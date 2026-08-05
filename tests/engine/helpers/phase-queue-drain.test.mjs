import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkPhaseQueueDrained } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-queue-drain.mjs';

const created = [];
function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'phase-queue-drain-'));
  created.push(dir);
  return dir;
}
function item(id, { delegated = false, future = false } = {}) {
  return {
    queue_item_id: id,
    title: future ? 'Future-looking residual' : 'Residual demand',
    targets: delegated
      ? { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-topic-scout', timeout_ms: 600000 } }
      : { controller: 'main-agent' },
    kind: future ? 'future_phase_work' : 'current_work',
    action: 'inspect',
    producer_rule: future ? 'later_phase' : 'current_phase',
    lineage: {},
    priority_class: 'P3_current_gate_gap',
    required_receipts: [],
    done_condition: 'done',
    verification: { engine: [], agent: [] },
    writes_to: future ? ['artifacts/final/future.md'] : [],
    status_sync: [],
    completion_receipt: null,
    failure_route: 'repair',
    status: 'queued',
    restore_priority: 'normal',
    payload: {},
  };
}
function queue(overrides = {}) {
  return {
    schema_version: 'queue.v2',
    bundle_name: 'test',
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
    ...overrides,
  };
}
function writeQueue(dir, value) {
  const file = path.join(dir, 'rb_queue.json');
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

describe('phase queue drain', () => {
  after(() => created.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('fails missing, malformed and schema-invalid authority without creating or rewriting bytes', () => {
    const missing = tempBundle();
    const missingResult = checkPhaseQueueDrained(missing, { phase: 'wave1' });
    assert.equal(missingResult.passed, false);
    assert.equal(missingResult.findings.length, 1);
    assert.equal(missingResult.findings[0].repair_kind, 'missing_contract');

    for (const raw of ['{bad json\n', JSON.stringify({ nope: true })]) {
      const dir = tempBundle();
      const file = path.join(dir, 'rb_queue.json');
      writeFileSync(file, raw);
      const before = readFileSync(file);
      const result = checkPhaseQueueDrained(dir, { phase: 'wave1' });
      assert.equal(result.passed, false);
      assert.equal(result.findings.length, 1);
      assert.deepEqual(readFileSync(file), before);
    }
  });

  it('passes only a globally empty queue and never mutates authority bytes', () => {
    const dir = tempBundle();
    const file = writeQueue(dir, queue());
    const before = readFileSync(file);
    const result = checkPhaseQueueDrained(dir, { phase: 'wave2' });
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.deepEqual(readFileSync(file), before);
  });

  it('routes active-front demand only from direct targets and does not infer future phase', () => {
    for (const testCase of [
      { value: item('delegated', { delegated: true }), owner: /operate-work-unit.*claim/ },
      { value: item('main'), owner: /operate-queue.*claim/ },
      { value: item('future', { future: true }), owner: /operate-queue.*claim/ },
    ]) {
      const dir = tempBundle();
      const file = writeQueue(dir, queue({ active_window: [testCase.value] }));
      const before = readFileSync(file);
      const result = checkPhaseQueueDrained(dir, { phase: 'wave2' });
      assert.equal(result.passed, false);
      assert.match(result.findings[0].write_to, testCase.owner);
      assert.deepEqual(readFileSync(file), before);
    }
  });

  it('does not guess a main-agent owner for non-delegated engine demand', () => {
    const dir = tempBundle();
    const engineItem = item('engine-owned');
    engineItem.targets = { controller: 'engine' };
    writeQueue(dir, queue({ active_window: [engineItem] }));
    const result = checkPhaseQueueDrained(dir, { phase: 'wave1' });
    assert.equal(result.passed, false);
    assert.equal(result.findings[0].repair_kind, 'missing_contract');
    assert.match(result.findings[0].write_to, /targets\.controller=engine/);
    assert.doesNotMatch(result.findings[0].write_to, /operate-queue.*claim/);
  });

  it('prioritizes delegated in-flight over mixed residuals and exposes refill-only missing contract', () => {
    const inFlightDir = tempBundle();
    writeQueue(inFlightDir, queue({
      active_window: [item('main')],
      delegated_in_flight: {
        delegated: {
          queue_item_id: 'delegated', work_id: 'wu-w2-b000-tgt-i0001', wave: 2, kind: 'wave2_targeted_evidence',
          batch_id: 'b000', attempt_index: 1, queue_item_snapshot_hash: 'hash', claimed_at: '2026-07-16T00:00:00.000Z',
          timeout_ms: 600000, deadline_at: '2026-07-16T00:10:00.000Z',
        },
      },
    }));
    const inFlight = checkPhaseQueueDrained(inFlightDir, { phase: 'wave2' });
    assert.match(inFlight.findings[0].write_to, /operate-work-unit.*inspect/);
    assert.doesNotMatch(inFlight.findings[0].write_to, /operate-queue/);

    const refillDir = tempBundle();
    writeQueue(refillDir, queue({ refill_pool: [item('pool')] }));
    const refill = checkPhaseQueueDrained(refillDir, { phase: 'wave0' });
    assert.equal(refill.findings[0].repair_kind, 'missing_contract');
    assert.doesNotMatch(`${refill.findings[0].write_to} ${refill.findings[0].repair}`, /hand edit|refill command|operate-queue check/i);
  });
});
