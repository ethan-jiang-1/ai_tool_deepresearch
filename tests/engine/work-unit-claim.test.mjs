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

function delegatedForTopic(id, index) {
  const suffix = String(index).padStart(12, '0');
  const slug = `topic-${index}`;
  return delegated(id, {
    payload: {
      topic_uid: `tp_123e4567-e89b-12d3-a456-${suffix}`,
      topic_slug: slug,
      wave: 0,
    },
    required_receipts: [`file:artifacts/wave0/${slug}/source.yaml`],
    writes_to: [`artifacts/wave0/${slug}/source.yaml`],
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
    const topics = new Map();
    for (const item of items) {
      if (!item.payload?.topic_uid || !item.payload?.topic_slug) continue;
      topics.set(item.payload.topic_uid, {
        topic_uid: item.payload.topic_uid,
        slug: item.payload.topic_slug,
      });
    }
    if (topics.size === 0) topics.set('tp_123e4567-e89b-12d3-a456-426614174000', {
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      slug: 'topic-a',
    });
    const topicRows = [...topics.values()].map((entry, index) => `  - topic_uid: ${entry.topic_uid}
    id: "${String(index + 1).padStart(2, '0')}"
    slug: ${entry.slug}
    title: Topic ${index + 1}
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []`).join('\n');
    writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: claim-test
derived_topic_count: ${topics.size}
topic_registry_version: "2"
topic_registry:
${topicRows}
---
# Plan
`);
    mkdirSync(path.join(dir, 'seed_topics'), { recursive: true });
    for (const [index, entry] of [...topics.values()].entries()) {
      writeFileSync(path.join(dir, 'seed_topics', `${entry.slug}.md`), `---
topic_uid: ${entry.topic_uid}
id: "${String(index + 1).padStart(2, '0')}"
slug: ${entry.slug}
title: Topic ${index + 1}
must_answer: ["What matters?"]
scope_role: primary
depends_on_topic_uids: []
---
# Topic ${index + 1}
`);
    }
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
      saveSeedQueue(dir, [delegatedForTopic('queue-a', 1), delegatedForTopic('queue-b', 2), delegatedForTopic('queue-c', 3)]);
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
      saveSeedQueue(dir, Array.from({ length: 7 }, (_, index) => delegatedForTopic(`queue-${index + 1}`, index + 1)));
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

  it('rejects a requested same-target Wave0 batch atomically before allocation', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-owner'), delegated('queue-later')]);
      const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'));
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 2, ...availableSourceActor });

      assert.equal(result.ok, false);
      assert.equal(result.claimed_count, 0);
      assert.deepEqual(result.claimed_work_ids, []);
      assert.equal(result.admission.reason_code, 'wave0_source_target_conflict');
      assert.equal(result.admission.candidate_queue_item_id, 'queue-later');
      assert.equal(result.admission.owner_kind, 'queued');
      assert.equal(result.admission.owner_queue_item_id, 'queue-owner');
      assert.equal(result.admission.repair_kind, 'agent_action');
      assert.match(result.admission.rerun, /--count 1/);
      assert.equal(readFileSync(path.join(dir, 'rb_queue.json')).equals(queueBefore), true);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      assert.equal(existsSync(path.join(dir, '_work_units')), false);
    } finally {
      cleanup(dir);
    }
  });

  it('drains a legacy same-target queue serially and releases ownership at terminalization', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-owner'), delegated('queue-later')]);
      const first = claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableSourceActor });
      assert.equal(first.claimed_count, 1);
      assert.equal(loadQueue(dir).active_window[0].queue_item_id, 'queue-later');

      const blocked = claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableSourceActor });
      assert.equal(blocked.claimed_count, 0);
      assert.equal(blocked.admission.reason_code, 'wave0_source_target_conflict');
      assert.equal(blocked.admission.owner_kind, 'in_flight');
      assert.equal(blocked.admission.owner_work_id, first.claimed_work_ids[0]);

      const terminal = closeWorkUnitAttempt(dir, {
        work_id: first.claimed_work_ids[0],
        status: 'abandoned',
        reason: 'release target for serial-drain test',
      });
      assert.equal(terminal.ok, true);
      const second = claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableSourceActor });
      assert.equal(second.claimed_count, 1);
      assert.equal(loadWorkUnitIndex(dir).work_units[second.claimed_work_ids[0]].queue_item_id, 'queue-later');
    } finally {
      cleanup(dir);
    }
  });

  it('rechecks target conflicts under the claim transaction before mutation', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedForTopic('queue-a', 1), delegatedForTopic('queue-b', 2)]);
      const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'));
      let hookCalled = false;
      assert.throws(() => claimWorkUnits(dir, {
        phase: 'wave0',
        count: 2,
        ...availableSourceActor,
        transactionHooks: {
          beforeClaimRecheck({ operation }) {
            hookCalled = true;
            assert.equal(operation, 'claim_work_units');
            const queue = JSON.parse(readFileSync(path.join(dir, 'rb_queue.json'), 'utf8'));
            queue.active_window[1] = {
              ...queue.active_window[1],
              payload: { ...queue.active_window[1].payload, ...queue.active_window[0].payload },
              required_receipts: [...queue.active_window[0].required_receipts],
              writes_to: [...queue.active_window[0].writes_to],
            };
            writeFileSync(path.join(dir, 'rb_queue.json'), `${JSON.stringify(queue, null, 2)}\n`);
          },
        },
      }), /wave0_source_target_conflict|already owned/);
      assert.equal(hookCalled, true);
      assert.equal(readFileSync(path.join(dir, 'rb_queue.json')).equals(queueBefore), true);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      assert.equal(existsSync(path.join(dir, '_work_units', 'wu-w0-b000-src-i0001')), false);
    } finally {
      cleanup(dir);
    }
  });

  it('keeps a malformed in-flight current profile at its existing fail-closed boundary', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-owner')]);
      const first = claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableSourceActor });
      let queue = loadQueue(dir);
      queue = enqueue(queue, delegated('queue-later'));
      saveQueue(dir, queue);

      const indexPath = workUnitIndexPath(dir);
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      index.work_units[first.claimed_work_ids[0]].assignment_contract_version = 'work-unit.assignment.v2';
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
      const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'));

      assert.throws(() => claimWorkUnits(dir, {
        phase: 'wave0',
        count: 1,
        ...availableSourceActor,
      }), (error) => {
        assert.match(error.message, /unsupported current work-unit contract/);
        assert.doesNotMatch(error.message, /wave0_source_target_conflict/);
        return true;
      });
      assert.equal(readFileSync(path.join(dir, 'rb_queue.json')).equals(queueBefore), true);
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
