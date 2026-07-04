// @impl FRE-005
// Queue Manager schema, constants, target, and claim-advice regression coverage.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  QueueItemSchema,
  QUEUE_ACTIVE_WINDOW_SLOTS,
  SLOT_NAMES,
  createQueue,
  enqueue,
  claim,
  makeItem,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { TargetSpecSchema } from '../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import { MAX_CONCURRENT_SUBAGENTS } from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { item } from './queue-manager-fixtures.mjs';

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

describe('Queue active-window constants (AGQ-019)', () => {
  it('defines the 20-slot Queue wire shape independently of Relay concurrency', () => {
    assert.equal(QUEUE_ACTIVE_WINDOW_SLOTS, 20);
    assert.equal(SLOT_NAMES.length, 20);
    assert.equal(SLOT_NAMES[0], 'slot_1_current');
    assert.equal(SLOT_NAMES[1], 'slot_2_next');
    assert.equal(SLOT_NAMES.at(-1), 'slot_20_tail');
    assert.equal(SLOT_NAMES.at(-2), 'slot_19_pending');
  });

  it('Queue active-window slot count is NOT derived from Relay sub-agent concurrency cap', () => {
    // The core architectural invariant: Queue is not the Relay work pool.
    // Without this assertion, a future developer could set both constants equal
    // and no test would fail — the decoupling would be silently lost.
    assert.notEqual(QUEUE_ACTIVE_WINDOW_SLOTS, MAX_CONCURRENT_SUBAGENTS,
      'Queue slot count must be independent of Relay concurrency cap');
    assert.equal(QUEUE_ACTIVE_WINDOW_SLOTS, 20);
    assert.equal(MAX_CONCURRENT_SUBAGENTS, 8);
  });
});

describe('TargetSpec schema (AGQ-012)', () => {
  it('accepts valid targets with delegates', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.delegates.timeout_ms, 600000);
  });

  it('accepts valid targets without delegates', () => {
    const result = TargetSpecSchema.safeParse({ controller: 'main-agent' });
    assert.equal(result.success, true);
    assert.equal(result.data.controller, 'main-agent');
    assert.equal(result.data.delegates, undefined);
  });

  it('accepts targets with delegates and uses default timeout_ms', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.delegates.timeout_ms, 600000);
  });

  it('rejects invalid controller', () => {
    const result = TargetSpecSchema.safeParse({ controller: 'sub-agent' });
    assert.equal(result.success, false);
  });

  it('rejects invalid delegates.to', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'chatgpt', role_key: 'test' },
    });
    assert.equal(result.success, false);
  });

  it('rejects missing controller', () => {
    const result = TargetSpecSchema.safeParse({
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' },
    });
    assert.equal(result.success, false);
  });

  it('rejects delegates without required role_key', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent' },
    });
    assert.equal(result.success, false);
  });
});

describe('Queue item with targets (AGQ-011)', () => {
  it('accepts item with targets.delegates', () => {
    const parsed = QueueItemSchema.safeParse(item(1, {
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    }));
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.targets.controller, 'main-agent');
    assert.equal(parsed.data.targets.delegates.role_key, 'dpt-evidence-extractor');
  });

  it('accepts item with targets.controller only', () => {
    const parsed = QueueItemSchema.safeParse(item(1, {
      targets: { controller: 'main-agent' },
    }));
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.targets.controller, 'main-agent');
    assert.equal('delegates' in parsed.data.targets, false);
  });

  it('makeItem uses targets default', () => {
    const i = makeItem({ work_id: 'test-defaults' });
    assert.deepEqual(i.targets, { controller: 'main-agent' });
  });

  it('rejects item with missing target (old field name)', () => {
    // The old `target` field is no longer in the schema — should fail
    const candidate = { ...item(1) };
    delete candidate.targets;
    candidate.target = 'main-agent';
    const parsed = QueueItemSchema.safeParse(candidate);
    assert.equal(parsed.success, false);
  });
});

describe('Claim advice with targets.delegates (AGQ-014)', () => {
  it('claim returns delegates_required=true when delegates present', () => {
    let queue = createQueue('delegates-claim-test');
    queue = enqueue(queue, item(1, {
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
    }));
    const { item: claimed, advice } = claim(queue, { actor: 'main-agent' });
    assert.ok(claimed);
    assert.equal(advice.delegates_required, true);
    assert.equal(advice.delegates_config.role_key, 'dpt-source-intake');
    assert.equal(advice.delegates_config.timeout_ms, 600000);
  });

  it('claim returns delegates_required=false when no delegates', () => {
    let queue = createQueue('no-delegates-claim-test');
    queue = enqueue(queue, item(1, {
      targets: { controller: 'main-agent' },
    }));
    const { item: claimed, advice } = claim(queue, { actor: 'main-agent' });
    assert.ok(claimed);
    assert.equal(advice.delegates_required, false);
  });
});
