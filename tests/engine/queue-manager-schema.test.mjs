// @impl AGQ-001, AGQ-005, AGQ-018, AGQ-020, FRE-005
// Queue Manager schema, identity, and snapshot-hash regression coverage.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  QUEUE_SCHEMA_VERSION,
  QueueItemSchema,
  canonicalQueueItemSnapshot,
  claim,
  createQueue,
  enqueue,
  makeItem,
  queueItemSnapshotHash,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { TargetSpecSchema } from '../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import { item } from './queue-manager-fixtures.mjs';

describe('Queue item schema (AGQ-001)', () => {
  it('accepts a valid queue demand item with fixed fields and payload object', () => {
    const parsed = QueueItemSchema.safeParse(item(1, { payload: { kind: 'source-intake' } }));
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.queue_item_id, 'queue-1');
  });

  it('rejects missing required core fields', () => {
    const candidate = item(1);
    delete candidate.producer_rule;
    delete candidate.required_receipts;
    delete candidate.completion_receipt;
    const parsed = QueueItemSchema.safeParse(candidate);
    assert.equal(parsed.success, false);
  });

  it('rejects work_id on queue demand items', () => {
    assert.throws(
      () => makeItem({ work_id: 'legacy-task-id' }),
      /queue_item_id/,
    );
    assert.equal(QueueItemSchema.safeParse({ ...item(1), work_id: 'legacy-task-id' }).success, false);
  });
});

describe('Queue v2 constants and targets (AGQ-005)', () => {
  it('uses an ordered active-window limit instead of slot names', () => {
    assert.equal(QUEUE_SCHEMA_VERSION, 'queue.v2');
    assert.equal(QUEUE_ACTIVE_WINDOW_LIMIT, 20);
  });

  it('accepts valid targets with delegates', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.delegates.timeout_ms, 600000);
  });

  it('rejects invalid controller and delegate target', () => {
    assert.equal(TargetSpecSchema.safeParse({ controller: 'sub-agent' }).success, false);
    assert.equal(TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'chatgpt', role_key: 'test' },
    }).success, false);
  });
});

describe('Queue item with targets (AGQ-014)', () => {
  it('makeItem uses targets default', () => {
    const i = makeItem({ queue_item_id: 'test-defaults' });
    assert.deepEqual(i.targets, { controller: 'main-agent' });
  });

  it('operate-queue claim rejects delegated demand and routes to work-unit claim', () => {
    let queue = createQueue('delegates-claim-test');
    queue = enqueue(queue, item(1, {
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
    }));
    const result = claim(queue, { actor: 'main-agent' });
    assert.equal(result.item, null);
    assert.equal(result.feedback.passed, false);
    assert.match(result.feedback.advice, /operate-work-unit claim/);
    assert.equal(result.queue.active_window[0].queue_item_id, 'queue-1');
  });

  it('claim marks non-delegated front demand running', () => {
    let queue = createQueue('no-delegates-claim-test');
    queue = enqueue(queue, item(1, { targets: { controller: 'main-agent' } }));
    const result = claim(queue, { actor: 'main-agent' });
    assert.equal(result.item.queue_item_id, 'queue-1');
    assert.equal(result.queue.active_window[0].status, 'running');
    assert.equal(result.advice.delegates_required, false);
  });
});

describe('Queue item snapshot hash (AGQ-018)', () => {
  it('excludes status, timestamps, and runtime attempt fields', () => {
    const base = item(1, {
      status: 'queued',
      created_at: '2026-07-06T00:00:00.000Z',
      updated_at: '2026-07-06T00:00:00.000Z',
    });
    const changedRuntime = {
      ...base,
      status: 'running',
      updated_at: '2026-07-06T01:00:00.000Z',
      attempt_index: 2,
      queue_item_snapshot_hash: 'different',
    };
    assert.equal(queueItemSnapshotHash(base), queueItemSnapshotHash(changedRuntime));
    assert.equal(Object.hasOwn(canonicalQueueItemSnapshot(changedRuntime), 'status'), false);
  });

  it('changes when semantic demand fields change', () => {
    const base = item(1, { payload: { topic_slug: 'topic-a' } });
    const changed = item(1, { payload: { topic_slug: 'topic-b' } });
    assert.notEqual(queueItemSnapshotHash(base), queueItemSnapshotHash(changed));
  });
});
