// work-unit-submit-declaration-recovery.mjs
// Declaration recovery flow (C4 T4, move-only): rebuilds missing ledger rows
// from submit evidence with zero canonicalization.
// @impl WUC-005, CHI-004

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
  requireDirectOutputs,
  deriveSourceContribution,
} from './work-unit-submit.mjs';

export function declarationRecoveryCommand(bundleDir, workId) {
  return [
    'node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(String(workId || '<work-id>')),
  ].join(' ');
}

export function declarationRecoveryFailure(bundleDir, workId, error) {
  const reasonCode = error?.reason_code || error?.recovery_reason_code || 'declaration_recovery_prerequisite_failed';
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
    write_to: `submitted declaration recovery prerequisites for ${workId || '<work-id>'}; repair via operate-work-unit submit / late-submit / a fresh claim (the submit/late-submit/new-attempt boundary); do not edit rb_output_declarations.jsonl, index, status, queue, or hashes manually`,
    rerun: declarationRecoveryCommand(bundleDir, workId),
    inspect: [missingFact],
    advice: 'Repair only through the existing owner of the failed direct fact, then rerun the same recover-declaration checkpoint.',
  };
}

export function readOriginalSubmitEvidence(bundleDir, record, { resultHash, ledgerRecordHash }) {
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
        const tx = WorkUnitTransactionV2JournalSchema.parse(JSON.parse(readFileSync(path.join(txRoot, name), 'utf-8')));
        if (tx.status === 'committed'
          && ['submit_work_unit', 'late_submit_work_unit'].includes(tx.operation)
          && tx.target_work_ids.includes(record.work_id)
          && tx.target_queue_item_ids.includes(record.queue_item_id)) {
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

export function recoveryAuditOptions(record, evidence) {
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
      source: 'recorded_late_submit_evidence',
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

export function prepareCurrentDeclarationRecovery(bundleDir, workId) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, workId);
  assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  if (record.status !== 'submitted') {
    throw new Error(`work_id ${record.work_id} is ${record.status}; recover-declaration requires an already-submitted attempt`);
  }
  const acceptedLedgerRecordHash = acceptedLedgerRecordHashFor(record);
  if (!acceptedLedgerRecordHash || !record.terminal_at) {
    throw new Error(`submitted index record ${record.work_id} lacks accepted ledger hash or terminal_at`);
  }

  const status = readSubmittedStatusFile(bundleDir, record);
  if (status.work_id !== record.work_id || status.status !== 'submitted') {
    throw new Error(`submitted status/index binding mismatch for ${record.work_id}`);
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
  const result = parsedResult;
  const resultHash = hashValue(result);

  validateSubmitRuntimeReceipt(bundleDir, record, { normalizations });
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
    if (record.wave === 0 && record.kind === 'wave0_source_intake') {
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
      item.transaction.settled_at,
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
      const key = JSON.stringify(candidate);
      matches.set(key, { row: candidate, source: audit.source });
    }
  }
  if (matches.size === 0) {
    const error = new Error(`missing_contract: no legal recovery can reproduce ${record.work_id}'s accepted declaration; do not append provenance.`);
    error.recovery_reason_code = 'missing_contract';
    if (record.wave === 0 && record.kind === 'wave0_source_intake') {
      error.recovery_reason_code = 'missing_source_contribution_no_legal_recovery';
    }
    throw error;
  }
  if (matches.size > 1) {
    const error = new Error(`missing_contract: declaration reconstruction is ambiguous for ${record.work_id}`);
    error.recovery_reason_code = 'missing_contract';
    throw error;
  }
  const [{ row: ledgerRow, source: reconstructionSource }] = [...matches.values()];
  if (!timestampsUnified && evidence.length === 0 && existingRows.length === 0) {
    const error = new Error(`missing_contract: declaration timestamps for ${record.work_id} require original submit/transaction evidence`);
    error.recovery_reason_code = 'missing_contract';
    throw error;
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
    replaceLine: invalidTargetRows[0]?.line || null,
  };
}

export function writeRecoveredDeclaration(bundleDir, prepared) {
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
        });
        logToRun(bundleDir, 'info', 'work_unit_declaration_recovered', {
          kind: 'work_unit_declaration_recovery',
          tx_id,
          work_id: active.record.work_id,
          queue_item_id: active.record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: active.ledgerRow.ledger_record_hash,
          reconstruction_source: active.reconstructionSource,
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
