import { test } from 'node:test';
import assert from 'node:assert/strict';

import { inspect } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs';

// @impl AGQ-027

function queue(overrides = {}) {
  return {
    schema_version: 'queue.v2',
    queue_id: 'test',
    bundle_name: 'test',
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
    ...overrides,
  };
}

function delegatedItem() {
  return {
    queue_item_id: 'queue-a',
    title: 'Work',
    action: 'inspect',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    lineage: {},
    priority_class: 'P5_new_reference_intake',
    required_receipts: [],
    done_condition: 'done',
    verification: { engine: [], agent: [] },
    writes_to: [],
    status_sync: [],
    completion_receipt: null,
    failure_route: 'repair',
    status: 'queued',
    restore_priority: 'normal',
    payload: {},
  };
}

test('a fully drained queue reports drained: true and no refill advice', () => {
  const result = inspect(queue());
  assert.equal(result.passed, false);
  assert.equal(result.check, false);
  assert.equal(result.drained, true);
  assert.match(result.advice, /drained/);
  assert.doesNotMatch(result.advice, /Refill queue/);
});

test('a healthy queue with work reports passed: true without drained', () => {
  const result = inspect(queue({ active_window: [delegatedItem()] }));
  assert.equal(result.passed, true);
  assert.equal(result.drained, undefined);
});

function inFlight(overrides = {}) {
  return {
    queue_item_id: 'queue-a',
    work_id: 'wu-1',
    wave: 0,
    kind: 'wave0_source_intake',
    batch_id: 'b000',
    attempt_index: 1,
    queue_item_snapshot_hash: 'h',
    claimed_at: '2026-08-08T00:00:00.000Z',
    timeout_ms: 600000,
    deadline_at: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('a queue with in-flight work is not drained', () => {
  const result = inspect(queue({ delegated_in_flight: { 'queue-a': inFlight() } }));
  assert.equal(result.drained, undefined);
  assert.equal(result.passed, true); // in-flight work means the queue is executing, not drained
});

test('a blocker-style failure keeps drained false', () => {
  const expired = inFlight({ deadline_at: '2000-01-01T00:00:00.000Z' });
  const result = inspect(queue({ delegated_in_flight: { 'queue-a': expired } }));
  assert.equal(result.drained, false);
  assert.equal(result.passed, false);
  assert.match(result.inspect.join(' '), /expired/);
});
