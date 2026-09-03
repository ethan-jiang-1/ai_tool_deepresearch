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

  it('accepts optional writer + bundle fields (TRW-007)', () => {
    const r = TraceEntrySchema.safeParse({
      ts: '2026-01-01T00:00:00.000Z',
      event: 'wave1_completion',
      writer: 'cli',
      bundle: 'dpt_rb_glm-5-3-deepseek-v4-domestic-chips',
    });
    assert.ok(r.success);
    assert.equal(r.data.writer, 'cli');
    assert.equal(r.data.bundle, 'dpt_rb_glm-5-3-deepseek-v4-domestic-chips');
  });

  it('accepts pre-change historical events without writer/bundle (backward compatible)', () => {
    assert.ok(TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'wave0_completion', bundle: 'dpt_rb_glm-5-3-deepseek-v4-domestic-chips', detail: { topic_count: 11 } }).success);
    assert.ok(TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'run_start', source: 'trace' }).success);
  });

  it('rejects empty/whitespace writer or bundle values when present', () => {
    assert.ok(!TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'check', writer: '  ' }).success);
    assert.ok(!TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'check', bundle: '' }).success);
  });

  it('rejects non-string writer/bundle values', () => {
    assert.ok(!TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'check', writer: 7 }).success);
    assert.ok(!TraceEntrySchema.safeParse({ ts: '2026-01-01T00:00:00.000Z', event: 'check', bundle: { name: 'x' } }).success);
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
