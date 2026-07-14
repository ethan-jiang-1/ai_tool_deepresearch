// @impl DEW-006, DEW-014, AGQ-001, AGQ-014, SRL-004, LOG-006, FRE-005

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  loadQueue,
  makeItem,
  saveQueue,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  claimWorkUnits as claimWorkUnitsProduction,
  closeWorkUnitAttempt,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  openWorkUnitBatch,
  readWorkUnitLedgerRows,
  submitWorkUnit,
  timeoutPreflightWorkUnit,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-terminal-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function claimWorkUnits(dir, options) {
  return claimWorkUnitsProduction(dir, {
    ...options,
    actorObservation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: 'dpt-source-intake',
      reason_code: 'probe_succeeded',
    },
    executionActorClass: 'delegated_subagent',
  });
}

function delegated(id) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: id },
  });
}

function saveSeedQueue(dir, items) {
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

function afterDeadline(record, offsetMs = 1) {
  return Date.parse(record.deadline_at) + offsetMs;
}

function iso(ms) {
  return new Date(ms).toISOString();
}

function setFileMtime(filePath, ms) {
  const date = new Date(ms);
  utimesSync(filePath, date, date);
}

function writeReceiptProgress(dir, record, { event = 'fetch_batch_done', observedMs = Date.parse(record.claimed_at) + 1000 } = {}) {
  const receiptPath = path.join(dir, record.paths.runtime_receipt_ref);
  writeFileSync(receiptPath, `${JSON.stringify({
    schema_version: 'work-unit.receipt-event.v1',
    event,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: iso(observedMs),
  })}\n`);
  setFileMtime(receiptPath, observedMs);
  return receiptPath;
}

function writeMismatchedReceipt(dir, record, { observedMs = Date.parse(record.claimed_at) + 1000 } = {}) {
  const receiptPath = path.join(dir, record.paths.runtime_receipt_ref);
  writeFileSync(receiptPath, `${JSON.stringify({
    schema_version: 'work-unit.receipt-event.v1',
    event: 'fetch_batch_done',
    work_id: record.work_id,
    queue_item_id: 'wrong-queue-item',
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: iso(observedMs),
  })}\n`);
  setFileMtime(receiptPath, observedMs);
}

function writeSubmitReadyCandidate(dir, record, { resultPath = path.join(dir, record.paths.result_ref), observedMs = Date.parse(record.claimed_at) + 1000 } = {}) {
  const outputPath = `reference/${record.work_id}.md`;
  mkdirSync(path.join(dir, 'reference'), { recursive: true });
  writeFileSync(path.join(dir, outputPath), '# Source\n\nKey facts from a real fetched page.\n');

  const cacheTrail = `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), '# Captured Page\n\nFetched content for https://example.com/source.\n');
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), '{"url":"https://example.com/source"}\n');
  writeReceiptProgress(dir, record, { event: 'work_done', observedMs });

  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'ready',
    output_files: [{ path: outputPath, role: 'reference', source_url: 'https://example.com/source', source_slug: 'source' }],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  setFileMtime(resultPath, observedMs);
  return resultPath;
}

function writeRepairableCandidate(dir, record) {
  const resultPath = path.join(dir, record.paths.result_ref);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    summary: 'draft',
    output_files: [],
    cache_trails: [],
  }, null, 2)}\n`);
  return resultPath;
}

function writeWrongIdentityCandidate(dir, record) {
  const resultPath = path.join(dir, record.paths.result_ref);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: 'wu-w0-b000-src-i9999',
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    summary: 'wrong identity',
    output_files: [],
    cache_trails: [],
  }, null, 2)}\n`);
  return resultPath;
}

function snapshotPath(filePath) {
  if (!existsSync(filePath)) return { exists: false };
  const stat = statSync(filePath);
  if (stat.isDirectory()) {
    return {
      exists: true,
      type: 'dir',
      entries: Object.fromEntries(readdirSync(filePath).sort().map((entry) => [entry, snapshotPath(path.join(filePath, entry))])),
    };
  }
  return { exists: true, type: 'file', content: readFileSync(filePath, 'utf-8') };
}

function authoritySnapshot(dir) {
  return JSON.stringify(snapshotPath(dir));
}

function coreAuthoritySnapshot(dir) {
  return JSON.stringify({
    queue: snapshotPath(path.join(dir, 'rb_queue.json')),
    ledger: snapshotPath(path.join(dir, 'rb_output_declarations.jsonl')),
    workUnits: snapshotPath(path.join(dir, '_work_units')),
  });
}

function writeLateResult(dir, record) {
  const resultPath = path.join(dir, '_tmp', `${record.work_id}.late.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    summary: 'late',
    output_files: [],
    cache_trails: [],
  })}\n`);
  return resultPath;
}

describe('work-unit terminal attempts', () => {
  it('fail closes an attempt without queue completion or ledger coverage and rejects late submit', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];

      const closed = closeWorkUnitAttempt(dir, { work_id: record.work_id, status: 'failed', reason: 'sub-agent-error' });
      assert.equal(closed.ok, true);
      assert.equal(closed.status, 'failed');
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'], undefined);
      assert.equal(loadQueue(dir).terminal_history.at(-1).terminal_status, 'failed');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'failed');
      assert.throws(() => readFileSync(path.join(dir, 'rb_output_declarations.jsonl'), 'utf-8'), /ENOENT/);

      const late = submitWorkUnit(dir, { work_id: record.work_id, resultPath: writeLateResult(dir, record) });
      assert.equal(late.ok, false);
      assert.equal(late.status, 'failed');
      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      assert.match(trace, /work_unit_late_submit_rejected/);
    } finally {
      cleanup(dir);
    }
  });

  it('timeout requeues same demand and retry claim allocates a new same-batch work_id', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];

      const timedOut = closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(first),
      });
      assert.equal(timedOut.ok, true);
      assert.equal(timedOut.retry_requeued, true);
      assert.equal(loadQueue(dir).active_window[0].queue_item_id, 'queue-a');

      const retry = claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      assert.deepEqual(retry.claimed_work_ids, ['wu-w0-b000-src-i0002']);
      const second = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0002'];
      assert.equal(second.attempt_index, 2);
      assert.equal(second.batch_id, 'b000');
      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      assert.match(trace, /work_unit_retry_claimed/);
    } finally {
      cleanup(dir);
    }
  });

  it('late-submit accepts a timed-out target and removes queued retry demand', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(first),
      });
      assert.equal(loadQueue(dir).active_window[0].queue_item_id, 'queue-a');

      const resultPath = writeSubmitReadyCandidate(dir, first);
      const normalSubmit = submitWorkUnit(dir, { work_id: first.work_id, resultPath });
      assert.equal(normalSubmit.ok, false);
      assert.equal(normalSubmit.status, 'timed_out');

      const accepted = lateSubmitWorkUnit(dir, {
        work_id: first.work_id,
        resultPath,
        reason: 'late result arrived after timeout but before retry submitted',
      });
      assert.equal(accepted.ok, true);
      assert.equal(accepted.late_accept, true);
      assert.equal(accepted.status, 'submitted');
      assert.deepEqual(accepted.superseded_retry_work_ids, []);

      const queue = loadQueue(dir);
      assert.equal(queue.active_window.some((item) => item.queue_item_id === 'queue-a'), false);
      assert.equal(queue.refill_pool.some((item) => item.queue_item_id === 'queue-a'), false);
      assert.equal(queue.delegated_in_flight['queue-a'], undefined);
      assert.equal(queue.terminal_history.length, 1);
      assert.equal(queue.terminal_history[0].terminal_status, 'done');
      assert.equal(queue.terminal_history[0].work_id, first.work_id);

      const index = loadWorkUnitIndex(dir);
      assert.equal(index.work_units[first.work_id].status, 'submitted');
      const rows = readWorkUnitLedgerRows(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, first.work_id);
      assert.equal(rows[0].late_accept, true);
      assert.equal(rows[0].late_accept_reason, 'late result arrived after timeout but before retry submitted');
      assert.equal(rows[0].terminal_status_before_accept, 'timed_out');
      assert.deepEqual(rows[0].superseded_retry_work_ids, []);

      const replay = lateSubmitWorkUnit(dir, {
        work_id: first.work_id,
        resultPath,
        reason: 'late result arrived after timeout but before retry submitted',
      });
      assert.equal(replay.ok, true);
      assert.equal(replay.idempotent, true);
      assert.equal(readWorkUnitLedgerRows(dir).length, 1);
      assert.equal(loadQueue(dir).terminal_history.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('late-submit abandons a claimed retry without adding retry ledger coverage', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(first),
      });
      const retryClaim = claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const retryWorkId = retryClaim.claimed_work_ids[0];
      assert.equal(retryWorkId, 'wu-w0-b000-src-i0002');

      const resultPath = writeSubmitReadyCandidate(dir, first);
      const accepted = lateSubmitWorkUnit(dir, {
        work_id: first.work_id,
        resultPath,
        reason: 'target completed before claimed retry submitted',
      });
      assert.equal(accepted.ok, true);
      assert.deepEqual(accepted.superseded_retry_work_ids, [retryWorkId]);

      const index = loadWorkUnitIndex(dir);
      assert.equal(index.work_units[first.work_id].status, 'submitted');
      assert.equal(index.work_units[retryWorkId].status, 'abandoned');
      assert.equal(index.work_units[retryWorkId].terminal_reason, 'superseded_by_late_accept');
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'], undefined);
      assert.equal(loadQueue(dir).terminal_history.length, 1);
      const rows = readWorkUnitLedgerRows(dir);
      assert.equal(rows.length, 1);
      assert.deepEqual(rows[0].superseded_retry_work_ids, [retryWorkId]);
    } finally {
      cleanup(dir);
    }
  });

  it('late-submit rejects submitted replacements without mutating target authority', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(first),
      });
      const retryClaim = claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const retryWorkId = retryClaim.claimed_work_ids[0];
      const retry = loadWorkUnitIndex(dir).work_units[retryWorkId];
      const retryResult = writeSubmitReadyCandidate(dir, retry);
      const replacement = submitWorkUnit(dir, { work_id: retryWorkId, resultPath: retryResult });
      assert.equal(replacement.ok, true);

      const targetResult = writeSubmitReadyCandidate(dir, first);
      const before = coreAuthoritySnapshot(dir);
      const rejected = lateSubmitWorkUnit(dir, {
        work_id: first.work_id,
        resultPath: targetResult,
        reason: 'target returned after replacement submitted',
      });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'submitted_replacement_conflict');
      assert.equal(loadWorkUnitIndex(dir).work_units[first.work_id].status, 'timed_out');
      assert.equal(readWorkUnitLedgerRows(dir).length, 1);
      assert.equal(readWorkUnitLedgerRows(dir)[0].work_id, retryWorkId);
      assert.equal(coreAuthoritySnapshot(dir), before);
    } finally {
      cleanup(dir);
    }
  });

  it('late-submit rejects non-timed-out statuses, missing reason, and identity mismatch without authority mutation', () => {
    const failedDir = tempBundle();
    const abandonedDir = tempBundle();
    const submittedDir = tempBundle();
    const claimedDir = tempBundle();
    const mismatchDir = tempBundle();
    try {
      saveSeedQueue(failedDir, [delegated('queue-a')]);
      claimWorkUnits(failedDir, { phase: 'wave0', count: 1 });
      const failed = loadWorkUnitIndex(failedDir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(failedDir, { work_id: failed.work_id, status: 'failed', reason: 'sub-agent-error' });
      assert.equal(lateSubmitWorkUnit(failedDir, {
        work_id: failed.work_id,
        resultPath: writeLateResult(failedDir, failed),
        reason: 'should not recover failed',
      }).ok, false);

      saveSeedQueue(abandonedDir, [delegated('queue-a')]);
      claimWorkUnits(abandonedDir, { phase: 'wave0', count: 1 });
      const abandoned = loadWorkUnitIndex(abandonedDir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(abandonedDir, { work_id: abandoned.work_id, status: 'abandoned', reason: 'operator-cancelled' });
      assert.equal(lateSubmitWorkUnit(abandonedDir, {
        work_id: abandoned.work_id,
        resultPath: writeLateResult(abandonedDir, abandoned),
        reason: 'should not recover abandoned',
      }).ok, false);

      saveSeedQueue(submittedDir, [delegated('queue-a')]);
      claimWorkUnits(submittedDir, { phase: 'wave0', count: 1 });
      const submitted = loadWorkUnitIndex(submittedDir).work_units['wu-w0-b000-src-i0001'];
      const submittedResult = writeSubmitReadyCandidate(submittedDir, submitted);
      submitWorkUnit(submittedDir, { work_id: submitted.work_id, resultPath: submittedResult });
      const submittedLate = lateSubmitWorkUnit(submittedDir, {
        work_id: submitted.work_id,
        resultPath: submittedResult,
        reason: 'normal submitted work should reject late-submit',
      });
      assert.equal(submittedLate.ok, false);
      assert.match(submittedLate.reason, /normally submitted/);

      saveSeedQueue(claimedDir, [delegated('queue-a')]);
      claimWorkUnits(claimedDir, { phase: 'wave0', count: 1 });
      const claimed = loadWorkUnitIndex(claimedDir).work_units['wu-w0-b000-src-i0001'];
      const claimedLate = lateSubmitWorkUnit(claimedDir, {
        work_id: claimed.work_id,
        resultPath: writeSubmitReadyCandidate(claimedDir, claimed),
        reason: 'claimed should use normal submit',
      });
      assert.equal(claimedLate.ok, false);
      assert.equal(claimedLate.reason_code, 'claimed_requires_normal_submit');

      saveSeedQueue(mismatchDir, [delegated('queue-a')]);
      claimWorkUnits(mismatchDir, { phase: 'wave0', count: 1 });
      const mismatch = loadWorkUnitIndex(mismatchDir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(mismatchDir, {
        work_id: mismatch.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(mismatch),
      });
      const noReason = lateSubmitWorkUnit(mismatchDir, {
        work_id: mismatch.work_id,
        resultPath: writeSubmitReadyCandidate(mismatchDir, mismatch),
      });
      assert.equal(noReason.ok, false);
      assert.equal(noReason.reason_code, 'late_accept_reason_required');

      const badResult = writeWrongIdentityCandidate(mismatchDir, mismatch);
      const before = coreAuthoritySnapshot(mismatchDir);
      const identityMismatch = lateSubmitWorkUnit(mismatchDir, {
        work_id: mismatch.work_id,
        resultPath: badResult,
        reason: 'bad identity should not mutate authority',
      });
      assert.equal(identityMismatch.ok, false);
      assert.equal(identityMismatch.reason_code, 'wrong_work_id');
      assert.equal(coreAuthoritySnapshot(mismatchDir), before);
    } finally {
      cleanup(failedDir);
      cleanup(abandonedDir);
      cleanup(submittedDir);
      cleanup(claimedDir);
      cleanup(mismatchDir);
    }
  });

  it('late-submit idempotency rejects when durable postconditions are broken', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(first),
      });
      const resultPath = writeSubmitReadyCandidate(dir, first);
      const accepted = lateSubmitWorkUnit(dir, {
        work_id: first.work_id,
        resultPath,
        reason: 'late result accepted once',
      });
      assert.equal(accepted.ok, true);

      const queue = loadQueue(dir);
      queue.terminal_history = [];
      saveQueue(dir, queue);

      const replay = lateSubmitWorkUnit(dir, {
        work_id: first.work_id,
        resultPath,
        reason: 'late result accepted once',
      });
      assert.equal(replay.ok, false);
      assert.match(replay.reason, /postconditions are broken/);
      assert.equal(readWorkUnitLedgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('default timeout refuses a not-yet-idle claimed attempt without terminal side effects', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];

      const before = authoritySnapshot(dir);
      const refused = closeWorkUnitAttempt(dir, {
        work_id: record.work_id,
        status: 'timed_out',
        reason: 'too-soon',
        nowMs: Date.parse(record.claimed_at) + 1,
      });
      assert.equal(refused.ok, false);
      assert.equal(refused.recommended_action, 'wait');
      assert.equal(authoritySnapshot(dir), before);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id);
      assert.equal(loadQueue(dir).terminal_history.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  it('timeout-preflight reports no-progress eligibility without reporting claimed_at as observed progress', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];

      const preflight = timeoutPreflightWorkUnit(dir, {
        work_id: record.work_id,
        nowMs: afterDeadline(record),
      });
      assert.equal(preflight.timeout_eligible, true);
      assert.equal(preflight.check, true);
      assert.equal(preflight.recommended_action, 'timeout');
      assert.equal(preflight.lease_anchor_at, record.claimed_at);
      assert.equal(preflight.progress.latest_engine_observed_progress_at, null);
    } finally {
      cleanup(dir);
    }
  });

  it('timeout-preflight is read-only for eligible and recent-progress refusal cases', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];

      const beforeEligible = authoritySnapshot(dir);
      const eligible = timeoutPreflightWorkUnit(dir, {
        work_id: record.work_id,
        nowMs: afterDeadline(record),
      });
      assert.equal(eligible.timeout_eligible, true);
      assert.equal(authoritySnapshot(dir), beforeEligible);

      const observedMs = Date.parse(record.claimed_at) + 1000;
      writeReceiptProgress(dir, record, { observedMs });
      const beforeProgress = authoritySnapshot(dir);
      const refused = timeoutPreflightWorkUnit(dir, {
        work_id: record.work_id,
        nowMs: observedMs + 1000,
      });
      assert.equal(refused.timeout_eligible, false);
      assert.equal(refused.recommended_action, 'wait');
      assert.equal(refused.progress.receipt_nonempty, true);
      assert.equal(refused.progress.sources.some((source) => source.source_type === 'receipt_file' && source.extends_idle_lease), true);
      assert.equal(authoritySnapshot(dir), beforeProgress);
    } finally {
      cleanup(dir);
    }
  });

  it('timeout-preflight routes candidate results to submit, repair, or inspect', () => {
    const submitDir = tempBundle();
    const repairDir = tempBundle();
    const inspectDir = tempBundle();
    const externalDir = tempBundle();
    try {
      saveSeedQueue(submitDir, [delegated('queue-a')]);
      claimWorkUnits(submitDir, { phase: 'wave0', count: 1 });
      const submitRecord = loadWorkUnitIndex(submitDir).work_units['wu-w0-b000-src-i0001'];
      writeSubmitReadyCandidate(submitDir, submitRecord);
      const submitAdvice = timeoutPreflightWorkUnit(submitDir, {
        work_id: submitRecord.work_id,
        nowMs: afterDeadline(submitRecord),
      });
      assert.equal(submitAdvice.timeout_eligible, false);
      assert.equal(submitAdvice.recommended_action, 'submit');
      assert.equal(submitAdvice.progress.dry_submit_expected, 'pass');
      assert.equal(submitAdvice.progress.sources.some((source) => source.source_type === 'output_file'), true);
      assert.equal(submitAdvice.progress.sources.some((source) => source.source_type === 'cache_leaf'), true);
      const submitBeforeTimeout = authoritySnapshot(submitDir);
      const submitRefused = closeWorkUnitAttempt(submitDir, {
        work_id: submitRecord.work_id,
        status: 'timed_out',
        reason: 'submit-ready-must-not-timeout',
        nowMs: afterDeadline(submitRecord),
      });
      assert.equal(submitRefused.ok, false);
      assert.equal(submitRefused.recommended_action, 'submit');
      assert.equal(authoritySnapshot(submitDir), submitBeforeTimeout);

      saveSeedQueue(repairDir, [delegated('queue-a')]);
      claimWorkUnits(repairDir, { phase: 'wave0', count: 1 });
      const repairRecord = loadWorkUnitIndex(repairDir).work_units['wu-w0-b000-src-i0001'];
      writeRepairableCandidate(repairDir, repairRecord);
      const repairAdvice = timeoutPreflightWorkUnit(repairDir, {
        work_id: repairRecord.work_id,
        nowMs: afterDeadline(repairRecord),
      });
      assert.equal(repairAdvice.timeout_eligible, false);
      assert.equal(repairAdvice.recommended_action, 'repair');
      assert.equal(repairAdvice.progress.dry_submit_expected, 'fail');
      const repairBeforeTimeout = authoritySnapshot(repairDir);
      const repairRefused = closeWorkUnitAttempt(repairDir, {
        work_id: repairRecord.work_id,
        status: 'timed_out',
        reason: 'repairable-must-not-timeout',
        nowMs: afterDeadline(repairRecord),
      });
      assert.equal(repairRefused.ok, false);
      assert.equal(repairRefused.recommended_action, 'repair');
      assert.equal(authoritySnapshot(repairDir), repairBeforeTimeout);

      saveSeedQueue(inspectDir, [delegated('queue-a')]);
      claimWorkUnits(inspectDir, { phase: 'wave0', count: 1 });
      const inspectRecord = loadWorkUnitIndex(inspectDir).work_units['wu-w0-b000-src-i0001'];
      writeWrongIdentityCandidate(inspectDir, inspectRecord);
      const inspectAdvice = timeoutPreflightWorkUnit(inspectDir, {
        work_id: inspectRecord.work_id,
        nowMs: afterDeadline(inspectRecord),
      });
      assert.equal(inspectAdvice.timeout_eligible, false);
      assert.equal(inspectAdvice.recommended_action, 'repair');
      const inspectBeforeTimeout = authoritySnapshot(inspectDir);
      const inspectRefused = closeWorkUnitAttempt(inspectDir, {
        work_id: inspectRecord.work_id,
        status: 'timed_out',
        reason: 'wrong-identity-must-not-timeout',
        nowMs: afterDeadline(inspectRecord),
      });
      assert.equal(inspectRefused.ok, false);
      assert.equal(inspectRefused.recommended_action, 'repair');
      assert.equal(authoritySnapshot(inspectDir), inspectBeforeTimeout);

      saveSeedQueue(externalDir, [delegated('queue-a')]);
      claimWorkUnits(externalDir, { phase: 'wave0', count: 1 });
      const externalRecord = loadWorkUnitIndex(externalDir).work_units['wu-w0-b000-src-i0001'];
      const externalPath = path.join(externalDir, '_tmp', 'external-result.json');
      writeSubmitReadyCandidate(externalDir, externalRecord, { resultPath: externalPath });
      const externalNowMs = afterDeadline(externalRecord);
      setFileMtime(externalPath, externalNowMs + 60000);
      const externalAdvice = timeoutPreflightWorkUnit(externalDir, {
        work_id: externalRecord.work_id,
        resultPath: externalPath,
        nowMs: externalNowMs,
      });
      assert.equal(externalAdvice.recommended_action, 'submit');
      const resultSource = externalAdvice.progress.sources.find((source) => source.source_type === 'result_file');
      assert.equal(resultSource?.extends_idle_lease, false);
      assert.equal(resultSource?.suspicious_timestamp, true);
      assert.notEqual(externalAdvice.lease_anchor_at, resultSource?.observed_at);
    } finally {
      cleanup(submitDir);
      cleanup(repairDir);
      cleanup(inspectDir);
      cleanup(externalDir);
    }
  });

  it('timeout-preflight fails closed for status drift, missing queue binding, and ambiguous receipt identity', () => {
    const statusDir = tempBundle();
    const queueDir = tempBundle();
    const receiptDir = tempBundle();
    try {
      saveSeedQueue(statusDir, [delegated('queue-a')]);
      claimWorkUnits(statusDir, { phase: 'wave0', count: 1 });
      const statusRecord = loadWorkUnitIndex(statusDir).work_units['wu-w0-b000-src-i0001'];
      const statusPath = path.join(statusDir, statusRecord.paths.status_ref);
      const statusFile = JSON.parse(readFileSync(statusPath, 'utf-8'));
      statusFile.status = 'failed';
      writeFileSync(statusPath, `${JSON.stringify(statusFile, null, 2)}\n`);
      const statusAdvice = timeoutPreflightWorkUnit(statusDir, { work_id: statusRecord.work_id, nowMs: afterDeadline(statusRecord) });
      assert.equal(statusAdvice.timeout_eligible, false);
      assert.equal(statusAdvice.recommended_action, 'inspect');
      assert.match(statusAdvice.inspect.join('\n'), /status\/index mismatch/);

      saveSeedQueue(queueDir, [delegated('queue-a')]);
      claimWorkUnits(queueDir, { phase: 'wave0', count: 1 });
      const queueRecord = loadWorkUnitIndex(queueDir).work_units['wu-w0-b000-src-i0001'];
      const queue = loadQueue(queueDir);
      delete queue.delegated_in_flight[queueRecord.queue_item_id];
      saveQueue(queueDir, queue);
      const queueBeforeTimeout = authoritySnapshot(queueDir);
      const queueRefused = closeWorkUnitAttempt(queueDir, {
        work_id: queueRecord.work_id,
        status: 'timed_out',
        reason: 'missing-binding-must-not-timeout',
        nowMs: afterDeadline(queueRecord),
      });
      assert.equal(queueRefused.ok, false);
      assert.equal(queueRefused.recommended_action, 'inspect');
      assert.equal(authoritySnapshot(queueDir), queueBeforeTimeout);

      saveSeedQueue(receiptDir, [delegated('queue-a')]);
      claimWorkUnits(receiptDir, { phase: 'wave0', count: 1 });
      const receiptRecord = loadWorkUnitIndex(receiptDir).work_units['wu-w0-b000-src-i0001'];
      writeMismatchedReceipt(receiptDir, receiptRecord);
      const receiptBeforeTimeout = authoritySnapshot(receiptDir);
      const receiptRefused = closeWorkUnitAttempt(receiptDir, {
        work_id: receiptRecord.work_id,
        status: 'timed_out',
        reason: 'ambiguous-receipt-must-not-timeout',
        nowMs: afterDeadline(receiptRecord),
      });
      assert.equal(receiptRefused.ok, false);
      assert.equal(receiptRefused.recommended_action, 'inspect');
      assert.match(receiptRefused.inspect.join('\n'), /no identity-matched progress event/);
      assert.equal(authoritySnapshot(receiptDir), receiptBeforeTimeout);
    } finally {
      cleanup(statusDir);
      cleanup(queueDir);
      cleanup(receiptDir);
    }
  });

  it('timeout-preflight diagnoses future mtimes without overextending the lease', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const nowMs = Date.parse(record.claimed_at) + 2000;
      writeReceiptProgress(dir, record, { observedMs: nowMs + 60000 });

      const preflight = timeoutPreflightWorkUnit(dir, { work_id: record.work_id, nowMs });
      const receiptSource = preflight.progress.sources.find((source) => source.source_type === 'receipt_file');
      assert.equal(receiptSource?.suspicious_timestamp, true);
      assert.equal(preflight.progress.latest_engine_observed_progress_at, iso(nowMs));
      assert.equal(preflight.effective_timeout_at, iso(nowMs + record.timeout_ms));
    } finally {
      cleanup(dir);
    }
  });

  it('force timeout records durable audit fields for progress-positive attempts', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const observedMs = Date.parse(record.claimed_at) + 1000;
      writeReceiptProgress(dir, record, { observedMs });

      const forced = closeWorkUnitAttempt(dir, {
        work_id: record.work_id,
        status: 'timed_out',
        reason: 'operator-forced-after-inspection',
        force: true,
        nowMs: observedMs + 1000,
      });
      assert.equal(forced.ok, true);
      assert.equal(forced.forced_timeout, true);
      assert.equal(forced.preflight_timeout_eligible, false);
      assert.equal(forced.preflight_recommended_action, 'wait');
      assert.equal(forced.default_timeout_would_refuse, true);
      assert.equal(Array.isArray(forced.progress_sources), true);
      assert.equal(forced.progress_sources.some((source) => source.source_type === 'receipt_file'), true);

      const traceRows = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8')
        .trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
      const forcedEvent = traceRows.find((row) => row.event === 'work_unit_forced_timeout');
      assert.equal(forcedEvent?.forced_timeout, true);
      assert.equal(forcedEvent?.default_timeout_would_refuse, true);
      assert.equal(Array.isArray(forcedEvent?.progress_sources), true);

      const late = submitWorkUnit(dir, { work_id: record.work_id, resultPath: writeLateResult(dir, record) });
      assert.equal(late.ok, false);
      assert.equal(late.status, 'timed_out');
    } finally {
      cleanup(dir);
    }
  });

  it('abandon closes an attempt idempotently and rejects mismatched terminal repeats', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];

      const abandoned = closeWorkUnitAttempt(dir, { work_id: record.work_id, status: 'abandoned', reason: 'operator-cancelled' });
      assert.equal(abandoned.ok, true);
      assert.equal(abandoned.status, 'abandoned');
      assert.equal(abandoned.retry_requeued, false);
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'], undefined);
      assert.equal(loadQueue(dir).terminal_history.at(-1).terminal_status, 'cancelled');
      assert.throws(() => readFileSync(path.join(dir, 'rb_output_declarations.jsonl'), 'utf-8'), /ENOENT/);

      const duplicate = closeWorkUnitAttempt(dir, { work_id: record.work_id, status: 'abandoned', reason: 'operator-cancelled' });
      assert.equal(duplicate.ok, true);
      assert.equal(duplicate.duplicate, true);

      const differentReason = closeWorkUnitAttempt(dir, { work_id: record.work_id, status: 'abandoned', reason: 'different-reason' });
      assert.equal(differentReason.ok, false);
      assert.equal(differentReason.status, 'abandoned');

      const differentStatus = closeWorkUnitAttempt(dir, { work_id: record.work_id, status: 'failed', reason: 'operator-cancelled' });
      assert.equal(differentStatus.ok, false);
      assert.equal(differentStatus.status, 'abandoned');
    } finally {
      cleanup(dir);
    }
  });

  it('explicit refill batch opens b001 with lineage before retry claim', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'gate-refill-needed',
        nowMs: afterDeadline(first),
      });
      const opened = openWorkUnitBatch(dir, { phase: 'wave0', reason: 'gate_failure_refill' });
      assert.equal(opened.batch_id, 'b001');

      const retry = claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      assert.deepEqual(retry.claimed_work_ids, ['wu-w0-b001-src-i0001']);
      const index = loadWorkUnitIndex(dir);
      assert.equal(index.work_units['wu-w0-b001-src-i0001'].attempt_index, 2);
      assert.equal(index.waves.wave0.batches.b001.batch_reason, 'gate_failure_refill');
      assert.equal(index.waves.wave0.batches.b001.lineage.prior_work_unit_count, 1);
    } finally {
      cleanup(dir);
    }
  });
});
