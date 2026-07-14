// @impl DEW-002, DEW-004, SDC-001, SDC-002, SDC-003, FRE-005
// Work-unit index: path helpers, ID parsing/validation, status counting, index CRUD, ID allocation, record lookup, transactions.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  WORK_UNITS,
  DEFAULT_KIND_REGISTRY,
} from './work-unit-constants.mjs';
import {
  now,
  clone,
  writeJson,
  readJson,
  traceWorkUnitEvent,
} from './work-unit-utils.mjs';
import { logToRun } from './logger.mjs';
import {
  WORK_UNIT_ID_PATTERN,
  WORK_UNIT_INDEX_SCHEMA_VERSION,
  WorkUnitIndexSchema,
} from '../schema/contracts/work-unit.mjs';

export function workUnitsRoot(bundleDir) {
  return path.join(bundleDir, WORK_UNITS.ROOT);
}

export function workUnitIndexPath(bundleDir) {
  return path.join(bundleDir, WORK_UNITS.INDEX);
}

export function transactionDir(bundleDir) {
  return path.join(bundleDir, WORK_UNITS.TRANSACTIONS);
}

export function ensureWorkUnitDirs(bundleDir) {
  mkdirSync(workUnitsRoot(bundleDir), { recursive: true });
  mkdirSync(transactionDir(bundleDir), { recursive: true });
}

export function parseWorkId(workId) {
  const match = String(workId).match(WORK_UNIT_ID_PATTERN);
  if (!match?.groups) {
    throw new Error(`Invalid work_id '${workId}': expected wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}`);
  }
  return {
    work_id: workId,
    wave: Number.parseInt(match.groups.wave, 10),
    batch_id: `b${match.groups.batch}`,
    batch_index: Number.parseInt(match.groups.batch, 10),
    kind_code: match.groups.kind_code,
    claim_index: Number.parseInt(match.groups.claim, 10),
  };
}

export function resolveKindCode(kindRegistry, kind) {
  const code = kindRegistry.kinds[kind];
  if (!code) throw new Error(`No kind_code registered for kind '${kind}'`);
  if (kindRegistry.codes[code] !== kind) throw new Error(`Kind registry is not bijective for kind '${kind}' and code '${code}'`);
  return code;
}

export function resolveKind(kindRegistry, kindCode) {
  const kind = kindRegistry.codes[kindCode];
  if (!kind) throw new Error(`No kind registered for kind_code '${kindCode}'`);
  if (kindRegistry.kinds[kind] !== kindCode) throw new Error(`Kind registry is not bijective for code '${kindCode}' and kind '${kind}'`);
  return kind;
}

export function validateWorkIdBinding({ work_id, kindRegistry, wave, batch_id, batch_index, claim_index, kind, kind_code }) {
  const parsed = parseWorkId(work_id);
  const expectedKind = resolveKind(kindRegistry, parsed.kind_code);
  const issues = [];
  if (wave !== undefined && parsed.wave !== wave) issues.push(`wave mismatch: id=${parsed.wave} surface=${wave}`);
  if (batch_id !== undefined && parsed.batch_id !== batch_id) issues.push(`batch_id mismatch: id=${parsed.batch_id} surface=${batch_id}`);
  if (batch_index !== undefined && parsed.batch_index !== batch_index) issues.push(`batch_index mismatch: id=${parsed.batch_index} surface=${batch_index}`);
  if (claim_index !== undefined && parsed.claim_index !== claim_index) issues.push(`claim_index mismatch: id=${parsed.claim_index} surface=${claim_index}`);
  if (kind_code !== undefined && parsed.kind_code !== kind_code) issues.push(`kind_code mismatch: id=${parsed.kind_code} surface=${kind_code}`);
  if (kind !== undefined && expectedKind !== kind) issues.push(`kind mismatch: id=${expectedKind} surface=${kind}`);
  if (issues.length > 0) throw new Error(`work_id binding invalid for ${work_id}: ${issues.join('; ')}`);
  return { ...parsed, kind: expectedKind };
}

export function computeStatusCounts(workUnits) {
  const counts = { claimed: 0, submitted: 0, failed: 0, timed_out: 0, abandoned: 0 };
  for (const record of Object.values(workUnits || {})) counts[record.status] += 1;
  return counts;
}

export function countTraceEvents(bundleDir, eventName) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return 0;
  try {
    return readFileSync(tracePath, 'utf-8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((count, line) => {
        try {
          const entry = JSON.parse(line);
          return entry.event === eventName ? count + 1 : count;
        } catch {
          return count;
        }
      }, 0);
  } catch {
    return 0;
  }
}

export function computeWorkUnitHealthProjection(workUnits, { nowMs = Date.now(), lateSubmitRejections = 0 } = {}) {
  const statusCounts = computeStatusCounts(workUnits);
  const byWave = {};
  let expired = 0;
  let retries = 0;
  let submitRejections = 0;
  let nonterminal = 0;

  for (const record of Object.values(workUnits || {})) {
    const wave = `wave${record.wave}`;
    byWave[wave] = (byWave[wave] || 0) + 1;
    if (record.status === 'claimed') {
      nonterminal += 1;
      if (Number.isFinite(Date.parse(record.deadline_at)) && Date.parse(record.deadline_at) < nowMs) expired += 1;
    }
    if ((record.attempt_index || 1) > 1) retries += 1;
    if (record.last_submit_rejection) submitRejections += 1;
  }

  return {
    total: Object.keys(workUnits || {}).length,
    ...statusCounts,
    expired,
    retries,
    submit_rejections: submitRejections,
    late_submit_rejections: lateSubmitRejections,
    nonterminal,
    by_wave: byWave,
  };
}

export function computeInspectProjection(workUnits, generatedAt = now()) {
  const byWave = {};
  let nonterminal = 0;
  for (const record of Object.values(workUnits || {})) {
    const key = `wave${record.wave}`;
    byWave[key] = (byWave[key] || 0) + 1;
    if (record.status === 'claimed') nonterminal += 1;
  }
  return {
    generated_at: generatedAt,
    total: Object.keys(workUnits || {}).length,
    by_wave: byWave,
    nonterminal,
  };
}

export function createEmptyWorkUnitIndex({ kindRegistry = DEFAULT_KIND_REGISTRY } = {}) {
  const ts = now();
  return WorkUnitIndexSchema.parse({
    schema_version: WORK_UNIT_INDEX_SCHEMA_VERSION,
    kind_registry: clone(kindRegistry),
    waves: {},
    work_units: {},
    status_counts: computeStatusCounts({}),
    inspect_projection: computeInspectProjection({}, ts),
    updated_at: ts,
  });
}

export function loadWorkUnitIndex(bundleDir, { createIfMissing = false } = {}) {
  const filePath = workUnitIndexPath(bundleDir);
  if (!existsSync(filePath)) {
    if (!createIfMissing) {
      throw new Error(`Work-unit index does not exist at ${filePath}; missing existing work-unit authority. Rerun with the canonical absolute bundle_dir from the assigned task or beacon.`);
    }
    ensureWorkUnitDirs(bundleDir);
    const index = createEmptyWorkUnitIndex();
    writeJson(filePath, index);
    return index;
  }
  return WorkUnitIndexSchema.parse(readJson(filePath));
}

export function saveWorkUnitIndex(bundleDir, index, { recompute = true } = {}) {
  const next = clone(index);
  if (recompute) {
    const ts = now();
    next.status_counts = computeStatusCounts(next.work_units);
    next.inspect_projection = computeInspectProjection(next.work_units, ts);
    next.updated_at = ts;
  }
  const parsed = WorkUnitIndexSchema.parse(next);
  writeJson(workUnitIndexPath(bundleDir), parsed);
  return parsed;
}

export function waveKey(wave) {
  return `wave${wave}`;
}

export function batchId(batchIndex) {
  return `b${String(batchIndex).padStart(3, '0')}`;
}

export function claimId(claimIndex) {
  return `i${String(claimIndex).padStart(4, '0')}`;
}

export function ensureBatch(index, wave, { batchReason = 'initial_phase_drain', lineage } = {}) {
  const key = waveKey(wave);
  if (!index.waves[key]) index.waves[key] = { current_batch_index: 0, batches: {} };
  const waveState = index.waves[key];
  const id = batchId(waveState.current_batch_index);
  if (!waveState.batches[id]) {
    waveState.batches[id] = {
      batch_index: waveState.current_batch_index,
      batch_reason: batchReason,
      next_claim_index: 1,
      opened_at: now(),
      ...(lineage ? { lineage } : {}),
    };
  }
  return waveState.batches[id];
}

export function nextAttemptIndex(index, queueItemId) {
  let maxAttempt = 0;
  for (const record of Object.values(index.work_units || {})) {
    if (record.queue_item_id === queueItemId) maxAttempt = Math.max(maxAttempt, record.attempt_index);
  }
  return maxAttempt + 1;
}

export function allocateWorkId(index, { wave, kind, queue_item_id, batchReason = 'initial_phase_drain', lineage }) {
  const kind_code = resolveKindCode(index.kind_registry, kind);
  const batch = ensureBatch(index, wave, { batchReason, lineage });
  const claim_index = batch.next_claim_index;
  const work_id = `wu-w${wave}-${batchId(batch.batch_index)}-${kind_code}-${claimId(claim_index)}`;
  if (index.work_units[work_id]) throw new Error(`work_id collision: ${work_id}`);
  batch.next_claim_index += 1;
  return {
    work_id,
    wave,
    batch_id: batchId(batch.batch_index),
    batch_index: batch.batch_index,
    claim_index,
    kind,
    kind_code,
    attempt_index: nextAttemptIndex(index, queue_item_id),
  };
}

export function requireWorkUnitRecord(index, workId) {
  const record = index.work_units[workId];
  if (!record) throw new Error(`Unknown work_id '${workId}'`);
  return record;
}

export function transactionPath(bundleDir, txId) {
  return path.join(transactionDir(bundleDir), `${txId}.json`);
}

function writeTransaction(bundleDir, tx) {
  writeJson(transactionPath(bundleDir, tx.tx_id), tx);
}

export function withWorkUnitTransaction(bundleDir, operation, fn) {
  ensureWorkUnitDirs(bundleDir);
  const lockPath = path.join(bundleDir, WORK_UNITS.LOCK);
  mkdirSync(lockPath);
  const tx = {
    schema_version: 'work-unit.transaction.v1',
    tx_id: `tx-${Date.now()}-${randomUUID().slice(0, 8)}`,
    operation,
    status: 'started',
    started_at: now(),
    committed_at: null,
  };
  try {
    writeTransaction(bundleDir, tx);
    const result = fn({ tx_id: tx.tx_id });
    writeTransaction(bundleDir, { ...tx, status: 'committed', committed_at: now() });
    return result;
  } catch (error) {
    writeTransaction(bundleDir, { ...tx, status: 'failed', error: error.message || String(error), committed_at: null });
    try {
      traceWorkUnitEvent(bundleDir, 'work_unit_transaction_failed', {
        tx_id: tx.tx_id,
        operation,
        reason: error.message || String(error),
      });
      logToRun(bundleDir, 'error', 'work_unit_transaction_failed', {
        kind: 'work_unit_transaction',
        tx_id: tx.tx_id,
        operation,
        reason: error.message || String(error),
      });
    } catch { /* preserve original transaction error */ }
    throw error;
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}
