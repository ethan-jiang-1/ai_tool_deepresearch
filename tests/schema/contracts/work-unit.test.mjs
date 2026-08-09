import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WorkUnitIndexRecordSchema,
  WorkUnitLateAcceptContextSchema,
  WorkUnitLedgerRecordSchema,
  WorkUnitRuntimeReceiptEventSchema,
} from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit.mjs';
import {
  computeWorkUnitLedgerRecordHash,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

function baseLedgerRow(overrides = {}) {
  const row = {
    declared_at: '2026-07-10T00:00:00.000Z',
    work_id: 'wu-w0-b000-src-i0001',
    queue_item_id: 'queue-a',
    wave: 0,
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    creation_reason: 'initial_phase_drain',
    work_unit_ref: '_work_units/wave0/wu-w0-b000-src-i0001',
    result_ref: '_work_units/wave0/wu-w0-b000-src-i0001/result.json',
    runtime_receipt_ref: '_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl',
    receipt_nonce: '1234567890123456',
    output_files: [],
    source_claims: [],
    accepted_source_urls: [],
    cache_trails: [],
    result_hash: 'result-hash',
    ...overrides,
  };
  return {
    ...row,
    ledger_record_hash: computeWorkUnitLedgerRecordHash(row),
  };
}

function baseIndexRecord(overrides = {}) {
  return {
    work_id: 'wu-w0-b000-src-i0001',
    queue_item_id: 'queue-a',
    wave: 0,
    batch_id: 'b000',
    batch_index: 0,
    claim_index: 1,
    attempt_index: 1,
    kind: 'wave0_source_intake',
    kind_code: 'src',
    status: 'submitted',
    producer_rule: 'source_intake_fan_in',
    creation_reason: 'initial_phase_drain',
    queue_item_snapshot_hash: 'queue-hash',
    receipt_nonce: '1234567890123456',
    claimed_at: '2026-07-10T00:00:00.000Z',
    timeout_ms: 600000,
    deadline_at: '2026-07-10T00:10:00.000Z',
    runtime_refs: {},
    paths: {
      work_unit_dir: '_work_units/wave0/wu-w0-b000-src-i0001',
      manifest_ref: '_work_units/wave0/wu-w0-b000-src-i0001/manifest.json',
      beacon_ref: '_work_units/wave0/wu-w0-b000-src-i0001/_beacon.json',
      task_ref: '_work_units/wave0/wu-w0-b000-src-i0001/task.md',
      result_schema_ref: '_work_units/wave0/wu-w0-b000-src-i0001/result.schema.json',
      result_ref: '_work_units/wave0/wu-w0-b000-src-i0001/result.json',
      runtime_receipt_ref: '_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl',
      status_ref: '_work_units/wave0/wu-w0-b000-src-i0001/status.json',
      agent_ref: '_work_units/wave0/wu-w0-b000-src-i0001/agent.json',
    },
    result_hash: 'result-hash',
    ledger_record_hash: 'ledger-hash',
    terminal_at: '2026-07-10T00:02:00.000Z',
    ...overrides,
  };
}

function baseReceipt(overrides = {}) {
  return {
    schema_version: 'work-unit.receipt-event.v1',
    event: 'work_done',
    work_id: 'wu-w0-b000-src-i0001',
    queue_item_id: 'queue-a',
    kind: 'wave0_source_intake',
    receipt_nonce: '1234567890123456',
    actor_contract_version: 'work-unit.actor.v1',
    execution_actor_class: 'delegated_subagent',
    ts: '2026-07-10T00:01:00.000Z',
    ...overrides,
  };
}

describe('WorkUnitRuntimeReceiptEventSchema', () => {
  it('accepts object/string diagnostic detail without rewriting it', () => {
    for (const detail of [{ stage: 'fetch', attempt: 2 }, 'fetch batch completed']) {
      const parsed = WorkUnitRuntimeReceiptEventSchema.parse(baseReceipt({ detail }));
      assert.deepEqual(parsed.detail, detail);
    }
  });

  it('rejects non-message detail shapes while retaining identity strictness', () => {
    for (const detail of [[], 3, true, null]) {
      assert.throws(() => WorkUnitRuntimeReceiptEventSchema.parse(baseReceipt({ detail })));
    }
    assert.throws(() => WorkUnitRuntimeReceiptEventSchema.parse(baseReceipt({ receipt_nonce: 'wrong' })), /too small|at least 16/i);
    assert.throws(() => WorkUnitRuntimeReceiptEventSchema.parse(baseReceipt({ schema_version: 'work-unit.receipt-event.v999' })), /Invalid input|literal/i);
  });
});

describe('WorkUnitLateAcceptContextSchema', () => {
  it('owns only the irreducible late-submit facts', () => {
    assert.deepEqual(
      [...WorkUnitLateAcceptContextSchema.innerType().keyof().options].sort(),
      ['late_accept_reason', 'superseded_retry_work_ids', 'terminal_status_before_accept'],
    );

    const context = {
      late_accept_reason: 'late result arrived after timeout',
      terminal_status_before_accept: 'timed_out',
      superseded_retry_work_ids: ['wu-w0-b000-src-i0002'],
    };
    assert.deepEqual(WorkUnitLateAcceptContextSchema.parse(context), context);
    assert.throws(
      () => WorkUnitLateAcceptContextSchema.parse({ ...context, output_files: [] }),
      /Unrecognized key/,
    );
  });

  it('rejects incomplete, duplicate, self-bound, or non-submitted context', () => {
    assert.throws(
      () => WorkUnitLateAcceptContextSchema.parse({
        late_accept_reason: '   ',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: [],
      }),
      /too small|at least 1 character/i,
    );
    assert.throws(
      () => WorkUnitLateAcceptContextSchema.parse({
        late_accept_reason: 'duplicate retry',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: ['wu-w0-b000-src-i0002', 'wu-w0-b000-src-i0002'],
      }),
      /must be unique/,
    );
    assert.throws(
      () => WorkUnitIndexRecordSchema.parse(baseIndexRecord({
        status: 'timed_out',
        late_accept_context: {
          late_accept_reason: 'not accepted yet',
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: [],
        },
      })),
      /only allowed on a submitted work unit/,
    );
    assert.throws(
      () => WorkUnitIndexRecordSchema.parse(baseIndexRecord({
        late_accept_context: {
          late_accept_reason: 'self retry is invalid',
          terminal_status_before_accept: 'timed_out',
          superseded_retry_work_ids: ['wu-w0-b000-src-i0001'],
        },
      })),
      /must not include the accepted work_id/,
    );
  });
});

describe('WorkUnitLedgerRecordSchema', () => {
  it('limits source contributions to matching Wave0 source-intake ledger rows', () => {
    const contribution = {
      target: 'artifacts/wave0/topic-a/source.yaml',
      direct_contract: 'wave0.source-metadata-array.v1',
      validated_length: 2,
      semantic_digest: 'a'.repeat(64),
    };
    const accepted = baseLedgerRow({
      output_files: [{ path: contribution.target, role: 'source_yaml' }],
      source_contribution: contribution,
    });
    assert.deepEqual(WorkUnitLedgerRecordSchema.parse(accepted).source_contribution, contribution);

    assert.equal(WorkUnitLedgerRecordSchema.safeParse(baseLedgerRow({
      wave: 1,
      kind: 'wave1_topic_deepening',
      output_files: [{ path: contribution.target, role: 'source_yaml' }],
      source_contribution: contribution,
    })).success, false);
    assert.equal(WorkUnitLedgerRecordSchema.safeParse(baseLedgerRow({
      output_files: [{ path: 'artifacts/wave0/topic-a/other.yaml', role: 'source_yaml' }],
      source_contribution: contribution,
    })).success, false);
    assert.equal(WorkUnitLedgerRecordSchema.safeParse(baseLedgerRow({
      output_files: [{ path: contribution.target, role: 'source_yaml' }],
      source_contribution: { ...contribution, semantic_digest: 'not-a-sha256' },
    })).success, false);
  });

  it('accepts audited late-submit rows and hashes audit fields', () => {
    const row = baseLedgerRow({
      late_accept: true,
      late_accept_reason: 'late result arrived after timeout',
      terminal_status_before_accept: 'timed_out',
      superseded_retry_work_ids: ['wu-w0-b000-src-i0002'],
    });

    const parsed = WorkUnitLedgerRecordSchema.parse(row);
    assert.equal(parsed.late_accept, true);
    assert.equal(parsed.ledger_record_hash, computeWorkUnitLedgerRecordHash(row));

    const changed = { ...row, late_accept_reason: 'different reason' };
    assert.notEqual(changed.ledger_record_hash, computeWorkUnitLedgerRecordHash(changed));
  });

  it('rejects half-audit rows', () => {
    assert.throws(
      () => WorkUnitLedgerRecordSchema.parse(baseLedgerRow({ late_accept_reason: 'reason without flag' })),
      /only allowed when late_accept is true/,
    );
    assert.throws(
      () => WorkUnitLedgerRecordSchema.parse(baseLedgerRow({
        late_accept: true,
        late_accept_reason: 'missing superseded list',
        terminal_status_before_accept: 'timed_out',
      })),
      /superseded_retry_work_ids is required/,
    );
  });

  it('rejects duplicate or self superseded retry work ids', () => {
    assert.throws(
      () => WorkUnitLedgerRecordSchema.parse(baseLedgerRow({
        late_accept: true,
        late_accept_reason: 'self is invalid',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: ['wu-w0-b000-src-i0001'],
      })),
      /must not include the accepted work_id/,
    );
    assert.throws(
      () => WorkUnitLedgerRecordSchema.parse(baseLedgerRow({
        late_accept: true,
        late_accept_reason: 'duplicates invalid',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: ['wu-w0-b000-src-i0002', 'wu-w0-b000-src-i0002'],
      })),
      /must be unique/,
    );
  });
});

async function currentAssignmentSchemas() {
  const module = await import('../../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit.mjs');
  return {
    WorkUnitRequiredOutputSchema: module.WorkUnitRequiredOutputSchema,
    WorkUnitOutputContractSchema: module.WorkUnitOutputContractSchema,
    WorkUnitCandidateProjectionSchema: module.WorkUnitCandidateProjectionSchema,
  };
}

describe('current assignment contract schemas', () => {
  it('accepts the current v3 marker plus readable v1/v2 markers while retaining genuine legacy absence', () => {
    assert.ok(WorkUnitIndexRecordSchema.safeParse(baseIndexRecord()).success, 'marker absence remains legacy');
    assert.ok(WorkUnitIndexRecordSchema.safeParse(baseIndexRecord({
      assignment_contract_version: 'work-unit.assignment.v3',
    })).success, 'current marker is accepted');
    assert.ok(WorkUnitIndexRecordSchema.safeParse(baseIndexRecord({
      assignment_contract_version: 'work-unit.assignment.v2',
    })).success, 'immutable v2 marker remains readable');
    assert.ok(WorkUnitIndexRecordSchema.safeParse(baseIndexRecord({
      assignment_contract_version: 'work-unit.assignment.v1',
    })).success, 'immutable v1 marker remains readable');
    assert.equal(WorkUnitIndexRecordSchema.safeParse(baseIndexRecord({
      assignment_contract_version: 'work-unit.assignment.v999',
    })).success, false, 'unknown marker fails closed');
  });

  it('owns closed direct IDs, canonical roles, safe paths, and unique required-output tuples', async () => {
    const { WorkUnitRequiredOutputSchema, WorkUnitOutputContractSchema } = await currentAssignmentSchemas();
    const source = {
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      direct_contract: 'wave0.source-metadata-array.v1',
    };
    const evidence = {
      path: 'artifacts/wave1/topic-a/evidence-summary.md',
      role: 'evidence_summary',
      direct_contract: 'wave1.evidence-summary.v1',
    };
    const questions = {
      path: 'artifacts/wave1/topic-a/question-list.md',
      role: 'question_list',
      direct_contract: 'wave1.question-list.v1',
    };
    for (const required of [source, evidence, questions]) {
      assert.deepEqual(WorkUnitRequiredOutputSchema.parse(required), required);
    }
    for (const required of [
      { ...source, path: '../source.yaml' },
      { ...source, path: '/absolute/source.yaml' },
      { ...source, path: 'artifacts\\wave0\\topic-a\\source.yaml' },
      { ...source, role: 'other' },
      { ...source, direct_contract: 'unknown.contract.v1' },
      { ...source, extra: true },
    ]) {
      assert.equal(WorkUnitRequiredOutputSchema.safeParse(required).success, false);
    }

    const base = {
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
      output_files: {
        required: true,
        allowed_roles: ['reference', 'source_yaml', 'evidence_summary', 'question_list', 'other'],
        reference_requires_source_url: true,
      },
    };
    assert.ok(WorkUnitOutputContractSchema.safeParse({ ...base, required_outputs: [evidence, questions] }).success);
    assert.equal(WorkUnitOutputContractSchema.safeParse({ ...base, required_outputs: [source, source] }).success, false);
    assert.equal(WorkUnitOutputContractSchema.safeParse({
      ...base,
      required_outputs: [source, { ...source, role: 'evidence_summary' }],
    }).success, false);
    assert.equal(WorkUnitOutputContractSchema.safeParse({
      ...base,
      output_files: { ...base.output_files, allowed_roles: ['reference'] },
      required_outputs: [source],
    }).success, false);
  });

  it('defines one strict closed candidate projection shared by dry, formal, and timeout paths', async () => {
    const { WorkUnitCandidateProjectionSchema } = await currentAssignmentSchemas();
    const actions = [
      'repair_same_candidate',
      'return_to_actor',
      'fail_and_replace',
      'inspect_contract',
    ];
    assert.deepEqual(WorkUnitCandidateProjectionSchema.parse({
      recommended_action: 'submit',
      primary_root_code: null,
    }), {
      recommended_action: 'submit',
      primary_root_code: null,
    });
    for (const recommended_action of actions) {
      assert.ok(WorkUnitCandidateProjectionSchema.safeParse({
        recommended_action,
        primary_root_code: 'root_code',
      }).success);
    }
    assert.equal(WorkUnitCandidateProjectionSchema.safeParse({
      recommended_action: 'submit',
      primary_root_code: 'must_be_null',
    }).success, false);
    assert.equal(WorkUnitCandidateProjectionSchema.safeParse({
      recommended_action: 'abandon',
      primary_root_code: 'root_code',
    }).success, false);
    assert.equal(WorkUnitCandidateProjectionSchema.safeParse({
      recommended_action: 'inspect_contract',
      primary_root_code: null,
      repair_scope: 'contract_integrity',
    }).success, false);
  });
});
