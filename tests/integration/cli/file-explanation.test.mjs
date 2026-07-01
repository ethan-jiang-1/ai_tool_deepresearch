// file-explanation.test.mjs
// Tests for log-event.mjs --explain-file mode
// @impl 8A.14
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-fileexp-tmp');
const CLI = join(__dirname, '..', '..', '..', 'DPT_FRAMEWORK', 'cli', 'log-event.mjs');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function setupBundle(name) {
  const dir = join(TMP, `dpt_rb_${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: name, current_gate: 'wave1_complete' }));
  mkdirSync(join(dir, '_logs'), { recursive: true });
  writeFileSync(join(dir, '_logs', 'run.log'), '');
  writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  return dir;
}

function runCli(bundle, args = []) {
  return spawnSync('node', [CLI, '--bundle', bundle, ...args], { encoding: 'utf-8' });
}

describe('file explanation diagnostics', () => {
  it('writes file_explanation to trace when --explain-file is used', () => {
    const dir = setupBundle('fe-trace');
    const result = runCli(dir, [
      '--explain-file', 'reference/orphan.md',
      '--status', 'explained_non_authoritative',
      '--reason', 'Test-generated file',
    ]);
    assert.strictEqual(result.status, 0);

    const trace = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n');
    const lastEvent = JSON.parse(trace[trace.length - 1]);
    assert.strictEqual(lastEvent.event, 'diagnostic');
    assert.strictEqual(lastEvent.kind, 'file_explanation');
    assert.strictEqual(lastEvent.path, 'reference/orphan.md');
    assert.strictEqual(lastEvent.authority_status, 'explained_non_authoritative');
    assert.strictEqual(lastEvent.reason, 'Test-generated file');
  });

  it('also writes human-readable log line', () => {
    const dir = setupBundle('fe-log');
    runCli(dir, [
      '--explain-file', 'reference/extra.md',
      '--status', 'ignored_with_reason',
      '--reason', 'Not needed for this phase',
    ]);

    const log = readFileSync(join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(log.includes('file_explanation'), 'Log should contain file_explanation');
    assert.ok(log.includes('ignored_with_reason'), 'Log should contain the status');
  });

  it('rejects invalid authority_status values', () => {
    const dir = setupBundle('fe-invalid');
    const result = runCli(dir, [
      '--explain-file', 'reference/bad.md',
      '--status', 'declared_authoritative', // not allowed for Agent-written explanations
      '--reason', 'Test',
    ]);
    assert.strictEqual(result.status, 0); // exits 0 but writes nothing

    const trace = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim();
    assert.strictEqual(trace, '', 'Trace should be empty for invalid status');
  });

  it('exits silently when required args are missing', () => {
    const dir = setupBundle('fe-missing');
    const r1 = runCli(dir, ['--explain-file', 'ref/x.md']); // no --status or --reason
    assert.strictEqual(r1.status, 0);

    const r2 = runCli(dir, ['--explain-file', 'ref/x.md', '--status', 'explained_non_authoritative']); // no --reason
    assert.strictEqual(r2.status, 0);
  });

  it('is append-only — multiple explanations for same path create multiple trace events', () => {
    const dir = setupBundle('fe-append');
    runCli(dir, [
      '--explain-file', 'reference/orphan.md',
      '--status', 'explained_non_authoritative',
      '--reason', 'First explanation',
    ]);
    runCli(dir, [
      '--explain-file', 'reference/orphan.md',
      '--status', 'ignored_with_reason',
      '--reason', 'Updated explanation',
    ]);

    const trace = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n');
    const explanations = trace.filter(l => {
      try { return JSON.parse(l).kind === 'file_explanation'; } catch { return false; }
    });
    assert.strictEqual(explanations.length, 2, 'Both explanations should be present');
  });

  it('accepts optional --phase, --work-id, --topic-slug, --rerun-action', () => {
    const dir = setupBundle('fe-optional');
    runCli(dir, [
      '--explain-file', 'reference/orphan.md',
      '--status', 'explained_non_authoritative',
      '--reason', 'Test',
      '--phase', 'wave1',
      '--work-id', 'wave1-deepen-topic-a',
      '--topic-slug', 'topic-a',
      '--rerun-action', 'add',
    ]);

    const trace = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n');
    const lastEvent = JSON.parse(trace[trace.length - 1]);
    assert.strictEqual(lastEvent.phase, 'wave1');
    assert.strictEqual(lastEvent.work_id, 'wave1-deepen-topic-a');
    assert.strictEqual(lastEvent.topic_slug, 'topic-a');
    assert.strictEqual(lastEvent.related_rerun_action, 'add');
  });
});
