// @impl FRE-005
// Queue Manager active-window, lifecycle, pending-count, fail, and preemption regression coverage.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SLOT_NAMES,
  createQueue,
  enqueue,
  claim,
  complete,
  fail,
  preempt,
  pendingCount,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { stageSubagentSlots } from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { baseState, cleanup, item, tempBundle } from './queue-manager-fixtures.mjs';

describe('Enqueue and claim (AGQ-002)', () => {
  it('fills all active slots before using refill_pool', () => {
    let queue = createQueue('enqueue-test');
    for (let i = 1; i <= SLOT_NAMES.length + 1; i++) queue = enqueue(queue, item(i));
    assert.deepEqual(SLOT_NAMES.map((slot) => queue.active_window[slot]?.work_id),
      Array.from({ length: SLOT_NAMES.length }, (_, i) => `work-${i + 1}`),
    );
    assert.equal(queue.refill_pool.length, 1);
    assert.equal(queue.refill_pool[0].work_id, `work-${SLOT_NAMES.length + 1}`);
  });

  it('claim returns only slot_1_current and marks it running', () => {
    let queue = createQueue('claim-test');
    queue = enqueue(queue, item(1));
    queue = enqueue(queue, item(2));
    const result = claim(queue, { actor: 'main-agent' });
    assert.equal(result.item.work_id, 'work-1');
    assert.equal(result.queue.active_window.slot_1_current.status, 'running');
    assert.equal(result.queue.active_window.slot_2_next.status, 'queued');
    assert.equal(Object.hasOwn(result.item, 'slot_2_next'), false);
  });
});

describe('Queue pending count (AGQ-020)', () => {
  it('returns zero for an empty queue', () => {
    assert.equal(pendingCount(createQueue('empty-count-test')), 0);
  });

  it('counts non-null active-window slots and refill_pool items', () => {
    let queue = createQueue('pending-count-test');
    for (let i = 1; i <= SLOT_NAMES.length + 2; i++) queue = enqueue(queue, item(i));
    assert.equal(pendingCount(queue), SLOT_NAMES.length + 2);
    assert.equal(SLOT_NAMES.filter((slot) => queue.active_window[slot] !== null).length, SLOT_NAMES.length);
    assert.equal(queue.refill_pool.length, 2);
  });

  it('counts mixed active-window and refill_pool depth after manual null slots', () => {
    let queue = createQueue('mixed-count-test');
    queue = enqueue(queue, item(1));
    queue = enqueue(queue, item(2));
    queue.refill_pool.push(item(3), item(4), item(5));
    queue.active_window.slot_2_next = null;
    assert.equal(pendingCount(queue), 4);
  });

  it('pendingCount does NOT include staged relay sub-agent slots', () => {
    // Spec: "The count SHALL NOT include Relay sub-agent slots."
    // Relay slots live under _subagents/ on disk; they are not Queue tasks.
    const dir = tempBundle();
    try {
      let queue = createQueue('subagent-exclusion');
      queue = enqueue(queue, item(1));
      assert.equal(pendingCount(queue), 1);

      const slots = stageSubagentSlots(baseState(), dir);
      assert.ok(slots.length > 0, 'expected at least one relay slot from pass-branch dispatch');

      assert.equal(pendingCount(queue), 1,
        'pendingCount must not include relay sub-agent slots staged on disk');
    } finally {
      cleanup(dir);
    }
  });
});

describe('Complete, promote, refill, and fail (AGQ-002, AGQ-004)', () => {
  it('complete checks receipt, promotes slot 2, and refills tail from pool', () => {
    const dir = tempBundle();
    try {
      writeFileSync(path.join(dir, 'done.json'), '{"ok":true}\n');
      let queue = createQueue('complete-test');
      const total = SLOT_NAMES.length + 1; // fill all slots + 1 for pool
      for (let i = 1; i <= total; i++) {
        queue = enqueue(queue, item(i, i === 1 ? { completion_receipt: 'json:done.json' } : {}));
      }
      const result = complete(queue, { work_id: 'work-1', receipt: 'json:done.json' }, dir);
      assert.equal(result.feedback.passed, true);
      assert.equal(result.queue.active_window.slot_1_current.work_id, 'work-2');
      assert.equal(result.queue.active_window[SLOT_NAMES.at(-1)].work_id, `work-${SLOT_NAMES.length + 1}`);
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
      const result = complete(queue, { work_id: 'work-1' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.equal(result.queue.active_window.slot_1_current.work_id, 'work-1');
      assert.match(result.feedback.inspect.join('\n'), /Missing file receipt/);
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
      queue = fail(queue, { work_id: 'work-1', reason: 'receipt missing' }, dir);
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
    let queue = createQueue('preempt-test');
    for (let i = 1; i <= 3; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window.slot_1_current.work_id, 'work-1');
    assert.equal(queue.active_window.slot_2_next.work_id, 'work-urgent');
    assert.equal(queue.active_window.slot_3_pending.work_id, 'work-2');
  });

  it('preserves displaced tail slot with restore metadata', () => {
    let queue = createQueue('full-preempt-test');
    for (let i = 1; i <= SLOT_NAMES.length; i++) queue = enqueue(queue, item(i));
    const displacedWorkId = `work-${SLOT_NAMES.length}`;
    const displacedFromSlot = SLOT_NAMES.at(-1);
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window[SLOT_NAMES.at(-1)].work_id, `work-${SLOT_NAMES.length - 1}`);
    assert.equal(queue.refill_pool[0].work_id, displacedWorkId);
    assert.equal(queue.refill_pool[0].preempted_from_slot, displacedFromSlot);
    assert.equal(queue.refill_pool[0].restore_priority, 'next_tail_opening');
  });

  it('requires unsafeCurrent=true to replace current work', () => {
    let queue = createQueue('unsafe-test');
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
