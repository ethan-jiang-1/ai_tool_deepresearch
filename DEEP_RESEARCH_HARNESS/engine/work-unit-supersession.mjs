// @impl DEW-024, AGQ-026, WPG-016, CHI-004
// Audited submitted-attempt supersession and unique current-lineage resolution.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS,
} from '../schema/contracts/queue.mjs';
import {
  WORK_UNIT_SUPERSESSION_SCHEMA_VERSION,
  WorkUnitSupersessionRelationSchema,
} from '../schema/contracts/work-unit.mjs';
import { WorkUnitTransactionV2JournalSchema } from '../schema/contracts/work-unit-transaction.mjs';
import {
  clone,
  hashValue,
  now,
  readJson,
  traceWorkUnitEvent,
} from './work-unit-utils.mjs';
import {
  loadWorkUnitIndex,
  saveWorkUnitIndex,
  transactionDir,
  withWorkUnitTransaction,
} from './work-unit-index.mjs';
import {
  acceptedLedgerRecordHashFor,
  readSubmittedLedgerDocument,
  readSubmittedStatusFile,
  validateCurrentSubmittedLedgerFact,
} from './work-unit-submitted-ledger.mjs';
import {
  readAndValidateBeacon,
  readAndValidateManifest,
  readAndValidateResult,
  validateCacheTrails,
  validateOutputFiles,
  validateSubmitRuntimeReceipt,
  assertCompleteCurrentWorkUnitProfile,
} from './work-unit-validation.mjs';
import { inspectWorkUnitDeclarationRecovery } from './work-unit-submit.mjs';
import { inspectWorkUnitTransaction } from './work-unit-transaction.mjs';
import { enqueue, loadQueue, loadQueueReadOnly, saveQueue } from './queue-manager-lifecycle.mjs';
import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { evaluateDirectOutputTarget, semanticOrderedArrayDigest } from './helpers/direct-output-contract.mjs';
import { logToRun } from './logger.mjs';
import { WORK_UNIT_REPAIR_KIND } from './work-unit-repair-vocabulary.mjs';

const WORK_UNIT_INDEX_TARGET = '_work_units/_index.json';
const QUEUE_TARGET = 'rb_queue.json';
const ROOT_PRECEDENCE = Object.freeze([
  'submitted_declaration_missing',
  'submitted_declaration_drift',
  'submitted_result_drift',
  'submitted_runtime_receipt_drift',
  'submitted_output_drift',
  'submitted_cache_drift',
]);
const REPLACEMENT_LINEAGE_FIELDS = Object.freeze([
  'replacement_of_work_id',
  'replacement_of_queue_item_id',
  'replacement_terminal_status',
  'replacement_terminal_reason',
  'replacement_queue_item_snapshot_hash',
]);

function supersedeCommand(bundleDir, workId, reason = '<audit-reason>') {
  return [
    'node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(String(workId || '<work-id>')),
    '--reason', JSON.stringify(String(reason || '<audit-reason>')),
  ].join(' ');
}

function failure(bundleDir, record, code, missingFact, {
  repairKind = WORK_UNIT_REPAIR_KIND.missingContract,
  writeTo = null,
  rerun = null,
  observedRoots = [],
  transaction = null,
} = {}) {
  return {
    ok: false,
    eligible: false,
    reason_code: code,
    work_id: record?.work_id || null,
    queue_item_id: record?.queue_item_id || null,
    repair_kind: repairKind,
    missing_fact: missingFact,
    write_to: writeTo,
    rerun: rerun || supersedeCommand(bundleDir, record?.work_id),
    observed_roots: observedRoots,
    ...(transaction ? { transaction } : {}),
  };
}

function relationFailure(bundleDir, record, message) {
  return failure(bundleDir, record, 'supersession_integrity_invalid', message);
}

function parseTrace(bundleDir) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`trace line ${index + 1} is invalid JSON: ${error.message || String(error)}`);
      }
    });
}

function originalAcceptanceEvidence(bundleDir, record, acceptedHash) {
  const events = parseTrace(bundleDir);
  const submitted = events.filter((entry) => (
    entry.event === 'work_unit_submitted'
    && entry.work_id === record.work_id
    && entry.queue_item_id === record.queue_item_id
    && entry.ledger_record_hash === acceptedHash
    && (!record.result_hash || entry.result_hash === record.result_hash)
    && typeof entry.tx_id === 'string'
  ));
  const candidates = [];
  for (const event of submitted) {
    const appended = events.some((entry) => (
      entry.event === 'work_unit_ledger_appended'
      && entry.tx_id === event.tx_id
      && entry.work_id === record.work_id
      && entry.queue_item_id === record.queue_item_id
      && entry.ledger_record_hash === acceptedHash
    ));
    if (!appended) continue;
    const journalPath = path.join(transactionDir(bundleDir), `${event.tx_id}.json`);
    if (!existsSync(journalPath)) continue;
    let journal;
    try {
      journal = WorkUnitTransactionV2JournalSchema.parse(readJson(journalPath));
    } catch {
      continue;
    }
    if (journal.status !== 'committed') continue;
    if (!['submit_work_unit', 'late_submit_work_unit'].includes(journal.operation)) continue;
    if (!journal.target_work_ids.includes(record.work_id)
      || !journal.target_queue_item_ids.includes(record.queue_item_id)) continue;
    candidates.push({ tx_id: event.tx_id, journal, submitted_event: event });
  }
  const unique = new Map(candidates.map((candidate) => [candidate.tx_id, candidate]));
  if (unique.size !== 1) {
    throw new Error(`expected one committed original submit transaction/trace binding for ${record.work_id}; found ${unique.size}`);
  }
  return [...unique.values()][0];
}

function terminalStatusMatches(record, terminal) {
  if (record.status === 'submitted') return terminal.terminal_status === 'done';
  if (record.status === 'failed') return terminal.terminal_status === 'failed';
  if (record.status === 'abandoned') return terminal.terminal_status === 'cancelled';
  return false;
}

export function validateSubmittedPredecessorAuthority(bundleDir, index, record, { queue = null } = {}) {
  if (!record || record.status !== 'submitted') {
    throw new Error(`supersession requires a submitted predecessor, got ${record?.status || '<missing>'}`);
  }
  assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  const acceptedHash = acceptedLedgerRecordHashFor(record);
  if (!acceptedHash) throw new Error(`submitted predecessor ${record.work_id} lacks accepted ledger evidence`);
  const status = readSubmittedStatusFile(bundleDir, record);
  if (status.work_id !== record.work_id || status.status !== 'submitted') {
    throw new Error(`submitted status binding mismatch for ${record.work_id}`);
  }
  if (!record.terminal_at || status.updated_at !== record.terminal_at) {
    throw new Error(`submitted index/status terminal timestamp mismatch for ${record.work_id}`);
  }
  const manifest = readAndValidateManifest(bundleDir, index, record);
  readAndValidateBeacon(bundleDir, record, manifest);
  const queueView = queue || loadQueueReadOnly(bundleDir);
  const terminals = queueView.terminal_history.filter((entry) => (
    entry.work_id === record.work_id && entry.queue_item_id === record.queue_item_id
  ));
  if (terminals.length !== 1 || !terminals[0].item || !terminalStatusMatches(record, terminals[0])) {
    throw new Error(`submitted predecessor ${record.work_id} requires exactly one matching terminal done snapshot`);
  }
  const terminal = terminals[0];
  if (terminal.completed_at !== record.terminal_at) {
    throw new Error(`submitted predecessor terminal timestamp mismatch for ${record.work_id}`);
  }
  if (queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash
    || queueItemSnapshotHash(terminal.item) !== record.queue_item_snapshot_hash
    || hashValue(manifest.queue_item) !== hashValue(terminal.item)) {
    throw new Error(`submitted predecessor queue snapshot drift for ${record.work_id}`);
  }
  return { accepted_hash: acceptedHash, status, manifest, queue: queueView, terminal };
}

function collectDirectDriftRoots(bundleDir, index, record, row, parent) {
  const observed = [];
  let result = null;
  try {
    const normalizations = [];
    result = readAndValidateResult(bundleDir, path.join(bundleDir, record.paths.result_ref), record, {
      normalizations,
      outputContract: parent.manifest.output_contract,
    });
    if (normalizations.length > 0 || hashValue(result) !== row.result_hash) {
      throw new Error(`canonical result no longer matches accepted result_hash for ${record.work_id}`);
    }
  } catch (error) {
    observed.push({ code: 'submitted_result_drift', surface: record.paths.result_ref, detail: error.message || String(error) });
  }

  try {
    const normalizations = [];
    const receipt = validateSubmitRuntimeReceipt(bundleDir, record, {
      normalizations,
      allowNonceNormalization: false,
    });
    if (normalizations.length > 0 || !receipt.events.some((entry) => entry.event === 'work_done')) {
      throw new Error(`runtime receipt is not the exact accepted lifecycle shape for ${record.work_id}`);
    }
  } catch (error) {
    observed.push({ code: 'submitted_runtime_receipt_drift', surface: record.paths.runtime_receipt_ref, detail: error.message || String(error) });
  }

  if (result) {
    try {
      validateOutputFiles(bundleDir, result, parent.manifest.output_contract);
      if (row.source_contribution) {
        const contribution = row.source_contribution;
        const evaluated = evaluateDirectOutputTarget({
          bundleDir,
          target: contribution.target,
          contractId: contribution.direct_contract,
        });
        if (!evaluated.passed || evaluated.validated_value.length < contribution.validated_length) {
          throw new Error(`submitted source contribution target is missing or structurally drifted: ${contribution.target}`);
        }
        const digest = semanticOrderedArrayDigest(evaluated.validated_value.slice(0, contribution.validated_length));
        if (digest !== contribution.semantic_digest) {
          throw new Error(`submitted source contribution prefix drifted: ${contribution.target}`);
        }
      }
    } catch (error) {
      observed.push({ code: 'submitted_output_drift', surface: 'submitted output files', detail: error.message || String(error) });
    }
    try {
      const cache = validateCacheTrails(bundleDir, result, parent.manifest.cache_policy, {
        record,
        normalizations: [],
        writeCanonicalCache: false,
      });
      if (cache.virtualCachePages.size > 0) throw new Error('submitted cache leaves require canonicalization');
    } catch (error) {
      observed.push({ code: 'submitted_cache_drift', surface: 'submitted cache trails', detail: error.message || String(error) });
    }
  }
  return observed;
}

function globalLedgerIssue(bundleDir, document, index, targetWorkId) {
  if (document.unattributable_errors.length > 0) {
    return `unattributable declaration corruption: ${document.unattributable_errors.map((entry) => `line ${entry.line} ${entry.reason}`).join('; ')}`;
  }
  if (document.duplicate_work_ids.length > 0) {
    return `duplicate declaration rows: ${document.duplicate_work_ids.join(', ')}`;
  }
  const foreignInvalid = document.attributable_invalid_rows.filter((entry) => entry.work_id !== targetWorkId);
  if (foreignInvalid.length > 0) {
    return `foreign attributable declaration corruption: ${foreignInvalid.map((entry) => `${entry.work_id}@${entry.line}`).join(', ')}`;
  }
  for (const row of document.valid_rows) {
    const owner = index.work_units[row.work_id];
    if (!owner || owner.status !== 'submitted') {
      return `declaration row ${row.work_id} has no submitted index owner`;
    }
    if (owner.supersession_relation) continue;
    try {
      validateCurrentSubmittedLedgerFact({
        record: owner,
        row,
        status: readSubmittedStatusFile(bundleDir, owner),
      });
    } catch (error) {
      if (row.work_id !== targetWorkId) return `foreign current declaration invalid for ${row.work_id}: ${error.message || String(error)}`;
    }
  }
  return null;
}

function selectRoot(observed) {
  for (const code of ROOT_PRECEDENCE) {
    if (observed.some((entry) => entry.code === code)) return code;
  }
  return null;
}

function successorQueueItemId(workId) {
  return `supersession-${workId}`;
}

function withoutSupersessionLineage(lineage) {
  const next = clone(lineage || {});
  for (const field of WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS) delete next[field];
  return next;
}

export function buildSupersessionSuccessorDemand(terminalItem, relation) {
  const {
    created_at: _createdAt,
    updated_at: _updatedAt,
    status: _status,
    restore_priority: _restorePriority,
    ...immutable
  } = clone(terminalItem);
  return {
    ...immutable,
    queue_item_id: relation.successor_queue_item_id,
    status: 'queued',
    restore_priority: 'normal',
    lineage: {
      ...withoutSupersessionLineage(terminalItem.lineage),
      supersession_of_work_id: relation.predecessor_work_id,
      supersession_of_queue_item_id: relation.predecessor_queue_item_id,
      supersession_accepted_ledger_record_hash: relation.accepted_ledger_record_hash,
      supersession_root: relation.root_code,
      supersession_tx_id: relation.tx_id,
    },
  };
}

function queueEntries(bundleDir, index, queue) {
  const entries = [];
  queue.active_window.forEach((item) => entries.push({ location: 'active_window', queue_item_id: item.queue_item_id, item, work_id: null, terminal: null }));
  queue.refill_pool.forEach((item) => entries.push({ location: 'refill_pool', queue_item_id: item.queue_item_id, item, work_id: null, terminal: null }));
  for (const [queueItemId, inFlight] of Object.entries(queue.delegated_in_flight || {})) {
    const record = index.work_units[inFlight.work_id];
    if (!record) throw new Error(`in-flight successor ${queueItemId} lacks index record ${inFlight.work_id}`);
    const manifest = readAndValidateManifest(bundleDir, index, record);
    entries.push({ location: 'delegated_in_flight', queue_item_id: queueItemId, item: manifest.queue_item, work_id: record.work_id, terminal: null });
  }
  for (const terminal of queue.terminal_history || []) {
    entries.push({ location: 'terminal_history', queue_item_id: terminal.queue_item_id, item: terminal.item || null, work_id: terminal.work_id || null, terminal });
  }
  return entries;
}

function oneQueueEntry(entries, queueItemId) {
  const matches = entries.filter((entry) => entry.queue_item_id === queueItemId);
  if (matches.length !== 1) throw new Error(`successor queue identity ${queueItemId} has ${matches.length} ordinary locations`);
  if (!matches[0].item) throw new Error(`successor queue identity ${queueItemId} lacks its immutable item snapshot`);
  return matches[0];
}

function assertRelationLineage(relation, item) {
  const expected = {
    supersession_of_work_id: relation.predecessor_work_id,
    supersession_of_queue_item_id: relation.predecessor_queue_item_id,
    supersession_accepted_ledger_record_hash: relation.accepted_ledger_record_hash,
    supersession_root: relation.root_code,
    supersession_tx_id: relation.tx_id,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (item.lineage?.[field] !== value) throw new Error(`successor lineage mismatch at ${field}`);
  }
  for (const field of ['schema_version', 'reason', 'recorded_at', 'successor_queue_item_id']) {
    if (Object.hasOwn(item.lineage || {}, field)) throw new Error(`relation-only field leaked into queue lineage: ${field}`);
  }
}

function lineageFieldsMatch(leftItem, rightItem, fields) {
  return fields.every((field) => leftItem.lineage?.[field] === rightItem.lineage?.[field]);
}

function validateSupersessionTransactionRelation(bundleDir, relation, { allowStartedTxId = null } = {}) {
  const journalPath = path.join(transactionDir(bundleDir), `${relation.tx_id}.json`);
  if (!existsSync(journalPath)) {
    throw new Error(`supersession transaction journal is missing: ${relation.tx_id}`);
  }
  const journal = WorkUnitTransactionV2JournalSchema.parse(readJson(journalPath));
  if (journal.tx_id !== relation.tx_id
    || journal.operation !== 'supersede_work_unit') {
    throw new Error(`supersession transaction reference is invalid: ${relation.tx_id}`);
  }
  const allowedStarted = journal.status === 'started' && allowStartedTxId === relation.tx_id;
  if (journal.status !== 'committed' && !allowedStarted) {
    throw new Error(`supersession transaction ${relation.tx_id} is ${journal.status}, expected committed`);
  }
  const expectedWorkIds = [relation.predecessor_work_id];
  const expectedQueueItemIds = [relation.predecessor_queue_item_id, relation.successor_queue_item_id];
  if (hashValue(journal.target_work_ids) !== hashValue(expectedWorkIds)
    || hashValue(journal.target_queue_item_ids) !== hashValue(expectedQueueItemIds)) {
    throw new Error(`supersession transaction coordinates mismatch for ${relation.predecessor_work_id}`);
  }
  return journal;
}

function buildReplacementDemand(record, terminalItem) {
  const {
    created_at: _createdAt,
    updated_at: _updatedAt,
    status: _status,
    restore_priority: _restorePriority,
    ...immutable
  } = clone(terminalItem);
  return {
    ...immutable,
    queue_item_id: `replacement-${record.work_id}`,
    status: 'queued',
    lineage: {
      ...(terminalItem.lineage || {}),
      replacement_of_work_id: record.work_id,
      replacement_of_queue_item_id: record.queue_item_id,
      replacement_terminal_status: record.status,
      replacement_terminal_reason: record.terminal_reason,
      replacement_queue_item_snapshot_hash: record.queue_item_snapshot_hash,
    },
  };
}

function retryParentIsEligible(record) {
  return record.status === 'timed_out'
    || (record.status === 'failed' && record.terminal_reason?.startsWith('actor_spawn_unavailable:'));
}

function buildRetryDemand(record, manifestItem) {
  return {
    ...clone(manifestItem),
    status: 'queued',
    lineage: {
      ...(manifestItem.lineage || {}),
      retry_of_work_id: record.work_id,
      retry_reason: record.terminal_reason,
      attempt_index: record.attempt_index + 1,
    },
  };
}

function validateLateAcceptedRetryCleanup(bundleDir, index, currentRecord, attempts, consumedWorkIds) {
  const cleanedWorkIds = currentRecord.late_accept_context?.superseded_retry_work_ids || [];
  if (cleanedWorkIds.length > 1) {
    throw new Error(`late-submit cleanup for ${currentRecord.work_id} names multiple retry attempts`);
  }
  for (const workId of cleanedWorkIds) {
    const retry = index.work_units[workId];
    if (!retry || retry.queue_item_id !== currentRecord.queue_item_id || !attempts.includes(retry)) {
      throw new Error(`late-submit cleanup retry ${workId} is not an attempt for ${currentRecord.queue_item_id}`);
    }
    if (retry.status !== 'abandoned' || retry.terminal_reason !== 'superseded_by_late_accept') {
      throw new Error(`late-submit cleanup retry ${workId} lacks its audited abandoned disposition`);
    }
    if (retry.attempt_index !== currentRecord.attempt_index + 1) {
      throw new Error(`late-submit cleanup retry ${workId} has invalid attempt_index`);
    }
    const currentManifest = readAndValidateManifest(bundleDir, index, currentRecord);
    const retryManifest = readAndValidateManifest(bundleDir, index, retry);
    const expected = buildRetryDemand(currentRecord, currentManifest.queue_item);
    if (queueItemSnapshotHash(retryManifest.queue_item) !== queueItemSnapshotHash(expected)) {
      throw new Error(`late-submit cleanup retry ${workId} snapshot does not match ${currentRecord.work_id}`);
    }
    consumedWorkIds.add(workId);
  }
}

function validateSuccessorRetryContinuation(bundleDir, index, entry, initialDemand) {
  const attempts = Object.values(index.work_units)
    .filter((record) => record.queue_item_id === entry.queue_item_id);
  const consumedWorkIds = new Set();
  const reverseEdges = [];

  const validateItem = (item, record = null) => {
    if (record) {
      if (consumedWorkIds.has(record.work_id)) {
        throw new Error(`retry lineage cycle at work unit ${record.work_id}`);
      }
      consumedWorkIds.add(record.work_id);
      const manifest = readAndValidateManifest(bundleDir, index, record);
      if (queueItemSnapshotHash(item) !== queueItemSnapshotHash(manifest.queue_item)) {
        throw new Error(`retry lineage snapshot mismatch for ${record.work_id}`);
      }
    }

    const retryOfWorkId = item.lineage?.retry_of_work_id || null;
    if (!retryOfWorkId) {
      if (queueItemSnapshotHash(item) !== queueItemSnapshotHash(initialDemand)) {
        throw new Error(`supersession successor snapshot drift for ${initialDemand.queue_item_id}`);
      }
      if (record && record.attempt_index !== 1) {
        throw new Error(`initial supersession successor ${record.work_id} has attempt_index ${record.attempt_index}`);
      }
      return;
    }

    const parent = index.work_units[retryOfWorkId];
    if (!parent || parent.queue_item_id !== entry.queue_item_id) {
      throw new Error(`retry lineage parent ${retryOfWorkId} is missing for ${entry.queue_item_id}`);
    }
    if (consumedWorkIds.has(parent.work_id)) {
      throw new Error(`retry lineage cycle at work unit ${parent.work_id}`);
    }
    if (!retryParentIsEligible(parent)) {
      throw new Error(`retry lineage parent ${retryOfWorkId} is ${parent.status}, not retry-eligible`);
    }
    const parentManifest = readAndValidateManifest(bundleDir, index, parent);
    const expected = buildRetryDemand(parent, parentManifest.queue_item);
    if (queueItemSnapshotHash(item) !== queueItemSnapshotHash(expected)) {
      throw new Error(`retry lineage snapshot mismatch from ${retryOfWorkId}`);
    }
    if (item.lineage?.attempt_index !== parent.attempt_index + 1) {
      throw new Error(`retry lineage attempt_index mismatch from ${retryOfWorkId}`);
    }
    if (record && record.attempt_index !== parent.attempt_index + 1) {
      throw new Error(`retry work-unit attempt_index mismatch for ${record.work_id}`);
    }
    reverseEdges.push({
      kind: 'retry',
      predecessor_work_id: parent.work_id,
      successor_queue_item_id: entry.queue_item_id,
      successor_work_id: record?.work_id || null,
    });
    validateItem(parentManifest.queue_item, parent);
  };

  const currentRecord = entry.work_id ? index.work_units[entry.work_id] : null;
  validateItem(entry.item, currentRecord);
  if (currentRecord?.late_accept_context) {
    validateLateAcceptedRetryCleanup(bundleDir, index, currentRecord, attempts, consumedWorkIds);
  }
  const unaccounted = attempts.filter((record) => !consumedWorkIds.has(record.work_id));
  if (unaccounted.length > 0) {
    throw new Error(`retry lineage for ${entry.queue_item_id} has unaccounted attempts: ${unaccounted.map((record) => record.work_id).join(', ')}`);
  }
  return reverseEdges.reverse();
}

function leafFromEntry(index, entry) {
  if (entry.location === 'active_window' || entry.location === 'refill_pool') {
    const claimed = Object.values(index.work_units).filter((record) => record.queue_item_id === entry.queue_item_id && record.status === 'claimed');
    if (claimed.length > 0) throw new Error(`queued successor ${entry.queue_item_id} also has a claimed work unit`);
    return { queue_item_id: entry.queue_item_id, queue_location: entry.location, work_id: null, work_status: null, item: entry.item };
  }
  if (!entry.work_id) throw new Error(`delegated successor ${entry.queue_item_id} lacks work_id authority`);
  const record = index.work_units[entry.work_id];
  if (!record || record.queue_item_id !== entry.queue_item_id) throw new Error(`successor work/index binding mismatch for ${entry.queue_item_id}`);
  if (entry.location === 'delegated_in_flight' && record.status !== 'claimed') {
    throw new Error(`in-flight successor ${entry.queue_item_id} is ${record.status}, expected claimed`);
  }
  if (entry.location === 'terminal_history' && !terminalStatusMatches(record, entry.terminal)) {
    throw new Error(`terminal successor ${entry.queue_item_id} does not match work status ${record.status}`);
  }
  if (queueItemSnapshotHash(entry.item) !== record.queue_item_snapshot_hash) {
    throw new Error(`successor queue snapshot mismatch for ${record.work_id}`);
  }
  return { queue_item_id: entry.queue_item_id, queue_location: entry.location, work_id: record.work_id, work_status: record.status, item: entry.item, record };
}

export function resolveWorkUnitSupersessionLineage(bundleDir, {
  predecessorWorkId,
  index: suppliedIndex = null,
  queue: suppliedQueue = null,
  allowStartedRelationTxId = null,
} = {}) {
  const index = suppliedIndex || loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const queue = suppliedQueue || loadQueueReadOnly(bundleDir);
  const entries = queueEntries(bundleDir, index, queue);
  const start = index.work_units[predecessorWorkId];
  if (!start?.supersession_relation) throw new Error(`submitted predecessor ${predecessorWorkId} has no supersession relation`);
  const visitedWorkIds = new Set();
  const visitedQueueIds = new Set();
  const edges = [];

  const resolveEntry = (entry) => {
    if (visitedQueueIds.has(entry.queue_item_id)) throw new Error(`supersession lineage cycle at queue item ${entry.queue_item_id}`);
    visitedQueueIds.add(entry.queue_item_id);
    const leaf = leafFromEntry(index, entry);
    if (!leaf.record || leaf.queue_location !== 'terminal_history') return leaf;
    const record = leaf.record;
    if (visitedWorkIds.has(record.work_id)) throw new Error(`supersession lineage cycle at work unit ${record.work_id}`);
    visitedWorkIds.add(record.work_id);
    const supersessionChildren = entries.filter((candidate) => (
      candidate.item?.lineage?.supersession_of_work_id === record.work_id
    ));
    const expectedReplacement = buildReplacementDemand(record, entry.item);
    const replacementChildren = entries.filter((candidate) => (
      candidate.item?.lineage?.replacement_of_work_id === record.work_id
      && lineageFieldsMatch(candidate.item, expectedReplacement, WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS)
    ));
    if (record.supersession_relation) {
      if (replacementChildren.length > 0) throw new Error(`submitted successor ${record.work_id} has conflicting replacement lineage`);
      return followRelation(record);
    }
    if (supersessionChildren.length > 0) throw new Error(`queue claims supersession for ${record.work_id} without an index relation`);
    if (replacementChildren.length === 0) return leaf;
    if (!['failed', 'abandoned'].includes(record.status) || replacementChildren.length !== 1) {
      throw new Error(`replacement lineage from ${record.work_id} is branched or status-incompatible`);
    }
    const child = replacementChildren[0];
    if (child.queue_item_id !== expectedReplacement.queue_item_id
      || queueItemSnapshotHash(child.item) !== queueItemSnapshotHash(expectedReplacement)) {
      throw new Error(`replacement lineage mismatch from ${record.work_id}`);
    }
    edges.push({ kind: 'replacement', predecessor_work_id: record.work_id, successor_queue_item_id: child.queue_item_id });
    return resolveEntry(child);
  };

  const followRelation = (record) => {
    const parent = validateSubmittedPredecessorAuthority(bundleDir, index, record, { queue });
    const relation = WorkUnitSupersessionRelationSchema.parse(record.supersession_relation);
    validateSupersessionTransactionRelation(bundleDir, relation, {
      allowStartedTxId: allowStartedRelationTxId,
    });
    if (relation.accepted_ledger_record_hash !== parent.accepted_hash) {
      throw new Error(`supersession accepted hash mismatch for ${record.work_id}`);
    }
    const expected = buildSupersessionSuccessorDemand(parent.terminal.item, relation);
    const directChildren = entries.filter((candidate) => (
      candidate.item?.lineage?.supersession_of_work_id === record.work_id
      && lineageFieldsMatch(candidate.item, expected, REPLACEMENT_LINEAGE_FIELDS)
    ));
    if (directChildren.length !== 1 || directChildren[0].queue_item_id !== relation.successor_queue_item_id) {
      throw new Error(`supersession relation from ${record.work_id} does not own exactly one direct successor`);
    }
    const child = oneQueueEntry(entries, relation.successor_queue_item_id);
    assertRelationLineage(relation, child.item);
    edges.push({ kind: 'supersession', predecessor_work_id: record.work_id, successor_queue_item_id: child.queue_item_id, relation });
    edges.push(...validateSuccessorRetryContinuation(bundleDir, index, child, expected));
    return resolveEntry(child);
  };

  visitedWorkIds.add(start.work_id);
  const leaf = followRelation(start);
  return { predecessor_work_id: start.work_id, edges, leaf };
}

function idempotentRelationResult(bundleDir, index, record, queue) {
  try {
    const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
      predecessorWorkId: record.work_id,
      index,
      queue,
    });
    return {
      ok: true,
      eligible: false,
      superseded: true,
      created: false,
      idempotent: true,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      relation: record.supersession_relation,
      successor: lineage.leaf,
      lineage,
    };
  } catch (error) {
    return relationFailure(bundleDir, record, error.message || String(error));
  }
}

export function evaluateWorkUnitSupersessionEligibility(bundleDir, {
  work_id,
  reason = null,
  currentTxId = null,
  checkDeclarationRecovery = true,
} = {}) {
  let index;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (error) {
    return failure(bundleDir, null, 'work_unit_index_invalid', error.message || String(error));
  }
  const record = index.work_units[work_id];
  if (!record) return failure(bundleDir, null, 'unknown_work_id', `No work-unit record exists for ${work_id}.`);

  try {
    assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  } catch (error) {
    return failure(bundleDir, record, error.reason_code || 'unsupported_current_contract', error.message || String(error));
  }

  const rerun = supersedeCommand(bundleDir, record.work_id, reason || '<audit-reason>');
  const transaction = inspectWorkUnitTransaction(bundleDir, {
    operation: 'supersede_work_unit',
    targetWorkIds: [record.work_id],
    targetQueueItemIds: [record.queue_item_id],
    rerun,
    ignoreHeldTxId: currentTxId,
  });
  if (transaction.disposition !== 'none') {
    return failure(bundleDir, record, transaction.disposition, transaction.missing_fact
      || `global transaction ${transaction.holder?.tx_id || '<unknown>'} blocks supersession`, {
      repairKind: transaction.repair_kind,
      writeTo: transaction.write_to,
      rerun: transaction.rerun,
      transaction,
    });
  }

  let queue;
  try {
    queue = loadQueueReadOnly(bundleDir);
  } catch (error) {
    return failure(bundleDir, record, 'queue_binding_invalid', error.message || String(error));
  }
  if (record.supersession_relation) return idempotentRelationResult(bundleDir, index, record, queue);

  let parent;
  try {
    parent = validateSubmittedPredecessorAuthority(bundleDir, index, record, { queue });
  } catch (error) {
    return failure(bundleDir, record, 'submitted_parent_authority_invalid', error.message || String(error));
  }

  const document = readSubmittedLedgerDocument(bundleDir);
  const documentIssue = globalLedgerIssue(bundleDir, document, index, record.work_id);
  if (documentIssue) return failure(bundleDir, record, 'submitted_ledger_invalid', documentIssue);
  const validRows = document.valid_rows.filter((row) => row.work_id === record.work_id);
  const invalidRows = document.attributable_invalid_rows.filter((row) => row.work_id === record.work_id);
  if (validRows.length + invalidRows.length > 1) {
    return failure(bundleDir, record, 'submitted_ledger_invalid', `multiple target declaration rows exist for ${record.work_id}`);
  }

  const observed = [];
  let currentRow = validRows[0] || null;
  if (!currentRow && invalidRows.length === 0) {
    observed.push({ code: 'submitted_declaration_missing', surface: 'rb_output_declarations.jsonl', detail: `no row exists for ${record.work_id}` });
  } else if (invalidRows.length === 1) {
    observed.push({ code: 'submitted_declaration_drift', surface: `rb_output_declarations.jsonl:${invalidRows[0].line}`, detail: invalidRows[0].reason });
  } else {
    try {
      validateCurrentSubmittedLedgerFact({ record, row: currentRow, status: parent.status });
    } catch (error) {
      if (error.reason_code === 'submitted_acceptance_fingerprint_mismatch') {
        observed.push({ code: 'submitted_declaration_drift', surface: 'rb_output_declarations.jsonl', detail: error.message || String(error) });
      } else {
        return failure(bundleDir, record, error.reason_code || 'submitted_ledger_invalid', error.message || String(error));
      }
    }
  }

  const declarationRoot = observed.find((entry) => entry.code.startsWith('submitted_declaration_'));
  if (declarationRoot) {
    if (checkDeclarationRecovery) {
      const recovery = inspectWorkUnitDeclarationRecovery(bundleDir, { work_id: record.work_id });
      if (recovery.eligible && recovery.declaration_present === false) {
        return failure(bundleDir, record, 'declaration_recovery_required',
          `Exact declaration recovery is the nearest legal action for ${record.work_id}.`, {
            repairKind: WORK_UNIT_REPAIR_KIND.recoverDeclaration,
            writeTo: 'rb_output_declarations.jsonl',
            rerun: recovery.operation,
            observedRoots: observed,
          });
      }
    }
    let acceptance;
    try {
      acceptance = originalAcceptanceEvidence(bundleDir, record, parent.accepted_hash);
    } catch (error) {
      return failure(bundleDir, record, WORK_UNIT_REPAIR_KIND.missingContract, `Durable acceptance evidence is incomplete for ${record.work_id}: ${error.message || String(error)}`, {
        observedRoots: observed,
      });
    }
    observed.push(...collectDirectDriftRoots(bundleDir, index, record, {
      result_hash: acceptance.submitted_event.result_hash,
    }, parent));
  } else {
    observed.push(...collectDirectDriftRoots(bundleDir, index, record, currentRow, parent));
  }

  const rootCode = selectRoot(observed);
  if (!rootCode) {
    return failure(bundleDir, record, WORK_UNIT_REPAIR_KIND.semanticBoundary,
      `Submitted attempt ${record.work_id} remains hash-valid; richer or later content alone does not authorize deterministic correction.`, {
        repairKind: WORK_UNIT_REPAIR_KIND.semanticBoundary,
      });
  }
  return {
    ok: true,
    eligible: true,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    accepted_ledger_record_hash: parent.accepted_hash,
    root_code: rootCode,
    observed_roots: observed,
    successor_queue_item_id: successorQueueItemId(record.work_id),
    record,
    parent,
    index,
    queue,
    transaction,
    rerun,
  };
}

export function supersedeWorkUnitAttempt(bundleDir, {
  work_id,
  reason,
  afterIndexSave = null,
  transactionHooks = null,
} = {}) {
  if (!work_id) throw new Error('--work-id is required');
  if (typeof reason !== 'string' || reason.trim() === '') throw new Error('--reason is required');
  const auditReason = reason.trim();
  const preview = evaluateWorkUnitSupersessionEligibility(bundleDir, {
    work_id,
    reason: auditReason,
  });
  if (!preview.eligible) return preview;

  const result = withWorkUnitTransaction(bundleDir, 'supersede_work_unit', {
    targetWorkIds: [preview.work_id],
    targetQueueItemIds: [preview.queue_item_id, preview.successor_queue_item_id],
    mutationTargets: [WORK_UNIT_INDEX_TARGET, QUEUE_TARGET],
    rerun: preview.rerun,
    hooks: transactionHooks,
  }, ({ tx_id }) => {
    const current = evaluateWorkUnitSupersessionEligibility(bundleDir, {
      work_id,
      reason: auditReason,
      currentTxId: tx_id,
    });
    if (!current.eligible) return current;
    const relation = WorkUnitSupersessionRelationSchema.parse({
      schema_version: WORK_UNIT_SUPERSESSION_SCHEMA_VERSION,
      predecessor_work_id: current.work_id,
      predecessor_queue_item_id: current.queue_item_id,
      accepted_ledger_record_hash: current.accepted_ledger_record_hash,
      root_code: current.root_code,
      reason: auditReason,
      recorded_at: now(),
      tx_id,
      successor_queue_item_id: current.successor_queue_item_id,
    });
    const successor = buildSupersessionSuccessorDemand(current.parent.terminal.item, relation);
    const collision = queueEntries(bundleDir, current.index, current.queue)
      .some((entry) => entry.queue_item_id === successor.queue_item_id);
    if (collision || Object.values(current.index.work_units).some((entry) => entry.queue_item_id === successor.queue_item_id)) {
      throw new Error(`fresh supersession successor identity already exists: ${successor.queue_item_id}`);
    }

    const index = current.index;
    index.work_units[current.work_id].supersession_relation = relation;
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    if (typeof afterIndexSave === 'function') {
      afterIndexSave({ bundleDir, relation: clone(relation), savedIndex: clone(savedIndex) });
    }
    const savedQueue = saveQueue(bundleDir, enqueue(loadQueue(bundleDir), successor));
    const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
      predecessorWorkId: current.work_id,
      index: savedIndex,
      queue: savedQueue,
      allowStartedRelationTxId: tx_id,
    });
    traceWorkUnitEvent(bundleDir, 'work_unit_superseded', {
      tx_id,
      work_id: current.work_id,
      queue_item_id: current.queue_item_id,
      accepted_ledger_record_hash: current.accepted_ledger_record_hash,
      root_code: current.root_code,
      successor_queue_item_id: successor.queue_item_id,
    });
    logToRun(bundleDir, 'info', 'work_unit_superseded', {
      kind: 'work_unit_supersession',
      tx_id,
      work_id: current.work_id,
      queue_item_id: current.queue_item_id,
      root_code: current.root_code,
      successor_queue_item_id: successor.queue_item_id,
    });
    return {
      ok: true,
      eligible: false,
      superseded: true,
      created: true,
      idempotent: false,
      work_id: current.work_id,
      queue_item_id: current.queue_item_id,
      tx_id: relation.tx_id,
      successor_queue_item_id: relation.successor_queue_item_id,
      relation,
      successor: lineage.leaf,
      lineage,
      observed_roots: current.observed_roots,
    };
  });
  return result;
}

export function evaluateNormalizedSubmittedWorkUnitLedger(bundleDir) {
  const transaction = inspectWorkUnitTransaction(bundleDir, {
    operation: 'submit_work_unit',
    targetWorkIds: [],
    targetQueueItemIds: [],
    rerun: `rerun the same Gate or inspect checkpoint for ${JSON.stringify(path.resolve(bundleDir))}`,
  });
  if (transaction.disposition !== 'none') {
    const error = new Error(transaction.missing_fact
      || `work-unit transaction ${transaction.disposition}: ${transaction.holder?.tx_id || '<unknown>'}`);
    error.reason_code = transaction.disposition;
    error.transaction = transaction;
    throw error;
  }

  const document = readSubmittedLedgerDocument(bundleDir);
  if (document.unattributable_errors.length > 0) {
    throw new Error(`unattributable submitted-ledger corruption: ${document.unattributable_errors.map((entry) => `line ${entry.line} ${entry.reason}`).join('; ')}`);
  }
  if (document.duplicate_work_ids.length > 0) {
    throw new Error(`duplicate submitted-ledger work IDs: ${document.duplicate_work_ids.join(', ')}`);
  }
  const hasWorkUnitRows = document.valid_rows.length > 0 || document.attributable_invalid_rows.length > 0;
  const indexPresent = existsSync(path.join(bundleDir, '_work_units', '_index.json'));
  if (!hasWorkUnitRows && !indexPresent) {
    return {
      facts: [],
      historical: [],
      legacy_non_work_unit_rows: document.legacy_non_work_unit_rows,
      kind_registry: null,
      transaction,
    };
  }

  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const queue = loadQueueReadOnly(bundleDir);
  const facts = [];
  const historical = [];
  const consumed = new Set();

  for (const record of Object.values(index.work_units)) {
    if (record.status !== 'submitted') continue;
    const validRows = document.valid_rows.filter((row) => row.work_id === record.work_id);
    const invalidRows = document.attributable_invalid_rows.filter((row) => row.work_id === record.work_id);
    if (validRows.length + invalidRows.length > 1) {
      throw new Error(`submitted ledger cardinality invalid for ${record.work_id}`);
    }
    const parent = validateSubmittedPredecessorAuthority(bundleDir, index, record, { queue });
    const row = validRows[0] || null;
    if (!record.supersession_relation) {
      if (invalidRows.length > 0) throw new Error(`current submitted row is attributable but invalid for ${record.work_id}: ${invalidRows[0].reason}`);
      if (!row) throw new Error(`submitted ledger row is missing for ${record.work_id}`);
      const current = validateCurrentSubmittedLedgerFact({ record, row, status: parent.status });
      facts.push({ ledger_row: current.row, index_record: record });
      consumed.add(record.work_id);
      continue;
    }

    let rowDisposition = 'missing';
    if (invalidRows.length > 0) rowDisposition = 'attributable_drift';
    if (row) {
      try {
        validateCurrentSubmittedLedgerFact({ record, row, status: parent.status });
        rowDisposition = 'hash_valid_historical';
      } catch {
        rowDisposition = 'attributable_drift';
      }
    }
    if (rowDisposition !== 'hash_valid_historical') {
      originalAcceptanceEvidence(bundleDir, record, parent.accepted_hash);
    }
    const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
      predecessorWorkId: record.work_id,
      index,
      queue,
    });
    historical.push({
      work_id: record.work_id,
      index_record: record,
      relation: record.supersession_relation,
      ledger_row: row,
      ledger_disposition: rowDisposition,
      lineage,
    });
    consumed.add(record.work_id);
  }

  for (const row of document.valid_rows) {
    if (!consumed.has(row.work_id)) {
      const owner = index.work_units[row.work_id];
      throw new Error(owner
        ? `submitted ledger row belongs to non-submitted work unit ${row.work_id}: ${owner.status}`
        : `submitted ledger row has no index owner: ${row.work_id}`);
    }
  }
  for (const row of document.attributable_invalid_rows) {
    if (!consumed.has(row.work_id)) {
      throw new Error(`attributable invalid ledger row has no validated historical owner: ${row.work_id}@${row.line}`);
    }
  }

  const currentByQueue = new Map();
  for (const fact of facts) {
    const queueItemId = fact.ledger_row.queue_item_id;
    const owners = currentByQueue.get(queueItemId) || [];
    owners.push(fact.ledger_row.work_id);
    currentByQueue.set(queueItemId, owners);
  }
  for (const [queueItemId, workIds] of currentByQueue.entries()) {
    if (workIds.length > 1) {
      throw new Error(`multiple current submitted rows for queue item ${queueItemId}: ${workIds.join(', ')}`);
    }
  }

  // `facts` are consumed by provenance readers that may need submit order
  // rather than work-unit claim/index insertion order.
  const factsByWorkId = new Map(facts.map((fact) => [fact.ledger_row.work_id, fact]));
  const ledgerOrderedFacts = document.valid_rows.flatMap((row) => {
    const fact = factsByWorkId.get(row.work_id);
    return fact ? [fact] : [];
  });
  if (ledgerOrderedFacts.length !== facts.length) {
    throw new Error('submitted ledger ordering could not account for every current submitted work-unit fact');
  }

  return {
    facts: ledgerOrderedFacts,
    historical,
    legacy_non_work_unit_rows: document.legacy_non_work_unit_rows,
    kind_registry: index.kind_registry,
    transaction,
  };
}
