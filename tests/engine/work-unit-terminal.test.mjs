// @impl DEW-006, AGQ-001, AGQ-014, SRL-004, LOG-006, FRE-005

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  claimWorkUnits,
  closeWorkUnitAttempt,
  loadWorkUnitIndex,
  openWorkUnitBatch,
  submitWorkUnit,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-terminal-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
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

      const timedOut = closeWorkUnitAttempt(dir, { work_id: first.work_id, status: 'timed_out', reason: 'deadline-expired' });
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
      closeWorkUnitAttempt(dir, { work_id: first.work_id, status: 'timed_out', reason: 'gate-refill-needed' });
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
