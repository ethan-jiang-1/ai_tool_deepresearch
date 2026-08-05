// @impl DEW-023, CHI-004
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

import { WORK_UNITS } from './work-unit-constants.mjs';
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
  WorkUnitTransactionJournalSchema,
  WorkUnitTransactionLockOwnerSchema,
  WorkUnitTransactionMutationManifestSchema,
  WorkUnitTransactionPairSchema,
  WorkUnitTransactionProjectionSchema,
  WorkUnitTransactionV2JournalSchema,
} from '../schema/contracts/work-unit-transaction.mjs';

export const WORK_UNIT_TRANSACTION_TRANSITIONS = Object.freeze({
  started: Object.freeze(['committed', 'rolled_back', 'suspect']),
  suspect: Object.freeze(['rolled_back']),
  committed: Object.freeze([]),
  rolled_back: Object.freeze([]),
});

const LOCK_OWNER_BASENAME = 'owner.json';
const AUDIT_ONLY_PATHS = new Set(['rb_trace.jsonl', '_logs/run.log']);

function rootPath(bundleDir) {
  return path.resolve(bundleDir);
}

function lockPath(bundleDir) {
  return path.join(rootPath(bundleDir), WORK_UNITS.LOCK);
}

export function transactionLockOwnerPath(bundleDir) {
  return path.join(lockPath(bundleDir), LOCK_OWNER_BASENAME);
}

function transactionRoot(bundleDir) {
  return path.join(rootPath(bundleDir), WORK_UNITS.TRANSACTIONS);
}

function journalPath(bundleDir, txId) {
  return path.join(transactionRoot(bundleDir), `${txId}.json`);
}

function journalRef(txId) {
  return `${WORK_UNITS.TRANSACTIONS}/${txId}.json`;
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalTargetPath(bundleDir, target) {
  const parsed = WorkUnitTransactionMutationManifestSchema.parse({
    targets: [{ path: target, before_exists: false }],
  }).targets[0].path;
  const absolute = path.resolve(rootPath(bundleDir), parsed);
  const root = rootPath(bundleDir);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error(`transaction target escapes bundle root: ${target}`);
  }
  return { relative: parsed, absolute };
}

function captureMutationTargets(bundleDir, targetPaths) {
  const snapshots = [];
  for (const targetPath of targetPaths) {
    const target = canonicalTargetPath(bundleDir, targetPath);
    if (!existsSync(target.absolute)) {
      snapshots.push({ ...target, before_exists: false, bytes: null });
      continue;
    }
    const stats = lstatSync(target.absolute);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`transaction target must be one exact regular file: ${target.relative}`);
    }
    const bytes = readFileSync(target.absolute);
    snapshots.push({
      ...target,
      before_exists: true,
      before_sha256: sha256Bytes(bytes),
      bytes,
    });
  }
  return snapshots;
}

function mutationManifestFor(snapshots) {
  return WorkUnitTransactionMutationManifestSchema.parse({
    targets: snapshots.map((snapshot) => ({
      path: snapshot.relative,
      before_exists: snapshot.before_exists,
      ...(snapshot.before_exists ? { before_sha256: snapshot.before_sha256 } : {}),
    })),
  });
}

function targetMatchesBeforeImage(snapshot) {
  if (!snapshot.before_exists) return !existsSync(snapshot.absolute);
  if (!existsSync(snapshot.absolute)) return false;
  const stats = lstatSync(snapshot.absolute);
  return stats.isFile() && !stats.isSymbolicLink()
    && sha256Bytes(readFileSync(snapshot.absolute)) === snapshot.before_sha256;
}

function restoreMutationTargets(snapshots) {
  const failures = [];
  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (!snapshot.before_exists) {
        rmSync(snapshot.absolute, { recursive: true, force: true });
      } else {
        if (existsSync(snapshot.absolute) && !lstatSync(snapshot.absolute).isFile()) {
          rmSync(snapshot.absolute, { recursive: true, force: true });
        }
        mkdirSync(path.dirname(snapshot.absolute), { recursive: true });
        writeFileSync(snapshot.absolute, snapshot.bytes);
      }
    } catch (error) {
      failures.push(`${snapshot.relative}: ${error.message || String(error)}`);
    }
  }
  for (const snapshot of snapshots) {
    try {
      if (!targetMatchesBeforeImage(snapshot)) failures.push(`${snapshot.relative}: before-image mismatch`);
    } catch (error) {
      failures.push(`${snapshot.relative}: ${error.message || String(error)}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function listBundleFiles(bundleDir, currentJournalRef = null) {
  const root = rootPath(bundleDir);
  const files = new Map();
  if (!existsSync(root)) return files;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === WORK_UNITS.LOCK || relative.startsWith(`${WORK_UNITS.LOCK}/`)) continue;
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (relative === currentJournalRef || AUDIT_ONLY_PATHS.has(relative)) continue;
      files.set(relative, sha256Bytes(readFileSync(absolute)));
    }
  };
  visit(root);
  return files;
}

function changedFiles(before, after) {
  const all = new Set([...before.keys(), ...after.keys()]);
  return [...all].filter((entry) => before.get(entry) !== after.get(entry)).sort();
}

function callerFor(operation, { targetWorkIds = [], targetQueueItemIds = [] } = {}) {
  return {
    operation,
    work_id: targetWorkIds[0] || null,
    queue_item_id: targetQueueItemIds[0] || null,
  };
}

function defaultRerun(operation, bundleDir, { targetWorkIds = [] } = {}) {
  const workArg = targetWorkIds[0] ? ` --work-id ${JSON.stringify(targetWorkIds[0])}` : '';
  return `rerun ${operation} for ${JSON.stringify(rootPath(bundleDir))}${workArg}`;
}

function rawSuspectHolder(owner = null, journal = null) {
  const rawDisposition = journal?.schema_version === 'work-unit.transaction.v1' && journal?.status === 'failed'
    ? 'legacy_failed'
    : ['started', 'committed', 'rolled_back', 'suspect'].includes(journal?.status)
      ? journal.status
      : 'unknown';
  return {
    tx_id: typeof owner?.tx_id === 'string' ? owner.tx_id : typeof journal?.tx_id === 'string' ? journal.tx_id : null,
    operation: typeof owner?.operation === 'string' ? owner.operation : typeof journal?.operation === 'string' ? journal.operation : null,
    journal_ref: typeof owner?.journal_ref === 'string' ? owner.journal_ref : typeof journal?.journal_ref === 'string' ? journal.journal_ref : null,
    target_work_ids: Array.isArray(owner?.target_work_ids) ? owner.target_work_ids : Array.isArray(journal?.target_work_ids) ? journal.target_work_ids : [],
    target_queue_item_ids: Array.isArray(owner?.target_queue_item_ids) ? owner.target_queue_item_ids : Array.isArray(journal?.target_queue_item_ids) ? journal.target_queue_item_ids : [],
    journal_disposition: rawDisposition,
  };
}

function currentTargetsMatchManifest(bundleDir, journal) {
  try {
    const snapshots = journal.mutation_manifest.targets.map((target) => {
      const resolved = canonicalTargetPath(bundleDir, target.path);
      return { ...resolved, ...target };
    });
    return snapshots.every(targetMatchesBeforeImage);
  } catch {
    return false;
  }
}

function recoverTransactionRerun(bundleDir, txId) {
  return `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction ${JSON.stringify(rootPath(bundleDir))} --tx-id ${JSON.stringify(txId || '<tx-id>')}`;
}

function suspectProjection(bundleDir, operation, options, {
  owner = null,
  journal = null,
  reason,
  unlocked = false,
} = {}) {
  const holder = owner || journal ? rawSuspectHolder(owner, journal) : null;
  const recoverable = unlocked
    && journal?.schema_version === WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION
    && ['started', 'suspect'].includes(journal.status)
    && currentTargetsMatchManifest(bundleDir, journal);
  return WorkUnitTransactionProjectionSchema.parse({
    disposition: 'suspect_transaction',
    caller: callerFor(operation, options),
    holder,
    targets_same_attempt: holder && options.targetWorkIds?.[0]
      ? holder.target_work_ids.includes(options.targetWorkIds[0])
      : null,
    repair_kind: recoverable ? 'recover_transaction' : 'missing_contract',
    missing_fact: reason,
    write_to: recoverable ? journal.journal_ref : null,
    rerun: recoverable
      ? recoverTransactionRerun(bundleDir, journal.tx_id)
      : (options.rerun || defaultRerun(operation, bundleDir, options)),
  });
}

function readHeldTransactionProjection(bundleDir, operation, options) {
  const ownerFile = transactionLockOwnerPath(bundleDir);
  let rawOwner = null;
  let rawJournal = null;
  try {
    rawOwner = readJson(ownerFile);
    const owner = WorkUnitTransactionLockOwnerSchema.parse(rawOwner);
    const journalFile = path.join(rootPath(bundleDir), owner.journal_ref);
    rawJournal = readJson(journalFile);
    const journal = WorkUnitTransactionV2JournalSchema.parse(rawJournal);
    const pair = WorkUnitTransactionPairSchema.parse({ owner, journal });
    if (pair.journal.status === 'suspect') {
      return suspectProjection(bundleDir, operation, options, {
        owner,
        journal,
        reason: `held transaction ${owner.tx_id} has suspect disposition`,
      });
    }
    return WorkUnitTransactionProjectionSchema.parse({
      disposition: 'busy',
      caller: callerFor(operation, options),
      holder: {
        tx_id: owner.tx_id,
        operation: owner.operation,
        journal_ref: owner.journal_ref,
        target_work_ids: owner.target_work_ids,
        target_queue_item_ids: owner.target_queue_item_ids,
        journal_disposition: journal.status,
      },
      targets_same_attempt: journal.status === 'started'
        && Boolean(options.targetWorkIds?.some((workId) => owner.target_work_ids.includes(workId))),
      repair_kind: 'wait',
      missing_fact: null,
      write_to: null,
      rerun: options.rerun || defaultRerun(operation, bundleDir, options),
    });
  } catch (error) {
    return suspectProjection(bundleDir, operation, options, {
      owner: rawOwner,
      journal: rawJournal,
      reason: `global work-unit lock owner/journal is unpaired or invalid: ${error.message || String(error)}`,
    });
  }
}

function unresolvedOrphanJournals(bundleDir, { exceptTxId = null } = {}) {
  const dir = transactionRoot(bundleDir);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    let raw;
    try {
      raw = readJson(path.join(dir, entry.name));
      const journal = WorkUnitTransactionJournalSchema.parse(raw);
      if (journal.tx_id === exceptTxId) continue;
      if (journal.schema_version === WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION
        && ['started', 'suspect'].includes(journal.status)) out.push(journal);
      if (journal.schema_version === 'work-unit.transaction.v1' && journal.status !== 'committed') out.push(journal);
    } catch (error) {
      out.push({
        tx_id: typeof raw?.tx_id === 'string' ? raw.tx_id : entry.name.replace(/\.json$/, ''),
        schema_version: raw?.schema_version || 'unknown',
        status: raw?.status || 'unknown',
        parse_error: error.message || String(error),
      });
    }
  }
  return out;
}

export function inspectWorkUnitTransaction(bundleDir, {
  operation = 'submit_work_unit',
  targetWorkIds = [],
  targetQueueItemIds = [],
  rerun = null,
  includeOrphans = true,
  exceptTxId = null,
  ignoreHeldTxId = null,
} = {}) {
  const options = { targetWorkIds, targetQueueItemIds, rerun };
  if (existsSync(lockPath(bundleDir))) {
    if (ignoreHeldTxId) {
      try {
        const owner = WorkUnitTransactionLockOwnerSchema.parse(readJson(transactionLockOwnerPath(bundleDir)));
        if (owner.tx_id !== ignoreHeldTxId) return readHeldTransactionProjection(bundleDir, operation, options);
      } catch {
        return readHeldTransactionProjection(bundleDir, operation, options);
      }
    } else {
      return readHeldTransactionProjection(bundleDir, operation, options);
    }
  }
  if (includeOrphans) {
    const orphans = unresolvedOrphanJournals(bundleDir, { exceptTxId: exceptTxId || ignoreHeldTxId });
    if (orphans.length > 0) {
      const [journal] = orphans;
      return suspectProjection(bundleDir, operation, options, {
        journal,
        unlocked: orphans.length === 1,
        reason: orphans.length === 1
          ? `unlocked unresolved transaction journal ${journal.tx_id} has disposition ${journal.status}`
          : `multiple unresolved transaction journals exist: ${orphans.map((entry) => entry.tx_id).join(', ')}`,
      });
    }
  }
  return WorkUnitTransactionProjectionSchema.parse({
    disposition: 'none',
    caller: callerFor(operation, options),
    holder: null,
    targets_same_attempt: false,
    repair_kind: null,
    missing_fact: null,
    write_to: null,
    rerun: null,
  });
}

function transactionBlockedResult(projection) {
  return {
    ok: false,
    reason_code: projection.disposition,
    repair_kind: projection.repair_kind,
    missing_fact: projection.missing_fact,
    write_to: projection.write_to,
    rerun: projection.rerun,
    transaction: projection,
  };
}

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
    const afterAcquireProjection = inspectWorkUnitTransaction(root, {
      operation,
      targetWorkIds: normalized.targetWorkIds,
      targetQueueItemIds: normalized.targetQueueItemIds,
      rerun: normalized.rerun,
      includeOrphans: true,
      exceptTxId: normalized.allowOrphanTxId,
    });
    // The lock is ours but has no owner yet; inspect sees that as suspect. Only orphan journals matter here.
    const orphans = unresolvedOrphanJournals(root, { exceptTxId: normalized.allowOrphanTxId });
    if (orphans.length > 0) {
      return transactionBlockedResult(suspectProjection(root, operation, normalized, {
        journal: orphans[0],
        unlocked: true,
        reason: `unresolved transaction journal blocks ${operation}: ${orphans.map((entry) => entry.tx_id).join(', ')}`,
      }));
    }
    void afterAcquireProjection;

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
      .filter((entry) => !normalized.mutationTargets.includes(entry));
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
      repair_kind: 'missing_contract',
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
      repair_kind: 'missing_contract',
      missing_fact: `transaction journal does not exist: ${journalRef(tx_id)}`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
    };
  }

  let journal;
  try {
    journal = WorkUnitTransactionJournalSchema.parse(readJson(targetPath));
  } catch (error) {
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: 'missing_contract',
      missing_fact: `transaction journal is not recoverable v2 proof: ${error.message || String(error)}`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
    };
  }
  if (journal.schema_version !== WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION) {
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: 'missing_contract',
      missing_fact: `legacy transaction ${tx_id} has no v2 before-image recovery proof`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
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
    };
  }
  if (!currentTargetsMatchManifest(bundleDir, journal)) {
    return {
      ok: false,
      reason_code: 'suspect_transaction',
      repair_kind: 'missing_contract',
      missing_fact: `transaction ${tx_id} targets do not match the complete declared before-image`,
      write_to: null,
      rerun: recoverTransactionRerun(bundleDir, tx_id),
    };
  }

  const result = withWorkUnitTransaction(bundleDir, 'recover_work_unit_transaction', {
    mutationTargets: [journal.journal_ref],
    targetWorkIds: journal.target_work_ids,
    targetQueueItemIds: journal.target_queue_item_ids,
    allowOrphanTxId: tx_id,
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
    };
  });
  return result;
}
