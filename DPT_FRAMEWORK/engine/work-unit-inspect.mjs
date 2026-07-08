// @impl EXO-001, FIO-001
// Work-unit inspect: list dirs, transaction/receipt/beacon/ledger issues, inspect entry point.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

import {
  WORK_UNIT_REQUIRED_RECEIPT_FIELDS,
} from './work-unit-constants.mjs';
import {
  rel,
  readJson,
  hashValue,
  isSafeBundleRelative,
  emitWorkUnitInspectDiagnostics,
  readWorkUnitLedgerRows,
  validateCacheTrailContent,
} from './work-unit-utils.mjs';
import {
  workUnitsRoot,
  workUnitIndexPath,
  transactionDir,
  validateWorkIdBinding,
  computeWorkUnitHealthProjection,
  computeStatusCounts,
  computeInspectProjection,
  countTraceEvents,
  loadWorkUnitIndex,
} from './work-unit-index.mjs';
import {
  WORK_UNIT_BEACON_SCHEMA_VERSION,
  WorkUnitBeaconSchema,
  WorkUnitManifestSchema,
  WorkUnitResultSchema,
  WorkUnitRuntimeReceiptEventSchema,
} from '../schema/contracts/work-unit.mjs';

function listWorkUnitDirs(bundleDir) {
  const root = workUnitsRoot(bundleDir);
  if (!existsSync(root)) return [];
  const dirs = [];
  for (const waveName of readdirSync(root, { withFileTypes: true })) {
    if (!waveName.isDirectory() || !/^wave[0-9]+$/.test(waveName.name)) continue;
    const waveDir = path.join(root, waveName.name);
    for (const entry of readdirSync(waveDir, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(rel(bundleDir, path.join(waveDir, entry.name)));
    }
  }
  return dirs;
}

function transactionIssues(bundleDir) {
  const dir = transactionDir(bundleDir);
  if (!existsSync(dir)) return [];
  const issues = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const tx = readJson(path.join(dir, entry.name));
    if (tx.status !== 'committed') issues.push(`uncommitted transaction ${entry.name}: status=${tx.status || '<missing>'}`);
  }
  return issues;
}

function runtimeReceiptIssues(bundleDir, record) {
  const receiptPath = path.join(bundleDir, record.paths.runtime_receipt_ref);
  if (!existsSync(receiptPath)) return [`missing runtime receipt: ${record.paths.runtime_receipt_ref}`];
  const issues = [];
  const raw = readFileSync(receiptPath, 'utf-8');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  lines.forEach((line, index) => {
    let parsed;
    try {
      parsed = WorkUnitRuntimeReceiptEventSchema.parse(JSON.parse(line));
    } catch (error) {
      issues.push(`runtime receipt invalid for ${record.work_id} line ${index + 1}: ${error.message}`);
      return;
    }
    for (const field of WORK_UNIT_REQUIRED_RECEIPT_FIELDS) {
      if (parsed[field] !== record[field]) {
        issues.push(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
      }
    }
  });
  return issues;
}

function beaconIssues(bundleDir, record) {
  const beaconPath = path.join(bundleDir, record.paths.beacon_ref);
  if (!existsSync(beaconPath)) return [`missing beacon: ${record.paths.beacon_ref}`];
  const issues = [];
  try {
    const beacon = WorkUnitBeaconSchema.parse(readJson(beaconPath));
    for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
      if (beacon[field] !== record[field]) issues.push(`beacon/index mismatch for ${record.work_id}: ${field}`);
    }
    if (beacon.work_unit_dir !== record.paths.work_unit_dir) issues.push(`beacon/index mismatch for ${record.work_id}: work_unit_dir`);
    if (beacon.result_schema_ref !== record.paths.result_schema_ref) issues.push(`beacon/index mismatch for ${record.work_id}: result_schema_ref`);
    if (beacon.runtime_receipt_ref !== record.paths.runtime_receipt_ref) issues.push(`beacon/index mismatch for ${record.work_id}: runtime_receipt_ref`);
  } catch (error) {
    issues.push(`beacon invalid for ${record.work_id}: ${error.message}`);
  }
  return issues;
}

function ledgerIssues(bundleDir, index) {
  const issues = [];
  const unsupportedLedger = path.join(workUnitsRoot(bundleDir), '_ledger.jsonl');
  if (existsSync(unsupportedLedger)) {
    issues.push('unsupported delegated ledger present: _work_units/_ledger.jsonl; production submissions use rb_output_declarations.jsonl');
  }

  let rows = [];
  try {
    rows = readWorkUnitLedgerRows(bundleDir);
  } catch (error) {
    issues.push(`work-unit ledger invalid: ${error.message}`);
    return issues;
  }
  const rowsByWorkId = new Map();
  for (const row of rows) {
    if (rowsByWorkId.has(row.work_id)) issues.push(`duplicate work-unit ledger row: ${row.work_id}`);
    rowsByWorkId.set(row.work_id, row);
    const record = index.work_units[row.work_id];
    if (!record) {
      issues.push(`ledger row without index record: ${row.work_id}`);
      continue;
    }
    if (record.status !== 'submitted') issues.push(`ledger row for non-submitted work unit: ${row.work_id} status=${record.status}`);
  }

  for (const [workId, record] of Object.entries(index.work_units || {})) {
    if (record.status !== 'submitted') continue;
    const row = rowsByWorkId.get(workId);
    if (!row) {
      issues.push(`submitted work unit missing ledger row: ${workId}`);
      continue;
    }
    for (const field of ['queue_item_id', 'wave', 'kind', 'producer_rule', 'creation_reason', 'receipt_nonce']) {
      if (row[field] !== record[field]) issues.push(`ledger/index mismatch for ${workId}: ${field}`);
    }
    if (row.work_unit_ref !== record.paths.work_unit_dir) issues.push(`ledger/index mismatch for ${workId}: work_unit_ref`);
    if (row.result_ref !== record.paths.result_ref) issues.push(`ledger/index mismatch for ${workId}: result_ref`);
    if (row.runtime_receipt_ref !== record.paths.runtime_receipt_ref) issues.push(`ledger/index mismatch for ${workId}: runtime_receipt_ref`);
    if (row.result_hash !== record.result_hash) issues.push(`ledger/index mismatch for ${workId}: result_hash`);
    if (row.ledger_record_hash !== record.ledger_record_hash) issues.push(`ledger/index mismatch for ${workId}: ledger_record_hash`);

    const resultPath = path.join(bundleDir, record.paths.result_ref);
    if (!existsSync(resultPath)) {
      issues.push(`submitted work unit missing result file: ${record.paths.result_ref}`);
    } else {
      try {
        const result = WorkUnitResultSchema.parse(readJson(resultPath));
        if (hashValue(result) !== record.result_hash) issues.push(`submitted result hash mismatch: ${workId}`);
      } catch (error) {
        issues.push(`submitted result invalid for ${workId}: ${error.message}`);
      }
    }

    for (const output of row.output_files || []) {
      if (!isSafeBundleRelative(output.path) || !existsSync(path.join(bundleDir, output.path))) {
        issues.push(`ledger output file missing or unsafe for ${workId}: ${output.path}`);
      }
    }
    for (const trail of row.cache_trails || []) {
      const full = path.join(bundleDir, trail);
      if (!isSafeBundleRelative(trail) || !trail.startsWith('_cache/') || !existsSync(full) || !statSync(full).isDirectory()) {
        issues.push(`ledger cache trail missing or unsafe for ${workId}: ${trail}`);
        continue;
      }
      try {
        validateCacheTrailContent(full, trail);
      } catch (error) {
        issues.push(`ledger cache trail incomplete for ${workId}: ${error.message}`);
      }
    }
  }

  return issues;
}

export function inspectWorkUnits(bundleDir, { nowMs = Date.now(), emitDiagnostics = false, diagnosticSource = 'work-unit-inspect' } = {}) {
  const issues = [];
  const indexPath = workUnitIndexPath(bundleDir);
  const root = workUnitsRoot(bundleDir);
  const emptyProjection = computeWorkUnitHealthProjection({}, {
    nowMs,
    lateSubmitRejections: countTraceEvents(bundleDir, 'work_unit_late_submit_rejected'),
  });
  if (!existsSync(indexPath) && !existsSync(root)) {
    return { passed: true, check: true, inspect: [], projection: emptyProjection, advice: 'No work units have been allocated.' };
  }

  issues.push(...transactionIssues(bundleDir));

  let index;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (error) {
    const invalidIssues = [`work-unit index invalid: ${error.message}`];
    if (emitDiagnostics) emitWorkUnitInspectDiagnostics(bundleDir, { issues: invalidIssues, source: diagnosticSource });
    return {
      passed: false,
      check: false,
      inspect: invalidIssues,
      projection: emptyProjection,
      advice: '_work_units/_index.json is Engine-owned. Restore it from a checkpoint or repair through Engine work-unit tooling before continuing; do not hand-edit work-unit authority files.',
    };
  }

  const projection = computeWorkUnitHealthProjection(index.work_units, {
    nowMs,
    lateSubmitRejections: countTraceEvents(bundleDir, 'work_unit_late_submit_rejected'),
  });

  const expectedCounts = computeStatusCounts(index.work_units);
  if (JSON.stringify(expectedCounts) !== JSON.stringify(index.status_counts)) {
    issues.push(`status-count drift: expected ${JSON.stringify(expectedCounts)} got ${JSON.stringify(index.status_counts)}`);
  }

  const expectedProjection = computeInspectProjection(index.work_units, index.inspect_projection.generated_at);
  const projectionComparable = ({ total, by_wave, nonterminal }) => ({ total, by_wave, nonterminal });
  if (JSON.stringify(projectionComparable(expectedProjection)) !== JSON.stringify(projectionComparable(index.inspect_projection))) {
    issues.push('inspect projection drift: total/by_wave/nonterminal do not match work_units');
  }
  issues.push(...ledgerIssues(bundleDir, index));

  const nonterminalByQueueItem = new Map();
  const indexedDirs = new Set();
  for (const [workId, record] of Object.entries(index.work_units)) {
    try {
      validateWorkIdBinding({ ...record, kindRegistry: index.kind_registry });
    } catch (error) {
      issues.push(error.message);
    }
    indexedDirs.add(record.paths.work_unit_dir);
    if (record.status === 'claimed') {
      const existing = nonterminalByQueueItem.get(record.queue_item_id);
      if (existing) issues.push(`duplicate non-terminal queue binding for ${record.queue_item_id}: ${existing} and ${workId}`);
      nonterminalByQueueItem.set(record.queue_item_id, workId);
      if (Date.parse(record.deadline_at) < nowMs) issues.push(`expired lease: ${workId} deadline_at=${record.deadline_at}`);
    }

    const manifestPath = path.join(bundleDir, record.paths.manifest_ref);
    if (!existsSync(manifestPath)) {
      issues.push(`missing manifest: ${record.paths.manifest_ref}`);
      continue;
    }
    try {
      const manifest = WorkUnitManifestSchema.parse(readJson(manifestPath));
      validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
      for (const field of ['queue_item_id', 'kind', 'receipt_nonce', 'queue_item_snapshot_hash']) {
        if (manifest[field] !== record[field]) issues.push(`manifest/index mismatch for ${workId}: ${field}`);
      }
      if (manifest.paths.work_unit_dir !== record.paths.work_unit_dir) issues.push(`manifest/index mismatch for ${workId}: work_unit_dir`);
    } catch (error) {
      issues.push(`manifest invalid for ${workId}: ${error.message}`);
    }
    issues.push(...beaconIssues(bundleDir, record));
    issues.push(...runtimeReceiptIssues(bundleDir, record));
  }

  for (const [waveName, waveState] of Object.entries(index.waves || {})) {
    for (const [id, batch] of Object.entries(waveState.batches || {})) {
      const wave = Number.parseInt(waveName.replace('wave', ''), 10);
      const maxClaim = Math.max(0, ...Object.values(index.work_units)
        .filter((record) => record.wave === wave && record.batch_id === id)
        .map((record) => record.claim_index));
      if (batch.next_claim_index <= maxClaim) {
        issues.push(`counter drift: ${waveName}/${id} next_claim_index=${batch.next_claim_index} max_claim_index=${maxClaim}`);
      }
    }
  }

  for (const dir of listWorkUnitDirs(bundleDir)) {
    if (!indexedDirs.has(dir)) issues.push(`orphan work-unit directory: ${dir}`);
  }

  if (issues.length === 0) {
    return { passed: true, check: true, inspect: [], projection, advice: 'Work-unit index and envelope surfaces are consistent.' };
  }
  if (emitDiagnostics) emitWorkUnitInspectDiagnostics(bundleDir, { issues, source: diagnosticSource });
  return { passed: false, check: false, inspect: issues, projection, advice: 'Resolve work-unit index/envelope drift before running delegated gates.' };
}
