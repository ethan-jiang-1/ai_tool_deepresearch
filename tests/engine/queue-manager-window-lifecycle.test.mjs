// @impl AGQ-003, AGQ-005, AGQ-019, AGQ-020, FRE-005
// Queue Manager active-window, lifecycle, pending-count, fail, and preemption coverage.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  createQueue,
  enqueue,
  claim,
  complete,
  fail,
  preempt,
  pendingCount,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { cleanup, item, tempBundle } from './queue-manager-fixtures.mjs';

describe('Enqueue and claim (AGQ-002)', () => {
  it('fills active_window before using refill_pool', () => {
    let queue = createQueue('enqueue-test');
    for (let i = 1; i <= QUEUE_ACTIVE_WINDOW_LIMIT + 1; i++) queue = enqueue(queue, item(i));
    assert.deepEqual(queue.active_window.map((entry) => entry.queue_item_id),
      Array.from({ length: QUEUE_ACTIVE_WINDOW_LIMIT }, (_, i) => `queue-${i + 1}`),
    );
    assert.equal(queue.refill_pool.length, 1);
    assert.equal(queue.refill_pool[0].queue_item_id, `queue-${QUEUE_ACTIVE_WINDOW_LIMIT + 1}`);
  });

  it('claim returns the queue front and marks it running', () => {
    let queue = createQueue('claim-test');
    queue = enqueue(queue, item(1));
    queue = enqueue(queue, item(2));
    const result = claim(queue, { actor: 'main-agent' });
    assert.equal(result.item.queue_item_id, 'queue-1');
    assert.equal(result.queue.active_window[0].status, 'running');
    assert.equal(result.queue.active_window[1].status, 'queued');
  });
});

describe('Queue pending count (AGQ-020)', () => {
  it('returns zero for an empty queue', () => {
    assert.equal(pendingCount(createQueue('empty-count-test')), 0);
  });

  it('counts active_window and refill_pool demand', () => {
    let queue = createQueue('pending-count-test');
    for (let i = 1; i <= QUEUE_ACTIVE_WINDOW_LIMIT + 2; i++) queue = enqueue(queue, item(i));
    assert.equal(pendingCount(queue), QUEUE_ACTIVE_WINDOW_LIMIT + 2);
    assert.equal(queue.active_window.length, QUEUE_ACTIVE_WINDOW_LIMIT);
    assert.equal(queue.refill_pool.length, 2);
  });

  it('does not count delegated in-flight attempts as unclaimed demand', () => {
    let queue = createQueue('inflight-count-test');
    queue = enqueue(queue, item(1));
    queue.delegated_in_flight['queue-2'] = {
      queue_item_id: 'queue-2',
      work_id: 'wu-w0-b000-src-i0001',
      wave: 0,
      kind: 'wave0_source_intake',
      batch_id: 'b000',
      attempt_index: 1,
      queue_item_snapshot_hash: 'abc123',
      claimed_at: '2026-07-06T00:00:00.000Z',
      timeout_ms: 600000,
      deadline_at: '2026-07-06T00:10:00.000Z',
    };
    assert.equal(pendingCount(queue), 1);
  });
});

describe('Complete, promote, refill, and fail (AGQ-002, AGQ-004)', () => {
  it('complete checks receipt, promotes the next item, and refills tail from pool', () => {
    const dir = tempBundle();
    try {
      writeFileSync(path.join(dir, 'done.json'), '{"ok":true}\n');
      let queue = createQueue('complete-test');
      const total = QUEUE_ACTIVE_WINDOW_LIMIT + 1;
      for (let i = 1; i <= total; i++) {
        queue = enqueue(queue, item(i, i === 1 ? { completion_receipt: 'json:done.json' } : {}));
      }
      const result = complete(queue, { queue_item_id: 'queue-1', receipt: 'json:done.json' }, dir);
      assert.equal(result.feedback.passed, true);
      assert.equal(result.queue.active_window[0].queue_item_id, 'queue-2');
      assert.equal(result.queue.active_window.at(-1).queue_item_id, `queue-${QUEUE_ACTIVE_WINDOW_LIMIT + 1}`);
      assert.equal(result.queue.refill_pool.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  it('missing completion receipt blocks promotion', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('missing-receipt-test');
      queue = enqueue(queue, item(1, { completion_receipt: 'file:missing.txt' }));
      queue = enqueue(queue, item(2));
      const result = complete(queue, { queue_item_id: 'queue-1' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.equal(result.queue.active_window[0].queue_item_id, 'queue-1');
      assert.match(result.feedback.inspect.join('\n'), /Missing file receipt/);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated in-flight completion via operate-queue fails closed', () => {
    const dir = tempBundle();
    try {
      const queue = createQueue('delegated-complete-test');
      queue.delegated_in_flight['queue-del'] = {
        queue_item_id: 'queue-del',
        work_id: 'wu-w0-b000-src-i0001',
        wave: 0,
        kind: 'wave0_source_intake',
        batch_id: 'b000',
        attempt_index: 1,
        queue_item_snapshot_hash: 'abc123',
        claimed_at: '2026-07-06T00:00:00.000Z',
        timeout_ms: 600000,
        deadline_at: '2026-07-06T00:10:00.000Z',
      };
      const result = complete(queue, { queue_item_id: 'queue-del', receipt: 'none' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.match(result.feedback.advice, /operate-work-unit submit/);
      assert.equal(result.queue.delegated_in_flight['queue-del'].work_id, 'wu-w0-b000-src-i0001');
    } finally {
      cleanup(dir);
    }
  });

  it('fail creates repair work instead of chat progress', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('fail-test');
      queue = enqueue(queue, item(1));
      queue = enqueue(queue, item(2));
      queue = fail(queue, { queue_item_id: 'queue-1', reason: 'receipt missing' }, dir);
      assert.match(queue.active_window[0].queue_item_id, /^repair-queue-1-/);
      assert.equal(queue.active_window[0].priority_class, 'P1_state_or_gate_repair');
      assert.equal(queue.active_window[1].queue_item_id, 'queue-2');
    } finally {
      cleanup(dir);
    }
  });
});

describe('Preemption (AGQ-003)', () => {
  it('inserts urgent work at the front when current is not running', () => {
    let queue = createQueue('preempt-test');
    for (let i = 1; i <= 3; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window[0].queue_item_id, 'queue-urgent');
    assert.equal(queue.active_window[1].queue_item_id, 'queue-1');
  });

  it('does not interrupt a running queue-front item by default', () => {
    let queue = createQueue('running-preempt-test');
    for (let i = 1; i <= 3; i++) queue = enqueue(queue, item(i));
    queue = claim(queue).queue;
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window[0].queue_item_id, 'queue-1');
    assert.equal(queue.active_window[0].status, 'running');
    assert.equal(queue.active_window[1].queue_item_id, 'queue-urgent');
  });

  it('preserves displaced tail with restore metadata', () => {
    let queue = createQueue('full-preempt-test');
    for (let i = 1; i <= QUEUE_ACTIVE_WINDOW_LIMIT; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window.at(-1).queue_item_id, `queue-${QUEUE_ACTIVE_WINDOW_LIMIT - 1}`);
    assert.equal(queue.refill_pool[0].queue_item_id, `queue-${QUEUE_ACTIVE_WINDOW_LIMIT}`);
    assert.equal(queue.refill_pool[0].restore_priority, 'next_tail_opening');
    assert.equal(queue.refill_pool[0].lineage.preempted_from, 'active_window_tail');
  });

  it('requires unsafeCurrent=true to replace current work', () => {
    let queue = createQueue('unsafe-test');
    queue = enqueue(queue, item(1));
    queue = claim(queue).queue;
    assert.throws(
      () => preempt(queue, item('urgent'), { reason: 'bad-state', replaceCurrent: true }),
      /unsafeCurrent=true/,
    );
    queue = preempt(queue, item('urgent'), { reason: 'bad-state', replaceCurrent: true, unsafeCurrent: true });
    assert.equal(queue.active_window[0].queue_item_id, 'queue-urgent');
    assert.equal(queue.refill_pool[0].queue_item_id, 'queue-1');
  });
});
