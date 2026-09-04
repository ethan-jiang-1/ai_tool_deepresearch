// @impl WUC-002, CHI-004
// Global work-unit mutation transaction, contention projection, and proof-bounded recovery.


import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { WORK_UNITS, WORK_UNIT_OUTPUT_LEDGER } from './work-unit-constants.mjs';
import { logToRun } from './logger.mjs';
import {
  now,
  readJson,
  traceWorkUnitEvent,
  writeJson,
} from './work-unit-utils.mjs';
import {
  WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
  WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
  WorkUnitTransactionLockOwnerSchema,
  WorkUnitTransactionMutationManifestSchema,
  WorkUnitTransactionPairSchema,
  WorkUnitTransactionProjectionSchema,
  WorkUnitTransactionV2JournalSchema,
} from '../schema/contracts/work-unit-transaction.mjs';
import { WORK_UNIT_REPAIR_KIND } from './work-unit-repair-vocabulary.mjs';
import {
  rootPath,
  lockPath,
  transactionLockOwnerPath,
  transactionRoot,
  journalPath,
  journalRef,
  captureMutationTargets,
  mutationManifestFor,
  restoreMutationTargets,
  listBundleFiles,
  changedFiles,
  belongsToOtherWorkUnit,
  currentTargetsMatchManifest,
} from './work-unit-transaction-primitives.mjs';
import {
  recoverTransactionRerun,
  suspectProjection,
  readHeldTransactionProjection,
  unresolvedOrphanJournals,
  firstRecoverableOrphan,
  inspectWorkUnitTransaction,
  transactionBlockedResult,
} from './work-unit-transaction-projection.mjs';
const LOCK_OWNER_BASENAME = 'owner.json';
const LEGACY_TRANSACTION_V1_SCHEMA_VERSION = 'work-unit.transaction.v1';

// Compat re-exports: importers of work-unit-transaction.mjs keep their surfaces.
export { inspectWorkUnitTransaction, transactionBlockedResult } from './work-unit-transaction-projection.mjs';
export { transactionLockOwnerPath } from './work-unit-transaction-primitives.mjs';

export const WORK_UNIT_TRANSACTION_TRANSITIONS = Object.freeze({
  started: Object.freeze(['committed', 'rolled_back', 'suspect']),
  suspect: Object.freeze(['rolled_back']),
  committed: Object.freeze([]),
  rolled_back: Object.freeze([]),
});

function normalizeOptions(options, fn) {
  if (typeof options === 'function') {
    throw new Error('work-unit transaction callers must declare exact mutation targets before mutation');
  }
  if (typeof fn !== 'function') throw new Error('work-unit transaction callback is required');
  const normalized = {
    targetWorkIds: [...new Set(options?.targetWorkIds || [])],
    targetQueueItemIds: [...new Set(options?.targetQueueItemIds || [])],
    mutationTargets: [...new Set(options?.mutationTargets || [])],
    rerun: options?.rerun || null,
    allowOrphanTxId: options?.allowOrphanTxId || null,
    orphanBlocking: options?.orphanBlocking === 'none' ? 'none' : 'all',
    hooks: options?.hooks || null,
  };
  if (normalized.mutationTargets.length === 0) {
    throw new Error(`work-unit transaction ${options?.operation || '<unknown>'} requires at least one exact mutation target`);
  }
  return normalized;
}

function invokeTransactionHook(hooks, name, context) {
  if (typeof hooks?.[name] === 'function') hooks[name](context);
}

export function withWorkUnitTransaction(bundleDir, operation, options, fn) {
  const normalized = normalizeOptions(options, fn);
  const root = rootPath(bundleDir);
  mkdirSync(transactionRoot(root), { recursive: true });

  const initialProjection = inspectWorkUnitTransaction(root, {
    operation,
    targetWorkIds: normalized.targetWorkIds,
    targetQueueItemIds: normalized.targetQueueItemIds,
    rerun: normalized.rerun,
    exceptTxId: normalized.allowOrphanTxId,
    includeOrphans: normalized.orphanBlocking === 'all',
  });
  if (initialProjection.disposition !== 'none') return transactionBlockedResult(initialProjection);

  const txId = `tx-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const ownerDir = lockPath(root);
  try {
    mkdirSync(ownerDir);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    return transactionBlockedResult(readHeldTransactionProjection(root, operation, normalized));
  }

  let snapshots = [];
  let journal = null;
  let callbackStarted = false;
  let callbackStopped = false;
  try {
    // The lock is ours but has no owner yet; inspect would see that as
    // suspect. Only orphan journals matter here, and only for operations that
    // keep all-orphan blocking ('all'); the recovery transaction itself
    // ('none') settles its named journal while other orphans remain.
    if (normalized.orphanBlocking === 'all') {
      const orphans = unresolvedOrphanJournals(root, { exceptTxId: normalized.allowOrphanTxId });
      if (orphans.length > 0) {
        const first = firstRecoverableOrphan(orphans);
        return transactionBlockedResult(suspectProjection(root, operation, normalized, {
          journal: first || orphans[0],
          unlocked: Boolean(first),
          reason: `unresolved transaction journal blocks ${operation}: ${orphans.map((entry) => entry.tx_id).join(', ')}`,
        }));
      }
    }

    snapshots = captureMutationTargets(root, normalized.mutationTargets);
    const mutationManifest = mutationManifestFor(snapshots);
    const ref = journalRef(txId);
    journal = WorkUnitTransactionV2JournalSchema.parse({
      schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
      tx_id: txId,
      operation,
      journal_ref: ref,
      target_work_ids: normalized.targetWorkIds,
      target_queue_item_ids: normalized.targetQueueItemIds,
      mutation_manifest: mutationManifest,
      status: 'started',
      started_at: now(),
      settled_at: null,
      error: null,
    });
    const owner = WorkUnitTransactionLockOwnerSchema.parse({
      schema_version: WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
      tx_id: txId,
      operation,
      journal_ref: ref,
      target_work_ids: normalized.targetWorkIds,
      target_queue_item_ids: normalized.targetQueueItemIds,
      acquired_at: journal.started_at,
    });
    writeJson(journalPath(root, txId), journal);
    writeJson(transactionLockOwnerPath(root), owner);
    WorkUnitTransactionPairSchema.parse({ owner, journal });

    const beforeFiles = listBundleFiles(root, ref);
    callbackStarted = true;
    const result = fn({
      tx_id: txId,
      mutation_manifest: mutationManifest,
      assert_declared_target(target) {
        if (!normalized.mutationTargets.includes(target)) {
          throw new Error(`undeclared transaction target: ${target}`);
        }
      },
    });
    callbackStopped = true;
    const afterFiles = listBundleFiles(root, ref);
    const undeclared = changedFiles(beforeFiles, afterFiles)
      .filter((entry) => !normalized.mutationTargets.includes(entry))
      .filter((entry) => !belongsToOtherWorkUnit(entry, normalized.targetWorkIds));
    if (undeclared.length > 0) {
      const error = new Error(`transaction ${txId} mutated undeclared targets: ${undeclared.join(', ')}`);
      error.undeclared_targets = undeclared;
      throw error;
    }

    invokeTransactionHook(normalized.hooks, 'afterMutation', {
      bundleDir: root,
      tx_id: txId,
      operation,
      mutation_manifest: mutationManifest,
      result,
    });

    journal = WorkUnitTransactionV2JournalSchema.parse({
      ...journal,
      status: 'committed',
      settled_at: now(),
      error: null,
    });
    writeJson(journalPath(root, txId), journal);
    invokeTransactionHook(normalized.hooks, 'afterCommittedBeforeRelease', {
      bundleDir: root,
      tx_id: txId,
      operation,
      journal,
      result,
    });
    return result;
  } catch (error) {
    if (journal?.status === 'committed') {
      error.transaction = {
        tx_id: txId,
        disposition: 'committed',
        rollback: null,
      };
      throw error;
    }
    callbackStopped = callbackStarted;
    const rollback = restoreMutationTargets(snapshots);
    const rollbackProven = rollback.ok && !(error.undeclared_targets?.length > 0);
    if (journal) {
      const disposition = rollbackProven ? 'rolled_back' : 'suspect';
      try {
        journal = WorkUnitTransactionV2JournalSchema.parse({
          ...journal,
          status: disposition,
          settled_at: now(),
          error: rollbackProven
            ? `operation failed and exact before-images were restored: ${error.message || String(error)}`
            : `operation failed and rollback proof is incomplete: ${[error.message || String(error), ...rollback.failures].join('; ')}`,
        });
        writeJson(journalPath(root, txId), journal);
      } catch { /* unlocked started remains proof-limited */ }
    }
    try {
      traceWorkUnitEvent(root, 'work_unit_transaction_failed', {
        tx_id: txId,
        operation,
        disposition: journal?.status || 'started',
        callback_stopped: callbackStopped,
        rollback_restored: rollbackProven,
        rollback_failures: rollback.failures,
        reason: error.message || String(error),
      });
      logToRun(root, 'error', 'work_unit_transaction_failed', {
        kind: 'work_unit_transaction',
        tx_id: txId,
        operation,
        disposition: journal?.status || 'started',
        reason: error.message || String(error),
      });
    } catch { /* preserve the operation error */ }
    error.transaction = {
      tx_id: txId,
      disposition: journal?.status || 'started',
      rollback: { ...rollback, ok: rollbackProven },
    };
    throw error;
  } finally {
    // Final action: no transaction-owned target or audit write may follow this release.
    rmSync(ownerDir, { recursive: true, force: true });
  }
}

export function recoverWorkUnitTransaction(bundleDir, { tx_id, transactionHooks = null } = {}) {
  if (!tx_id || typeof tx_id !== 'string') {
    return {
      ok: false,
      reason_code: 'invalid_transaction_id',
      repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
      missing_fact: '--tx-id is required',
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
    };
  }
  if (existsSync(lockPath(bundleDir))) {
    return transactionBlockedResult(readHeldTransactionProjection(bundleDir, 'recover_work_unit_transaction', {
      targetWorkIds: [],
      targetQueueItemIds: [],
      rerun: recoverTransactionRerun(bundleDir, tx_id),
    }));
  }

  const targetPath = journalPath(bundleDir, tx_id);
  if (!existsSync(targetPath)) {
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
      missing_fact: `transaction journal does not exist: ${journalRef(tx_id)}`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
        missing_fact: `transaction journal does not exist: ${journalRef(tx_id)}`,
        write_to: null,
        rerun: recoverTransactionRerun(bundleDir, tx_id),
      },
    };
  }

  let journal;
  try {
    journal = WorkUnitTransactionV2JournalSchema.parse(readJson(targetPath));
  } catch (error) {
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
      missing_fact: `transaction journal is not recoverable v2 proof: ${error.message || String(error)}`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
        missing_fact: `transaction journal is not recoverable v2 proof: ${error.message || String(error)}`,
        write_to: null,
        rerun: recoverTransactionRerun(bundleDir, tx_id),
      },
    };
  }
  if (['committed', 'rolled_back'].includes(journal.status)) {
    return {
      ok: true,
      changed: false,
      idempotent: true,
      tx_id,
      disposition: journal.status,
      journal_ref: journal.journal_ref,
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.recoverTransaction,
        missing_fact: null,
        write_to: journal.journal_ref,
        rerun: recoverTransactionRerun(bundleDir, tx_id),
      },
    };
  }
  if (!currentTargetsMatchManifest(bundleDir, journal)) {
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
      missing_fact: `transaction ${tx_id} targets do not match the complete declared before-image`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.missingContract,
        missing_fact: `transaction ${tx_id} targets do not match the complete declared before-image`,
        write_to: null,
        rerun: recoverTransactionRerun(bundleDir, tx_id),
      },
    };
  }

  // Wrapper dependency: another unresolved orphan declares this journal as a
  // mutation target, so recovering it now would race the wrapper's own
  // rollback proof. Settle the wrapper first; manifests are captured at
  // transaction start, so this relation is acyclic.
  const wrapperOrphans = unresolvedOrphanJournals(bundleDir, { exceptTxId: tx_id })
    .filter((orphan) => (orphan?.mutation_manifest?.targets || [])
      .some((target) => target?.path === journal.journal_ref));
  if (wrapperOrphans.length > 0) {
    const wrapper = firstRecoverableOrphan(wrapperOrphans) || wrapperOrphans[0];
    const missingFact = `transaction ${tx_id} journal is a declared mutation target of unresolved transaction ${wrapper.tx_id}; recover the wrapper first`;
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: WORK_UNIT_REPAIR_KIND.recoverTransaction,
      missing_fact: missingFact,
      write_to: wrapper?.journal_ref || null,
      rerun: recoverTransactionRerun(bundleDir, wrapper.tx_id),
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.recoverTransaction,
        missing_fact: missingFact,
        write_to: wrapper?.journal_ref || null,
        rerun: recoverTransactionRerun(bundleDir, wrapper.tx_id),
      },
    };
  }

  const result = withWorkUnitTransaction(bundleDir, 'recover_work_unit_transaction', {
    mutationTargets: [journal.journal_ref],
    targetWorkIds: journal.target_work_ids,
    targetQueueItemIds: journal.target_queue_item_ids,
    allowOrphanTxId: tx_id,
    orphanBlocking: 'none',
    rerun: recoverTransactionRerun(bundleDir, tx_id),
    hooks: transactionHooks,
  }, ({ tx_id: recoveryTxId }) => {
    const current = WorkUnitTransactionV2JournalSchema.parse(readJson(targetPath));
    if (current.tx_id !== tx_id || !['started', 'suspect'].includes(current.status)) {
      throw new Error(`transaction ${tx_id} changed before recovery commit`);
    }
    if (!currentTargetsMatchManifest(bundleDir, current)) {
      throw new Error(`transaction ${tx_id} before-image changed before recovery commit`);
    }
    const settled = WorkUnitTransactionV2JournalSchema.parse({
      ...current,
      status: 'rolled_back',
      settled_at: now(),
      error: `proof-verified rollback recorded by ${recoveryTxId}`,
    });
    writeJson(targetPath, settled);
    return {
      ok: true,
      changed: true,
      idempotent: false,
      tx_id,
      recovery_tx_id: recoveryTxId,
      disposition: 'rolled_back',
      journal_ref: settled.journal_ref,
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.recoverTransaction,
        missing_fact: null,
        write_to: settled.journal_ref,
        rerun: recoverTransactionRerun(bundleDir, tx_id),
      },
    };
  });
  return result;
}
