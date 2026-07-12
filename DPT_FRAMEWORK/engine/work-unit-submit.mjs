// @impl DEW-005, DEW-013, FRE-005, EXO-001
// Work-unit submit and dry-submit preflight: validation planning, durability, ledger row building, rejection, prepare and submit.

import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  WORK_UNIT_OUTPUT_LEDGER,
} from './work-unit-constants.mjs';
import {
  queuePath,
  queueItemSnapshotHash,
  queueStateFromFile,
} from './queue-manager-core.mjs';
import {
  now,
  clone,
  writeJson,
  hashValue,
  ledgerPath,
  appendLedgerRow,
  traceWorkUnitEvent,
  recordSubmitNormalization,
  isPathInsideDir,
  findSubmittedLedgerRow,
  computeWorkUnitLedgerRecordHash,
  readWorkUnitLedgerRows,
} from './work-unit-utils.mjs';
import {
  loadWorkUnitIndex,
  saveWorkUnitIndex,
  requireWorkUnitRecord,
  withWorkUnitTransaction,
  workUnitIndexPath,
} from './work-unit-index.mjs';
import {
  readAndValidateManifest,
  readAndValidateBeacon,
  readAndValidateResult,
  validateSubmitRuntimeReceipt,
  validateOutputFiles,
  validateCacheTrails,
  validateSourceClaims,
  validateQueueBindingForSubmit,
} from './work-unit-validation.mjs';

import { WorkUnitLedgerRecordSchema, WorkUnitStatusFileSchema } from '../schema/contracts/work-unit.mjs';
import { loadQueue, saveQueue } from './queue-manager-lifecycle.mjs';
import { refill } from './queue-manager-window.mjs';
import { logToRun } from './logger.mjs';

function captureFileSnapshot(filePath) {
  return existsSync(filePath)
    ? { exists: true, content: readFileSync(filePath) }
    : { exists: false, content: null };
}

function restoreFileSnapshot(filePath, snapshot) {
  if (snapshot.exists) {
    writeFileSync(filePath, snapshot.content);
  } else {
    rmSync(filePath, { force: true });
  }
}

function captureSubmitSnapshot(bundleDir, record) {
  const files = [
    workUnitIndexPath(bundleDir),
    path.join(bundleDir, 'rb_queue.json'),
    ledgerPath(bundleDir),
    path.join(bundleDir, record.paths.result_ref),
    path.join(bundleDir, record.paths.runtime_receipt_ref),
    path.join(bundleDir, record.paths.status_ref),
  ];
  return files.map((filePath) => ({ filePath, snapshot: captureFileSnapshot(filePath) }));
}

function restoreSubmitSnapshot(snapshot) {
  const failures = [];
  for (const entry of snapshot.slice().reverse()) {
    try {
      restoreFileSnapshot(entry.filePath, entry.snapshot);
    } catch (err) {
      failures.push({ path: entry.filePath, reason: err.message || String(err) });
    }
  }
  return { ok: failures.length === 0, failures };
}

function verifySubmitDurablePostcondition(bundleDir, record) {
  const missing = [];
  let queue = null;
  let index = null;

  try {
    queue = loadQueue(bundleDir);
  } catch (err) {
    missing.push(`rb_queue.json reload failed: ${err.message || String(err)}`);
  }

  if (queue) {
    if (queue.delegated_in_flight?.[record.queue_item_id]) {
      missing.push(`rb_queue.json delegated_in_flight still contains ${record.queue_item_id}`);
    }
    const hasTerminal = (queue.terminal_history || []).some((entry) => (
      entry.queue_item_id === record.queue_item_id &&
      entry.work_id === record.work_id &&
      entry.terminal_status === 'done'
    ));
    if (!hasTerminal) {
      missing.push(`rb_queue.json terminal_history lacks done record for ${record.queue_item_id}/${record.work_id}`);
    }
  }

  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    if (index.work_units?.[record.work_id]?.status !== 'submitted') {
      missing.push(`_work_units/_index.json does not mark ${record.work_id} submitted`);
    }
  } catch (err) {
    missing.push(`_work_units/_index.json reload failed: ${err.message || String(err)}`);
  }

  try {
    const ledgerRow = findSubmittedLedgerRow(bundleDir, record.work_id);
    if (!ledgerRow || ledgerRow.queue_item_id !== record.queue_item_id) {
      missing.push(`rb_output_declarations.jsonl lacks submitted ledger row for ${record.work_id}`);
    }
  } catch (err) {
    missing.push(`rb_output_declarations.jsonl reload failed: ${err.message || String(err)}`);
  }

  return { ok: missing.length === 0, missing, queue, index };
}

function buildSubmitDurabilityFailure(prepared, error, rollback) {
  const missing = error.missing_postconditions || [error.message || String(error)];
  const rollbackFailures = rollback?.failures || [];
  return {
    ok: false,
    work_id: prepared.record.work_id,
    queue_item_id: prepared.record.queue_item_id,
    status: rollback?.ok ? 'claimed' : 'suspect',
    reason_code: 'queue_postcondition_failed',
    reason: `Submit durable queue postcondition failed: ${missing.join('; ')}`,
    missing_postconditions: missing,
    rollback: {
      attempted: true,
      restored: Boolean(rollback?.ok),
      failures: rollbackFailures,
    },
    suspect_state: !rollback?.ok,
    inspect: [
      ...missing.map((item) => `Missing submit postcondition: ${item}`),
      ...(rollback?.ok
        ? ['Submit writes were rolled back to the prior durable state.']
        : ['Submit rollback could not be proven; work-unit/queue completion state is suspect.']),
    ],
    advice: 'Repair through Engine queue/work-unit tooling; do not hand-edit rb_queue.json or work-unit ledgers.',
  };
}

function readQueueSideEffectFree(bundleDir) {
  const filePath = queuePath(bundleDir);
  if (!existsSync(filePath)) throw new Error('rb_queue.json missing');
  return queueStateFromFile(JSON.parse(readFileSync(filePath, 'utf-8')), { queueId: path.basename(bundleDir) });
}

function submittedReplacementConflicts(index, ledgerRows, record) {
  const submittedIndexRecords = Object.values(index.work_units || {})
    .filter((candidate) => (
      candidate.queue_item_id === record.queue_item_id &&
      candidate.work_id !== record.work_id &&
      candidate.status === 'submitted'
    ));
  const submittedLedgerRows = ledgerRows
    .filter((row) => row.queue_item_id === record.queue_item_id && row.work_id !== record.work_id);
  return { submittedIndexRecords, submittedLedgerRows };
}

function targetLedgerRows(ledgerRows, record) {
  return ledgerRows.filter((row) => row.work_id === record.work_id);
}

function planLateSubmitRetryCleanup(queue, index, record) {
  const qid = record.queue_item_id;
  const queuedLocations = [];

  for (const [location, items] of [
    ['active_window', queue.active_window || []],
    ['refill_pool', queue.refill_pool || []],
  ]) {
    items.forEach((item, indexInLocation) => {
      if (item.queue_item_id === qid) queuedLocations.push({ location, index: indexInLocation, item });
    });
  }

  const terminalRows = (queue.terminal_history || []).filter((entry) => entry.queue_item_id === qid);
  if (terminalRows.length > 0) {
    throw new Error(`queue_item_id ${qid} already has terminal_history; late-submit cannot add a second terminal location`);
  }
  if (queuedLocations.length > 1) {
    throw new Error(`queue_item_id ${qid} has ambiguous queued retry locations`);
  }

  for (const queued of queuedLocations) {
    const retryOf = queued.item?.lineage?.retry_of_work_id || null;
    if (queued.item?.status !== 'queued' || retryOf !== record.work_id) {
      throw new Error(`queue_item_id ${qid} queued state is not a retry of ${record.work_id}`);
    }
  }

  const inFlight = queue.delegated_in_flight?.[qid] || null;
  if (!inFlight) {
    return {
      queue_item_id: qid,
      queuedLocations,
      supersededRetryWorkIds: [],
    };
  }
  if (inFlight.work_id === record.work_id) {
    throw new Error(`targeted timed_out work unit ${record.work_id} is still delegated in flight`);
  }

  const retryRecord = index.work_units?.[inFlight.work_id];
  if (!retryRecord) {
    throw new Error(`claimed retry ${inFlight.work_id} is missing from work-unit index`);
  }
  if (retryRecord.queue_item_id !== qid) {
    throw new Error(`claimed retry ${inFlight.work_id} queue_item_id mismatch for ${qid}`);
  }
  if (retryRecord.status === 'submitted') {
    throw new Error(`submitted replacement ${retryRecord.work_id} blocks late-submit for ${record.work_id}`);
  }
  if (retryRecord.status !== 'claimed') {
    throw new Error(`claimed retry ${retryRecord.work_id} status is ${retryRecord.status}; retry state is ambiguous`);
  }
  if ((retryRecord.attempt_index || 1) <= (record.attempt_index || 1)) {
    throw new Error(`claimed retry ${retryRecord.work_id} is not a later attempt for ${record.work_id}`);
  }

  return {
    queue_item_id: qid,
    queuedLocations,
    supersededRetryWorkIds: [retryRecord.work_id],
  };
}

function applyLateSubmitQueueCleanup(queue, record, cleanupPlan) {
  let q = clone(queue);
  q.active_window = (q.active_window || []).filter((item) => item.queue_item_id !== record.queue_item_id);
  q.refill_pool = (q.refill_pool || []).filter((item) => item.queue_item_id !== record.queue_item_id);
  delete q.delegated_in_flight[record.queue_item_id];
  return q;
}

function verifyLateSubmitDurablePostcondition(bundleDir, record, { supersededRetryWorkIds = [] } = {}) {
  const missing = [];
  let queue = null;
  let index = null;
  let ledgerRows = [];

  try {
    queue = loadQueue(bundleDir);
  } catch (err) {
    missing.push(`rb_queue.json reload failed: ${err.message || String(err)}`);
  }

  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (err) {
    missing.push(`_work_units/_index.json reload failed: ${err.message || String(err)}`);
  }

  try {
    ledgerRows = readWorkUnitLedgerRows(bundleDir);
  } catch (err) {
    missing.push(`rb_output_declarations.jsonl reload failed: ${err.message || String(err)}`);
  }

  if (index) {
    const target = index.work_units?.[record.work_id];
    if (!target || target.status !== 'submitted') {
      missing.push(`_work_units/_index.json does not mark ${record.work_id} submitted`);
    }
    const submittedReplacements = Object.values(index.work_units || {})
      .filter((candidate) => candidate.queue_item_id === record.queue_item_id && candidate.work_id !== record.work_id && candidate.status === 'submitted');
    if (submittedReplacements.length > 0) {
      missing.push(`submitted replacement exists for ${record.queue_item_id}: ${submittedReplacements.map((item) => item.work_id).join(', ')}`);
    }
    for (const retryWorkId of supersededRetryWorkIds) {
      const retry = index.work_units?.[retryWorkId];
      if (!retry || retry.status !== 'abandoned') {
        missing.push(`superseded retry ${retryWorkId} is not abandoned`);
      }
    }
  }

  if (queue) {
    if (queue.delegated_in_flight?.[record.queue_item_id]) {
      missing.push(`rb_queue.json delegated_in_flight still contains ${record.queue_item_id}`);
    }
    const queuedRetry = [
      ...(queue.active_window || []),
      ...(queue.refill_pool || []),
    ].find((item) => item.queue_item_id === record.queue_item_id);
    if (queuedRetry) {
      missing.push(`rb_queue.json still has queued retry demand for ${record.queue_item_id}`);
    }
    const sameQueueTerminalRows = (queue.terminal_history || []).filter((entry) => entry.queue_item_id === record.queue_item_id);
    const targetDoneRows = sameQueueTerminalRows.filter((entry) => (
      entry.work_id === record.work_id &&
      entry.terminal_status === 'done'
    ));
    if (sameQueueTerminalRows.length !== 1 || targetDoneRows.length !== 1) {
      missing.push(`rb_queue.json terminal_history does not contain exactly one targeted done row for ${record.queue_item_id}/${record.work_id}`);
    }
  }

  if (ledgerRows.length > 0) {
    const targetRows = targetLedgerRows(ledgerRows, record);
    if (targetRows.length !== 1 || targetRows[0].queue_item_id !== record.queue_item_id) {
      missing.push(`rb_output_declarations.jsonl does not contain exactly one submitted row for ${record.work_id}`);
    }
    const replacementRows = ledgerRows.filter((row) => row.queue_item_id === record.queue_item_id && row.work_id !== record.work_id);
    if (replacementRows.length > 0) {
      missing.push(`submitted replacement ledger row exists for ${record.queue_item_id}: ${replacementRows.map((row) => row.work_id).join(', ')}`);
    }
    for (const retryWorkId of supersededRetryWorkIds) {
      if (ledgerRows.some((row) => row.work_id === retryWorkId)) {
        missing.push(`superseded retry ${retryWorkId} has submitted ledger coverage`);
      }
    }
  }

  return { ok: missing.length === 0, missing, queue, index, ledgerRows };
}

function captureLateSubmitSnapshot(bundleDir, records, extraRelativeRefs = []) {
  const files = [
    workUnitIndexPath(bundleDir),
    path.join(bundleDir, 'rb_queue.json'),
    ledgerPath(bundleDir),
    ...extraRelativeRefs.map((ref) => path.join(bundleDir, ref)),
  ];
  for (const record of records) {
    files.push(
      path.join(bundleDir, record.paths.result_ref),
      path.join(bundleDir, record.paths.runtime_receipt_ref),
      path.join(bundleDir, record.paths.status_ref),
    );
  }
  return files.map((filePath) => ({ filePath, snapshot: captureFileSnapshot(filePath) }));
}

function lateSubmitRejection(bundleDir, { work_id, resultPath, record = null, reason, reasonCode = 'invalid_late_submit' }) {
  const payload = {
    ok: false,
    late_accept: false,
    work_id: record?.work_id || work_id,
    queue_item_id: record?.queue_item_id || null,
    status: record?.status || 'unknown',
    reason,
    reason_code: reasonCode,
    candidate_result_path: resultPath ? path.resolve(resultPath) : null,
    inspect: [reason],
    advice: record?.status === 'claimed'
      ? 'Use normal operate-work-unit submit for claimed attempts; late-submit is only for audited timed_out recovery.'
      : 'Use late-submit only for an eligible timed_out work unit with no submitted replacement; otherwise retry through normal Engine work-unit paths.',
  };
  if (record) {
    traceWorkUnitEvent(bundleDir, 'work_unit_late_submit_rejected', {
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      reason_code: reasonCode,
    });
    logToRun(bundleDir, 'warn', 'work_unit_late_submit_rejected', {
      kind: 'work_unit_late_submit',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      reason_code: reasonCode,
      reason,
      runtime_refs: record.runtime_refs || {},
    });
  }
  return payload;
}

function buildLateSubmitDurabilityFailure(prepared, error, rollback) {
  const missing = error.missing_postconditions || [error.message || String(error)];
  return {
    ok: false,
    late_accept: false,
    work_id: prepared.record.work_id,
    queue_item_id: prepared.record.queue_item_id,
    status: rollback?.ok ? 'timed_out' : 'suspect',
    reason_code: 'late_submit_postcondition_failed',
    reason: `Late-submit durable postcondition failed: ${missing.join('; ')}`,
    missing_postconditions: missing,
    rollback: {
      attempted: true,
      restored: Boolean(rollback?.ok),
      failures: rollback?.failures || [],
    },
    suspect_state: !rollback?.ok,
    inspect: [
      ...missing.map((item) => `Missing late-submit postcondition: ${item}`),
      ...(rollback?.ok
        ? ['Late-submit writes were rolled back to the prior durable state.']
        : ['Late-submit rollback could not be proven; work-unit/queue completion state is suspect.']),
    ],
    advice: 'Repair through Engine queue/work-unit tooling; do not hand-edit rb_queue.json or work-unit ledgers.',
  };
}

function buildLedgerRow({ record, result, resultHash, declaredAt, auditFields = {} }) {
  const actorExecution = record.actor_execution || {
    execution_actor_class: 'legacy_unrecorded',
    delegated_role_key: null,
    observation: {
      outcome: 'unknown',
      source: 'legacy_claim',
      reason_code: 'legacy_actor_unrecorded',
      recorded_at: null,
    },
    policy_decision: 'legacy_compatibility',
    fallback_from: null,
  };
  const base = {
    declared_at: declaredAt,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    wave: record.wave,
    kind: record.kind,
    producer_rule: record.producer_rule,
    creation_reason: record.creation_reason,
    work_unit_ref: record.paths.work_unit_dir,
    result_ref: record.paths.result_ref,
    runtime_receipt_ref: record.paths.runtime_receipt_ref,
    receipt_nonce: record.receipt_nonce,
    output_files: result.output_files || [],
    source_claims: result.source_claims || [],
    accepted_source_urls: result.accepted_source_urls || [],
    cache_trails: result.cache_trails || [],
    result_hash: resultHash,
    actor_contract_version: 'work-unit.actor.v1',
    actor_execution: actorExecution,
    ...auditFields,
  };
  return WorkUnitLedgerRecordSchema.parse({
    ...base,
    ledger_record_hash: computeWorkUnitLedgerRecordHash(base),
  });
}

function canonicalWave1RequiredOutputRole(outputPath) {
  if (/^artifacts\/wave1\/[^/]+\/evidence-summary\.md$/.test(outputPath || '')) return 'evidence_summary';
  if (/^artifacts\/wave1\/[^/]+\/question-list\.md$/.test(outputPath || '')) return 'question_list';
  return null;
}

function normalizeWave1RequiredOutputRoles(result, record, normalizations, resultPath) {
  if (record.kind !== 'wave1_topic_deepening' && record.wave !== 1) return result;
  const outputFiles = Array.isArray(result.output_files) ? result.output_files : [];
  let changed = false;
  const normalizedOutputFiles = outputFiles.map((entry) => {
    const canonicalRole = canonicalWave1RequiredOutputRole(entry?.path);
    if (!canonicalRole || entry.role !== 'other') return entry;
    changed = true;
    recordSubmitNormalization(normalizations, {
      kind: 'wave1_required_output_role_normalized',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      surface_ref: entry.path,
      candidate_result_path: resultPath ? path.resolve(resultPath) : null,
      field: 'output_files[].role',
      from: entry.role,
      to: canonicalRole,
      reason: 'Wave1 required output paths are gate-consumed by canonical role selectors before submitted-ledger coverage.',
    });
    return { ...entry, role: canonicalRole };
  });
  return changed ? { ...result, output_files: normalizedOutputFiles } : result;
}

export function reasonCodeForSubmit(message) {
  if (/runtime receipt|lifecycle events/i.test(message)) return 'missing_receipt';
  if (/receipt_nonce|nonce|receipt mismatch/i.test(message)) return 'nonce_mismatch';
  if (/result\/index mismatch.*work_id|Unknown work_id|work_id/i.test(message)) return 'wrong_work_id';
  if (/output_files|declared output file/i.test(message)) return 'missing_output';
  if (/cache_trails|cache trail|degraded_capture_ref|cache\/degraded ref/i.test(message)) return 'missing_cache';
  if (/snapshot hash|stale/i.test(message)) return 'stale_snapshot';
  if (/duplicate submit/i.test(message)) return 'duplicate_content_mismatch';
  return 'invalid_result';
}

function submitRejectionPayload(record, reason, resultPath) {
  return {
    rejected_at: now(),
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    status: record.status,
    reason,
    reason_code: reasonCodeForSubmit(reason),
    result_path: resultPath ? path.resolve(resultPath) : null,
  };
}

function recordSubmitRejection(bundleDir, { work_id, resultPath, reason }) {
  let index;
  let record;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    record = requireWorkUnitRecord(index, work_id);
  } catch {
    return {
      ok: false,
      work_id,
      status: 'unknown',
      reason,
      reason_code: reasonCodeForSubmit(reason),
      inspect: [reason],
      advice: 'Use a known claimed work_id from operate-work-unit claim.',
    };
  }

  if (['failed', 'timed_out', 'abandoned'].includes(record.status)) {
    const rejected = submitRejectionPayload(record, `late submit rejected for terminal status ${record.status}: ${reason}`, resultPath);
    traceWorkUnitEvent(bundleDir, 'work_unit_late_submit_rejected', {
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      reason_code: rejected.reason_code,
    });
    logToRun(bundleDir, 'warn', 'work_unit_late_submit_rejected', {
      kind: 'work_unit_submit',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      runtime_refs: record.runtime_refs || {},
    });
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      last_submit_rejection: rejected,
      inspect: [rejected.reason],
      advice: 'Terminal work-unit attempts cannot be submitted; allocate a replacement work unit when retry is allowed.',
    };
  }

  if (record.status !== 'claimed') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      reason,
      reason_code: reasonCodeForSubmit(reason),
      inspect: [reason],
      advice: 'Submit is only accepted for claimed attempts, except same-content duplicate submitted attempts.',
    };
  }

  return withWorkUnitTransaction(bundleDir, 'reject_work_unit_submit', ({ tx_id }) => {
    const rejection = submitRejectionPayload(record, reason, resultPath);
    record.last_submit_rejection = rejection;
    index.work_units[record.work_id] = record;
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
      work_id: record.work_id,
      status: 'claimed',
      last_submit_rejection: rejection,
      updated_at: rejection.rejected_at,
    }));
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    traceWorkUnitEvent(bundleDir, 'work_unit_submit_rejected', {
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      kind: record.kind,
      receipt_nonce: record.receipt_nonce,
      reason_code: rejection.reason_code,
    });
    logToRun(bundleDir, 'warn', 'work_unit_submit_rejected', {
      kind: 'work_unit_submit',
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      reason_code: rejection.reason_code,
      reason,
    });
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: 'claimed',
      last_submit_rejection: rejection,
      inspect: [reason],
      advice: 'Correct the result/receipt/output/cache issue and submit the same claimed work_id again, or close the attempt explicitly.',
      index: savedIndex,
    };
  });
}

function violationForError(error, { phase = 'submit_validation' } = {}) {
  const message = error?.message || String(error);
  return {
    code: reasonCodeForSubmit(message),
    message,
    phase,
    repair_target: repairTargetForReason(message),
  };
}

function repairTargetForReason(message) {
  if (/runtime receipt|lifecycle events|receipt/i.test(message)) return 'runtime_receipt';
  if (/output_files|declared output file|role/i.test(message)) return 'output_files';
  if (/cache_trails|cache trail|degraded_capture_ref|cache\/degraded ref/i.test(message)) return 'cache_trails';
  if (/source_claims|accepted_source_urls|source claim/i.test(message)) return 'source_claims';
  if (/queue|snapshot hash|stale/i.test(message)) return 'queue_binding';
  if (/manifest|beacon/i.test(message)) return 'work_unit_envelope';
  if (/work_id|queue_item_id|kind|receipt_nonce|result/i.test(message)) return 'result';
  return 'candidate';
}

function validateSubmitPlan(bundleDir, {
  work_id,
  resultPath,
  dryRun = false,
  acceptedStatus = 'claimed',
  requireQueueInFlight = true,
  ledgerAuditFields = {},
} = {}) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  const normalizations = [];

  if (record.status === 'submitted' && acceptedStatus === 'claimed') {
    const parsedResult = readAndValidateResult(bundleDir, resultPath, record, { normalizations });
    const result = normalizeWave1RequiredOutputRoles(parsedResult, record, normalizations, resultPath);
    const resultHash = hashValue(result);
    const ledgerRow = findSubmittedLedgerRow(bundleDir, record.work_id);
    if (record.result_hash === resultHash && ledgerRow?.ledger_record_hash === record.ledger_record_hash) {
      return { duplicate: true, index, record, result, result_hash: resultHash, ledger_record_hash: record.ledger_record_hash, ledger_row: ledgerRow, normalizations };
    }
    throw new Error(`different-content duplicate submit rejected for ${record.work_id}`);
  }
  if (record.status !== acceptedStatus) {
    const verb = acceptedStatus === 'timed_out' ? 'late-submit requires timed_out' : 'submit requires claimed';
    throw new Error(`work_id ${record.work_id} is ${record.status}; ${verb}`);
  }

  const resultPathInsideAssignedDir = resultPath
    ? isPathInsideDir(resultPath, path.join(bundleDir, record.paths.work_unit_dir))
    : false;
  const manifest = readAndValidateManifest(bundleDir, index, record);
  const result = readAndValidateResult(bundleDir, resultPath, record, {
    normalizations,
    outputContract: manifest.output_contract,
  });
  const normalizedResult = normalizeWave1RequiredOutputRoles(result, record, normalizations, resultPath);
  const resultHash = hashValue(normalizedResult);
  readAndValidateBeacon(bundleDir, record, manifest);
  const runtimeReceipt = validateSubmitRuntimeReceipt(bundleDir, record, {
    normalizations,
    allowNonceNormalization: resultPathInsideAssignedDir,
  });
  const queue = requireQueueInFlight
    ? validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects: !dryRun })
    : readQueueSideEffectFree(bundleDir);
  if (!requireQueueInFlight && queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) {
    throw new Error(`manifest queue item snapshot hash is stale for ${record.work_id}`);
  }
  validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
  const cacheValidation = validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, {
    record,
    normalizations,
    writeCanonicalCache: !dryRun,
  });
  validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract, {
    virtualCachePages: cacheValidation.virtualCachePages,
  });
  const ledgerRow = buildLedgerRow({
    record,
    result: normalizedResult,
    resultHash,
    declaredAt: now(),
    auditFields: ledgerAuditFields,
  });
  return {
    duplicate: false,
    index,
    record,
    manifest,
    queue,
    result: normalizedResult,
    result_hash: resultHash,
    runtime_receipt_content: runtimeReceipt.canonical_content,
    normalizations,
    virtual_cache_pages: cacheValidation.virtualCachePages,
    ledger_row: ledgerRow,
    ledger_record_hash: ledgerRow.ledger_record_hash,
  };
}

function prepareWorkUnitSubmit(bundleDir, { work_id, resultPath }) {
  return validateSubmitPlan(bundleDir, { work_id, resultPath, dryRun: false });
}

function reasonCodeForLateSubmit(message) {
  if (/reason/i.test(message)) return 'late_accept_reason_required';
  if (/submitted replacement|replacement ledger|second terminal|terminal_history/i.test(message)) return 'submitted_replacement_conflict';
  if (/failed|abandoned/i.test(message)) return 'terminal_status_not_recoverable';
  if (/claimed/i.test(message)) return 'claimed_requires_normal_submit';
  if (/submitted/i.test(message)) return 'normal_submitted_rejects_late_submit';
  if (/retry|queued|in flight|ambiguous/i.test(message)) return 'ambiguous_retry_state';
  return reasonCodeForSubmit(message);
}

function cleanupPlanSignature(plan) {
  return JSON.stringify({
    queued: (plan.queuedLocations || []).map((entry) => ({
      location: entry.location,
      queue_item_id: entry.item?.queue_item_id || null,
      retry_of_work_id: entry.item?.lineage?.retry_of_work_id || null,
    })),
    supersededRetryWorkIds: plan.supersededRetryWorkIds || [],
  });
}

function loadLateSubmitTarget(bundleDir, work_id) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  return { index, record };
}

function prepareLateSubmitIdempotent(bundleDir, { index, record, ledgerRows, resultPath }) {
  const existingRows = targetLedgerRows(ledgerRows, record);
  if (existingRows.length !== 1) {
    throw new Error(`submitted work_id ${record.work_id} does not have exactly one submitted ledger row`);
  }
  const existingRow = existingRows[0];
  if (existingRow.late_accept !== true) {
    throw new Error(`work_id ${record.work_id} is already normally submitted; explicit late-submit rejects normal submitted work`);
  }

  const normalizations = [];
  const manifest = readAndValidateManifest(bundleDir, index, record);
  const parsedResult = readAndValidateResult(bundleDir, resultPath, record, {
    normalizations,
    outputContract: manifest.output_contract,
  });
  const result = normalizeWave1RequiredOutputRoles(parsedResult, record, normalizations, resultPath);
  const resultHash = hashValue(result);
  if (resultHash !== existingRow.result_hash || resultHash !== record.result_hash) {
    throw new Error(`audited late-submit replay result hash mismatch for ${record.work_id}`);
  }
  if (existingRow.ledger_record_hash !== record.ledger_record_hash) {
    throw new Error(`audited late-submit replay ledger/index mismatch for ${record.work_id}`);
  }

  const postcondition = verifyLateSubmitDurablePostcondition(bundleDir, record, {
    supersededRetryWorkIds: existingRow.superseded_retry_work_ids || [],
  });
  if (!postcondition.ok) {
    throw new Error(`audited late-submit replay postconditions are broken: ${postcondition.missing.join('; ')}`);
  }

  return {
    ok: true,
    duplicate: true,
    idempotent: true,
    late_accept: true,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    status: 'submitted',
    result_hash: resultHash,
    ledger_record_hash: existingRow.ledger_record_hash,
    ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
    superseded_retry_work_ids: existingRow.superseded_retry_work_ids || [],
    normalizations,
    queue: postcondition.queue,
    index: postcondition.index,
  };
}

function prepareLateSubmitWorkUnit(bundleDir, { work_id, resultPath, reason } = {}) {
  const reasonText = String(reason || '').trim();
  let index = null;
  let record = null;

  try {
    ({ index, record } = loadLateSubmitTarget(bundleDir, work_id));
  } catch (error) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        reason: error.message || String(error),
        reasonCode: reasonCodeForLateSubmit(error.message || String(error)),
      }),
    };
  }

  if (!reasonText) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: '--reason is required for audited late-submit',
        reasonCode: 'late_accept_reason_required',
      }),
    };
  }

  let ledgerRows = [];
  try {
    ledgerRows = readWorkUnitLedgerRows(bundleDir);
  } catch (error) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: `submitted ledger invalid: ${error.message || String(error)}`,
        reasonCode: 'invalid_ledger',
      }),
    };
  }

  if (record.status === 'submitted') {
    try {
      return {
        idempotent: prepareLateSubmitIdempotent(bundleDir, { index, record, ledgerRows, resultPath }),
      };
    } catch (error) {
      return {
        rejection: lateSubmitRejection(bundleDir, {
          work_id,
          resultPath,
          record,
          reason: error.message || String(error),
          reasonCode: reasonCodeForLateSubmit(error.message || String(error)),
        }),
      };
    }
  }

  if (record.status !== 'timed_out') {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: `work_id ${record.work_id} is ${record.status}; late-submit only recovers timed_out work units`,
        reasonCode: reasonCodeForLateSubmit(record.status),
      }),
    };
  }

  const existingTargetRows = targetLedgerRows(ledgerRows, record);
  if (existingTargetRows.length > 0) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: `timed_out work_id ${record.work_id} already has submitted ledger coverage`,
        reasonCode: 'target_already_covered',
      }),
    };
  }

  const conflicts = submittedReplacementConflicts(index, ledgerRows, record);
  if (conflicts.submittedIndexRecords.length > 0 || conflicts.submittedLedgerRows.length > 0) {
    const replacementIds = [
      ...conflicts.submittedIndexRecords.map((item) => item.work_id),
      ...conflicts.submittedLedgerRows.map((row) => row.work_id),
    ];
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: `submitted replacement blocks late-submit for ${record.queue_item_id}: ${[...new Set(replacementIds)].join(', ')}`,
        reasonCode: 'submitted_replacement_conflict',
      }),
    };
  }

  let cleanupPlan;
  try {
    cleanupPlan = planLateSubmitRetryCleanup(readQueueSideEffectFree(bundleDir), index, record);
  } catch (error) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: error.message || String(error),
        reasonCode: reasonCodeForLateSubmit(error.message || String(error)),
      }),
    };
  }

  try {
    const prepared = validateSubmitPlan(bundleDir, {
      work_id,
      resultPath,
      dryRun: true,
      acceptedStatus: 'timed_out',
      requireQueueInFlight: false,
      ledgerAuditFields: {
        late_accept: true,
        late_accept_reason: reasonText,
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: cleanupPlan.supersededRetryWorkIds,
      },
    });
    return {
      prepared: {
        ...prepared,
        reason: reasonText,
        cleanupPlan,
      },
    };
  } catch (error) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: error.message || String(error),
        reasonCode: reasonCodeForLateSubmit(error.message || String(error)),
      }),
    };
  }
}

function collectDrySubmitPlan(bundleDir, { work_id, resultPath }) {
  const violations = [];
  let index = null;
  let record = null;
  let manifest = null;
  let result = null;
  let normalizedResult = null;
  let queue = null;
  let runtimeReceipt = null;
  const normalizations = [];
  let resultHash = null;
  let cacheValidation = { virtualCachePages: new Map() };

  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (error) {
    violations.push(violationForError(error, { phase: 'work_unit_index' }));
    return { index, record, violations, normalizations };
  }

  try {
    record = requireWorkUnitRecord(index, work_id);
  } catch (error) {
    violations.push(violationForError(error, { phase: 'work_unit_record' }));
    return { index, record, violations, normalizations };
  }

  if (record.status === 'submitted') {
    violations.push({
      code: 'duplicate_content_mismatch',
      message: `work_id ${record.work_id} is already submitted; dry-submit only preflights claimed attempts`,
      phase: 'work_unit_status',
      repair_target: 'work_unit_status',
    });
    return { index, record, violations, normalizations };
  }

  if (record.status !== 'claimed') {
    violations.push(violationForError(new Error(`work_id ${record.work_id} is ${record.status}; submit requires claimed`), { phase: 'work_unit_status' }));
    return { index, record, violations, normalizations };
  }

  const resultPathInsideAssignedDir = resultPath
    ? isPathInsideDir(resultPath, path.join(bundleDir, record.paths.work_unit_dir))
    : false;

  try {
    manifest = readAndValidateManifest(bundleDir, index, record);
  } catch (error) {
    violations.push(violationForError(error, { phase: 'manifest' }));
  }

  try {
    result = readAndValidateResult(bundleDir, resultPath, record, {
      normalizations,
      outputContract: manifest?.output_contract || null,
    });
    normalizedResult = normalizeWave1RequiredOutputRoles(result, record, normalizations, resultPath);
    resultHash = hashValue(normalizedResult);
  } catch (error) {
    violations.push(violationForError(error, { phase: 'result' }));
  }

  if (manifest) {
    try {
      readAndValidateBeacon(bundleDir, record, manifest);
    } catch (error) {
      violations.push(violationForError(error, { phase: 'beacon' }));
    }

    try {
      queue = validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects: false });
    } catch (error) {
      violations.push(violationForError(error, { phase: 'queue_binding' }));
    }
  }

  try {
    runtimeReceipt = validateSubmitRuntimeReceipt(bundleDir, record, {
      normalizations,
      allowNonceNormalization: resultPathInsideAssignedDir,
    });
  } catch (error) {
    violations.push(violationForError(error, { phase: 'runtime_receipt' }));
  }

  if (manifest && normalizedResult) {
    try {
      validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
    } catch (error) {
      violations.push(violationForError(error, { phase: 'output_files' }));
    }

    try {
      cacheValidation = validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, {
        record,
        normalizations,
        writeCanonicalCache: false,
      });
    } catch (error) {
      violations.push(violationForError(error, { phase: 'cache_trails' }));
    }

    try {
      validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract, {
        virtualCachePages: cacheValidation.virtualCachePages,
      });
    } catch (error) {
      violations.push(violationForError(error, { phase: 'source_claims' }));
    }
  }

  return {
    index,
    record,
    manifest,
    queue,
    result: normalizedResult,
    result_hash: resultHash,
    runtime_receipt_content: runtimeReceipt?.canonical_content || null,
    normalizations,
    virtual_cache_pages: cacheValidation.virtualCachePages,
    violations,
  };
}

function publicNormalizations(normalizations) {
  return normalizations.map((item) => ({ ...item }));
}

export function drySubmitWorkUnit(bundleDir, { work_id, resultPath } = {}) {
  const plan = collectDrySubmitPlan(bundleDir, { work_id, resultPath });
  const reasonCodes = [...new Set((plan.violations || []).map((item) => item.code))];
  const base = {
    ok: (plan.violations || []).length === 0,
    dry_run: true,
    side_effects: false,
    work_id: plan.record?.work_id || work_id,
    queue_item_id: plan.record?.queue_item_id || null,
    status: plan.record?.status || 'unknown',
    expected_submit: (plan.violations || []).length === 0 ? 'pass' : 'fail',
    reason_codes: reasonCodes,
    violations: plan.violations || [],
    normalizations: publicNormalizations(plan.normalizations || []),
    candidate_result_path: resultPath ? path.resolve(resultPath) : null,
    advice: (plan.violations || []).length === 0
      ? 'Dry-submit passed. Run formal operate-work-unit submit to persist ledger, queue, result, receipt, trace, and cache authority.'
      : 'Repair the reported candidate result, receipt, output, cache, source-claim, or queue-binding issues, then rerun dry-submit or formal submit.',
  };
  if (base.ok) {
    base.result_hash = plan.result_hash;
    base.virtual_cache_pages = [...(plan.virtual_cache_pages || new Map()).keys()];
  }
  return base;
}

export function lateSubmitWorkUnit(bundleDir, { work_id, resultPath, reason } = {}) {
  const planned = prepareLateSubmitWorkUnit(bundleDir, { work_id, resultPath, reason });
  if (planned.rejection) return planned.rejection;
  if (planned.idempotent) return planned.idempotent;

  const prepared = planned.prepared;
  try {
    return withWorkUnitTransaction(bundleDir, 'late_submit_work_unit', ({ tx_id }) => {
      let index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
      let record = requireWorkUnitRecord(index, prepared.record.work_id);
      if (record.status !== 'timed_out') {
        throw new Error(`work_id ${record.work_id} is ${record.status}; late-submit requires timed_out`);
      }
      const queue = loadQueue(bundleDir);
      const currentCleanupPlan = planLateSubmitRetryCleanup(queue, index, record);
      if (cleanupPlanSignature(currentCleanupPlan) !== cleanupPlanSignature(prepared.cleanupPlan)) {
        throw new Error(`late-submit retry state changed for ${record.queue_item_id}; rerun late-submit inspection`);
      }

      const currentLedgerRows = readWorkUnitLedgerRows(bundleDir);
      if (targetLedgerRows(currentLedgerRows, record).length > 0) {
        throw new Error(`timed_out work_id ${record.work_id} already has submitted ledger coverage`);
      }
      const conflicts = submittedReplacementConflicts(index, currentLedgerRows, record);
      if (conflicts.submittedIndexRecords.length > 0 || conflicts.submittedLedgerRows.length > 0) {
        const replacementIds = [
          ...conflicts.submittedIndexRecords.map((item) => item.work_id),
          ...conflicts.submittedLedgerRows.map((row) => row.work_id),
        ];
        throw new Error(`submitted replacement blocks late-submit for ${record.queue_item_id}: ${[...new Set(replacementIds)].join(', ')}`);
      }

      const retryRecords = (currentCleanupPlan.supersededRetryWorkIds || [])
        .map((retryWorkId) => index.work_units[retryWorkId])
        .filter(Boolean);
      const submittedAt = now();
      const cachePageRefs = (prepared.result.cache_trails || [])
        .map((trail) => path.join(trail, 'page.md'));
      const snapshot = captureLateSubmitSnapshot(bundleDir, [record, ...retryRecords], cachePageRefs);

      try {
        const activePrepared = {
          ...validateSubmitPlan(bundleDir, {
            work_id: record.work_id,
            resultPath,
            dryRun: false,
            acceptedStatus: 'timed_out',
            requireQueueInFlight: false,
            ledgerAuditFields: {
              late_accept: true,
              late_accept_reason: prepared.reason,
              terminal_status_before_accept: 'timed_out',
              superseded_retry_work_ids: currentCleanupPlan.supersededRetryWorkIds,
            },
          }),
          reason: prepared.reason,
          cleanupPlan: currentCleanupPlan,
        };
        index = activePrepared.index;
        record = index.work_units[activePrepared.record.work_id];

        writeJson(path.join(bundleDir, record.paths.result_ref), activePrepared.result);
        writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), activePrepared.runtime_receipt_content);
        writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
          work_id: record.work_id,
          status: 'submitted',
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          updated_at: submittedAt,
        }));

        record.status = 'submitted';
        record.result_hash = activePrepared.result_hash;
        record.ledger_record_hash = activePrepared.ledger_record_hash;
        record.terminal_at = submittedAt;
        index.work_units[record.work_id] = record;

        for (const retry of retryRecords) {
          retry.status = 'abandoned';
          retry.terminal_reason = 'superseded_by_late_accept';
          retry.terminal_at = submittedAt;
          index.work_units[retry.work_id] = retry;
          writeJson(path.join(bundleDir, retry.paths.status_ref), WorkUnitStatusFileSchema.parse({
            work_id: retry.work_id,
            status: 'abandoned',
            updated_at: submittedAt,
          }));
        }

        let nextQueue = applyLateSubmitQueueCleanup(queue, record, prepared.cleanupPlan);
        nextQueue.terminal_history.push({
          queue_item_id: record.queue_item_id,
          terminal_status: 'done',
          completed_at: submittedAt,
          work_id: record.work_id,
          reason: activePrepared.result.summary || activePrepared.reason,
          item: activePrepared.manifest.queue_item,
        });
        nextQueue = refill(nextQueue);

        appendLedgerRow(bundleDir, activePrepared.ledger_row);
        const savedIndex = saveWorkUnitIndex(bundleDir, index);
        const savedQueue = saveQueue(bundleDir, nextQueue);

        const postcondition = verifyLateSubmitDurablePostcondition(bundleDir, record, {
          supersededRetryWorkIds: activePrepared.cleanupPlan.supersededRetryWorkIds,
        });
        if (!postcondition.ok) {
          const err = new Error(`late-submit durable postcondition failed: ${postcondition.missing.join('; ')}`);
          err.missing_postconditions = postcondition.missing;
          throw err;
        }

        traceWorkUnitEvent(bundleDir, 'work_unit_ledger_appended', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: activePrepared.ledger_record_hash,
          output_count: (activePrepared.ledger_row.output_files || []).length,
          cache_trail_count: (activePrepared.ledger_row.cache_trails || []).length,
          late_accept: true,
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: activePrepared.cleanupPlan.supersededRetryWorkIds,
        });
        traceWorkUnitEvent(bundleDir, 'work_unit_late_submitted', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          wave: record.wave,
          kind: record.kind,
          receipt_nonce: record.receipt_nonce,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          late_accept_reason: activePrepared.reason,
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: activePrepared.cleanupPlan.supersededRetryWorkIds,
        });
        traceWorkUnitEvent(bundleDir, 'work_unit_submitted', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          wave: record.wave,
          kind: record.kind,
          receipt_nonce: record.receipt_nonce,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          late_accept: true,
        });
        logToRun(bundleDir, 'info', 'work_unit_late_submitted', {
          kind: 'work_unit_late_submit',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          late_accept_reason: activePrepared.reason,
          superseded_retry_work_ids: activePrepared.cleanupPlan.supersededRetryWorkIds,
        });

        return {
          ok: true,
          duplicate: false,
          late_accept: true,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          status: 'submitted',
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          late_accept_reason: activePrepared.reason,
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: activePrepared.cleanupPlan.supersededRetryWorkIds,
          queue: postcondition.queue || savedQueue,
          index: postcondition.index || savedIndex,
          normalizations: activePrepared.normalizations,
        };
      } catch (error) {
        const rollback = restoreSubmitSnapshot(snapshot);
        error.late_submit_failure_payload = buildLateSubmitDurabilityFailure(prepared, error, rollback);
        throw error;
      }
    });
  } catch (error) {
    if (error.late_submit_failure_payload) return error.late_submit_failure_payload;
    return lateSubmitRejection(bundleDir, {
      work_id,
      resultPath,
      record: prepared.record,
      reason: error.message || String(error),
      reasonCode: reasonCodeForLateSubmit(error.message || String(error)),
    });
  }
}

export function submitWorkUnit(bundleDir, { work_id, resultPath, afterQueueSave = null } = {}) {
  let prepared;
  try {
    prepared = prepareWorkUnitSubmit(bundleDir, { work_id, resultPath });
  } catch (error) {
    return recordSubmitRejection(bundleDir, { work_id, resultPath, reason: error.message || String(error) });
  }
  if (prepared.duplicate) {
    return {
      ok: true,
      duplicate: true,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      status: 'submitted',
      result_hash: prepared.result_hash,
      ledger_record_hash: prepared.ledger_record_hash,
      normalizations: prepared.normalizations,
    };
  }

  try {
    return withWorkUnitTransaction(bundleDir, 'submit_work_unit', ({ tx_id }) => {
      const index = prepared.index;
      let queue = prepared.queue;
      const record = index.work_units[prepared.record.work_id];
      const submittedAt = now();
      const snapshot = captureSubmitSnapshot(bundleDir, record);

      try {
        writeJson(path.join(bundleDir, record.paths.result_ref), prepared.result);
        writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), prepared.runtime_receipt_content);
        writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
          work_id: record.work_id,
          status: 'submitted',
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
          updated_at: submittedAt,
        }));

        record.status = 'submitted';
        record.result_hash = prepared.result_hash;
        record.ledger_record_hash = prepared.ledger_record_hash;
        record.terminal_at = submittedAt;
        index.work_units[record.work_id] = record;

        delete queue.delegated_in_flight[record.queue_item_id];
        queue.terminal_history.push({
          queue_item_id: record.queue_item_id,
          terminal_status: 'done',
          completed_at: submittedAt,
          work_id: record.work_id,
          reason: prepared.result.summary || undefined,
          item: prepared.manifest.queue_item,
        });
        queue = refill(queue);

        appendLedgerRow(bundleDir, prepared.ledger_row);
        const savedIndex = saveWorkUnitIndex(bundleDir, index);
        const savedQueue = saveQueue(bundleDir, queue);
        if (typeof afterQueueSave === 'function') {
          afterQueueSave({ bundleDir, record: clone(record), savedQueue: clone(savedQueue), savedIndex: clone(savedIndex) });
        }

        const postcondition = verifySubmitDurablePostcondition(bundleDir, record);
        if (!postcondition.ok) {
          const err = new Error(`submit durable queue postcondition failed: ${postcondition.missing.join('; ')}`);
          err.missing_postconditions = postcondition.missing;
          throw err;
        }

        traceWorkUnitEvent(bundleDir, 'work_unit_ledger_appended', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: prepared.ledger_record_hash,
          output_count: (prepared.ledger_row.output_files || []).length,
          cache_trail_count: (prepared.ledger_row.cache_trails || []).length,
        });
        logToRun(bundleDir, 'info', 'work_unit_ledger_appended', {
          kind: 'ledger_append',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: prepared.ledger_record_hash,
        });
        if (prepared.normalizations.length > 0) {
          traceWorkUnitEvent(bundleDir, 'work_unit_submit_normalized', {
            tx_id,
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            kind: record.kind,
            normalization_count: prepared.normalizations.length,
            normalizations: prepared.normalizations,
          });
          logToRun(bundleDir, 'info', 'work_unit_submit_normalized', {
            kind: 'work_unit_submit',
            tx_id,
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            normalization_count: prepared.normalizations.length,
            normalizations: prepared.normalizations,
          });
        }
        traceWorkUnitEvent(bundleDir, 'work_unit_submitted', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          wave: record.wave,
          kind: record.kind,
          receipt_nonce: record.receipt_nonce,
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
        });
        logToRun(bundleDir, 'info', 'work_unit_submitted', {
          kind: 'work_unit_submit',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
        });

        return {
          ok: true,
          duplicate: false,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          status: 'submitted',
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          queue: postcondition.queue,
          index: postcondition.index,
          normalizations: prepared.normalizations,
        };
      } catch (error) {
        const rollback = restoreSubmitSnapshot(snapshot);
        error.submit_failure_payload = buildSubmitDurabilityFailure(prepared, error, rollback);
        throw error;
      }
    });
  } catch (error) {
    if (error.submit_failure_payload) return error.submit_failure_payload;
    throw error;
  }
}
