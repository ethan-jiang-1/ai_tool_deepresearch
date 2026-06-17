// agentic-queue.test.mjs — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QueueItemSchema,
  createEmptyQueue,
  enqueue,
  claimCurrent,
  completeCurrent,
  failCurrent,
  preempt,
  checkReceipts,
  renderProjection,
  hashQueueState,
  loadQueue,
  makeQueueItem,
  QUEUE_FILE,
  SLOT_NAMES,
} from './agentic-queue.mjs';

function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'agq-'));
  mkdirSync(path.join(dir, '_cache'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function item(n, overrides = {}) {
  return makeQueueItem({
    work_id: `work-${n}`,
    title: `Work ${n}`,
    action: `Do work ${n}`,
    ...overrides,
  });
}

describe('Queue schema (AGQ-001)', () => {
  it('accepts a valid queue item with fixed fields and payload object', () => {
    const parsed = QueueItemSchema.safeParse(item(1, { payload: { kind: 'source-intake' } }));
    assert.equal(parsed.success, true);
  });

  it('rejects missing required core fields', () => {
    const candidate = item(1);
    delete candidate.producer_rule;
    delete candidate.required_receipts;
    delete candidate.completion_receipt;
    const parsed = QueueItemSchema.safeParse(candidate);
    assert.equal(parsed.success, false);
  });

  it('rejects non-object payload', () => {
    const parsed = QueueItemSchema.safeParse({ ...item(1), payload: 'bad' });
    assert.equal(parsed.success, false);
  });
});

describe('Enqueue and claim (AGQ-002)', () => {
  it('fills five active slots before using refill_pool', () => {
    let queue = createEmptyQueue('enqueue-test');
    for (let i = 1; i <= 6; i++) queue = enqueue(queue, item(i));
    assert.deepEqual(SLOT_NAMES.map((slot) => queue.active_window[slot]?.work_id), [
      'work-1',
      'work-2',
      'work-3',
      'work-4',
      'work-5',
    ]);
    assert.equal(queue.refill_pool.length, 1);
    assert.equal(queue.refill_pool[0].work_id, 'work-6');
  });

  it('claimCurrent returns only slot_1_current and marks it running', () => {
    let queue = createEmptyQueue('claim-test');
    queue = enqueue(queue, item(1));
    queue = enqueue(queue, item(2));
    const claim = claimCurrent(queue, { actor: 'main-agent' });
    assert.equal(claim.item.work_id, 'work-1');
    assert.equal(claim.queue.active_window.slot_1_current.status, 'running');
    assert.equal(claim.queue.active_window.slot_2_next.status, 'queued');
    assert.equal(Object.hasOwn(claim.item, 'slot_2_next'), false);
  });
});

describe('Complete, promote, refill, and fail (AGQ-002, AGQ-004)', () => {
  it('completeCurrent checks receipt, promotes slot 2, and refills tail from pool', () => {
    const dir = tempBundle();
    try {
      writeFileSync(path.join(dir, 'done.json'), '{"ok":true}\n');
      let queue = createEmptyQueue('complete-test');
      for (let i = 1; i <= 6; i++) {
        queue = enqueue(queue, item(i, i === 1 ? { completion_receipt: 'json:done.json' } : {}));
      }
      const result = completeCurrent(queue, { work_id: 'work-1', receipt: 'json:done.json' }, dir);
      assert.equal(result.feedback.passed, true);
      assert.equal(result.queue.active_window.slot_1_current.work_id, 'work-2');
      assert.equal(result.queue.active_window.slot_5_tail.work_id, 'work-6');
      assert.equal(result.queue.refill_pool.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  it('missing completion receipt blocks promotion', () => {
    const dir = tempBundle();
    try {
      let queue = createEmptyQueue('missing-receipt-test');
      queue = enqueue(queue, item(1, { completion_receipt: 'file:missing.txt' }));
      queue = enqueue(queue, item(2));
      const result = completeCurrent(queue, { work_id: 'work-1' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.equal(result.queue.active_window.slot_1_current.work_id, 'work-1');
      assert.match(result.feedback.inspect.join('\n'), /Missing file receipt/);
    } finally {
      cleanup(dir);
    }
  });

  it('failCurrent creates repair work instead of chat progress', () => {
    const dir = tempBundle();
    try {
      let queue = createEmptyQueue('fail-test');
      queue = enqueue(queue, item(1));
      queue = enqueue(queue, item(2));
      queue = failCurrent(queue, { work_id: 'work-1', reason: 'receipt missing' }, dir);
      assert.equal(queue.active_window.slot_1_current.work_id, 'work-2');
      assert.match(queue.active_window.slot_2_next.work_id, /^repair-work-1-/);
      assert.equal(queue.active_window.slot_2_next.priority_class, 'P1_state_or_gate_repair');
    } finally {
      cleanup(dir);
    }
  });
});

describe('Preemption (AGQ-003)', () => {
  it('inserts urgent work into slot_2_next without interrupting current', () => {
    let queue = createEmptyQueue('preempt-test');
    for (let i = 1; i <= 3; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window.slot_1_current.work_id, 'work-1');
    assert.equal(queue.active_window.slot_2_next.work_id, 'work-urgent');
    assert.equal(queue.active_window.slot_3_pending.work_id, 'work-2');
  });

  it('preserves displaced slot_5_tail with restore metadata', () => {
    let queue = createEmptyQueue('full-preempt-test');
    for (let i = 1; i <= 5; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window.slot_5_tail.work_id, 'work-4');
    assert.equal(queue.refill_pool[0].work_id, 'work-5');
    assert.equal(queue.refill_pool[0].preempted_from_slot, 'slot_5_tail');
    assert.equal(queue.refill_pool[0].restore_priority, 'next_tail_opening');
  });

  it('requires unsafeCurrent=true to replace current work', () => {
    let queue = createEmptyQueue('unsafe-test');
    queue = enqueue(queue, item(1));
    assert.throws(
      () => preempt(queue, item('urgent'), { reason: 'bad-state', replaceCurrent: true }),
      /unsafeCurrent=true/,
    );
    queue = preempt(queue, item('urgent'), { reason: 'bad-state', replaceCurrent: true, unsafeCurrent: true });
    assert.equal(queue.active_window.slot_1_current.work_id, 'work-urgent');
    assert.equal(queue.refill_pool[0].work_id, 'work-1');
  });
});

describe('Receipts, projection, and CLI (AGQ-004, AGQ-005, AGQ-006)', () => {
  it('unknown receipt prefix fails closed', () => {
    let queue = createEmptyQueue('receipt-test');
    queue = enqueue(queue, item(1, { required_receipts: ['chat:trust_me'] }));
    const feedback = checkReceipts(queue, queue.active_window.slot_1_current);
    assert.equal(feedback.passed, false);
    assert.match(feedback.inspect.join('\n'), /Unsupported receipt prefix/);
  });

  it('projection is generated from JSON and manual drift cannot mutate state', () => {
    const dir = tempBundle();
    try {
      let queue = createEmptyQueue('projection-test');
      queue = enqueue(queue, item(1));
      const beforeHash = hashQueueState(queue);
      const projection = renderProjection(queue, dir);
      writeFileSync(projection, '# edited projection\nslot_1_current: fake\n');
      const afterHash = hashQueueState(queue);
      assert.equal(afterHash, beforeHash);
      assert.equal(queue.active_window.slot_1_current.work_id, 'work-1');
    } finally {
      cleanup(dir);
    }
  });

  it('CLI enqueues, claims, completes, preempts, renders, and checks real files', () => {
    const dir = tempBundle();
    try {
      const cli = path.resolve('experiments/prototype-agentic-queue/agentic-queue-cli.mjs');
      const task1 = path.join(dir, 'task1.json');
      const task2 = path.join(dir, 'task2.json');
      const urgent = path.join(dir, 'urgent.json');
      const result = path.join(dir, 'result.json');
      writeFileSync(path.join(dir, 'done.txt'), 'done\n');
      writeFileSync(task1, `${JSON.stringify(item(1, { completion_receipt: 'file:done.txt' }))}\n`);
      writeFileSync(task2, `${JSON.stringify(item(2))}\n`);
      writeFileSync(urgent, `${JSON.stringify(item('urgent', { priority_class: 'P1_state_or_gate_repair' }))}\n`);
      writeFileSync(result, `${JSON.stringify({ work_id: 'work-1', receipt: 'file:done.txt', summary: 'done' })}\n`);

      execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task1], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task2], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'claim', dir, '--actor', 'main-agent'], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'complete', dir, '--result', result], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'preempt', dir, '--task', urgent, '--reason', 'urgent'], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'render', dir], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'check', dir], { stdio: 'pipe' });

      const saved = JSON.parse(readFileSync(path.join(dir, QUEUE_FILE), 'utf-8'));
      assert.equal(saved.active_window.slot_1_current.work_id, 'work-2');
      assert.equal(saved.active_window.slot_2_next.work_id, 'work-urgent');
      assert.match(readFileSync(path.join(dir, saved.projection_path), 'utf-8'), /work-urgent/);
    } finally {
      cleanup(dir);
    }
  });
});
