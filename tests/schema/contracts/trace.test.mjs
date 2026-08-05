// tests/schema/contracts/trace.test.mjs — 1:1 for DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TraceEntrySchema, TraceSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs';

describe('TraceEntrySchema', () => {
  it('accepts valid entry with ts + event', () => {
    assert.ok(TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'run_start' }).success);
  });

  it('accepts entry with extra fields (passthrough)', () => {
    const r = TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'check', source: 'engine', passed: true, detail: 'ok' });
    assert.ok(r.success);
    assert.equal(r.data.source, 'engine');
    assert.equal(r.data.passed, true);
  });

  it('rejects entry missing ts', () => {
    assert.ok(!TraceEntrySchema.safeParse({ event: 'run_start' }).success);
  });

  it('rejects entry missing event', () => {
    assert.ok(!TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z' }).success);
  });
});

describe('TraceSchema', () => {
  it('accepts empty array', () => {
    assert.ok(TraceSchema.safeParse([]).success);
  });

  it('accepts array of valid entries', () => {
    assert.ok(TraceSchema.safeParse([
      { ts: '2026-01-01T00:00:00.000Z', event: 'run_start' },
      { ts: '2026-01-01T00:01:00.000Z', event: 'check', passed: true },
    ]).success);
  });

  it('rejects non-array', () => {
    assert.ok(!TraceSchema.safeParse({ ts: 'x', event: 'y' }).success);
  });

  it('rejects array with invalid entry', () => {
    assert.ok(!TraceSchema.safeParse([{ event: 'ok' }]).success);
  });
});
