// work-unit-submit-late-retry.mjs
// Audited late-submit flow (C4 T3, move-only).
// @impl WUC-006, WUC-007

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
  WORK_UNIT_INDEX_TARGET,
  QUEUE_TARGET,
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
import {
  captureFileSnapshot,
  restoreFileSnapshot,
  captureSubmitSnapshot,
  restoreSubmitSnapshot,
  writeSubmittedStatusAndHashes,
  verifySubmitDurablePostcondition,
  buildSubmitDurabilityFailure,
  readQueueSideEffectFree,
  submittedReplacementConflicts,
  targetLedgerRows,
  verifyLateSubmitDurablePostcondition,
  captureLateSubmitSnapshot,
  buildLateSubmitDurabilityFailure,
  buildLedgerRow,
} from './work-unit-submit-snapshot.mjs';
import {
  reasonCodeForSubmit,
  drySubmitRerun,
  validateSubmitPlan,
  applyCandidateCanonicalizations,
  formalSubmitRerun,
} from './work-unit-submit.mjs';

export function planLateSubmitRetryCleanup(queue, index, record) {
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

export function applyLateSubmitQueueCleanup(queue, record, cleanupPlan) {
  let q = clone(queue);
  q.active_window = (q.active_window || []).filter((item) => item.queue_item_id !== record.queue_item_id);
  q.refill_pool = (q.refill_pool || []).filter((item) => item.queue_item_id !== record.queue_item_id);
  delete q.delegated_in_flight[record.queue_item_id];
  return q;
}

export function lateSubmitRejection(bundleDir, {
  work_id,
  resultPath,
  record = null,
  reason,
  reasonCode = 'invalid_late_submit',
  audit = true,
}) {
  const payload = {
    ok: false,
    late_accept: false,
    work_id: record?.work_id || work_id,
    queue_item_id: record?.queue_item_id || null,
    status: record?.status || 'unknown',
    reason,
    reason_code: reasonCode,
    candidate_result_path: resultPath ? path.resolve(resultPath) : null,
    attempt_disposition: record ? projectWorkUnitAttemptDisposition(bundleDir, record, {
      operation: 'late_submit_work_unit',
      rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
    }) : null,
    inspect: [reason],
    advice: record?.status === 'claimed'
      ? 'Use normal operate-work-unit submit for claimed attempts; late-submit is only for audited timed_out recovery.'
      : 'Use late-submit only for an eligible timed_out work unit with no submitted replacement; otherwise retry through normal Engine work-unit paths.',
  };
  if (record && audit) {
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

export function reasonCodeForLateSubmit(message) {
  if (/reason/i.test(message)) return 'late_accept_reason_required';
  if (/submitted replacement|replacement ledger|second terminal|terminal_history/i.test(message)) return 'submitted_replacement_conflict';
  if (/failed|abandoned/i.test(message)) return 'terminal_status_not_recoverable';
  if (/claimed/i.test(message)) return 'claimed_requires_normal_submit';
  if (/submitted/i.test(message)) return 'normal_submitted_rejects_late_submit';
  if (/retry|queued|in flight|ambiguous/i.test(message)) return 'ambiguous_retry_state';
  return reasonCodeForSubmit(message);
}

export function cleanupPlanSignature(plan) {
  return JSON.stringify({
    queued: (plan.queuedLocations || []).map((entry) => ({
      location: entry.location,
      queue_item_id: entry.item?.queue_item_id || null,
      retry_of_work_id: entry.item?.lineage?.retry_of_work_id || null,
    })),
    supersededRetryWorkIds: plan.supersededRetryWorkIds || [],
  });
}

export function loadLateSubmitTarget(bundleDir, work_id) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  return { index, record };
}

export function prepareLateSubmitIdempotent(bundleDir, { index, record, ledgerRows, resultPath }) {
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
  const result = parsedResult;
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

export function prepareLateSubmitWorkUnit(bundleDir, { work_id, resultPath, reason } = {}) {
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

  try {
    assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  } catch (error) {
    return {
      rejection: lateSubmitRejection(bundleDir, {
        work_id,
        resultPath,
        record,
        reason: error.message || String(error),
        reasonCode: error.reason_code || reasonCodeForLateSubmit(error.message || String(error)),
        audit: false,
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

export function invokeTransactionMutationBoundary(transactionHooks, boundary, context = {}) {
  if (typeof transactionHooks?.afterMutationBoundary === 'function') {
    transactionHooks.afterMutationBoundary({ boundary, ...context });
  }
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
