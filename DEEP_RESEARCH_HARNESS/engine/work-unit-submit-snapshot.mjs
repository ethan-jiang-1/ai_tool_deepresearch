// work-unit-submit-snapshot.mjs
// Snapshot/durability mechanics shared by submit, late-submit and declaration-recovery
// flows (C4 T2, move-only). Hosts the shared durable-state queries (base layer).
// @impl WSU-001, WSU-006, WSU-008

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
  assertCompleteCurrentWorkUnitProfile,
} from './work-unit-validation.mjs';
import { evaluateDirectOutputTarget, semanticOrderedArrayDigest } from './helpers/direct-output-contract.mjs';
import { deriveWorkUnitCandidateProjection } from './work-unit-candidate-projection.mjs';
import {
  acceptedLedgerRecordHashFor,
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
import { WorkUnitTransactionV2JournalSchema } from '../schema/contracts/work-unit-transaction.mjs';
import { loadQueue, saveQueue } from './queue-manager-lifecycle.mjs';
import { refill } from './queue-manager-window.mjs';
import { logToRun } from './logger.mjs';
import { projectWorkUnitAttemptDisposition } from './work-unit-attempt-disposition.mjs';
import { evaluateWorkUnitSubmitIntegrity } from './work-unit-submit-integrity.mjs';

export function captureFileSnapshot(filePath) {
  return existsSync(filePath)
    ? { exists: true, content: readFileSync(filePath) }
    : { exists: false, content: null };
}

export function restoreFileSnapshot(filePath, snapshot) {
  if (snapshot.exists) {
    writeFileSync(filePath, snapshot.content);
  } else {
    rmSync(filePath, { force: true });
  }
}

export function captureSubmitSnapshot(bundleDir, record, extraRelativeRefs = []) {
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

export function restoreSubmitSnapshot(snapshot) {
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

export function writeSubmittedStatusAndHashes(bundleDir, record, { ledgerRecordHash, submittedAt }) {
  writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitSubmissionV1StatusFileSchema.parse({
    work_id: record.work_id,
    status: 'submitted',
    updated_at: submittedAt,
  }));
  delete record.result_hash;
  delete record.ledger_record_hash;
  record.accepted_ledger_record_hash = ledgerRecordHash;
}

export function verifySubmitDurablePostcondition(bundleDir, record) {
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

export function buildSubmitDurabilityFailure(prepared, error, rollback) {
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

export function readQueueSideEffectFree(bundleDir) {
  const filePath = queuePath(bundleDir);
  if (!existsSync(filePath)) throw new Error('rb_queue.json missing');
  return queueStateFromFile(JSON.parse(readFileSync(filePath, 'utf-8')), { queueId: path.basename(bundleDir) });
}

export function submittedReplacementConflicts(index, ledgerRows, record) {
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

export function targetLedgerRows(ledgerRows, record) {
  return ledgerRows.filter((row) => row.work_id === record.work_id);
}

export function verifyLateSubmitDurablePostcondition(bundleDir, record, {
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

export function captureLateSubmitSnapshot(bundleDir, records, extraRelativeRefs = []) {
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

export function buildLateSubmitDurabilityFailure(prepared, error, rollback) {
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

export function buildLedgerRow({ record, result, resultHash, declaredAt, auditFields = {}, sourceContribution = null }) {
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
    actor_execution: record.actor_execution,
    ...auditFields,
  };
  return WorkUnitLedgerRecordSchema.parse({
    ...base,
    ledger_record_hash: computeWorkUnitLedgerRecordHash(base),
  });
}
