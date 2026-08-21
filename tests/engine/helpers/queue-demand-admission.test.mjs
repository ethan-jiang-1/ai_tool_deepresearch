// @impl QIV-001, DEW-003

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateQueueDemandAdmission,
  Wave0TargetConflictSchema,
  Wave0TargetOwnerSchema,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/queue-demand-admission.mjs';
import { WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit.mjs';

const topic = {
  topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
  id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['What matters?'],
  scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [],
};

const currentFacts = {
  topicRegistry: [topic],
  topicState: { mode: 'canonical', topics: [{ topic_uid: topic.topic_uid, slug: topic.slug }], blockers: [] },
  findingIndex: { findings: [{ id: 'W2F-001' }] },
};

function delegated(kind, overrides = {}) {
  const shared = {
    queue_item_id: `queue-${kind}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'test', timeout_ms: 600000 } },
    kind,
    payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug },
    lineage: {},
  };
  if (kind === 'wave0_source_intake') shared.required_receipts = ['file:artifacts/wave0/topic-a/source.yaml'];
  if (kind === 'wave1_topic_deepening') {
    shared.producer_rule = 'topic_deepening';
    shared.payload.assignment_mode = 'supplementary';
    shared.required_receipts = [];
  }
  if (kind === 'wave2_targeted_evidence') {
    shared.payload = { finding_id: 'W2F-001' };
    shared.required_receipts = [];
  }
  return { ...shared, ...overrides, payload: { ...shared.payload, ...(overrides.payload || {}) } };
}

describe('evaluateQueueDemandAdmission', () => {
  it('accepts every explicit registered kind and returns resolved facts', () => {
    for (const kind of ['wave0_source_intake', 'wave1_topic_deepening', 'wave2_targeted_evidence']) {
      const result = evaluateQueueDemandAdmission({ queueItem: delegated(kind), currentFacts });
      assert.equal(result.ok, true, `${kind}: ${result.reason || ''}`);
      assert.equal(result.kind, kind);
      assert.equal(result.assignment_contract.assignment_contract_version, WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION);
      if (kind === 'wave0_source_intake') {
        assert.equal(result.wave0_source_target, 'artifacts/wave0/topic-a/source.yaml');
      }
    }
  });

  it('rejects absent and unsupported delegated kinds directly', () => {
    for (const kind of [undefined, 'manual_work']) {
      const result = evaluateQueueDemandAdmission({ queueItem: delegated(kind), currentFacts });
      assert.equal(result.ok, false);
      assert.equal(result.reason_code, 'delegated_kind_required');
    }
  });

  it('uses supplied current Topic and finding facts', () => {
    const staleTopic = evaluateQueueDemandAdmission({
      queueItem: delegated('wave0_source_intake', { payload: { topic_uid: topic.topic_uid, topic_slug: 'old-topic-a' } }),
      currentFacts,
    });
    assert.equal(staleTopic.ok, false);
    assert.equal(staleTopic.reason_code, 'topic_slug_unknown');

    const missingFinding = evaluateQueueDemandAdmission({
      queueItem: delegated('wave2_targeted_evidence', { payload: { finding_id: 'W2F-999' } }),
      currentFacts,
    });
    assert.equal(missingFinding.ok, false);
    assert.equal(missingFinding.reason_code, 'finding_id_unknown');
  });

  it('rejects closed assignment-contract selector input', () => {
    const result = evaluateQueueDemandAdmission({
      queueItem: delegated('wave1_topic_deepening', { payload: { required_outputs: [] } }),
      currentFacts,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason_code, 'assignment_contract_rejected');
    assert.match(result.reason, /reserved assignment selector required_outputs/);
  });

  it('rejects an invalid floor objective before delegated admission', () => {
    const accepted = evaluateQueueDemandAdmission({
      queueItem: delegated('wave1_topic_deepening', { payload: { reference_floor_deficit: 2 } }),
      currentFacts,
    });
    assert.equal(accepted.ok, true);
    const rejected = evaluateQueueDemandAdmission({
      queueItem: delegated('wave1_topic_deepening', { payload: { assignment_mode: 'primary', reference_floor_deficit: 2 } }),
      currentFacts,
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.reason_code, 'assignment_contract_rejected');
  });

  it('projects only direct payload assignment-mode failures without inferring or mutating', () => {
    for (const { label, payload, topLevelMode } of [
      { label: 'missing payload field despite top-level mode', payload: {}, topLevelMode: 'primary' },
      { label: 'unknown payload value', payload: { assignment_mode: 'unknown' }, topLevelMode: undefined },
    ]) {
      const card = delegated('wave1_topic_deepening', { payload, assignment_mode: topLevelMode });
      if (label.startsWith('missing')) delete card.payload.assignment_mode;
      const beforeCard = JSON.stringify(card);
      const beforeFacts = JSON.stringify(currentFacts);
      const result = evaluateQueueDemandAdmission({ queueItem: card, currentFacts });

      assert.equal(result.ok, false, label);
      assert.equal(result.reason_code, 'assignment_contract_rejected', label);
      assert.deepEqual(result.assignment_contract_feedback, {
        kind: 'payload_assignment_mode',
        coordinate: 'payload.assignment_mode',
        json_pointer: '/payload/assignment_mode',
        allowed_values: ['primary', 'supplementary'],
        repair_kind: 'agent_action',
        repair_surface: 'retained_unqueued_task_card',
        rerun_operation: 'enqueue',
      }, label);
      assert.equal(Object.hasOwn(result, 'queue_item'), false, label);
      assert.equal(JSON.stringify(card), beforeCard, label);
      assert.equal(JSON.stringify(currentFacts), beforeFacts, label);
    }

    const receiptFailure = evaluateQueueDemandAdmission({
      queueItem: delegated('wave1_topic_deepening', {
        payload: { assignment_mode: 'primary' },
        required_receipts: [],
      }),
      currentFacts,
    });
    assert.equal(receiptFailure.ok, false);
    assert.equal(receiptFailure.reason_code, 'assignment_contract_rejected');
    assert.equal(Object.hasOwn(receiptFailure, 'assignment_contract_feedback'), false);
  });

  it('excludes non-delegated cards and mutates neither input nor facts', () => {
    const card = delegated('wave1_topic_deepening', { targets: { controller: 'main-agent' }, payload: { assignment_mode: 'invalid' } });
    const beforeCard = JSON.stringify(card);
    const beforeFacts = JSON.stringify(currentFacts);
    const result = evaluateQueueDemandAdmission({ queueItem: card, currentFacts });
    assert.deepEqual(result, { ok: true, applicable: false, queue_item: card });
    assert.equal(JSON.stringify(card), beforeCard);
    assert.equal(JSON.stringify(currentFacts), beforeFacts);
  });

  it('rejects a later same-target Wave0 candidate with closed owner feedback', () => {
    const card = delegated('wave0_source_intake', { queue_item_id: 'wave0-later' });
    const facts = {
      ...currentFacts,
      wave0TargetOwners: [{
        owner_kind: 'queued',
        queue_item_id: 'wave0-earlier',
        target: 'artifacts/wave0/topic-a/source.yaml',
      }],
      targetConflictRerun: 'operate-work-unit claim --count 1',
    };
    const before = JSON.stringify({ card, facts });
    const result = evaluateQueueDemandAdmission({ queueItem: card, currentFacts: facts });

    assert.equal(result.ok, false);
    assert.equal(result.reason_code, 'wave0_source_target_conflict');
    assert.equal(result.repair_kind, 'agent_action');
    assert.equal(result.source_target, 'artifacts/wave0/topic-a/source.yaml');
    assert.equal(result.candidate_queue_item_id, 'wave0-later');
    assert.equal(result.owner_kind, 'queued');
    assert.equal(result.owner_queue_item_id, 'wave0-earlier');
    assert.equal(Object.hasOwn(result, 'owner_work_id'), false);
    assert.equal(result.rerun, 'operate-work-unit claim --count 1');
    assert.equal(Object.hasOwn(result, 'wait'), false);
    assert.equal(JSON.stringify({ card, facts }), before);
  });

  it('excludes the persisted queue candidate itself and permits a distinct target', () => {
    const card = delegated('wave0_source_intake', { queue_item_id: 'wave0-owner' });
    const owner = {
      owner_kind: 'queued',
      queue_item_id: 'wave0-owner',
      target: 'artifacts/wave0/topic-a/source.yaml',
    };
    const self = evaluateQueueDemandAdmission({
      queueItem: card,
      currentFacts: { ...currentFacts, wave0TargetOwners: [owner], excludeWave0QueueItemId: 'wave0-owner' },
    });
    assert.equal(self.ok, true);

    const distinct = evaluateQueueDemandAdmission({
      queueItem: card,
      currentFacts: {
        ...currentFacts,
        wave0TargetOwners: [{ ...owner, queue_item_id: 'wave0-other', target: 'artifacts/wave0/topic-b/source.yaml' }],
      },
    });
    assert.equal(distinct.ok, true);
  });

  it('reports an in-flight owner with its immutable work identity', () => {
    const result = evaluateQueueDemandAdmission({
      queueItem: delegated('wave0_source_intake', { queue_item_id: 'wave0-later' }),
      currentFacts: {
        ...currentFacts,
        wave0TargetOwners: [{
          owner_kind: 'in_flight',
          queue_item_id: 'wave0-running',
          work_id: 'wu-w0-b000-src-i0001',
          target: 'artifacts/wave0/topic-a/source.yaml',
        }],
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.owner_kind, 'in_flight');
    assert.equal(result.owner_queue_item_id, 'wave0-running');
    assert.equal(result.owner_work_id, 'wu-w0-b000-src-i0001');
  });

  it('validates ephemeral owner and conflict facts strictly', () => {
    assert.throws(() => Wave0TargetOwnerSchema.parse({
      owner_kind: 'in_flight',
      queue_item_id: 'wave0-running',
      target: 'artifacts/wave0/topic-a/source.yaml',
    }), /in_flight owner requires work_id/);
    assert.throws(() => Wave0TargetOwnerSchema.parse({
      owner_kind: 'queued',
      queue_item_id: 'wave0-queued',
      work_id: 'wu-w0-b000-src-i0001',
      target: 'artifacts/wave0/topic-a/source.yaml',
    }), /queued owner must not carry work_id/);
    assert.throws(() => Wave0TargetConflictSchema.parse({
      candidate: { queue_item_id: 'candidate', target: 'artifacts/wave0/topic-a/source.yaml' },
      owner: { owner_kind: 'queued', queue_item_id: 'owner', target: 'artifacts/wave0/topic-b/source.yaml' },
      reason_code: 'wave0_source_target_conflict',
      repair_kind: 'agent_action',
      rerun: 'rerun admission',
    }), /candidate and owner targets must match/);
  });
});
