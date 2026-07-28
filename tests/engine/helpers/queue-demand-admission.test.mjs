// @impl QIV-001, DEW-003

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateQueueDemandAdmission } from '../../../DPT_FRAMEWORK/engine/helpers/queue-demand-admission.mjs';
import { WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION } from '../../../DPT_FRAMEWORK/schema/contracts/work-unit.mjs';

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

  it('excludes non-delegated cards and mutates neither input nor facts', () => {
    const card = delegated('wave1_topic_deepening', { targets: { controller: 'main-agent' }, payload: { assignment_mode: 'invalid' } });
    const beforeCard = JSON.stringify(card);
    const beforeFacts = JSON.stringify(currentFacts);
    const result = evaluateQueueDemandAdmission({ queueItem: card, currentFacts });
    assert.deepEqual(result, { ok: true, applicable: false, queue_item: card });
    assert.equal(JSON.stringify(card), beforeCard);
    assert.equal(JSON.stringify(currentFacts), beforeFacts);
  });
});
