// tests/schema/contracts/queue.test.mjs - queue v2 contract coverage.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  QUEUE_SCHEMA_VERSION,
  QueueDemandItemSchema,
  QueueSchema,
  TargetSpecSchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/queue.mjs';

function demand(overrides = {}) {
  return {
    queue_item_id: 'queue-001',
    title: 'Queue demand',
    targets: { controller: 'main-agent' },
    action: 'do it',
    producer_rule: 'test_rule',
    lineage: {},
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: ['none'],
    done_condition: 'done',
    verification: { engine: [], agent: [] },
    writes_to: [],
    status_sync: [],
    completion_receipt: 'none',
    failure_route: 'repair',
    payload: {},
    ...overrides,
  };
}

function queue(overrides = {}) {
  return {
    schema_version: QUEUE_SCHEMA_VERSION,
    bundle_name: null,
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
    ...overrides,
  };
}

describe('TargetSpecSchema', () => {
  it('accepts controller=main-agent without delegates', () => {
    const r = TargetSpecSchema.safeParse({ controller: 'main-agent' });
    assert.ok(r.success);
    assert.equal(r.data.delegates, undefined);
  });

  it('accepts with delegates and defaults timeout_ms', () => {
    const r = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' },
    });
    assert.ok(r.success);
    assert.equal(r.data.delegates.timeout_ms, 600000);
  });

  it('rejects invalid controller or delegate target', () => {
    assert.equal(TargetSpecSchema.safeParse({ controller: 'sub-agent' }).success, false);
    assert.equal(TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'chatgpt', role_key: 'x' },
    }).success, false);
  });
});

describe('QueueDemandItemSchema', () => {
  it('accepts a valid queue demand item with queue_item_id', () => {
    const parsed = QueueDemandItemSchema.safeParse(demand());
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.queue_item_id, 'queue-001');
    assert.equal(parsed.data.status, 'queued');
  });

  it('rejects work_id as queue demand identity', () => {
    const parsed = QueueDemandItemSchema.safeParse(demand({ work_id: 'legacy-work-id' }));
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues.map((i) => i.message).join('\n'), /queue_item_id/);
  });

  it('allows null completion_receipt only with no required receipts', () => {
    assert.equal(QueueDemandItemSchema.safeParse(demand({
      required_receipts: [],
      completion_receipt: null,
    })).success, true);
    assert.equal(QueueDemandItemSchema.safeParse(demand({
      required_receipts: ['file:done.md'],
      completion_receipt: null,
    })).success, false);
  });
});

describe('QueueSchema', () => {
  it('accepts valid queue v2 shape', () => {
    assert.equal(QUEUE_ACTIVE_WINDOW_LIMIT, 20);
    assert.equal(QueueSchema.safeParse(queue()).success, true);
    assert.equal(QueueSchema.parse(queue()).schema_version, QUEUE_SCHEMA_VERSION);
  });

  it('accepts ordered active_window and refill_pool arrays', () => {
    const parsed = QueueSchema.safeParse(queue({
      active_window: [demand({ queue_item_id: 'queue-001' })],
      refill_pool: [demand({ queue_item_id: 'queue-002' })],
    }));
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.active_window[0].queue_item_id, 'queue-001');
  });

  it('accepts delegated_in_flight keyed by queue_item_id', () => {
    const parsed = QueueSchema.safeParse(queue({
      delegated_in_flight: {
        'queue-003': {
          queue_item_id: 'queue-003',
          work_id: 'wu-w0-b000-src-i0001',
          wave: 0,
          kind: 'wave0_source_intake',
          batch_id: 'b000',
          attempt_index: 1,
          queue_item_snapshot_hash: 'abc123',
          claimed_at: '2026-07-06T00:00:00.000Z',
          timeout_ms: 600000,
          deadline_at: '2026-07-06T00:10:00.000Z',
        },
      },
    }));
    assert.equal(parsed.success, true);
  });

  it('rejects duplicate queue_item_id across active queue locations', () => {
    const parsed = QueueSchema.safeParse(queue({
      active_window: [demand({ queue_item_id: 'queue-dupe' })],
      refill_pool: [demand({ queue_item_id: 'queue-dupe' })],
    }));
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues.map((i) => i.message).join('\n'), /queue-dupe/);
  });

  it('rejects delegated_in_flight key mismatch', () => {
    const parsed = QueueSchema.safeParse(queue({
      delegated_in_flight: {
        'queue-key': {
          queue_item_id: 'queue-value',
          work_id: 'wu-w0-b000-src-i0001',
          wave: 0,
          kind: 'wave0_source_intake',
          batch_id: 'b000',
          attempt_index: 1,
          queue_item_snapshot_hash: 'abc123',
          claimed_at: '2026-07-06T00:00:00.000Z',
          timeout_ms: 600000,
          deadline_at: '2026-07-06T00:10:00.000Z',
        },
      },
    }));
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues.map((i) => i.message).join('\n'), /must match queue_item_id/);
  });

  it('rejects legacy top-level slot shape', () => {
    const parsed = QueueSchema.safeParse({
      ...queue(),
      slot_1_current: demand({ queue_item_id: 'queue-old' }),
    });
    assert.equal(parsed.success, false);
  });
});
