// @impl DEW-024, WPG-016
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
  WorkUnitLedgerRecordSchema,
  WorkUnitStatusFileSchema,
  WorkUnitSubmissionV1StatusFileSchema,
} from '../schema/contracts/work-unit.mjs';
import {
  computeWorkUnitLedgerRecordHash,
  readJson,
  readWorkUnitLedgerRows,
} from './work-unit-utils.mjs';
import { WORK_UNIT_OUTPUT_LEDGER } from './work-unit-constants.mjs';

function integrityError(reasonCode, message) {
  const error = new Error(message);
  error.reason_code = reasonCode;
  return error;
}

export function isMarkedWorkUnitSubmission(record) {
  return record?.submission_contract_version === WORK_UNIT_SUBMISSION_CONTRACT_VERSION;
}

function workUnitLike(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.work_id === 'string' && value.work_id.startsWith('wu-');
}

export function readSubmittedLedgerDocument(bundleDir) {
  const file = path.join(bundleDir, WORK_UNIT_OUTPUT_LEDGER);
  if (!existsSync(file)) {
    return {
      file_present: false,
      valid_rows: [],
      attributable_invalid_rows: [],
      unattributable_errors: [],
      legacy_non_work_unit_rows: [],
      duplicate_work_ids: [],
    };
  }
  const raw = readFileSync(file, 'utf-8');
  const validRows = [];
  const attributableInvalidRows = [];
  const unattributableErrors = [];
  const legacyRows = [];
  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      unattributableErrors.push({ line: index + 1, reason: `invalid JSON: ${error.message || String(error)}` });
      return;
    }
    if (!workUnitLike(value)) {
      legacyRows.push(value);
      return;
    }
    const parsed = WorkUnitLedgerRecordSchema.safeParse(value);
    if (!parsed.success) {
      attributableInvalidRows.push({
        line: index + 1,
        work_id: value.work_id,
        reason: parsed.error.issues.map((issue) => `${issue.path.join('/') || '<root>'}: ${issue.message}`).join('; '),
        value,
      });
      return;
    }
    const row = parsed.data;
    const expectedHash = computeWorkUnitLedgerRecordHash(row);
    if (row.ledger_record_hash !== expectedHash) {
      attributableInvalidRows.push({
        line: index + 1,
        work_id: row.work_id,
        reason: `ledger_record_hash mismatch: expected ${expectedHash} got ${row.ledger_record_hash}`,
        value: row,
      });
      return;
    }
    validRows.push(row);
  });
  const counts = new Map();
  for (const row of [...validRows, ...attributableInvalidRows]) {
    counts.set(row.work_id, (counts.get(row.work_id) || 0) + 1);
  }
  return {
    file_present: true,
    valid_rows: validRows,
    attributable_invalid_rows: attributableInvalidRows,
    unattributable_errors: unattributableErrors,
    legacy_non_work_unit_rows: legacyRows,
    duplicate_work_ids: [...counts.entries()].filter(([, count]) => count > 1).map(([workId]) => workId),
  };
}

export function acceptedLedgerRecordHashFor(record) {
  return isMarkedWorkUnitSubmission(record)
    ? record.accepted_ledger_record_hash || null
    : record.ledger_record_hash || null;
}

export function readSubmittedStatusFile(bundleDir, record) {
  const statusPath = path.join(bundleDir, record.paths.status_ref);
  if (!existsSync(statusPath)) {
    throw integrityError('submitted_status_missing', `submitted status file is missing: ${record.paths.status_ref}`);
  }
  const statusBytes = readJson(statusPath);
  return isMarkedWorkUnitSubmission(record)
    ? WorkUnitSubmissionV1StatusFileSchema.parse(statusBytes)
    : WorkUnitStatusFileSchema.parse(statusBytes);
}

export function validateCurrentSubmittedLedgerFact({ record, row, status }) {
  if (!record || record.status !== 'submitted') {
    throw integrityError('submitted_status_invalid', 'current submitted ledger evaluation requires a submitted index record');
  }
  if (!row || row.work_id !== record.work_id) {
    throw integrityError('submitted_declaration_missing', `submitted ledger row is missing for ${record.work_id}`);
  }
  if (!status || status.work_id !== record.work_id || status.status !== 'submitted') {
    throw integrityError('submitted_status_binding_invalid', `submitted status/index binding mismatch for ${record.work_id}`);
  }
  for (const field of ['queue_item_id', 'wave', 'kind', 'producer_rule', 'creation_reason', 'receipt_nonce']) {
    if (row[field] !== record[field]) {
      throw integrityError('submitted_ledger_binding_invalid', `ledger/index mismatch for ${record.work_id}: ${field}`);
    }
  }
  if (row.work_unit_ref !== record.paths.work_unit_dir
    || row.result_ref !== record.paths.result_ref
    || row.runtime_receipt_ref !== record.paths.runtime_receipt_ref) {
    throw integrityError('submitted_ledger_binding_invalid', `ledger/index path binding mismatch for ${record.work_id}`);
  }

  if (isMarkedWorkUnitSubmission(record)) {
    if (record.result_hash !== undefined || record.ledger_record_hash !== undefined) {
      throw integrityError('submitted_representation_mixed', `marked submitted index record ${record.work_id} carries legacy current hash mirrors`);
    }
    if (status.result_hash !== undefined || status.ledger_record_hash !== undefined) {
      throw integrityError('submitted_representation_mixed', `marked submitted status ${record.work_id} carries legacy current hash mirrors`);
    }
    if (record.accepted_ledger_record_hash !== row.ledger_record_hash) {
      throw integrityError('submitted_acceptance_fingerprint_mismatch', `marked acceptance fingerprint mismatch for ${record.work_id}`);
    }
    return {
      branch: 'work-unit.submission.v1',
      record,
      row,
      status,
      result_hash: row.result_hash,
      ledger_record_hash: row.ledger_record_hash,
      accepted_ledger_record_hash: record.accepted_ledger_record_hash,
    };
  }

  if (record.accepted_ledger_record_hash !== undefined) {
    throw integrityError('submitted_representation_mixed', `legacy submitted index record ${record.work_id} carries a marked acceptance fingerprint`);
  }
  if (!record.result_hash || !record.ledger_record_hash
    || record.result_hash !== row.result_hash
    || record.ledger_record_hash !== row.ledger_record_hash
    || status.result_hash !== row.result_hash
    || status.ledger_record_hash !== row.ledger_record_hash) {
    throw integrityError('submitted_legacy_hash_mismatch', `legacy submitted hash mirrors disagree for ${record.work_id}`);
  }
  return {
    branch: 'legacy',
    record,
    row,
    status,
    result_hash: row.result_hash,
    ledger_record_hash: row.ledger_record_hash,
    accepted_ledger_record_hash: row.ledger_record_hash,
  };
}

export function loadCurrentSubmittedLedgerFact(bundleDir, record, { ledgerRows = null } = {}) {
  const rows = ledgerRows || readWorkUnitLedgerRows(bundleDir);
  const matches = rows.filter((row) => row.work_id === record.work_id);
  if (matches.length === 0) {
    throw integrityError('submitted_declaration_missing', `submitted ledger row is missing for ${record.work_id}`);
  }
  if (matches.length > 1) {
    throw integrityError('submitted_declaration_duplicate', `multiple submitted ledger rows exist for ${record.work_id}`);
  }
  const status = readSubmittedStatusFile(bundleDir, record);
  return validateCurrentSubmittedLedgerFact({ record, row: matches[0], status });
}
