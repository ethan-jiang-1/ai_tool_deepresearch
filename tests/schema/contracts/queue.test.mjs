// tests/schema/contracts/queue.test.mjs — 1:1 for DPT_FRAMEWORK/schema/contracts/queue.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QueueWorkUnitSchema,
  TargetSpecSchema,
  QueueSchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import {
  QUEUE_ACTIVE_WINDOW_SLOTS,
  SLOT_NAMES,
} from '../../../DPT_FRAMEWORK/schema/contracts/queue-slots.mjs';

// ═══════════════════════════════════════════════════════════════════
// TargetSpecSchema
// ═══════════════════════════════════════════════════════════════════

describe('TargetSpecSchema', () => {
  it('accepts controller=main-agent without delegates', () => {
    const r = TargetSpecSchema.safeParse({ controller: 'main-agent' });
    assert.ok(r.success);
    assert.equal(r.data.delegates, undefined);
  });

  it('accepts controller=engine', () => {
    assert.ok(TargetSpecSchema.safeParse({ controller: 'engine' }).success);
  });

  it('accepts with delegates and timeout_ms', () => {
    const r = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 300000 },
    });
    assert.ok(r.success);
    assert.equal(r.data.delegates.timeout_ms, 300000);
  });

  it('defaults timeout_ms to 600000 when delegates present but no timeout', () => {
    const r = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' },
    });
    assert.ok(r.success);
    assert.equal(r.data.delegates.timeout_ms, 600000);
  });

  it('rejects controller=sub-agent (not in enum)', () => {
    assert.ok(!TargetSpecSchema.safeParse({ controller: 'sub-agent' }).success);
  });

  it('rejects missing controller', () => {
    assert.ok(!TargetSpecSchema.safeParse({
      delegates: { to: 'sub-agent', role_key: 'x' },
    }).success);
  });

  it('rejects delegates.to=chatgpt (only sub-agent valid)', () => {
    assert.ok(!TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'chatgpt', role_key: 'x' },
    }).success);
  });

  it('rejects delegates missing role_key', () => {
    assert.ok(!TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent' },
    }).success);
  });
});

// ═══════════════════════════════════════════════════════════════════
// QueueWorkUnitSchema
// ═══════════════════════════════════════════════════════════════════

const validItem = {
  work_id: 'w1', title: 'Test', targets: { controller: 'main-agent' },
  action: 'do it', producer_rule: 'test_rule', lineage: {},
  priority_class: 'P4_progressive_artifact_or_seed_backfill',
  required_receipts: ['none'], done_condition: 'done',
  verification: { engine: [], agent: [] }, writes_to: [],
  status_sync: [], completion_receipt: 'none', failure_route: 'repair',
  payload: {},
};

describe('QueueWorkUnitSchema', () => {
  it('accepts valid item', () => {
    assert.ok(QueueWorkUnitSchema.safeParse(validItem).success);
  });

  it('accepts item with defaults (status, preempted_from_slot, restore_priority)', () => {
    const r = QueueWorkUnitSchema.safeParse(validItem);
    assert.ok(r.success);
    assert.equal(r.data.status, 'queued');
    assert.equal(r.data.preempted_from_slot, 'not_applicable');
    assert.equal(r.data.restore_priority, 'normal');
  });

  it('accepts item with targets.delegates', () => {
    assert.ok(QueueWorkUnitSchema.safeParse({
      ...validItem,
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    }).success);
  });

  it('rejects missing producer_rule', () => {
    const bad = { ...validItem }; delete bad.producer_rule;
    assert.ok(!QueueWorkUnitSchema.safeParse(bad).success);
  });

  it('rejects missing required_receipts', () => {
    const bad = { ...validItem }; delete bad.required_receipts;
    assert.ok(!QueueWorkUnitSchema.safeParse(bad).success);
  });

  it('rejects missing completion_receipt', () => {
    const bad = { ...validItem }; delete bad.completion_receipt;
    assert.ok(!QueueWorkUnitSchema.safeParse(bad).success);
  });

  it('rejects non-object payload', () => {
    assert.ok(!QueueWorkUnitSchema.safeParse({ ...validItem, payload: 'bad' }).success);
  });

  it('rejects missing work_id', () => {
    const bad = { ...validItem }; delete bad.work_id;
    assert.ok(!QueueWorkUnitSchema.safeParse(bad).success);
  });

  it('rejects invalid priority_class', () => {
    assert.ok(!QueueWorkUnitSchema.safeParse({ ...validItem, priority_class: 'P99_invalid' }).success);
  });
});

// ═══════════════════════════════════════════════════════════════════
// QueueSchema (five-slot outer wrapper)
// ═══════════════════════════════════════════════════════════════════

const validQueue = {
  queue_health: 'ready',
  stop_authorization_state: 'unauthorized_continue_required',
  ...Object.fromEntries(SLOT_NAMES.map((slot) => [slot, null])),
  refill_pool: [],
};

describe('QueueSchema', () => {
  it('uses shared Queue slot constants for the five-slot wire shape', () => {
    assert.equal(QUEUE_ACTIVE_WINDOW_SLOTS, 5);
    assert.equal(SLOT_NAMES.length, QUEUE_ACTIVE_WINDOW_SLOTS);
    assert.deepEqual(Object.keys(validQueue).filter((key) => key.startsWith('slot_')), SLOT_NAMES);
  });

  it('accepts valid empty queue', () => {
    assert.ok(QueueSchema.safeParse(validQueue).success);
  });

  it('accepts queue with items in slots', () => {
    const q = { ...validQueue, slot_1_current: validItem };
    assert.ok(QueueSchema.safeParse(q).success);
  });

  it('accepts queue with items in refill_pool', () => {
    const q = { ...validQueue, refill_pool: [validItem] };
    assert.ok(QueueSchema.safeParse(q).success);
  });

  it('rejects missing refill_pool', () => {
    const bad = { ...validQueue }; delete bad.refill_pool;
    assert.ok(!QueueSchema.safeParse(bad).success);
  });

  it('rejects invalid queue_health', () => {
    assert.ok(!QueueSchema.safeParse({ ...validQueue, queue_health: 'invalid' }).success);
  });

  it('rejects missing slot_1_current', () => {
    const bad = { ...validQueue }; delete bad.slot_1_current;
    assert.ok(!QueueSchema.safeParse(bad).success);
  });
});
