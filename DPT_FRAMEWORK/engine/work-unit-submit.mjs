// @impl DEW-005, FRE-005, EXO-001
// Work-unit submit: snapshot/rollback, durability, ledger row building, rejection, prepare and submit.

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

function buildLedgerRow({ record, result, resultHash, declaredAt }) {
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

function reasonCodeForSubmit(message) {
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

function prepareWorkUnitSubmit(bundleDir, { work_id, resultPath }) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  const normalizations = [];

  if (record.status === 'submitted') {
    const parsedResult = readAndValidateResult(bundleDir, resultPath, record, { normalizations });
    const result = normalizeWave1RequiredOutputRoles(parsedResult, record, normalizations, resultPath);
    const resultHash = hashValue(result);
    const ledgerRow = findSubmittedLedgerRow(bundleDir, record.work_id);
    if (record.result_hash === resultHash && ledgerRow?.ledger_record_hash === record.ledger_record_hash) {
      return { duplicate: true, index, record, result, result_hash: resultHash, ledger_record_hash: record.ledger_record_hash, ledger_row: ledgerRow, normalizations };
    }
    throw new Error(`different-content duplicate submit rejected for ${record.work_id}`);
  }
  if (record.status !== 'claimed') throw new Error(`work_id ${record.work_id} is ${record.status}; submit requires claimed`);

  const resultPathInsideAssignedDir = isPathInsideDir(resultPath, path.join(bundleDir, record.paths.work_unit_dir));
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
  const queue = validateQueueBindingForSubmit(bundleDir, record, manifest);
  validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
  validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, { record, normalizations });
  validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract);
  const ledgerRow = buildLedgerRow({ record, result: normalizedResult, resultHash, declaredAt: now() });
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
    ledger_row: ledgerRow,
    ledger_record_hash: ledgerRow.ledger_record_hash,
  };
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
