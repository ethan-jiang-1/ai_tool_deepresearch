// @impl AGQ-004, AGQ-005, AGQ-019, FRE-005
// Queue Manager receipts, projection rendering, and persistence coverage.

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
} from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { QueueSchema } from '../../DEEP_RESEARCH_HARNESS/schema/contracts/queue.mjs';
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
