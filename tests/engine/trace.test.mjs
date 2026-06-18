// tests/engine/trace.test.mjs — @impl TRW-001, TRW-002
// Unit tests for the stateless trace writer factory.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTrace } from '../../DPT_FRAMEWORK/engine/trace.mjs';
import { TraceEntrySchema, TraceSchema } from '../../DPT_FRAMEWORK/schema/index.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TEST_DIR = join(__dirname, '../_tmp_trace_test');

function tmpPath(name) {
  return join(TEST_DIR, name);
}

describe('createTrace — default (consoleEcho: true)', () => {
  const traceFile = tmpPath('test_default.jsonl');
  const trace = createTrace(traceFile);

  after(() => {
    trace.traceCleanup();
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('traceFilePath returns bound path', () => {
    assert.equal(trace.traceFilePath(), traceFile);
  });

  it('traceInit writes run_start event', () => {
    mkdirSync(TEST_DIR, { recursive: true });
    trace.traceInit('default test', { extra: 1 });
    const raw = readFileSync(traceFile, 'utf-8').trim();
    const lines = raw.split('\n');
    assert.ok(lines.length >= 1);
    const first = JSON.parse(lines[0]);
    assert.equal(first.event, 'run_start');
    assert.equal(first.label, 'default test');
    assert.equal(first.extra, 1);
    assert.ok(typeof first.ts === 'string');
  });

  it('traceEntry appends JSONL line', () => {
    trace.traceEntry('check', { source: 'test', passed: true, detail: 'ok' });
    const raw = readFileSync(traceFile, 'utf-8').trim();
    const lines = raw.split('\n');
    assert.ok(lines.length >= 2);
    const last = JSON.parse(lines[lines.length - 1]);
    assert.equal(last.event, 'check');
    assert.equal(last.source, 'test');
    assert.equal(last.passed, true);
    assert.equal(last.detail, 'ok');
  });

  it('traceSummary returns stats', () => {
    const s = trace.traceSummary();
    assert.ok(s.events.length >= 2);
    assert.ok(s.passed >= 0);
    assert.ok(s.failed >= 0);
  });
});

describe('createTrace — silent (consoleEcho: false)', () => {
  const traceFile = tmpPath('test_silent.jsonl');
  const trace = createTrace(traceFile, { consoleEcho: false });

  after(() => {
    trace.traceCleanup();
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('writes events without console output', () => {
    mkdirSync(TEST_DIR, { recursive: true });
    trace.traceInit('silent test');
    trace.traceEntry('check', { source: 'silent', passed: false });
    const raw = readFileSync(traceFile, 'utf-8').trim();
    const lines = raw.split('\n');
    assert.ok(lines.length >= 2);
  });

  it('traceSummary returns stats without console', () => {
    const s = trace.traceSummary();
    assert.ok(s.events.length >= 1);
    assert.equal(s.passed, 0);
    assert.equal(s.failed, 1);
  });
});

describe('createTrace — custom icons', () => {
  const traceFile = tmpPath('test_icons.jsonl');
  const trace = createTrace(traceFile, {
    consoleEcho: false,
    icons: { node_start: '▶', node_complete: '✅', custom_event: '⭐' },
  });

  after(() => {
    trace.traceCleanup();
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('uses custom icons in summary (no throw)', () => {
    mkdirSync(TEST_DIR, { recursive: true });
    trace.traceInit('icon test');
    trace.traceEntry('custom_event', { source: 'test', label: 'custom' });
    assert.doesNotThrow(() => trace.traceSummary());
  });
});

describe('trace output conforms to TraceEntrySchema @impl TRW-002', () => {
  const traceFile = tmpPath('test_schema.jsonl');
  const trace = createTrace(traceFile, { consoleEcho: false });

  after(() => {
    trace.traceCleanup();
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('each line validates against TraceEntrySchema', () => {
    mkdirSync(TEST_DIR, { recursive: true });
    trace.traceInit('schema test');
    trace.traceEntry('check', { source: 'test', passed: true, file: 'test.md', detail: 'ok' });
    trace.traceEntry('node_exec', { source: 'test', key: 'step_1', before: 'A', after: 'B' });

    const raw = readFileSync(traceFile, 'utf-8').trim();
    const lines = raw.split('\n');

    for (const line of lines) {
      const parsed = JSON.parse(line);
      const result = TraceEntrySchema.safeParse(parsed);
      assert.ok(result.success, `Line should validate: ${result.error?.issues?.map(i => i.message).join(', ')}`);
    }
  });

  it('full file validates against TraceSchema', () => {
    const raw = readFileSync(traceFile, 'utf-8').trim();
    const events = raw.split('\n').map(JSON.parse);
    const result = TraceSchema.safeParse(events);
    assert.ok(result.success);
  });
});

describe('trace edge cases', () => {
  it('traceSummary on nonexistent file returns empty', () => {
    const t = createTrace(tmpPath('nonexistent.jsonl'), { consoleEcho: false });
    const s = t.traceSummary();
    assert.deepEqual(s, { events: [], passed: 0, failed: 0 });
  });

  it('traceSummary on empty file returns empty', () => {
    const f = tmpPath('empty.jsonl');
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(f, '');
    const t = createTrace(f, { consoleEcho: false });
    const s = t.traceSummary();
    assert.deepEqual(s, { events: [], passed: 0, failed: 0 });
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('traceCleanup removes file', () => {
    const f = tmpPath('cleanup.jsonl');
    mkdirSync(TEST_DIR, { recursive: true });
    const t = createTrace(f, { consoleEcho: false });
    t.traceInit('cleanup test');
    assert.ok(existsSync(f));
    t.traceCleanup();
    assert.ok(!existsSync(f));
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
