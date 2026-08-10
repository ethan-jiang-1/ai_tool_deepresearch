// @impl DEW-003, AGQ-014, SUD-001, SUD-002, LOG-006

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
} from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
} from '../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit.mjs';
import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  loadWorkUnitIndex,
  openWorkUnitBatch,
  transactionDir,
  workUnitIndexPath,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

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
    payload: {
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
      wave: 0,
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
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
  if (!existsSync(path.join(dir, 'rb_plan.md'))) {
    writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: claim-test
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
    id: "01"
    slug: topic-a
    title: Topic A
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
    mkdirSync(path.join(dir, 'seed_topics'), { recursive: true });
    writeFileSync(path.join(dir, 'seed_topics', 'topic-a.md'), `---
topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
id: "01"
slug: topic-a
title: Topic A
must_answer: ["What matters?"]
scope_role: primary
depends_on_topic_uids: []
---
# Topic A
`);
  }
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
      for (const workId of result.claimed_work_ids) {
        const record = index.work_units[workId];
        const manifest = JSON.parse(readFileSync(path.join(dir, record.paths.manifest_ref), 'utf8'));
        const beacon = JSON.parse(readFileSync(path.join(dir, record.paths.beacon_ref), 'utf8'));
        assert.equal(record.submission_contract_version, WORK_UNIT_SUBMISSION_CONTRACT_VERSION);
        assert.equal(manifest.submission_contract_version, WORK_UNIT_SUBMISSION_CONTRACT_VERSION);
        assert.equal(beacon.submission_contract_version, WORK_UNIT_SUBMISSION_CONTRACT_VERSION);
        const task = readFileSync(path.join(dir, record.paths.task_ref), 'utf8');
        assert.match(task, /Logical actor route: `delegated_subagent`/);
        assert.ok(task.includes(`work_id \`${workId}\`, receipt_nonce \`${record.receipt_nonce}\``));
        assert.match(task, /does not authenticate a physical writer or prove host\/sub-agent liveness/i);
      }
      const txFiles = readdirSync(transactionDir(dir)).filter((name) => name.endsWith('.json'));
      assert.equal(txFiles.length, 1);
      assert.match(JSON.stringify(result.prompt_refs), /task\.md/);
    } finally {
      cleanup(dir);
    }
  });

  it('claims seven eligible normal demands without a cap scheduler', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, Array.from({ length: 7 }, (_, index) => delegated(`queue-${index + 1}`)));
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 7, ...availableSourceActor });
      assert.equal(result.claimed_count, 7);
      assert.equal(result.in_flight_count, 7);
      assert.equal(result.unclaimed_delegated_count, 0);
      assert.equal(new Set(result.claimed_work_ids).size, 7);
      assert.equal(Object.keys(loadWorkUnitIndex(dir).work_units).length, 7);
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

  it('projects malformed actor observation feedback from the existing validator without allocating work', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-invalid-observation')]);
      const result = claimWorkUnits(dir, {
        phase: 'wave0',
        actorObservation: {
          outcome: 'available',
          source: 'not_observed',
          role_key: 'dpt-source-intake',
          reason_code: 'probe_succeeded',
        },
        executionActorClass: 'delegated_subagent',
      });
      assert.equal(result.claimed_count, 0);
      assert.equal(result.actor_observation_feedback.planned_role_key, 'dpt-source-intake');
      assert.equal(typeof result.actor_observation_feedback.primary_conflict.field, 'string');
      assert.ok(result.actor_observation_feedback.conflicts.length > 0);
      assert.ok(result.actor_observation_feedback.legal_tuples.length > 0);
      assert.match(result.actor_observation_feedback.rerun, /operate-work-unit\.mjs claim/);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
    } finally {
      cleanup(dir);
    }
  });
});
