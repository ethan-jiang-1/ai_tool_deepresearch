// @impl AGQ-013, DEW-004

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { queueItemSnapshotHash } from '../../DPT_FRAMEWORK/engine/queue-manager-core.mjs';
import { claimAndSubmitWorkUnit, cleanupWorkUnitBundle, delegatedQueueItem, tempWorkUnitBundle } from './work-unit-test-helpers.mjs';

const VERSION = 'work-unit.assignment.v1';

const topic = {
  topic_uid: 'tp_00000001-0000-4000-8000-000000000000',
  topic_slug: 'topic-a',
};

const baseOutputContract = {
  required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
  output_files: {
    required: true,
    allowed_roles: ['reference', 'source_yaml', 'evidence_summary', 'question_list', 'other'],
    reference_requires_source_url: true,
  },
};

function queueItem(kind, overrides = {}) {
  return {
    queue_item_id: `queue-${kind}`,
    kind,
    producer_rule: kind === 'wave0_source_intake'
      ? 'source_intake_fan_in'
      : kind === 'wave1_topic_deepening'
        ? 'wave1_topic_deepening_dispatch'
        : 'wave2_targeted_evidence_dispatch',
    payload: {
      wave: kind === 'wave0_source_intake' ? 0 : kind === 'wave1_topic_deepening' ? 1 : 2,
      ...topic,
    },
    required_receipts: [],
    writes_to: [],
    ...overrides,
  };
}

async function resolve(input) {
  let resolveWorkUnitAssignmentContract;
  try {
    ({ resolveWorkUnitAssignmentContract } = await import(
      '../../DPT_FRAMEWORK/engine/work-unit-assignment-contract.mjs'
    ));
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') throw new Error('resolver module is not implemented');
    throw error;
  }
  return resolveWorkUnitAssignmentContract({
    assignmentContractVersion: VERSION,
    baseOutputContract,
    topicBinding: topic,
    ...input,
  });
}

function requiredOutputs(contract) {
  return contract.required_outputs;
}

describe('resolveWorkUnitAssignmentContract', () => {
  it('resolves Wave0 source intake from the exact canonical receipt', async () => {
    const contract = await resolve({
      kind: 'wave0_source_intake',
      queueItem: queueItem('wave0_source_intake', {
        required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
      }),
    });
    assert.deepEqual(requiredOutputs(contract), [{
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      direct_contract: 'wave0.source-metadata-array.v1',
    }]);
  });

  it('resolves a primary Wave1 assignment only from primary plus the exact pair', async () => {
    const contract = await resolve({
      kind: 'wave1_topic_deepening',
      queueItem: queueItem('wave1_topic_deepening', {
        payload: { ...queueItem('wave1_topic_deepening').payload, assignment_mode: 'primary' },
        required_receipts: [
          'file:artifacts/wave1/topic-a/evidence-summary.md',
          'file:artifacts/wave1/topic-a/question-list.md',
        ],
      }),
    });
    assert.deepEqual(requiredOutputs(contract), [
      {
        path: 'artifacts/wave1/topic-a/evidence-summary.md',
        role: 'evidence_summary',
        direct_contract: 'wave1.evidence-summary.v1',
      },
      {
        path: 'artifacts/wave1/topic-a/question-list.md',
        role: 'question_list',
        direct_contract: 'wave1.question-list.v1',
      },
    ]);
  });

  it('resolves supplementary Wave1 and Wave2 assignments to no required outputs', async () => {
    const supplementary = await resolve({
      kind: 'wave1_topic_deepening',
      queueItem: queueItem('wave1_topic_deepening', {
        payload: { ...queueItem('wave1_topic_deepening').payload, assignment_mode: 'supplementary' },
        required_receipts: [],
      }),
    });
    const wave2 = await resolve({
      kind: 'wave2_targeted_evidence',
      queueItem: queueItem('wave2_targeted_evidence'),
    });
    assert.deepEqual(requiredOutputs(supplementary), []);
    assert.deepEqual(requiredOutputs(wave2), []);
  });

  it('accepts only a positive supplementary Wave1 reference-floor objective', async () => {
    const accepted = await resolve({
      kind: 'wave1_topic_deepening',
      queueItem: queueItem('wave1_topic_deepening', {
        payload: { ...topic, wave: 1, assignment_mode: 'supplementary', reference_floor_deficit: 3 },
        required_receipts: [],
      }),
    });
    assert.deepEqual(requiredOutputs(accepted), []);
    for (const payload of [
      { ...topic, wave: 1, assignment_mode: 'primary', reference_floor_deficit: 1 },
      { ...topic, wave: 1, assignment_mode: 'supplementary', reference_floor_deficit: 0 },
      { ...topic, wave: 1, assignment_mode: 'supplementary', reference_floor_deficit: 1.5 },
      { ...topic, wave: 1, assignment_mode: 'supplementary', reference_floor_deficit: '3' },
    ]) {
      await assert.rejects(() => resolve({
        kind: 'wave1_topic_deepening',
        queueItem: queueItem('wave1_topic_deepening', { payload, required_receipts: [] }),
      }), /reference_floor_deficit/);
    }
  });

  it('binds the objective into the snapshot and projects it only as read-only task context', async () => {
    const withObjective = delegatedQueueItem('supplementary-floor-hash', {
      phase: 'wave1',
      payload: { assignment_mode: 'supplementary', reference_floor_deficit: 2 },
    });
    const withoutObjective = { ...withObjective, payload: { ...withObjective.payload } };
    delete withoutObjective.payload.reference_floor_deficit;
    assert.notEqual(queueItemSnapshotHash(withObjective), queueItemSnapshotHash(withoutObjective));

    const dir = tempWorkUnitBundle('wave1-floor-objective-');
    try {
      const { record } = claimAndSubmitWorkUnit(dir, {
        phase: 'wave1',
        queueItemId: 'supplementary-floor-objective',
        queueItemOverrides: { payload: { ...topic, wave: 1, assignment_mode: 'supplementary', reference_floor_deficit: 2 } },
      });
      const task = readFileSync(join(dir, record.paths.task_ref), 'utf8');
      assert.match(task, /Read-only acquisition objective:.*gap of 2 countable current-canonical references/s);
      assert.doesNotMatch(task, /"reference_floor_deficit"/);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('rejects missing, unknown, mismatched, partial, and cross-topic Wave1 assignment facts', async () => {
    const pair = [
      'file:artifacts/wave1/topic-a/evidence-summary.md',
      'file:artifacts/wave1/topic-a/question-list.md',
    ];
    const invalid = [
      { payload: { ...topic, wave: 1 }, required_receipts: pair },
      { payload: { ...topic, wave: 1, assignment_mode: 'unknown' }, required_receipts: pair },
      { payload: { ...topic, wave: 1, assignment_mode: 'primary' }, required_receipts: [] },
      { payload: { ...topic, wave: 1, assignment_mode: 'primary' }, required_receipts: pair.slice(0, 1) },
      { payload: { ...topic, wave: 1, assignment_mode: 'supplementary' }, required_receipts: pair },
      {
        payload: { ...topic, wave: 1, assignment_mode: 'primary' },
        required_receipts: [pair[0], 'file:artifacts/wave1/topic-b/question-list.md'],
      },
    ];
    for (const facts of invalid) {
      await assert.rejects(() => resolve({
        kind: 'wave1_topic_deepening',
        queueItem: queueItem('wave1_topic_deepening', facts),
      }), /assignment|mode|receipt|topic/i);
    }
  });

  it('rejects every reserved selector at root or recursively under payload and output_contract', async () => {
    const reserved = [
      'required_outputs',
      'direct_contract',
      'direct_contract_id',
      'assignment_contract_version',
      'resolver_version',
      'contract_id',
    ];
    for (const key of reserved) {
      const placements = [
        { [key]: 'forbidden' },
        { payload: { ...topic, nested: { [key]: 'forbidden' } } },
        { output_contract: { nested: { [key]: 'forbidden' } } },
      ];
      for (const placement of placements) {
        await assert.rejects(() => resolve({
          kind: 'wave0_source_intake',
          queueItem: queueItem('wave0_source_intake', {
            required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
            ...placement,
          }),
        }), new RegExp(key));
      }
    }
  });

  it('ignores non-selector prose and writes_to while preserving valid base customization', async () => {
    const customized = {
      ...baseOutputContract,
      required_result_fields: [...baseOutputContract.required_result_fields, 'summary'],
      source_claims: { allowed: true, accepted_requires_cache_or_degraded: true },
    };
    const contract = await resolve({
      kind: 'wave0_source_intake',
      baseOutputContract: customized,
      queueItem: queueItem('wave0_source_intake', {
        action: 'pretend direct_contract is selected by prose',
        writes_to: ['artifacts/wave0/optional/*.md'],
        payload: { ...topic, wave: 0, arbitrary_contract_name: 'ignored' },
        required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
      }),
    });
    assert.deepEqual(contract.required_result_fields, customized.required_result_fields);
    assert.deepEqual(contract.source_claims, customized.source_claims);
    assert.equal(requiredOutputs(contract).length, 1);
  });

  it('rejects unsafe, duplicate, conflicting, and customization-incompatible resolved output paths', async () => {
    const invalidCases = [
      {
        topicBinding: { ...topic, topic_slug: '../escape' },
        queueItem: queueItem('wave0_source_intake', {
          payload: { ...topic, topic_slug: '../escape', wave: 0 },
          required_receipts: ['file:artifacts/wave0/../escape/source.yaml'],
        }),
      },
      {
        kind: 'wave1_topic_deepening',
        queueItem: queueItem('wave1_topic_deepening', {
          payload: { ...topic, wave: 1, assignment_mode: 'primary' },
          required_receipts: [
            'file:artifacts/wave1/topic-a/evidence-summary.md',
            'file:artifacts/wave1/topic-a/evidence-summary.md',
          ],
        }),
      },
      {
        baseOutputContract: {
          ...baseOutputContract,
          output_files: { ...baseOutputContract.output_files, allowed_roles: ['reference'] },
        },
        queueItem: queueItem('wave0_source_intake', {
          required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
        }),
      },
    ];
    for (const input of invalidCases) {
      await assert.rejects(() => resolve({ kind: 'wave0_source_intake', ...input }), /path|duplicate|role|contract|receipt|topic/i);
    }
  });

  it('rejects unknown assignment versions and does not expose a resolver_version', async () => {
    await assert.rejects(() => resolve({
      assignmentContractVersion: 'work-unit.assignment.v999',
      kind: 'wave0_source_intake',
      queueItem: queueItem('wave0_source_intake', {
        required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
      }),
    }), /assignment.*version/i);

    const contract = await resolve({
      kind: 'wave0_source_intake',
      queueItem: queueItem('wave0_source_intake', {
        required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
      }),
    });
    assert.equal(Object.hasOwn(contract, 'resolver_version'), false);
  });
});
