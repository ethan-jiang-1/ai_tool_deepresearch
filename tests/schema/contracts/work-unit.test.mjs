import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WorkUnitIndexRecordSchema,
  WorkUnitLateAcceptContextSchema,
  WorkUnitLedgerRecordSchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/work-unit.mjs';
import {
  computeWorkUnitLedgerRecordHash,
} from '../../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

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
