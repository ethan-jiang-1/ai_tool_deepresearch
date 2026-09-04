// @impl DEW-022, WUC-002, WUC-009, WPG-016, CHI-004, EXO-001, FIO-001
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
  validateWorkIdBinding,
  computeWorkUnitHealthProjection,
  computeStatusCounts,
  computeInspectProjection,
  countTraceEvents,
  loadWorkUnitIndex,
} from './work-unit-index.mjs';
import {
  WorkUnitManifestSchema,
  WorkUnitResultSchema,
  WorkUnitRuntimeReceiptEventSchema,
} from '../schema/contracts/work-unit.mjs';
import { readAndValidateBeacon } from './work-unit-validation.mjs';
import { classifyCompleteCurrentWorkUnitProfile } from './work-unit-current-profile.mjs';
import { loadCurrentSubmittedLedgerFact } from './work-unit-submitted-ledger.mjs';
import { projectWorkUnitAttemptDisposition } from './work-unit-attempt-disposition.mjs';
import { evaluateNormalizedSubmittedWorkUnitLedger } from './work-unit-supersession.mjs';
import { inspectWorkUnitTransaction } from './work-unit-transaction.mjs';

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
  const issues = [];
  const current = inspectWorkUnitTransaction(bundleDir, { operation: 'submit_work_unit' });
  if (current.disposition === 'busy') issues.push(`work-unit transaction busy: ${current.holder.tx_id}`);
  if (current.disposition === 'suspect_transaction') issues.push(current.missing_fact);
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
    if (record.actor_contract_version) {
      if (parsed.actor_contract_version !== record.actor_contract_version) issues.push(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: actor_contract_version`);
      if (parsed.execution_actor_class !== record.actor_execution.execution_actor_class) issues.push(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: execution_actor_class`);
    }
  });
  return issues;
}

function ledgerIssues(bundleDir, index) {
  const issues = [];
  const historicalWorkIds = new Set();
  const unsupportedLedger = path.join(workUnitsRoot(bundleDir), '_ledger.jsonl');
  if (existsSync(unsupportedLedger)) {
    issues.push('unsupported delegated ledger present: _work_units/_ledger.jsonl; production submissions use rb_output_declarations.jsonl');
  }

  let normalized;
  try {
    normalized = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
  } catch (error) {
    issues.push(`work-unit ledger invalid: ${error.message}`);
    return { issues, historicalWorkIds };
  }
  for (const historical of normalized.historical || []) historicalWorkIds.add(historical.work_id);

  for (const fact of normalized.facts) {
    const row = fact.ledger_row;
    const record = fact.index_record;
    const workId = record.work_id;
    const expectedActorClass = record.actor_execution.execution_actor_class;
    const ledgerActorClass = row.actor_execution?.execution_actor_class;
    if (ledgerActorClass !== expectedActorClass) issues.push(`ledger/index mismatch for ${workId}: execution_actor_class`);

    const resultPath = path.join(bundleDir, record.paths.result_ref);
    if (!existsSync(resultPath)) {
      issues.push(`submitted work unit missing result file: ${record.paths.result_ref}`);
    } else {
      try {
        const result = WorkUnitResultSchema.parse(readJson(resultPath));
        if (hashValue(result) !== row.result_hash) issues.push(`submitted result hash mismatch: ${workId}`);
        if (result.execution_actor_class !== expectedActorClass) issues.push(`result/index mismatch for ${workId}: execution_actor_class`);
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

  return { issues, historicalWorkIds };
}

export function inspectWorkUnits(bundleDir, {
  nowMs = Date.now(),
  emitDiagnostics = false,
  diagnosticSource = 'work-unit-inspect',
  requireExistingAuthority = false,
} = {}) {
  const issues = [];
  const indexPath = workUnitIndexPath(bundleDir);
  const root = workUnitsRoot(bundleDir);
  const emptyProjection = computeWorkUnitHealthProjection({}, {
    nowMs,
    lateSubmitRejections: countTraceEvents(bundleDir, 'work_unit_late_submit_rejected'),
  });
  if (!existsSync(indexPath) && !existsSync(root)) {
    if (requireExistingAuthority) {
      return {
        passed: false,
        check: false,
        inspect: [`Work-unit index does not exist at ${indexPath}; missing existing work-unit authority.`],
        projection: emptyProjection,
        advice: 'Rerun with the canonical absolute bundle_dir from the assigned task or beacon; do not create a nested bundle root.',
      };
    }
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
  const profiles = new Map(Object.values(index.work_units).map((record) => [
    record.work_id,
    classifyCompleteCurrentWorkUnitProfile(bundleDir, record),
  ]));
  for (const profile of profiles.values()) {
    if (!profile.ok) {
      issues.push(`unsupported current work-unit contract for ${profile.work_id || '<unknown>'}: ${profile.unsupported_discriminator}`);
    }
  }
  const actor_projection = Object.values(index.work_units)
    .filter((record) => profiles.get(record.work_id).ok)
    .map((record) => ({
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      intended_delegated_role_key: record.actor_execution.delegated_role_key,
      execution_actor_class: record.actor_execution.execution_actor_class,
      actor_observation: record.actor_execution.observation,
    }));
  const attempt_disposition = Object.values(index.work_units).map((record) => ({
    work_id: record.work_id,
    ...projectWorkUnitAttemptDisposition(bundleDir, record, { operation: 'submit_work_unit' }),
  }));

  const expectedCounts = computeStatusCounts(index.work_units);
  if (JSON.stringify(expectedCounts) !== JSON.stringify(index.status_counts)) {
    issues.push(`status-count drift: expected ${JSON.stringify(expectedCounts)} got ${JSON.stringify(index.status_counts)}`);
  }

  const expectedProjection = computeInspectProjection(index.work_units, index.inspect_projection.generated_at);
  const projectionComparable = ({ total, by_wave, nonterminal }) => ({ total, by_wave, nonterminal });
  if (JSON.stringify(projectionComparable(expectedProjection)) !== JSON.stringify(projectionComparable(index.inspect_projection))) {
    issues.push('inspect projection drift: total/by_wave/nonterminal do not match work_units');
  }
  const normalizedLedger = ledgerIssues(bundleDir, index);
  issues.push(...normalizedLedger.issues);

  const nonterminalByQueueItem = new Map();
  const indexedDirs = new Set();
  for (const [workId, record] of Object.entries(index.work_units)) {
    try {
      validateWorkIdBinding({ ...record, kindRegistry: index.kind_registry });
    } catch (error) {
      issues.push(error.message);
    }
    indexedDirs.add(record.paths.work_unit_dir);
    if (!profiles.get(record.work_id).ok) continue;
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
      if (record.actor_contract_version && JSON.stringify(manifest.actor_execution) !== JSON.stringify(record.actor_execution)) issues.push(`manifest/index mismatch for ${workId}: actor_execution`);
      try {
        readAndValidateBeacon(bundleDir, record, manifest);
      } catch (error) {
        issues.push(`beacon invalid for ${record.work_id}: ${error.message}`);
      }
    } catch (error) {
      issues.push(`manifest invalid for ${workId}: ${error.message}`);
    }
    if (!normalizedLedger.historicalWorkIds.has(record.work_id)) {
      issues.push(...runtimeReceiptIssues(bundleDir, record));
    }
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
    return { passed: true, check: true, inspect: [], projection, actor_projection, attempt_disposition, advice: 'Work-unit index and envelope surfaces are consistent.' };
  }
  if (emitDiagnostics) emitWorkUnitInspectDiagnostics(bundleDir, { issues, source: diagnosticSource });
  return { passed: false, check: false, inspect: issues, projection, actor_projection, attempt_disposition, advice: 'Resolve work-unit index/envelope drift before running delegated gates.' };
}
