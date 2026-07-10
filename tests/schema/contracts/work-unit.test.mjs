import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
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
