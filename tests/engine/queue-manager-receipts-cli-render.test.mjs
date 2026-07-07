// @impl AGQ-004, AGQ-005, AGQ-019, FRE-005
// Queue Manager receipts, projection rendering, persistence, and CLI smoke coverage.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  QUEUE,
  createQueue,
  enqueue,
  checkReceipts,
  render,
  loadQueue,
  saveQueue,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { QueueSchema } from '../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import { cleanup, item, tempBundle } from './queue-manager-fixtures.mjs';

describe('Receipts, projection, and CLI (AGQ-004, AGQ-005, AGQ-006)', () => {
  it('unknown receipt prefix fails closed', () => {
    let queue = createQueue('receipt-test');
    queue = enqueue(queue, item(1, { required_receipts: ['chat:trust_me'] }));
    const feedback = checkReceipts(queue, queue.active_window[0]);
    assert.equal(feedback.passed, false);
    assert.match(feedback.inspect.join('\n'), /Unsupported receipt prefix/);
  });

  it('projection is generated from JSON and manual drift cannot mutate state', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('projection-test');
      queue = enqueue(queue, item(1));
      const before = JSON.stringify(queue);
      const projection = render(queue, dir);
      writeFileSync(projection, '# edited projection\nqueue-1: fake\n');
      const after = JSON.stringify(queue);
      assert.equal(after, before);
      assert.equal(queue.active_window[0].queue_item_id, 'queue-1');
    } finally {
      cleanup(dir);
    }
  });

  it('CLI enqueues, claims, completes, preempts, renders, and checks real files', () => {
    const dir = tempBundle();
    try {
      const cli = path.resolve('DPT_FRAMEWORK/cli/operate-queue.mjs');
      const task1 = path.join(dir, 'task1.json');
      const task2 = path.join(dir, 'task2.json');
      const urgent = path.join(dir, 'urgent.json');
      const result = path.join(dir, 'result.json');
      writeFileSync(path.join(dir, 'done.txt'), 'done\n');
      writeFileSync(task1, `${JSON.stringify(item(1, { completion_receipt: 'file:done.txt' }))}\n`);
      writeFileSync(task2, `${JSON.stringify(item(2))}\n`);
      writeFileSync(urgent, `${JSON.stringify(item('urgent', { priority_class: 'P1_state_or_gate_repair' }))}\n`);
      writeFileSync(result, `${JSON.stringify({ queue_item_id: 'queue-1', receipt: 'file:done.txt', summary: 'done' })}\n`);

      execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task1], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task2], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'claim', dir, '--actor', 'main-agent'], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'complete', dir, '--result', result], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'preempt', dir, '--task', urgent, '--reason', 'urgent'], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'render', dir], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'check', dir], { stdio: 'pipe' });

      const saved = JSON.parse(readFileSync(path.join(dir, QUEUE.FILE), 'utf-8'));
      assert.equal(QUEUE.FILE, 'rb_queue.json');
      assert.equal(QueueSchema.safeParse(saved).success, true);
      assert.equal(saved.active_window[0].queue_item_id, 'queue-urgent');
      assert.equal(saved.active_window[1].queue_item_id, 'queue-2');
      assert.match(readFileSync(path.join(dir, QUEUE.PROJECTION), 'utf-8'), /queue-urgent/);
      assert.match(readFileSync(path.join(dir, QUEUE.PROJECTION), 'utf-8'), /Generated from `rb_queue\.json`/);
    } finally {
      cleanup(dir);
    }
  });

  it('saveQueue persists the canonical rb_queue.json shape and loadQueue restores engine shape', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('canonical-file-test');
      queue = enqueue(queue, item(1));

      const savedQueue = saveQueue(dir, queue);
      const persisted = JSON.parse(readFileSync(path.join(dir, 'rb_queue.json'), 'utf-8'));
      assert.equal(savedQueue.active_window[0].queue_item_id, 'queue-1');
      assert.equal(QueueSchema.safeParse(persisted).success, true);
      assert.equal(persisted.active_window[0].queue_item_id, 'queue-1');
      // Negative regression: the old named queue slot field must stay absent.
      assert.equal(Object.hasOwn(persisted, 'slot_1_current'), false);

      const loaded = loadQueue(dir);
      assert.equal(loaded.active_window[0].queue_item_id, 'queue-1');
      assert.equal(loaded.projection_path, QUEUE.PROJECTION);
    } finally {
      cleanup(dir);
    }
  });
});
