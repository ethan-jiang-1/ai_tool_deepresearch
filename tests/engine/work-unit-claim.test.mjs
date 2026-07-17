// @impl DEW-003, AGQ-014, SUD-001, SUD-002, LOG-006

import { existsSync, readdirSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  loadQueue,
  makeItem,
  saveQueue,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  loadWorkUnitIndex,
  openWorkUnitBatch,
  transactionDir,
  workUnitIndexPath,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-claim-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function delegated(id, overrides = {}) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: id },
    ...overrides,
  });
}

function direct(id) {
  return makeItem({
    queue_item_id: id,
    title: `Direct ${id}`,
    targets: { controller: 'main-agent' },
    producer_rule: 'manual',
    payload: {},
  });
}

function saveSeedQueue(dir, items) {
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
  return queue;
}

const availableSourceActor = {
  actorObservation: {
    outcome: 'available',
    source: 'native_probe',
    role_key: 'dpt-source-intake',
    reason_code: 'probe_succeeded',
  },
  executionActorClass: 'delegated_subagent',
};

describe('claimWorkUnits', () => {
  it('claims a contiguous delegated prefix in one transaction', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a'), delegated('queue-b'), delegated('queue-c')]);
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 2, ...availableSourceActor });
      assert.equal(result.claimed_count, 2);
      assert.deepEqual(result.claimed_work_ids, ['wu-w0-b000-src-i0001', 'wu-w0-b000-src-i0002']);
      assert.deepEqual(result.continuation, {
        next_action: 'inspect_and_poll_claimed_work',
        work_ids: result.claimed_work_ids,
      });
      assert.equal(result.in_flight_count, 2);
      assert.equal(result.unclaimed_delegated_count, 1);
      assert.equal(result.phase_drained, false);

      const queue = loadQueue(dir);
      assert.equal(queue.active_window[0].queue_item_id, 'queue-c');
      assert.equal(Object.keys(queue.delegated_in_flight).length, 2);
      assert.equal(queue.delegated_in_flight['queue-a'].work_id, 'wu-w0-b000-src-i0001');

      const index = loadWorkUnitIndex(dir);
      assert.equal(Object.keys(index.work_units).length, 2);
      const txFiles = readdirSync(transactionDir(dir)).filter((name) => name.endsWith('.json'));
      assert.equal(txFiles.length, 1);
      assert.match(JSON.stringify(result.prompt_refs), /task\.md/);
    } finally {
      cleanup(dir);
    }
  });

  it('stops at the first non-delegated blocker after partial success', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a'), direct('queue-direct'), delegated('queue-b')]);
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 3, ...availableSourceActor });
      assert.equal(result.claimed_count, 1);
      assert.deepEqual(result.continuation, {
        next_action: 'inspect_and_poll_claimed_work',
        work_ids: result.claimed_work_ids,
      });
      assert.equal(result.blocked_by_queue_item_id, 'queue-direct');
      const queue = loadQueue(dir);
      assert.equal(queue.active_window[0].queue_item_id, 'queue-direct');
      assert.equal(queue.active_window[1].queue_item_id, 'queue-b');
      assert.equal(Object.keys(queue.delegated_in_flight).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('does not create work-unit index on zero-claim blocker', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [direct('queue-direct'), delegated('queue-a')]);
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 2 });
      assert.equal(result.claimed_count, 0);
      assert.equal(result.continuation, undefined);
      assert.equal(result.blocked_by_queue_item_id, 'queue-direct');
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      const queue = loadQueue(dir);
      assert.equal(queue.active_window[0].queue_item_id, 'queue-direct');
      assert.equal(queue.active_window[1].queue_item_id, 'queue-a');
    } finally {
      cleanup(dir);
    }
  });

  it('claims a new rerun demand in b001 after terminal b000 history', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-old')]);
      const first = claimWorkUnits(dir, { phase: 'wave0', ...availableSourceActor });
      assert.deepEqual(first.claimed_work_ids, ['wu-w0-b000-src-i0001']);
      assert.equal(closeWorkUnitAttempt(dir, { work_id: first.claimed_work_ids[0], status: 'abandoned', reason: 'historical-complete-for-rerun-test' }).ok, true);
      assert.equal(openWorkUnitBatch(dir, { phase: 'wave0', reason: 'rerun_new_topic' }).batch_id, 'b001');

      let queue = loadQueue(dir);
      queue = enqueue(queue, delegated('queue-new-topic'));
      saveQueue(dir, queue);
      const rerun = claimWorkUnits(dir, { phase: 'wave0', ...availableSourceActor });
      assert.equal(rerun.claimed_count, 1);
      assert.deepEqual(rerun.claimed_work_ids, ['wu-w0-b001-src-i0001']);
      assert.equal(loadWorkUnitIndex(dir).work_units['wu-w0-b001-src-i0001'].queue_item_id, 'queue-new-topic');
    } finally {
      cleanup(dir);
    }
  });
});
