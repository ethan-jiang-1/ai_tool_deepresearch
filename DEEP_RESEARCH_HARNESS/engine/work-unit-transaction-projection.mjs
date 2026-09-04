// work-unit-transaction-projection.mjs
// Layer 1: inspect/projection of transaction journals and orphan recovery
// ordering (C4 T5, move-only). Depends only on primitives.
// @impl WUC-002, CHI-004

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
  isExactIsoTimestamp,
  currentTargetsMatchManifest,
} from './work-unit-transaction-primitives.mjs';
const LOCK_OWNER_BASENAME = 'owner.json';
const LEGACY_TRANSACTION_V1_SCHEMA_VERSION = 'work-unit.transaction.v1';

export function callerFor(operation, { targetWorkIds = [], targetQueueItemIds = [] } = {}) {
  return {
    operation,
    work_id: targetWorkIds[0] || null,
    queue_item_id: targetQueueItemIds[0] || null,
  };
}

export function defaultRerun(operation, bundleDir, { targetWorkIds = [] } = {}) {
  const workArg = targetWorkIds[0] ? ` --work-id ${JSON.stringify(targetWorkIds[0])}` : '';
  return `rerun ${operation} for ${JSON.stringify(rootPath(bundleDir))}${workArg}`;
}

export function rawSuspectHolder(owner = null, journal = null) {
  const rawDisposition = journal?.schema_version === LEGACY_TRANSACTION_V1_SCHEMA_VERSION && journal?.status === 'failed'
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

export function isCompleteCommittedV1Diagnostic(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const expectedFields = [
    'schema_version',
    'tx_id',
    'operation',
    'status',
    'started_at',
    'committed_at',
  ];
  if (Object.keys(raw).length !== expectedFields.length
    || !expectedFields.every((field) => Object.hasOwn(raw, field))) return false;
  return raw.schema_version === LEGACY_TRANSACTION_V1_SCHEMA_VERSION
    && typeof raw.tx_id === 'string'
    && raw.tx_id.trim().length > 0
    && typeof raw.operation === 'string'
    && raw.operation.trim().length > 0
    && raw.status === 'committed'
    && isExactIsoTimestamp(raw.started_at)
    && isExactIsoTimestamp(raw.committed_at);
}

export function recoverTransactionRerun(bundleDir, txId) {
  return `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction ${JSON.stringify(rootPath(bundleDir))} --tx-id ${JSON.stringify(txId || '<tx-id>')}`;
}

export function suspectProjection(bundleDir, operation, options, {
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
    repair_kind: recoverable ? WORK_UNIT_REPAIR_KIND.recoverTransaction : WORK_UNIT_REPAIR_KIND.missingContract,
    missing_fact: reason,
    write_to: recoverable ? journal.journal_ref : null,
    rerun: recoverable
      ? recoverTransactionRerun(bundleDir, journal.tx_id)
      : (options.rerun || defaultRerun(operation, bundleDir, options)),
    next: {
      repair_kind: recoverable ? WORK_UNIT_REPAIR_KIND.recoverTransaction : WORK_UNIT_REPAIR_KIND.missingContract,
      missing_fact: reason,
      write_to: recoverable ? journal.journal_ref : null,
      rerun: recoverable
        ? recoverTransactionRerun(bundleDir, journal.tx_id)
        : (options.rerun || defaultRerun(operation, bundleDir, options)),
    },
  });
}

export function readHeldTransactionProjection(bundleDir, operation, options) {
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
      repair_kind: WORK_UNIT_REPAIR_KIND.wait,
      missing_fact: null,
      write_to: null,
      rerun: options.rerun || defaultRerun(operation, bundleDir, options),
      next: {
        repair_kind: WORK_UNIT_REPAIR_KIND.wait,
        missing_fact: null,
        write_to: null,
        rerun: options.rerun || defaultRerun(operation, bundleDir, options),
      },
    });
  } catch (error) {
    return suspectProjection(bundleDir, operation, options, {
      owner: rawOwner,
      journal: rawJournal,
      reason: `global work-unit lock owner/journal is unpaired or invalid: ${error.message || String(error)}`,
    });
  }
}

export function unresolvedOrphanJournals(bundleDir, { exceptTxId = null } = {}) {
  const dir = transactionRoot(bundleDir);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    let raw;
    try {
      raw = readJson(path.join(dir, entry.name));
      const parsed = WorkUnitTransactionV2JournalSchema.safeParse(raw);
      if (!parsed.success) {
        if (isCompleteCommittedV1Diagnostic(raw)) continue;
        throw parsed.error;
      }
      if (parsed.data.tx_id === exceptTxId) continue;
      if (['started', 'suspect'].includes(parsed.data.status)) out.push(parsed.data);
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

export function firstRecoverableOrphan(orphans) {
  const wrappedRefs = new Set();
  for (const orphan of orphans) {
    for (const target of orphan?.mutation_manifest?.targets || []) {
      if (typeof target?.path === 'string' && target.path.startsWith(`${WORK_UNITS.TRANSACTIONS}/`)) {
        wrappedRefs.add(target.path);
      }
    }
  }
  const isV2Orphan = (entry) => entry?.schema_version === WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION
    && !entry?.parse_error && typeof entry?.tx_id === 'string';
  const candidates = orphans.filter((orphan) => !wrappedRefs.has(orphan?.journal_ref));
  const ordered = [...(candidates.length > 0 ? candidates : orphans)].sort((left, right) => {
    const byShape = Number(isV2Orphan(right)) - Number(isV2Orphan(left));
    if (byShape !== 0) return byShape;
    const byStartedAt = String(left?.started_at || '').localeCompare(String(right?.started_at || ''));
    if (byStartedAt !== 0) return byStartedAt;
    return String(left?.tx_id || '').localeCompare(String(right?.tx_id || ''));
  });
  return ordered[0] || null;
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
      const journal = orphans.length === 1
        ? orphans[0]
        : (firstRecoverableOrphan(orphans) || orphans[0]);
      return suspectProjection(bundleDir, operation, options, {
        journal,
        unlocked: true,
        reason: orphans.length === 1
          ? `unlocked unresolved transaction journal ${journal.tx_id} has disposition ${journal.status}`
          : `multiple unresolved transaction journals exist (${orphans.map((entry) => entry.tx_id).join(', ')}); recover ${journal.tx_id} first`,
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

export function transactionBlockedResult(projection) {
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
