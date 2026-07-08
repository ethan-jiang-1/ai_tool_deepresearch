// @impl DEW-002, DEW-004, EXO-001
// Work-unit lifecycle: create, parse phase, eligibility, claim, close, batch open.

import path from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  WORK_UNIT_MANIFEST_SCHEMA_VERSION,
  WorkUnitManifestSchema,
  WorkUnitStatusFileSchema,
} from '../schema/contracts/work-unit.mjs';
import {
  now,
  clone,
  writeJson,
  traceWorkUnitEvent,
  kindContractForQueueItem,
} from './work-unit-utils.mjs';
import {
  allocateWorkId,
  validateWorkIdBinding,
  computeStatusCounts,
  loadWorkUnitIndex,
  saveWorkUnitIndex,
  requireWorkUnitRecord,
  withWorkUnitTransaction,
  waveKey,
  batchId,
} from './work-unit-index.mjs';
import {
  refsForWorkUnit,
  writeWorkUnitEnvelope,
  spawnPromptForWorkUnit,
} from './work-unit-envelope.mjs';
import {
  readAndValidateManifest,
} from './work-unit-validation.mjs';

import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { loadQueue, saveQueue } from './queue-manager-lifecycle.mjs';
import { preempt, refill } from './queue-manager-window.mjs';
import { logToRun } from './logger.mjs';

function createWorkUnitInIndex(bundleDir, index, {
  queueItem,
  wave,
  kind = queueItem.kind,
  timeout_ms,
  creation_reason = 'claim',
  batchReason = 'initial_phase_drain',
  runtime_refs = {},
} = {}) {
  if (!queueItem?.queue_item_id) throw new Error('queueItem.queue_item_id is required');
  if (!kind) throw new Error('work-unit kind is required');
  const timeoutMs = timeout_ms || queueItem.targets?.delegates?.timeout_ms || 600000;
  const allocation = allocateWorkId(index, {
    wave,
    kind,
    queue_item_id: queueItem.queue_item_id,
    batchReason,
  });
  const claimedAt = now();
  const deadlineAt = new Date(Date.parse(claimedAt) + timeoutMs).toISOString();
  const { refs } = refsForWorkUnit(bundleDir, allocation);
  const receiptNonce = `wu-${randomUUID()}`;
  const kindContract = kindContractForQueueItem(queueItem, kind);
  const manifest = WorkUnitManifestSchema.parse({
    schema_version: WORK_UNIT_MANIFEST_SCHEMA_VERSION,
    ...allocation,
    task_brief: kindContract.task_brief,
    queue_item_id: queueItem.queue_item_id,
    producer_rule: queueItem.producer_rule,
    creation_reason,
    queue_item_snapshot_hash: queueItemSnapshotHash(queueItem),
    receipt_nonce: receiptNonce,
    claimed_at: claimedAt,
    timeout_ms: timeoutMs,
    deadline_at: deadlineAt,
    output_contract: kindContract.output_contract,
    cache_policy: kindContract.cache_policy,
    runtime_refs,
    paths: refs,
    queue_item: clone(queueItem),
  });
  validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
  writeWorkUnitEnvelope(bundleDir, manifest);
  const record = {
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    wave: manifest.wave,
    batch_id: manifest.batch_id,
    batch_index: manifest.batch_index,
    claim_index: manifest.claim_index,
    attempt_index: manifest.attempt_index,
    kind: manifest.kind,
    kind_code: manifest.kind_code,
    status: 'claimed',
    producer_rule: manifest.producer_rule,
    creation_reason: manifest.creation_reason,
    queue_item_snapshot_hash: manifest.queue_item_snapshot_hash,
    receipt_nonce: manifest.receipt_nonce,
    claimed_at: manifest.claimed_at,
    timeout_ms: manifest.timeout_ms,
    deadline_at: manifest.deadline_at,
    runtime_refs: manifest.runtime_refs,
    paths: manifest.paths,
  };
  index.work_units[record.work_id] = record;
  return { record, manifest };
}

export function createWorkUnit(bundleDir, options = {}) {
  return withWorkUnitTransaction(bundleDir, 'create_work_unit', () => {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const { record, manifest } = createWorkUnitInIndex(bundleDir, index, options);
    const saved = saveWorkUnitIndex(bundleDir, index);
    return { index: saved, record: saved.work_units[record.work_id], manifest, spawn_prompt: spawnPromptForWorkUnit(manifest, bundleDir) };
  });
}

export function parsePhase(phase) {
  const match = String(phase || '').match(/^wave(?<wave>[0-9]+)$/);
  if (!match?.groups) throw new Error(`--phase must be waveN, got '${phase}'`);
  return Number.parseInt(match.groups.wave, 10);
}

export function defaultKindForWave(wave) {
  if (wave === 0) return 'wave0_source_intake';
  if (wave === 1) return 'wave1_topic_deepening';
  if (wave === 2) return 'wave2_targeted_evidence';
  return null;
}

export function itemWave(item) {
  if (Number.isInteger(item.payload?.wave)) return item.payload.wave;
  if (Number.isInteger(item.lineage?.wave)) return item.lineage.wave;
  if (typeof item.kind === 'string') {
    const match = item.kind.match(/^wave(?<wave>[0-9]+)_/);
    if (match?.groups) return Number.parseInt(match.groups.wave, 10);
  }
  return null;
}

export function isEligibleDelegatedItem(item, wave) {
  if (!item || item.targets?.delegates?.to !== 'sub-agent') return false;
  const waveFromItem = itemWave(item);
  return waveFromItem === null || waveFromItem === wave;
}

export function countUnclaimedDelegated(queue, wave) {
  return [...queue.active_window, ...queue.refill_pool]
    .filter((item) => isEligibleDelegatedItem(item, wave)).length;
}

export function phaseInFlight(queue, wave) {
  return Object.values(queue.delegated_in_flight || {})
    .filter((entry) => entry.wave === wave);
}

export function openWorkUnitBatch(bundleDir, { phase, reason, lineage = {} } = {}) {
  const wave = parsePhase(phase);
  if (!reason) throw new Error('--reason is required');
  return withWorkUnitTransaction(bundleDir, 'open_work_unit_batch', ({ tx_id }) => {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const key = waveKey(wave);
    if (!index.waves[key]) index.waves[key] = { current_batch_index: 0, batches: {} };
    const waveState = index.waves[key];
    const nextIndex = Math.max(1, waveState.current_batch_index + 1);
    waveState.current_batch_index = nextIndex;
    const id = batchId(nextIndex);
    waveState.batches[id] = {
      batch_index: nextIndex,
      batch_reason: reason,
      next_claim_index: 1,
      opened_at: now(),
      lineage: {
        prior_work_unit_count: Object.values(index.work_units || {}).filter((record) => record.wave === wave).length,
        prior_status_counts: computeStatusCounts(Object.fromEntries(
          Object.entries(index.work_units || {}).filter(([, record]) => record.wave === wave),
        )),
        ...lineage,
      },
    };
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    traceWorkUnitEvent(bundleDir, 'work_unit_batch_opened', {
      tx_id,
      phase,
      wave,
      batch_id: id,
      batch_reason: reason,
    });
    logToRun(bundleDir, 'info', 'work_unit_batch_opened', {
      kind: 'work_unit_batch',
      tx_id,
      phase,
      batch_id: id,
      batch_reason: reason,
    });
    return { ok: true, phase, wave, batch_id: id, batch_reason: reason, index: savedIndex };
  });
}

export function claimWorkUnits(bundleDir, { phase, count = 1, batchReason = 'initial_phase_drain' } = {}) {
  const wave = parsePhase(phase);
  const requestedCount = Number.parseInt(String(count), 10);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) throw new Error('--count must be a positive integer');

  const previewQueue = loadQueue(bundleDir);
  const previewFront = previewQueue.active_window[0];
  if (!previewFront || !isEligibleDelegatedItem(previewFront, wave) || !(previewFront.kind || defaultKindForWave(wave))) {
    const blockedBy = previewFront && !isEligibleDelegatedItem(previewFront, wave) ? previewFront.queue_item_id : null;
    return {
      ok: false,
      requested_count: requestedCount,
      claimed_count: 0,
      claimed_work_ids: [],
      in_flight_count: phaseInFlight(previewQueue, wave).length,
      unclaimed_delegated_count: countUnclaimedDelegated(previewQueue, wave),
      blocked_by_queue_item_id: blockedBy,
      phase_drained: countUnclaimedDelegated(previewQueue, wave) === 0 && phaseInFlight(previewQueue, wave).length === 0,
      prompt_refs: [],
      queue: previewQueue,
    };
  }

  return withWorkUnitTransaction(bundleDir, 'claim_work_units', ({ tx_id }) => {
    let queue = previewQueue;
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const claimed = [];
    let blockedBy = null;

    for (let i = 0; i < requestedCount; i += 1) {
      const front = queue.active_window[0];
      if (!front) break;
      if (!isEligibleDelegatedItem(front, wave)) {
        blockedBy = front.queue_item_id;
        break;
      }
      const kind = front.kind || defaultKindForWave(wave);
      if (!kind) {
        blockedBy = front.queue_item_id;
        break;
      }
      if (queue.delegated_in_flight[front.queue_item_id]) {
        throw new Error(`queue_item_id ${front.queue_item_id} is already delegated in flight`);
      }

      queue.active_window.shift();
      const { record, manifest } = createWorkUnitInIndex(bundleDir, index, {
        queueItem: front,
        wave,
        kind,
        creation_reason: 'claim',
        batchReason,
      });
      queue.delegated_in_flight[front.queue_item_id] = {
        queue_item_id: front.queue_item_id,
        work_id: record.work_id,
        wave: record.wave,
        batch_id: record.batch_id,
        kind: record.kind,
        attempt_index: record.attempt_index,
        queue_item_snapshot_hash: record.queue_item_snapshot_hash,
        claimed_at: record.claimed_at,
        timeout_ms: record.timeout_ms,
        deadline_at: record.deadline_at,
      };
      claimed.push({ record, manifest });
      const claimEvent = record.attempt_index > 1 ? 'work_unit_retry_claimed' : 'work_unit_claimed';
      traceWorkUnitEvent(bundleDir, claimEvent, {
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        attempt_index: record.attempt_index,
      });
      logToRun(bundleDir, 'info', claimEvent, {
        kind: 'queue_claim',
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        work_unit_kind: record.kind,
        attempt_index: record.attempt_index,
      });
    }

    queue = refill(queue);
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    const savedQueue = saveQueue(bundleDir, queue);
    const inFlight = phaseInFlight(savedQueue, wave);
    const unclaimedDelegated = countUnclaimedDelegated(savedQueue, wave);
    const response = {
      ok: claimed.length > 0,
      requested_count: requestedCount,
      claimed_count: claimed.length,
      claimed_work_ids: claimed.map(({ record }) => record.work_id),
      in_flight_count: inFlight.length,
      unclaimed_delegated_count: unclaimedDelegated,
      blocked_by_queue_item_id: blockedBy,
      phase_drained: unclaimedDelegated === 0 && inFlight.length === 0,
      prompt_refs: claimed.map(({ record, manifest }) => ({
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        task_ref: manifest.paths.task_ref,
        beacon_ref: manifest.paths.beacon_ref,
        result_schema_ref: manifest.paths.result_schema_ref,
        runtime_receipt_ref: manifest.paths.runtime_receipt_ref,
        spawn_prompt: spawnPromptForWorkUnit(manifest, bundleDir),
      })),
    };
    traceWorkUnitEvent(bundleDir, claimed.length > 0 ? 'work_unit_batch_claimed' : 'work_unit_claim_rejected', {
      tx_id,
      requested_count: requestedCount,
      claimed_count: claimed.length,
      blocked_by_queue_item_id: blockedBy,
      phase: `wave${wave}`,
    });
    return { ...response, queue: savedQueue, index: savedIndex };
  });
}

function statusToEvent(status) {
  if (status === 'failed') return 'work_unit_failed';
  if (status === 'timed_out') return 'work_unit_timed_out';
  if (status === 'abandoned') return 'work_unit_abandoned';
  return 'work_unit_terminal';
}

function statusToQueueTerminal(status) {
  if (status === 'failed') return 'failed';
  if (status === 'abandoned') return 'cancelled';
  return 'blocked';
}

export function closeWorkUnitAttempt(bundleDir, { work_id, status, reason } = {}) {
  if (!['failed', 'timed_out', 'abandoned'].includes(status)) throw new Error(`unsupported terminal status: ${status}`);
  if (!reason) throw new Error('--reason is required');

  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  if (record.status === status && record.terminal_reason === reason) {
    return { ok: true, duplicate: true, work_id: record.work_id, queue_item_id: record.queue_item_id, status: record.status, reason };
  }
  if (record.status === 'submitted') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      inspect: [`work_id ${record.work_id} is already submitted`],
      advice: 'Submitted attempts cannot be terminalized.',
    };
  }
  if (record.status !== 'claimed') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      inspect: [`work_id ${record.work_id} is already ${record.status}`],
      advice: 'A terminal attempt can only be repeated idempotently with the same status and reason.',
    };
  }

  const manifest = readAndValidateManifest(bundleDir, index, record);
  return withWorkUnitTransaction(bundleDir, `work_unit_${status}`, ({ tx_id }) => {
    let queue = loadQueue(bundleDir);
    const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
    if (!inFlight || inFlight.work_id !== record.work_id) {
      throw new Error(`queue in-flight binding missing for ${record.work_id}`);
    }
    delete queue.delegated_in_flight[record.queue_item_id];

    const closedAt = now();
    record.status = status;
    record.terminal_reason = reason;
    record.terminal_at = closedAt;
    index.work_units[record.work_id] = record;
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
      work_id: record.work_id,
      status,
      updated_at: closedAt,
    }));

    if (status === 'timed_out') {
      const retryItem = {
        ...manifest.queue_item,
        status: 'queued',
        updated_at: closedAt,
        lineage: {
          ...(manifest.queue_item.lineage || {}),
          retry_of_work_id: record.work_id,
          retry_reason: reason,
          attempt_index: record.attempt_index + 1,
        },
      };
      queue = preempt(queue, retryItem, { reason: 'work_unit_timeout_retry' });
    } else {
      queue.terminal_history.push({
        queue_item_id: record.queue_item_id,
        terminal_status: statusToQueueTerminal(status),
        completed_at: closedAt,
        work_id: record.work_id,
        reason,
        item: manifest.queue_item,
      });
      queue = refill(queue);
    }

    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    const savedQueue = saveQueue(bundleDir, queue);
    const event = statusToEvent(status);
    traceWorkUnitEvent(bundleDir, event, {
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      wave: record.wave,
      kind: record.kind,
      receipt_nonce: record.receipt_nonce,
      reason,
    });
    logToRun(bundleDir, status === 'timed_out' ? 'warn' : 'info', event, {
      kind: 'work_unit_terminal',
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status,
      reason,
      runtime_refs: record.runtime_refs || {},
    });
    return {
      ok: true,
      duplicate: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status,
      reason,
      retry_requeued: status === 'timed_out',
      queue: savedQueue,
      index: savedIndex,
    };
  });
}
