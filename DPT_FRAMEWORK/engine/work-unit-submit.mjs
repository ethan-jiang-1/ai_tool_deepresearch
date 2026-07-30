// @impl DEW-005, DEW-013, DEW-023, DEW-024, CHI-004, FRE-005, EXO-001
// Work-unit submit and dry-submit preflight: validation planning, durability, ledger row building, rejection, prepare and submit.

import {
  existsSync,
  readFileSync,
  readdirSync,
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
  transactionDir,
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
  validateManifestTopicBinding,
} from './work-unit-validation.mjs';
import { evaluateDirectOutputTarget, semanticOrderedArrayDigest } from './helpers/direct-output-contract.mjs';
import { deriveWorkUnitCandidateProjection } from './work-unit-candidate-projection.mjs';
import {
  acceptedLedgerRecordHashFor,
  isMarkedWorkUnitSubmission,
  loadCurrentSubmittedLedgerFact,
  readSubmittedLedgerDocument,
  readSubmittedStatusFile,
  validateCurrentSubmittedLedgerFact,
} from './work-unit-submitted-ledger.mjs';

import {
  SourceContributionSchema,
  WorkUnitLedgerRecordSchema,
  WorkUnitStatusFileSchema,
  WorkUnitSubmissionV1StatusFileSchema,
} from '../schema/contracts/work-unit.mjs';
import { loadQueue, saveQueue } from './queue-manager-lifecycle.mjs';
import { refill } from './queue-manager-window.mjs';
import { logToRun } from './logger.mjs';
import { projectWorkUnitAttemptDisposition } from './work-unit-attempt-disposition.mjs';
import { evaluateWorkUnitSubmitIntegrity } from './work-unit-submit-integrity.mjs';

const WORK_UNIT_INDEX_TARGET = '_work_units/_index.json';
const QUEUE_TARGET = 'rb_queue.json';

function formalSubmitRerun(bundleDir, workId, resultPath, { late = false, reason = null } = {}) {
  return [
    'node DPT_FRAMEWORK/cli/operate-work-unit.mjs',
    late ? 'late-submit' : 'submit',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(workId),
    '--result', JSON.stringify(path.resolve(resultPath)),
    ...(late ? ['--reason', JSON.stringify(reason)] : []),
  ].join(' ');
}

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

function captureSubmitSnapshot(bundleDir, record, extraRelativeRefs = []) {
  const files = [
    workUnitIndexPath(bundleDir),
    path.join(bundleDir, 'rb_queue.json'),
    ledgerPath(bundleDir),
    path.join(bundleDir, record.paths.result_ref),
    path.join(bundleDir, record.paths.runtime_receipt_ref),
    path.join(bundleDir, record.paths.status_ref),
    ...extraRelativeRefs.map((ref) => path.join(bundleDir, ref)),
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

function writeSubmittedStatusAndHashes(bundleDir, record, { resultHash, ledgerRecordHash, submittedAt }) {
  if (isMarkedWorkUnitSubmission(record)) {
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitSubmissionV1StatusFileSchema.parse({
      work_id: record.work_id,
      status: 'submitted',
      updated_at: submittedAt,
    }));
    delete record.result_hash;
    delete record.ledger_record_hash;
    record.accepted_ledger_record_hash = ledgerRecordHash;
    return;
  }
  writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
    work_id: record.work_id,
    status: 'submitted',
    result_hash: resultHash,
    ledger_record_hash: ledgerRecordHash,
    updated_at: submittedAt,
  }));
  record.result_hash = resultHash;
  record.ledger_record_hash = ledgerRecordHash;
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

function verifyLateSubmitDurablePostcondition(bundleDir, record, {
  supersededRetryWorkIds = [],
  lateAcceptContext = record.late_accept_context,
} = {}) {
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
    if (lateAcceptContext && JSON.stringify(target?.late_accept_context) !== JSON.stringify(lateAcceptContext)) {
      missing.push(`_work_units/_index.json does not preserve exact late_accept_context for ${record.work_id}`);
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

function buildLedgerRow({ record, result, resultHash, declaredAt, auditFields = {}, sourceContribution = null }) {
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
    ...(sourceContribution ? { source_contribution: sourceContribution } : {}),
    actor_contract_version: 'work-unit.actor.v1',
    actor_execution: actorExecution,
    ...auditFields,
  };
  return WorkUnitLedgerRecordSchema.parse({
    ...base,
    ledger_record_hash: computeWorkUnitLedgerRecordHash(base),
  });
}

function declarationRecoveryCommand(bundleDir, workId) {
  return [
    'node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(String(workId || '<work-id>')),
  ].join(' ');
}

function declarationRecoveryFailure(bundleDir, workId, error) {
  const reasonCode = error?.recovery_reason_code || 'declaration_recovery_prerequisite_failed';
  const missingFact = reasonCode === 'missing_source_contribution_no_legal_recovery'
    ? `No legal recovery can reproduce ${workId || '<work-id>'}: its hash-bound source_contribution no longer matches the accepted direct source bytes.`
    : error?.message || String(error);
  return {
    ok: false,
    recovered: false,
    changed: false,
    work_id: workId || null,
    reason_code: reasonCode,
    repair_kind: 'missing_contract',
    missing_fact: missingFact,
    write_to: `submitted declaration recovery prerequisites for ${workId || '<work-id>'}; do not edit rb_output_declarations.jsonl, index, status, queue, or hashes manually`,
    rerun: declarationRecoveryCommand(bundleDir, workId),
    inspect: [missingFact],
    advice: 'Repair only through the existing owner of the failed direct fact, then rerun the same recover-declaration checkpoint.',
  };
}

function readOriginalSubmitEvidence(bundleDir, record, { resultHash, ledgerRecordHash }) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  let events;
  try {
    events = readFileSync(tracePath, 'utf-8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }

  const transactions = new Map();
  const txRoot = transactionDir(bundleDir);
  if (existsSync(txRoot)) {
    for (const name of readdirSync(txRoot)) {
      if (!name.endsWith('.json')) continue;
      try {
        const tx = JSON.parse(readFileSync(path.join(txRoot, name), 'utf-8'));
        if (tx?.status === 'committed' && ['submit_work_unit', 'late_submit_work_unit'].includes(tx.operation)) {
          transactions.set(tx.tx_id, tx);
        }
      } catch { /* malformed evidence is not eligible */ }
    }
  }

  return events
    .filter((event) => (
      event.event === 'work_unit_submitted' &&
      event.work_id === record.work_id &&
      event.queue_item_id === record.queue_item_id &&
      event.result_hash === resultHash &&
      event.ledger_record_hash === ledgerRecordHash &&
      transactions.has(event.tx_id)
    ))
    .map((event) => {
      const transaction = transactions.get(event.tx_id);
      const lateEvent = events.find((candidate) => (
        candidate.event === 'work_unit_late_submitted' &&
        candidate.tx_id === event.tx_id &&
        candidate.work_id === record.work_id &&
        candidate.queue_item_id === record.queue_item_id &&
        candidate.result_hash === resultHash &&
        candidate.ledger_record_hash === ledgerRecordHash
      ));
      return { event, transaction, lateEvent };
    });
}

function recoveryAuditOptions(record, evidence) {
  if (record.late_accept_context) {
    return [{
      source: 'current_late_context',
      fields: {
        late_accept: true,
        late_accept_reason: record.late_accept_context.late_accept_reason,
        terminal_status_before_accept: record.late_accept_context.terminal_status_before_accept,
        superseded_retry_work_ids: record.late_accept_context.superseded_retry_work_ids,
      },
    }];
  }

  const options = [{ source: 'normal_submission', fields: {} }];
  for (const item of evidence) {
    const late = item.lateEvent;
    if (
      item.transaction.operation !== 'late_submit_work_unit' ||
      typeof late?.late_accept_reason !== 'string' || late.late_accept_reason.trim().length === 0 ||
      late.terminal_status_before_accept !== 'timed_out' ||
      !Array.isArray(late.superseded_retry_work_ids)
    ) continue;
    options.push({
      source: 'legacy_late_submit_evidence',
      fields: {
        late_accept: true,
        late_accept_reason: late.late_accept_reason.trim(),
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: late.superseded_retry_work_ids,
      },
    });
  }
  return options;
}

function prepareCurrentDeclarationRecovery(bundleDir, workId) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, workId);
  if (record.status !== 'submitted') {
    throw new Error(`work_id ${record.work_id} is ${record.status}; recover-declaration requires an already-submitted attempt`);
  }
  const marked = isMarkedWorkUnitSubmission(record);
  const acceptedLedgerRecordHash = acceptedLedgerRecordHashFor(record);
  if (!acceptedLedgerRecordHash || !record.terminal_at) {
    throw new Error(`submitted index record ${record.work_id} lacks version-applicable accepted ledger hash or terminal_at`);
  }
  if (!marked && !record.result_hash) {
    throw new Error(`legacy submitted index record ${record.work_id} lacks result_hash`);
  }

  const status = readSubmittedStatusFile(bundleDir, record);
  if (status.work_id !== record.work_id || status.status !== 'submitted') {
    throw new Error(`submitted status/index binding mismatch for ${record.work_id}`);
  }
  if (!marked && (status.result_hash !== record.result_hash || status.ledger_record_hash !== record.ledger_record_hash)) {
    throw new Error(`submitted status/index hash mismatch for ${record.work_id}`);
  }

  const ledgerDocument = readSubmittedLedgerDocument(bundleDir);
  if (ledgerDocument.unattributable_errors.length > 0) {
    throw new Error(`submitted ledger has unattributable corruption: ${ledgerDocument.unattributable_errors.map((item) => `line ${item.line} ${item.reason}`).join('; ')}`);
  }
  if (ledgerDocument.duplicate_work_ids.length > 0) {
    throw new Error(`submitted ledger has duplicate work IDs: ${ledgerDocument.duplicate_work_ids.join(', ')}`);
  }
  const foreignInvalidRows = ledgerDocument.attributable_invalid_rows
    .filter((item) => item.work_id !== record.work_id);
  if (foreignInvalidRows.length > 0) {
    throw new Error(`submitted ledger has unrelated attributable corruption: ${foreignInvalidRows.map((item) => item.work_id).join(', ')}`);
  }
  const invalidTargetRows = ledgerDocument.attributable_invalid_rows
    .filter((item) => item.work_id === record.work_id);
  if (invalidTargetRows.length > 1) {
    throw new Error(`multiple drifted submitted declaration rows exist for ${record.work_id}`);
  }
  const ledgerRows = ledgerDocument.valid_rows;
  const existingRows = targetLedgerRows(ledgerRows, record);
  if (existingRows.length > 1) throw new Error(`multiple submitted declaration rows exist for ${record.work_id}`);

  const conflicts = submittedReplacementConflicts(index, ledgerRows, record);
  if (conflicts.submittedIndexRecords.length > 0 || conflicts.submittedLedgerRows.length > 0) {
    const conflictIds = [
      ...conflicts.submittedIndexRecords.map((item) => item.work_id),
      ...conflicts.submittedLedgerRows.map((item) => item.work_id),
    ];
    throw new Error(`submitted replacement conflict for ${record.queue_item_id}: ${[...new Set(conflictIds)].join(', ')}`);
  }

  const queue = readQueueSideEffectFree(bundleDir);
  if (queue.delegated_in_flight?.[record.queue_item_id]) {
    throw new Error(`submitted queue item ${record.queue_item_id} is still delegated in flight`);
  }
  const terminalRows = (queue.terminal_history || []).filter((entry) => entry.queue_item_id === record.queue_item_id);
  const terminal = terminalRows.find((entry) => (
    entry.work_id === record.work_id && entry.terminal_status === 'done'
  ));
  if (terminalRows.length !== 1 || !terminal) {
    throw new Error(`queue terminal history does not contain exactly one done row for ${record.queue_item_id}/${record.work_id}`);
  }
  if (queueItemSnapshotHash(terminal.item) !== record.queue_item_snapshot_hash) {
    throw new Error(`queue terminal snapshot mismatch for ${record.work_id}`);
  }

  if (existingRows.length === 1) {
    const [ledgerRow] = existingRows;
    validateCurrentSubmittedLedgerFact({ record, row: ledgerRow, status });
    for (const retryWorkId of ledgerRow.superseded_retry_work_ids || []) {
      const retry = index.work_units[retryWorkId];
      if (!retry || retry.status !== 'abandoned' || retry.terminal_reason !== 'superseded_by_late_accept') {
        throw new Error(`superseded retry binding is invalid for ${retryWorkId}`);
      }
      if (ledgerRows.some((row) => row.work_id === retryWorkId)) {
        throw new Error(`superseded retry ${retryWorkId} already has submitted declaration coverage`);
      }
    }
    return {
      index,
      record,
      status,
      queue,
      ledgerRows,
      ledgerRow,
      existing: true,
      reconstructionSource: 'existing_hash_valid_row',
      legacy: false,
    };
  }

  const normalizations = [];
  const manifest = readAndValidateManifest(bundleDir, index, record);
  validateManifestTopicBinding(bundleDir, manifest);
  readAndValidateBeacon(bundleDir, record, manifest);
  const assignedResultPath = path.join(bundleDir, record.paths.result_ref);
  const parsedResult = readAndValidateResult(bundleDir, assignedResultPath, record, {
    normalizations,
    outputContract: manifest.output_contract,
  });
  const result = normalizeWave1RequiredOutputRoles(parsedResult, record, manifest, normalizations, assignedResultPath);
  const resultHash = hashValue(result);
  if (!marked && resultHash !== record.result_hash) {
    throw new Error(`submitted result hash mismatch for ${record.work_id}`);
  }

  validateSubmitRuntimeReceipt(bundleDir, record, { normalizations, allowNonceNormalization: false });
  validateOutputFiles(bundleDir, result, manifest.output_contract);
  const cacheValidation = validateCacheTrails(bundleDir, result, manifest.cache_policy, {
    record,
    normalizations,
    writeCanonicalCache: false,
  });
  if (cacheValidation.virtualCachePages.size > 0 || normalizations.length > 0) {
    throw new Error(`submitted direct owners for ${record.work_id} require normalization and cannot reproduce the accepted row exactly`);
  }
  validateSourceClaims(bundleDir, result, manifest.output_contract, {
    virtualCachePages: cacheValidation.virtualCachePages,
    manifest,
  });

  let sourceContribution;
  try {
    const directOutputEvaluations = requireDirectOutputs(bundleDir, manifest);
    sourceContribution = deriveSourceContribution(record, manifest, result, directOutputEvaluations);
  } catch (error) {
    if (marked && record.wave === 0 && record.kind === 'wave0_source_intake') {
      error.recovery_reason_code = 'missing_source_contribution_no_legal_recovery';
    }
    throw error;
  }
  const evidence = readOriginalSubmitEvidence(bundleDir, record, {
    resultHash,
    ledgerRecordHash: acceptedLedgerRecordHash,
  });
  const timestampsUnified = status.updated_at === record.terminal_at && terminal.completed_at === record.terminal_at;
  const timestampCandidates = new Set([record.terminal_at, status.updated_at, terminal.completed_at]);
  for (const invalid of invalidTargetRows) {
    if (typeof invalid.value?.declared_at === 'string' && Number.isFinite(Date.parse(invalid.value.declared_at))) {
      timestampCandidates.add(invalid.value.declared_at);
    }
  }
  for (const item of evidence) {
    for (const candidate of [
      item.event.ts,
      item.lateEvent?.ts,
      item.transaction.started_at,
      item.transaction.committed_at,
    ]) {
      if (typeof candidate === 'string' && Number.isFinite(Date.parse(candidate))) timestampCandidates.add(candidate);
    }
  }
  if (existingRows.length === 1) timestampCandidates.add(existingRows[0].declared_at);

  const matches = new Map();
  for (const declaredAt of timestampCandidates) {
    for (const audit of existingRows.length === 1
      ? [{ source: 'existing_hash_valid_row', fields: existingRows[0].late_accept === true ? {
        late_accept: true,
        late_accept_reason: existingRows[0].late_accept_reason,
        terminal_status_before_accept: existingRows[0].terminal_status_before_accept,
        superseded_retry_work_ids: existingRows[0].superseded_retry_work_ids,
      } : {} }]
      : recoveryAuditOptions(record, evidence)) {
      let candidate;
      try {
        candidate = buildLedgerRow({
          record,
          result,
          resultHash,
          declaredAt,
          auditFields: audit.fields,
          sourceContribution,
        });
      } catch {
        continue;
      }
      if (candidate.ledger_record_hash !== acceptedLedgerRecordHash) continue;
      if (!marked && candidate.ledger_record_hash !== status.ledger_record_hash) continue;
      const key = JSON.stringify(candidate);
      matches.set(key, { row: candidate, source: audit.source });
    }
  }
  if (matches.size === 0) {
    const error = new Error(`missing_contract: no legal recovery can reproduce ${record.work_id}'s hash from the exact legacy no-contribution declaration shape; do not reread source.yaml or append provenance.`);
    if (record.wave === 0 && record.kind === 'wave0_source_intake') {
      error.recovery_reason_code = 'missing_source_contribution_no_legal_recovery';
    }
    throw error;
  }
  if (matches.size > 1) {
    throw new Error(`missing_contract: declaration reconstruction is ambiguous for ${record.work_id}`);
  }
  const [{ row: ledgerRow, source: reconstructionSource }] = [...matches.values()];
  if (!timestampsUnified && evidence.length === 0 && existingRows.length === 0) {
    throw new Error(`missing_contract: legacy submission timestamps for ${record.work_id} require original submit/transaction evidence`);
  }
  if (existingRows.length === 1 && JSON.stringify(existingRows[0]) !== JSON.stringify(ledgerRow)) {
    throw new Error(`existing declaration row conflicts with reconstructed row for ${record.work_id}`);
  }
  for (const retryWorkId of ledgerRow.superseded_retry_work_ids || []) {
    const retry = index.work_units[retryWorkId];
    if (!retry || retry.status !== 'abandoned' || retry.terminal_reason !== 'superseded_by_late_accept') {
      throw new Error(`superseded retry binding is invalid for ${retryWorkId}`);
    }
    if (ledgerRows.some((row) => row.work_id === retryWorkId)) {
      throw new Error(`superseded retry ${retryWorkId} already has submitted declaration coverage`);
    }
  }

  return {
    index,
    record,
    status,
    queue,
    ledgerRows,
    ledgerRow,
    existing: existingRows.length === 1,
    reconstructionSource,
    legacy: reconstructionSource.startsWith('legacy_') || !timestampsUnified,
    replaceLine: invalidTargetRows[0]?.line || null,
  };
}

function writeRecoveredDeclaration(bundleDir, prepared) {
  if (!prepared.replaceLine) {
    appendLedgerRow(bundleDir, prepared.ledgerRow);
    return;
  }
  const file = ledgerPath(bundleDir);
  const lines = readFileSync(file, 'utf-8').split(/\r?\n/);
  const lineIndex = prepared.replaceLine - 1;
  if (lineIndex < 0 || lineIndex >= lines.length || !lines[lineIndex].trim()) {
    throw new Error(`drifted declaration line ${prepared.replaceLine} changed before recovery`);
  }
  let current;
  try {
    current = JSON.parse(lines[lineIndex]);
  } catch {
    throw new Error(`drifted declaration line ${prepared.replaceLine} is no longer attributable`);
  }
  if (current?.work_id !== prepared.record.work_id) {
    throw new Error(`drifted declaration line ${prepared.replaceLine} changed work_id before recovery`);
  }
  lines[lineIndex] = JSON.stringify(prepared.ledgerRow);
  writeFileSync(file, `${lines.join('\n').replace(/\n+$/, '')}\n`);
}

function normalizeWave1RequiredOutputRoles(result, record, manifest, normalizations, resultPath) {
  if (record.kind !== 'wave1_topic_deepening' && record.wave !== 1) return result;
  if (record.assignment_contract_version) return result;
  const assignedTopicSlug = manifest?.queue_item?.payload?.topic_slug;
  if (!assignedTopicSlug) return result;
  const legacyRoleByPath = new Map([
    [`artifacts/wave1/${assignedTopicSlug}/evidence-summary.md`, 'evidence_summary'],
    [`artifacts/wave1/${assignedTopicSlug}/question-list.md`, 'question_list'],
  ]);
  const outputFiles = Array.isArray(result.output_files) ? result.output_files : [];
  let changed = false;
  const normalizedOutputFiles = outputFiles.map((entry) => {
    const canonicalRole = legacyRoleByPath.get(entry?.path) || null;
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

function requireDirectOutputs(bundleDir, manifest) {
  const evaluations = new Map();
  for (const required of manifest.output_contract.required_outputs || []) {
    const evaluated = evaluateDirectOutputTarget({
      bundleDir,
      target: required.path,
      contractId: required.direct_contract,
    });
    if (!evaluated.passed) {
      const directRoot = evaluated.roots[0];
      const error = new Error(`${directRoot.coordinate}: ${directRoot.expected} ${directRoot.observed}`);
      error.repair_contract = {
        code: directRoot.code,
        repair_kind: directRoot.root_class === 'semantic_content' ? 'agent_action' : 'missing_contract',
        write_to: path.join(path.resolve(bundleDir), directRoot.coordinate),
        details: directRoot,
      };
      throw error;
    }
    evaluations.set(required.path, { required, evaluated });
  }
  return evaluations;
}

function deriveSourceContribution(record, manifest, result, directOutputEvaluations) {
  if (record.wave !== 0 || record.kind !== 'wave0_source_intake' || !record.assignment_contract_version) return null;
  const sourceRequirements = (manifest.output_contract.required_outputs || []).filter((required) => (
    required.role === 'source_yaml' && required.direct_contract === 'wave0.source-metadata-array.v1'
  ));
  if (sourceRequirements.length === 0) return null;
  if (sourceRequirements.length !== 1) {
    throw new Error(`current Wave0 source intake requires exactly one source_yaml direct-output tuple for ${record.work_id}`);
  }
  const [required] = sourceRequirements;
  const evaluated = directOutputEvaluations.get(required.path)?.evaluated;
  if (!evaluated?.passed || !Array.isArray(evaluated.validated_value)) {
    throw new Error(`current Wave0 source intake lacks one validated source-array snapshot for ${record.work_id}`);
  }
  const matchingOutputs = (result.output_files || []).filter((output) => (
    output.path === required.path && output.role === 'source_yaml'
  ));
  if (matchingOutputs.length !== 1) {
    throw new Error(`current Wave0 source intake result lacks exactly one declared source_yaml output for ${record.work_id}`);
  }
  return SourceContributionSchema.parse({
    target: required.path,
    direct_contract: required.direct_contract,
    validated_length: evaluated.validated_value.length,
    semantic_digest: semanticOrderedArrayDigest(evaluated.validated_value),
  });
}

export function reasonCodeForSubmit(message) {
  if (/work-unit topic binding|canonical topic plan/i.test(message)) return 'topic_binding_invalid';
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

function rejectionGuidance(violations = [], selectedPrimary = null) {
  const primary = selectedPrimary || null;
  return {
    violations,
    selected_primary: primary,
    ...(primary ? {
      repair_kind: primary.repair_kind,
      missing_fact: primary.missing_fact,
      write_to: primary.write_to,
      rerun: primary.rerun,
    } : {}),
  };
}

function recordSubmitRejection(bundleDir, {
  work_id,
  resultPath,
  reason,
  violations = [],
  candidateProjection = null,
  selectedPrimary = null,
  transactionHooks = null,
}) {
  const guidance = rejectionGuidance(violations, selectedPrimary);
  const projection = candidateProjection ? {
    recommended_action: candidateProjection.recommended_action,
    primary_root_code: candidateProjection.primary_root_code,
  } : {};
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
      advice: 'Use the reported work-unit owner boundary, then rerun dry-submit for the same candidate.',
      ...guidance,
      ...projection,
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
      advice: 'Terminal work-unit attempts cannot be submitted; follow the reported owner boundary rather than editing authority files.',
      ...guidance,
      ...projection,
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
      advice: 'Submit is only accepted for claimed attempts; use the reported owner boundary and re-run dry-submit when the attempt is claim-eligible.',
      ...guidance,
      ...projection,
    };
  }

  return withWorkUnitTransaction(bundleDir, 'reject_work_unit_submit', {
    targetWorkIds: [record.work_id],
    targetQueueItemIds: [record.queue_item_id],
    mutationTargets: [WORK_UNIT_INDEX_TARGET, record.paths.status_ref],
    rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
    hooks: transactionHooks,
  }, ({ tx_id }) => {
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
      advice: 'Repair the same candidate through the reported coordinates and rerun the exact dry-submit checkpoint before formal submit.',
      index: savedIndex,
      ...guidance,
      ...projection,
    };
  });
}

function jsonPointer(pathParts = []) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return '/';
  return `/${pathParts.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
}

function drySubmitRerun(bundleDir, workId, resultPath) {
  return [
    'node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(String(workId || '<work-id>')),
    '--result', JSON.stringify(resultPath ? path.resolve(resultPath) : '<result.json>'),
  ].join(' ');
}

function repairContractForPhase({ phase, bundleDir, record, resultPath, issuePath = [], receiptLine = null }) {
  const candidatePath = resultPath ? path.resolve(resultPath) : '<result.json>';
  if (phase === 'result') {
    const pointer = jsonPointer(issuePath);
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#${pointer}`, json_pointer: pointer };
  }
  if (phase === 'runtime_receipt') {
    const receiptPath = record ? path.join(path.resolve(bundleDir), record.paths.runtime_receipt_ref) : 'assigned runtime-receipt.jsonl';
    return {
      repair_kind: 'agent_action',
      write_to: receiptLine ? `${receiptPath}#line=${receiptLine}` : receiptPath,
    };
  }
  if (phase === 'output_files') {
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#/output_files` };
  }
  if (phase === 'cache_trails') {
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#/cache_trails and the exact declared cache leaf under ${path.resolve(bundleDir)}` };
  }
  if (phase === 'source_claims') {
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#/source_claims` };
  }
  return {
    repair_kind: 'missing_contract',
    write_to: `work-unit ${phase} authority boundary for ${record?.work_id || '<work-id>'}; use an existing Engine operation when available`,
  };
}

function violationForError(error, {
  phase = 'submit_validation',
  bundleDir,
  record = null,
  workId = record?.work_id,
  resultPath = null,
  validationIssue = null,
} = {}) {
  const message = error?.message || String(error);
  const issueMessage = validationIssue?.message || message;
  const ownerRepair = error?.repair_contract || {};
  const ownerPointer = ownerRepair.json_pointer || null;
  const repair = {
    ...repairContractForPhase({
      phase,
      bundleDir,
      record,
      resultPath,
      issuePath: validationIssue?.path || [],
      receiptLine: error?.receipt_line || null,
    }),
    ...ownerRepair,
  };
  if (ownerPointer && !ownerRepair.write_to) {
    repair.write_to = `${resultPath ? path.resolve(resultPath) : '<result.json>'}#${ownerPointer}`;
  }
  return {
    code: validationIssue?.code || ownerRepair.code || reasonCodeForSubmit(issueMessage),
    message: issueMessage,
    phase,
    repair_target: phase === 'source_claims' ? 'source_claims' : repairTargetForReason(issueMessage),
    repair_kind: repair.repair_kind,
    missing_fact: issueMessage,
    write_to: repair.write_to,
    rerun: drySubmitRerun(bundleDir, workId, resultPath),
    ...((repair.json_pointer || ownerPointer) ? { json_pointer: repair.json_pointer || ownerPointer } : {}),
    ...(repair.details ? { details: repair.details } : {}),
    ...(error?.candidate_scope_hint ? { scope_hint: error.candidate_scope_hint } : {}),
  };
}

function violationsForError(error, context) {
  if (Array.isArray(error?.validation_issues) && error.validation_issues.length > 0) {
    return error.validation_issues.map((validationIssue) => violationForError(error, { ...context, validationIssue }));
  }
  return [violationForError(error, context)];
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
  acceptedStatus = 'claimed',
  requireQueueInFlight = true,
} = {}) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  const normalizations = [];

  if (record.status === 'submitted' && acceptedStatus === 'claimed') {
    const replayManifest = readAndValidateManifest(bundleDir, index, record);
    const parsedResult = readAndValidateResult(bundleDir, resultPath, record, {
      normalizations,
      outputContract: replayManifest.output_contract,
    });
    const result = normalizeWave1RequiredOutputRoles(parsedResult, record, replayManifest, normalizations, resultPath);
    const resultHash = hashValue(result);
    const submitted = loadCurrentSubmittedLedgerFact(bundleDir, record);
    if (submitted.result_hash === resultHash) {
      return {
        duplicate: true,
        index,
        record,
        result,
        result_hash: resultHash,
        ledger_record_hash: submitted.ledger_record_hash,
        ledger_row: submitted.row,
        normalizations,
      };
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
  validateManifestTopicBinding(bundleDir, manifest);
  const result = readAndValidateResult(bundleDir, resultPath, record, {
    normalizations,
    outputContract: manifest.output_contract,
  });
  const normalizedResult = normalizeWave1RequiredOutputRoles(result, record, manifest, normalizations, resultPath);
  const resultHash = hashValue(normalizedResult);
  readAndValidateBeacon(bundleDir, record, manifest);
  const directOutputEvaluations = requireDirectOutputs(bundleDir, manifest);
  const runtimeReceipt = validateSubmitRuntimeReceipt(bundleDir, record, {
    normalizations,
    allowNonceNormalization: resultPathInsideAssignedDir,
  });
  const queue = requireQueueInFlight
    ? validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects: false })
    : readQueueSideEffectFree(bundleDir);
  if (!requireQueueInFlight && queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) {
    throw new Error(`manifest queue item snapshot hash is stale for ${record.work_id}`);
  }
  validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
  const cacheValidation = validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, {
    record,
    normalizations,
    writeCanonicalCache: false,
  });
  validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract, {
    virtualCachePages: cacheValidation.virtualCachePages,
    manifest,
  });
  const sourceContribution = deriveSourceContribution(record, manifest, normalizedResult, directOutputEvaluations);
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
    source_contribution: sourceContribution,
  };
}

function applyCandidateCanonicalizations(bundleDir, prepared) {
  for (const [trail, pageText] of prepared.virtual_cache_pages || new Map()) {
    writeFileSync(path.join(bundleDir, trail, 'page.md'), pageText);
  }
}

function prepareWorkUnitSubmit(bundleDir, { work_id, resultPath }) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  if (record.status === 'submitted') {
    return validateSubmitPlan(bundleDir, { work_id, resultPath });
  }
  const plan = collectDrySubmitPlan(bundleDir, { work_id, resultPath });
  if ((plan.violations || []).length > 0) {
    const error = new Error(plan.violations.map((violation) => violation.message).join('; '));
    error.candidate_plan = plan;
    throw error;
  }
  return plan;
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
  const result = normalizeWave1RequiredOutputRoles(parsedResult, record, manifest, normalizations, resultPath);
  const resultHash = hashValue(result);
  const submitted = loadCurrentSubmittedLedgerFact(bundleDir, record, { ledgerRows });
  if (resultHash !== existingRow.result_hash || resultHash !== submitted.result_hash) {
    throw new Error(`audited late-submit replay result hash mismatch for ${record.work_id}`);
  }
  if (existingRow.ledger_record_hash !== submitted.ledger_record_hash) {
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
      acceptedStatus: 'timed_out',
      requireQueueInFlight: false,
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

function directOutputViolation(bundleDir, record, resultPath, directRoot) {
  return {
    code: directRoot.code,
    message: `${directRoot.expected} ${directRoot.observed}`,
    phase: 'direct_outputs',
    repair_target: 'output_files',
    repair_kind: directRoot.root_class === 'semantic_content' ? 'agent_action' : 'missing_contract',
    missing_fact: `${directRoot.coordinate}: ${directRoot.observed}`,
    write_to: path.join(path.resolve(bundleDir), directRoot.coordinate),
    rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
    root_class: directRoot.root_class,
    contract_id: directRoot.contract_id,
    coordinate: directRoot.coordinate,
    expected: directRoot.expected,
    observed: directRoot.observed,
  };
}

function finalizeCandidatePlan(plan) {
  const requiredOutputs = plan.manifest?.output_contract?.required_outputs || [];
  const workDone = Boolean(plan.runtime_receipt?.events?.some((event) => event.event === 'work_done'));
  const derived = deriveWorkUnitCandidateProjection({
    violations: plan.violations || [],
    workDone,
    requiredOutputs,
  });
  return {
    ...plan,
    violations: derived.violations,
    selected_primary: derived.selected_primary,
    candidate_projection: derived.projection,
  };
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
  let cacheValid = false;
  let beaconValid = false;
  const directOutputPasses = new Set();
  const directOutputEvaluations = new Map();

  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'work_unit_index', bundleDir, workId: work_id, resultPath }));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  try {
    record = requireWorkUnitRecord(index, work_id);
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'work_unit_record', bundleDir, workId: work_id, resultPath }));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  if (record.status === 'submitted') {
    violations.push(violationForError(
      new Error(`work_id ${record.work_id} is already submitted; dry-submit only preflights claimed attempts`),
      { phase: 'work_unit_status', bundleDir, record, resultPath },
    ));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  if (record.status !== 'claimed') {
    violations.push(violationForError(
      new Error(`work_id ${record.work_id} is ${record.status}; submit requires claimed`),
      { phase: 'work_unit_status', bundleDir, record, resultPath },
    ));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  const resultPathInsideAssignedDir = resultPath
    ? isPathInsideDir(resultPath, path.join(bundleDir, record.paths.work_unit_dir))
    : false;

  try {
    manifest = readAndValidateManifest(bundleDir, index, record);
    validateManifestTopicBinding(bundleDir, manifest);
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'manifest', bundleDir, record, resultPath }));
  }

  try {
    result = readAndValidateResult(bundleDir, resultPath, record, {
      normalizations,
      outputContract: manifest?.output_contract || null,
    });
    normalizedResult = normalizeWave1RequiredOutputRoles(result, record, manifest, normalizations, resultPath);
    resultHash = hashValue(normalizedResult);
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'result', bundleDir, record, resultPath }));
  }

  if (manifest) {
    try {
      readAndValidateBeacon(bundleDir, record, manifest);
      beaconValid = true;
    } catch (error) {
      violations.push(...violationsForError(error, { phase: 'beacon', bundleDir, record, resultPath }));
    }

    try {
      queue = validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects: false });
    } catch (error) {
      violations.push(...violationsForError(error, { phase: 'queue_binding', bundleDir, record, resultPath }));
    }
  }

  if (manifest && beaconValid) {
    for (const required of manifest.output_contract.required_outputs || []) {
      const evaluated = evaluateDirectOutputTarget({
        bundleDir,
        target: required.path,
        contractId: required.direct_contract,
      });
      if (evaluated.passed) {
        directOutputPasses.add(required.path);
        directOutputEvaluations.set(required.path, { required, evaluated });
      } else {
        violations.push(...evaluated.roots.map((directRoot) => directOutputViolation(bundleDir, record, resultPath, directRoot)));
      }
    }
  }

  try {
    runtimeReceipt = validateSubmitRuntimeReceipt(bundleDir, record, {
      normalizations,
      allowNonceNormalization: resultPathInsideAssignedDir,
    });
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'runtime_receipt', bundleDir, record, resultPath }));
  }

  if (manifest && normalizedResult) {
    try {
      validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
    } catch (error) {
      const requiredPath = (manifest.output_contract.required_outputs || [])
        .find((required) => error.message.includes(required.path))?.path;
      if (requiredPath && directOutputPasses.has(requiredPath)
        && /missing required output path|must use canonical role|duplicate normalized path/i.test(error.message)) {
        error.candidate_scope_hint = 'mechanical';
      }
      if (/output_files\[\] is required/i.test(error.message)
        && (manifest.output_contract.required_outputs || []).length > 0
        && directOutputPasses.size === manifest.output_contract.required_outputs.length) {
        error.candidate_scope_hint = 'mechanical';
      }
      violations.push(...violationsForError(error, { phase: 'output_files', bundleDir, record, resultPath }));
    }

    try {
      cacheValidation = validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, {
        record,
        normalizations,
        writeCanonicalCache: false,
      });
      cacheValid = true;
    } catch (error) {
      violations.push(...violationsForError(error, { phase: 'cache_trails', bundleDir, record, resultPath }));
    }

    if (cacheValid) {
      try {
        validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract, {
          virtualCachePages: cacheValidation.virtualCachePages,
          manifest,
        });
      } catch (error) {
        violations.push(...violationsForError(error, { phase: 'source_claims', bundleDir, record, resultPath }));
      }
    }
  }

  let sourceContribution = null;
  if (manifest && normalizedResult && violations.length === 0) {
    try {
      sourceContribution = deriveSourceContribution(record, manifest, normalizedResult, directOutputEvaluations);
    } catch (error) {
      violations.push(...violationsForError(error, {
        phase: 'direct_outputs', bundleDir, record, resultPath,
      }));
    }
  }

  return finalizeCandidatePlan({
    index,
    record,
    manifest,
    queue,
    result: normalizedResult,
    result_hash: resultHash,
    runtime_receipt_content: runtimeReceipt?.canonical_content || null,
    runtime_receipt: runtimeReceipt,
    normalizations,
    virtual_cache_pages: cacheValidation.virtualCachePages,
    source_contribution: sourceContribution,
    violations,
  });
}

function publicNormalizations(normalizations) {
  return normalizations.map((item) => ({ ...item }));
}

function invokeTransactionMutationBoundary(transactionHooks, boundary, context = {}) {
  if (typeof transactionHooks?.afterMutationBoundary === 'function') {
    transactionHooks.afterMutationBoundary({ boundary, ...context });
  }
}

export function drySubmitWorkUnit(bundleDir, { work_id, resultPath } = {}) {
  const plan = collectDrySubmitPlan(bundleDir, { work_id, resultPath });
  const submitIntegrity = plan.record
    ? evaluateWorkUnitSubmitIntegrity(bundleDir, {
        index: plan.index,
        record: plan.record,
        resultPath,
      })
    : null;
  const reasonCodes = [...new Set((plan.violations || []).map((item) => item.code))];
  const base = {
    ok: (plan.violations || []).length === 0 && (submitIntegrity?.ok ?? true),
    dry_run: true,
    side_effects: false,
    work_id: plan.record?.work_id || work_id,
    queue_item_id: plan.record?.queue_item_id || null,
    status: plan.record?.status || 'unknown',
    expected_submit: (plan.violations || []).length === 0 && (submitIntegrity?.ok ?? true) ? 'pass' : 'fail',
    reason_codes: [...new Set([...reasonCodes, ...(submitIntegrity?.roots || []).map((item) => item.code)])],
    violations: plan.violations || [],
    selected_primary: plan.selected_primary || null,
    recommended_action: plan.candidate_projection.recommended_action,
    primary_root_code: plan.candidate_projection.primary_root_code,
    normalizations: publicNormalizations(plan.normalizations || []),
    candidate_result_path: resultPath ? path.resolve(resultPath) : null,
    advice: (plan.violations || []).length === 0
      ? 'Dry-submit passed. Run formal operate-work-unit submit to persist ledger, queue, result, receipt, trace, and cache authority.'
      : 'Repair the reported candidate result, receipt, output, cache, source-claim, or queue-binding issues, then rerun dry-submit or formal submit.',
  };
  if (submitIntegrity) base.submit_integrity = submitIntegrity;
  if (plan.record) {
    base.attempt_disposition = projectWorkUnitAttemptDisposition(bundleDir, plan.record, {
      operation: 'submit_work_unit',
      rerun: drySubmitRerun(bundleDir, plan.record.work_id, resultPath),
    });
  }
  if (base.ok) {
    base.result_hash = plan.result_hash;
    base.virtual_cache_pages = [...(plan.virtual_cache_pages || new Map()).keys()];
  }
  return base;
}

export function lateSubmitWorkUnit(bundleDir, { work_id, resultPath, reason, transactionHooks = null } = {}) {
  const planned = prepareLateSubmitWorkUnit(bundleDir, { work_id, resultPath, reason });
  if (planned.rejection) return planned.rejection;
  if (planned.idempotent) return planned.idempotent;

  const prepared = planned.prepared;
  try {
    const cachePageTargets = [...(prepared.virtual_cache_pages || new Map()).keys()]
      .map((trail) => path.join(trail, 'page.md'));
    const retryStatusTargets = (prepared.cleanupPlan.supersededRetryWorkIds || [])
      .map((retryWorkId) => prepared.index.work_units[retryWorkId]?.paths?.status_ref)
      .filter(Boolean);
    return withWorkUnitTransaction(bundleDir, 'late_submit_work_unit', {
      targetWorkIds: [prepared.record.work_id, ...(prepared.cleanupPlan.supersededRetryWorkIds || [])],
      targetQueueItemIds: [prepared.record.queue_item_id],
      mutationTargets: [
        prepared.record.paths.result_ref,
        prepared.record.paths.runtime_receipt_ref,
        prepared.record.paths.status_ref,
        ...retryStatusTargets,
        ...cachePageTargets,
        WORK_UNIT_OUTPUT_LEDGER,
        WORK_UNIT_INDEX_TARGET,
        QUEUE_TARGET,
      ],
      rerun: formalSubmitRerun(bundleDir, prepared.record.work_id, resultPath, {
        late: true,
        reason: prepared.reason,
      }),
      hooks: transactionHooks,
    }, ({ tx_id }) => {
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

      let snapshot = null;
      try {
        const activePrepared = {
          ...validateSubmitPlan(bundleDir, {
            work_id: record.work_id,
            resultPath,
            acceptedStatus: 'timed_out',
            requireQueueInFlight: false,
          }),
          reason: prepared.reason,
          cleanupPlan: currentCleanupPlan,
        };
        index = activePrepared.index;
        record = index.work_units[activePrepared.record.work_id];
        const cachePageRefs = [...(activePrepared.virtual_cache_pages || new Map()).keys()]
          .map((trail) => path.join(trail, 'page.md'));
        snapshot = captureLateSubmitSnapshot(bundleDir, [record, ...retryRecords], cachePageRefs);
        const submittedAt = now();
        const ledgerRow = buildLedgerRow({
          record,
          result: activePrepared.result,
          resultHash: activePrepared.result_hash,
          declaredAt: submittedAt,
          sourceContribution: activePrepared.source_contribution,
          auditFields: {
            late_accept: true,
            late_accept_reason: activePrepared.reason,
            terminal_status_before_accept: 'timed_out',
            superseded_retry_work_ids: currentCleanupPlan.supersededRetryWorkIds,
          },
        });
        const ledgerRecordHash = ledgerRow.ledger_record_hash;

        applyCandidateCanonicalizations(bundleDir, activePrepared);
        writeJson(path.join(bundleDir, record.paths.result_ref), activePrepared.result);
        writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), activePrepared.runtime_receipt_content);
        writeSubmittedStatusAndHashes(bundleDir, record, {
          resultHash: activePrepared.result_hash,
          ledgerRecordHash,
          submittedAt,
        });
        record.status = 'submitted';
        record.terminal_at = submittedAt;
        record.late_accept_context = {
          late_accept_reason: activePrepared.reason,
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: [...currentCleanupPlan.supersededRetryWorkIds],
        };
        index.work_units[record.work_id] = record;
        invokeTransactionMutationBoundary(transactionHooks, 'targeted_attempt_saved', {
          bundleDir,
          work_id: record.work_id,
        });

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
        invokeTransactionMutationBoundary(transactionHooks, 'retry_statuses_saved', {
          bundleDir,
          work_id: record.work_id,
          retry_work_ids: retryRecords.map((retry) => retry.work_id),
        });

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

        appendLedgerRow(bundleDir, ledgerRow);
        invokeTransactionMutationBoundary(transactionHooks, 'ledger_appended', {
          bundleDir,
          work_id: record.work_id,
        });
        const savedIndex = saveWorkUnitIndex(bundleDir, index);
        invokeTransactionMutationBoundary(transactionHooks, 'index_saved', {
          bundleDir,
          work_id: record.work_id,
        });
        const savedQueue = saveQueue(bundleDir, nextQueue);
        invokeTransactionMutationBoundary(transactionHooks, 'queue_saved', {
          bundleDir,
          work_id: record.work_id,
        });

        const postcondition = verifyLateSubmitDurablePostcondition(bundleDir, record, {
          supersededRetryWorkIds: activePrepared.cleanupPlan.supersededRetryWorkIds,
          lateAcceptContext: record.late_accept_context,
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
          ledger_record_hash: ledgerRecordHash,
          output_count: (ledgerRow.output_files || []).length,
          cache_trail_count: (ledgerRow.cache_trails || []).length,
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
          ledger_record_hash: ledgerRecordHash,
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
          ledger_record_hash: ledgerRecordHash,
          late_accept: true,
        });
        logToRun(bundleDir, 'info', 'work_unit_late_submitted', {
          kind: 'work_unit_late_submit',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
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
          ledger_record_hash: ledgerRecordHash,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          late_accept_reason: activePrepared.reason,
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: activePrepared.cleanupPlan.supersededRetryWorkIds,
          queue: postcondition.queue || savedQueue,
          index: postcondition.index || savedIndex,
          normalizations: activePrepared.normalizations,
        };
      } catch (error) {
        const rollback = snapshot
          ? restoreSubmitSnapshot(snapshot)
          : { ok: true, failures: [] };
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

export function recoverWorkUnitDeclaration(bundleDir, { work_id, transactionHooks = null } = {}) {
  let prepared;
  try {
    prepared = prepareCurrentDeclarationRecovery(bundleDir, work_id);
  } catch (error) {
    return declarationRecoveryFailure(bundleDir, work_id, error);
  }
  if (prepared.existing) {
    return {
      ok: true,
      recovered: true,
      changed: false,
      idempotent: true,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      status: 'submitted',
      ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
      ledger_record_hash: prepared.ledgerRow.ledger_record_hash,
    };
  }

  try {
    return withWorkUnitTransaction(bundleDir, 'recover_work_unit_declaration', {
      targetWorkIds: [prepared.record.work_id],
      targetQueueItemIds: [prepared.record.queue_item_id],
      mutationTargets: [WORK_UNIT_OUTPUT_LEDGER],
      rerun: declarationRecoveryCommand(bundleDir, prepared.record.work_id),
      hooks: transactionHooks,
    }, ({ tx_id }) => {
      const active = prepareCurrentDeclarationRecovery(bundleDir, work_id);
      if (active.existing) {
        return {
          ok: true,
          recovered: true,
          changed: false,
          idempotent: true,
          work_id: active.record.work_id,
          queue_item_id: active.record.queue_item_id,
          status: 'submitted',
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: active.ledgerRow.ledger_record_hash,
        };
      }

      const ledgerSnapshot = captureFileSnapshot(ledgerPath(bundleDir));
      try {
        writeRecoveredDeclaration(bundleDir, active);
        const restoredRows = readWorkUnitLedgerRows(bundleDir);
        const restored = restoredRows.filter((row) => row.work_id === active.record.work_id);
        if (restored.length !== 1 || restored[0].ledger_record_hash !== acceptedLedgerRecordHashFor(active.record)) {
          throw new Error(`recovered declaration durable postcondition failed for ${active.record.work_id}`);
        }
        traceWorkUnitEvent(bundleDir, 'work_unit_declaration_recovered', {
          tx_id,
          work_id: active.record.work_id,
          queue_item_id: active.record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: active.ledgerRow.ledger_record_hash,
          reconstruction_source: active.reconstructionSource,
          legacy_reconstruction: active.legacy,
        });
        logToRun(bundleDir, 'info', 'work_unit_declaration_recovered', {
          kind: 'work_unit_declaration_recovery',
          tx_id,
          work_id: active.record.work_id,
          queue_item_id: active.record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: active.ledgerRow.ledger_record_hash,
          reconstruction_source: active.reconstructionSource,
          legacy_reconstruction: active.legacy,
        });
        return {
          ok: true,
          recovered: true,
          changed: true,
          idempotent: false,
          work_id: active.record.work_id,
          queue_item_id: active.record.queue_item_id,
          status: 'submitted',
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: active.ledgerRow.ledger_record_hash,
          reconstruction_source: active.reconstructionSource,
          legacy_reconstruction: active.legacy,
        };
      } catch (error) {
        restoreFileSnapshot(ledgerPath(bundleDir), ledgerSnapshot);
        throw error;
      }
    });
  } catch (error) {
    return declarationRecoveryFailure(bundleDir, work_id, error);
  }
}

export function inspectWorkUnitDeclarationRecovery(bundleDir, { work_id } = {}) {
  try {
    const prepared = prepareCurrentDeclarationRecovery(bundleDir, work_id);
    return {
      eligible: true,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      status: prepared.record.status,
      declaration_present: prepared.existing,
      ledger_record_hash: prepared.ledgerRow.ledger_record_hash,
      reconstruction_source: prepared.reconstructionSource,
      legacy_reconstruction: prepared.legacy,
      operation: declarationRecoveryCommand(bundleDir, prepared.record.work_id),
    };
  } catch (error) {
    const failure = declarationRecoveryFailure(bundleDir, work_id, error);
    return {
      eligible: false,
      work_id: work_id || null,
      declaration_present: false,
      repair_kind: failure.repair_kind,
      missing_fact: failure.missing_fact,
      boundary: failure.write_to,
      operation: failure.rerun,
    };
  }
}

export function submitWorkUnit(bundleDir, {
  work_id,
  resultPath,
  afterQueueSave = null,
  transactionHooks = null,
} = {}) {
  let prepared;
  try {
    prepared = prepareWorkUnitSubmit(bundleDir, { work_id, resultPath });
  } catch (error) {
    const preflight = error.candidate_plan || collectDrySubmitPlan(bundleDir, { work_id, resultPath });
    return recordSubmitRejection(bundleDir, {
      work_id,
      resultPath,
      reason: error.message || String(error),
      violations: preflight.violations || [],
      candidateProjection: preflight.candidate_projection || null,
      selectedPrimary: preflight.selected_primary || null,
      transactionHooks,
    });
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

  const outerIntegrity = evaluateWorkUnitSubmitIntegrity(bundleDir, {
    index: prepared.index,
    record: prepared.record,
    resultPath,
  });
  if (!outerIntegrity.ok) {
    return {
      ok: false,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      reason_code: outerIntegrity.selected_primary.code,
      repair_kind: outerIntegrity.selected_primary.repair_kind,
      missing_fact: outerIntegrity.selected_primary.missing_fact,
      write_to: outerIntegrity.selected_primary.write_to,
      rerun: outerIntegrity.selected_primary.rerun,
      transaction: outerIntegrity.transaction,
      submit_integrity: outerIntegrity,
    };
  }

  try {
    const cachePageTargets = [...(prepared.virtual_cache_pages || new Map()).keys()]
      .map((trail) => path.join(trail, 'page.md'));
    return withWorkUnitTransaction(bundleDir, 'submit_work_unit', {
      targetWorkIds: [prepared.record.work_id],
      targetQueueItemIds: [prepared.record.queue_item_id],
      mutationTargets: [
        prepared.record.paths.result_ref,
        prepared.record.paths.runtime_receipt_ref,
        prepared.record.paths.status_ref,
        ...cachePageTargets,
        WORK_UNIT_OUTPUT_LEDGER,
        WORK_UNIT_INDEX_TARGET,
        QUEUE_TARGET,
      ],
      rerun: formalSubmitRerun(bundleDir, prepared.record.work_id, resultPath),
      hooks: transactionHooks,
    }, ({ tx_id }) => {
      const activePrepared = prepareWorkUnitSubmit(bundleDir, { work_id, resultPath });
      if (activePrepared.duplicate) {
        return {
          ok: true,
          duplicate: true,
          work_id: activePrepared.record.work_id,
          queue_item_id: activePrepared.record.queue_item_id,
          status: 'submitted',
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          normalizations: activePrepared.normalizations,
        };
      }
      const lockedIntegrity = evaluateWorkUnitSubmitIntegrity(bundleDir, {
        index: activePrepared.index,
        record: activePrepared.record,
        resultPath,
        currentTxId: tx_id,
      });
      if (!lockedIntegrity.ok) {
        return {
          ok: false,
          work_id: activePrepared.record.work_id,
          queue_item_id: activePrepared.record.queue_item_id,
          reason_code: lockedIntegrity.selected_primary.code,
          repair_kind: lockedIntegrity.selected_primary.repair_kind,
          missing_fact: lockedIntegrity.selected_primary.missing_fact,
          write_to: lockedIntegrity.selected_primary.write_to,
          rerun: lockedIntegrity.selected_primary.rerun,
          submit_integrity: lockedIntegrity,
        };
      }
      const index = activePrepared.index;
      let queue = activePrepared.queue;
      const record = index.work_units[activePrepared.record.work_id];
      const cachePageRefs = [...(activePrepared.virtual_cache_pages || new Map()).keys()]
        .map((trail) => path.join(trail, 'page.md'));
      const snapshot = captureSubmitSnapshot(bundleDir, record, cachePageRefs);
      const submittedAt = now();
      const ledgerRow = buildLedgerRow({
        record,
        result: activePrepared.result,
        resultHash: activePrepared.result_hash,
        declaredAt: submittedAt,
        sourceContribution: activePrepared.source_contribution,
      });
      const ledgerRecordHash = ledgerRow.ledger_record_hash;

      try {
        applyCandidateCanonicalizations(bundleDir, activePrepared);
        writeJson(path.join(bundleDir, record.paths.result_ref), activePrepared.result);
        writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), activePrepared.runtime_receipt_content);
        writeSubmittedStatusAndHashes(bundleDir, record, {
          resultHash: activePrepared.result_hash,
          ledgerRecordHash,
          submittedAt,
        });
        record.status = 'submitted';
        record.terminal_at = submittedAt;
        index.work_units[record.work_id] = record;

        delete queue.delegated_in_flight[record.queue_item_id];
        queue.terminal_history.push({
          queue_item_id: record.queue_item_id,
          terminal_status: 'done',
          completed_at: submittedAt,
          work_id: record.work_id,
          reason: activePrepared.result.summary || undefined,
          item: activePrepared.manifest.queue_item,
        });
        queue = refill(queue);

        appendLedgerRow(bundleDir, ledgerRow);
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
          ledger_record_hash: ledgerRecordHash,
          output_count: (ledgerRow.output_files || []).length,
          cache_trail_count: (ledgerRow.cache_trails || []).length,
        });
        logToRun(bundleDir, 'info', 'work_unit_ledger_appended', {
          kind: 'ledger_append',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: ledgerRecordHash,
        });
        if (activePrepared.normalizations.length > 0) {
          traceWorkUnitEvent(bundleDir, 'work_unit_submit_normalized', {
            tx_id,
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            kind: record.kind,
            normalization_count: activePrepared.normalizations.length,
            normalizations: activePrepared.normalizations,
          });
          logToRun(bundleDir, 'info', 'work_unit_submit_normalized', {
            kind: 'work_unit_submit',
            tx_id,
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            normalization_count: activePrepared.normalizations.length,
            normalizations: activePrepared.normalizations,
          });
        }
        traceWorkUnitEvent(bundleDir, 'work_unit_submitted', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          wave: record.wave,
          kind: record.kind,
          receipt_nonce: record.receipt_nonce,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
        });
        logToRun(bundleDir, 'info', 'work_unit_submitted', {
          kind: 'work_unit_submit',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
        });

        return {
          ok: true,
          duplicate: false,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          status: 'submitted',
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          queue: postcondition.queue,
          index: postcondition.index,
          normalizations: activePrepared.normalizations,
        };
      } catch (error) {
        const rollback = restoreSubmitSnapshot(snapshot);
        error.submit_failure_payload = buildSubmitDurabilityFailure(activePrepared, error, rollback);
        throw error;
      }
    });
  } catch (error) {
    if (error.submit_failure_payload) return error.submit_failure_payload;
    throw error;
  }
}
