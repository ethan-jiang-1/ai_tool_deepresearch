// @impl INT-001, LOC-005: inspect-bundle.mjs integration test
import { describe, it, before, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const FIXTURE = join(process.cwd(), 'tests/fixtures/DEEP_RESEARCH_HARNESS');
const INSPECT = join(FIXTURE, 'cli/inspect-bundle.mjs');

function makeBundle(baseDir, name, { traceEntries = [], logLines = [], map = 'current', entry = 'current' } = {}) {
  const bundleDir = join(baseDir, `dpt_rb_${name}`);
  mkdirSync(bundleDir, { recursive: true });
  const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_cache', 'final', '_logs', '_work_units'];
  for (const d of dirs) mkdirSync(join(bundleDir, d), { recursive: true });
  const topFiles = ['rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl'];
  for (const f of topFiles) writeFileSync(join(bundleDir, f), '');
  if (map === 'current' || map === 'both') writeFileSync(join(bundleDir, 'BUNDLE_MAP.md'), '# Bundle Map\n');
  if (map === 'legacy' || map === 'both') writeFileSync(join(bundleDir, 'START_FROM_HERE.md'), '# Legacy Map\n');
  if (entry === 'current') writeFileSync(join(bundleDir, 'BUNDLE_ENTRY.md'), '# Bundle Entry\n');
  if (entry === 'legacy') writeFileSync(join(bundleDir, 'RUN_BUNDLE.md'), '# Legacy Bundle Entry\n');
  writeFileSync(join(bundleDir, '_logs', 'run.log'), '');
  writeFileSync(join(bundleDir, 'reference/_INDEX.md'), '');
  writeFileSync(join(bundleDir, 'reference/README.md'), '');
  if (traceEntries.length > 0) {
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), traceEntries.map(e => JSON.stringify(e)).join('\n') + '\n');
  }
  if (logLines.length > 0) {
    writeFileSync(join(bundleDir, '_logs', 'run.log'), logLines.join('\n') + '\n');
  }
  return bundleDir;
}

describe('inspect-bundle.mjs integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = createTempDir('inspect-bundle');
    cpSync(FIXTURE, join(tmpDir, 'DEEP_RESEARCH_HARNESS'), { recursive: true });
  });

  after(cleanupAll);

  // ── Default behavior (unchanged) ──

  it('passes on complete bundle', () => {
    const bundleDir = makeBundle(tmpDir, 'complete');
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
    if (result.stdout.includes('START_FROM_HERE.md')) throw new Error(`Current bundle should not require START_FROM_HERE.md\n${result.stdout}`);
    if (result.stdout.includes('RUN_BUNDLE.md not found')) throw new Error(`Fresh BUNDLE_ENTRY.md bundle must not receive a stale legacy-entry warning\n${result.stdout}`);
  });

  it('accepts legacy RUN_BUNDLE.md as bounded entry compatibility', () => {
    const bundleDir = makeBundle(tmpDir, 'legacy-entry', { entry: 'legacy' });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected legacy entry compatibility to exit 0, got ${result.status}\n${result.stdout}`);
    if (result.stdout.includes('BUNDLE_ENTRY.md not found')) throw new Error(`Legacy RUN_BUNDLE.md must satisfy entry compatibility\n${result.stdout}`);
  });

  it('accepts legacy-only START_FROM_HERE.md with deprecation advice', () => {
    const bundleDir = makeBundle(tmpDir, 'legacy-only', { map: 'legacy' });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected legacy map compatibility to exit 0, got ${result.status}\n${result.stdout}`);
    if (!result.stdout.includes('deprecated legacy compatibility')) throw new Error(`Expected legacy deprecation advice\n${result.stdout}`);
    if (!result.stdout.includes('BUNDLE_MAP.md')) throw new Error(`Expected advice to name BUNDLE_MAP.md\n${result.stdout}`);
  });

  it('reports both map files with BUNDLE_MAP.md current', () => {
    const bundleDir = makeBundle(tmpDir, 'both-maps', { map: 'both' });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected both map names to exit 0, got ${result.status}\n${result.stdout}`);
    if (!result.stdout.includes('BUNDLE_MAP.md is current')) throw new Error(`Expected current-map diagnostic\n${result.stdout}`);
    if (!result.stdout.includes('deprecated compatibility debris')) throw new Error(`Expected legacy debris diagnostic\n${result.stdout}`);
  });

  it('fails when neither current nor legacy map exists', () => {
    const bundleDir = makeBundle(tmpDir, 'missing-map', { map: 'none' });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 1) throw new Error(`Expected missing map to exit 1, got ${result.status}\n${result.stdout}`);
    if (!result.stdout.includes('BUNDLE_MAP.md')) throw new Error(`Expected missing BUNDLE_MAP.md diagnostic\n${result.stdout}`);
  });

  it('fails on missing directory', () => {
    const bundleDir = makeBundle(tmpDir, 'missing');
    rmSync(join(bundleDir, 'final'), { recursive: true, force: true });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 1) throw new Error(`Expected exit 1, got ${result.status}\n${result.stdout}`);
  });

  it('reports unassociated repo-root runtime debris without blocking current run bundle', () => {
    const bundleDir = makeBundle(tmpDir, 'cleanup-debris');
    mkdirSync(join(tmpDir, '_cache', 'old-run'), { recursive: true });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    rmSync(join(tmpDir, '_cache'), { recursive: true, force: true });
    if (result.status !== 0) throw new Error(`Expected cleanup debris to exit 0, got ${result.status}\n${result.stdout}`);
    if (!result.stdout.includes('cleanup_debris')) throw new Error(`Expected cleanup_debris diagnostic\n${result.stdout}`);
  });

  it('fails on repo-root runtime leak associated with current work-unit authority', () => {
    const bundleDir = makeBundle(tmpDir, 'active-leak');
    const workId = 'wu-w0-b000-src-i0001';
    writeFileSync(join(bundleDir, '_work_units', '_index.json'), JSON.stringify({ work_units: { [workId]: {} } }));
    mkdirSync(join(tmpDir, '_work_units', 'wave0', workId), { recursive: true });
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    rmSync(join(tmpDir, '_work_units'), { recursive: true, force: true });
    if (result.status !== 1) throw new Error(`Expected active leak to exit 1, got ${result.status}\n${result.stdout}`);
    if (!result.stdout.includes('active_bundle_blocker')) throw new Error(`Expected active_bundle_blocker diagnostic\n${result.stdout}`);
  });

  // ── --log flag ──

  it('--log outputs _logs/run.log content', () => {
    const bundleDir = makeBundle(tmpDir, 'log-test', {
      logLines: ['[2026-06-26T00:00:00.000Z] INFO phase:test START bundle=x', '[2026-06-26T00:00:01.000Z] WARN gate:test FAIL bundle=x'],
    });
    const result = spawnSync('node', [INSPECT, bundleDir, '--log'], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`--log should exit 0, got ${result.status}`);
    if (!result.stdout.includes('phase:test START')) throw new Error(`--log should contain phase log line\n${result.stdout}`);
    if (!result.stdout.includes('gate:test FAIL')) throw new Error(`--log should contain gate log line\n${result.stdout}`);
  });

  it('--log exits 0 even when file is missing', () => {
    const bundleDir = makeBundle(tmpDir, 'log-missing');
    rmSync(join(bundleDir, '_logs', 'run.log'), { force: true });
    const result = spawnSync('node', [INSPECT, bundleDir, '--log'], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`--log on missing file should exit 0, got ${result.status}`);
  });

  // ── --summary flag ──

  it('--summary outputs pass/fail table', () => {
    const bundleDir = makeBundle(tmpDir, 'summary-test', {
      traceEntries: [
        { ts: '2026-06-26T00:00:00.000Z', event: 'run_start', source: 'test', bundle: 'summary-test' },
        { ts: '2026-06-26T00:00:01.000Z', event: 'gate_attempt', gate: 'test-gate', passed: true, bundle: 'summary-test' },
      ],
    });
    const result = spawnSync('node', [INSPECT, bundleDir, '--summary'], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`--summary should exit 0, got ${result.status}`);
    if (!result.stdout.includes('test-gate')) throw new Error(`--summary should include gate name\n${result.stdout}`);
  });

  it('--summary shows log line count', () => {
    const bundleDir = makeBundle(tmpDir, 'summary-log', {
      logLines: ['[2026-06-26T00:00:00.000Z] INFO test bundle=x'],
    });
    const result = spawnSync('node', [INSPECT, bundleDir, '--summary'], { encoding: 'utf-8', timeout: 5000 });
    if (!result.stdout.includes('1 line')) throw new Error(`--summary should show log line count\n${result.stdout}`);
  });

  it('--summary warns on empty log', () => {
    const bundleDir = makeBundle(tmpDir, 'summary-empty-log');
    const result = spawnSync('node', [INSPECT, bundleDir, '--summary'], { encoding: 'utf-8', timeout: 5000 });
    if (!result.stdout.includes('warning')) throw new Error(`--summary should warn on empty _logs/run.log\n${result.stdout}`);
  });

  // ── --timeline flag ──

  it('--timeline stitches JSONL sinks by ts', () => {
    const bundleDir = makeBundle(tmpDir, 'timeline-test', {
      traceEntries: [
        { ts: '2026-06-26T00:00:00.000Z', event: 'run_start', bundle: 'timeline-test' },
        { ts: '2026-06-26T00:00:02.000Z', event: 'gate_attempt', gate: 'g1', passed: true, bundle: 'timeline-test' },
      ],
      logLines: [
        '[2026-06-26T00:00:01.000Z] INFO phase START bundle=timeline-test',
      ],
    });
    const result = spawnSync('node', [INSPECT, bundleDir, '--timeline'], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`--timeline should exit 0, got ${result.status}`);
    if (!result.stdout.includes('run_start')) throw new Error(`--timeline should include trace events\n${result.stdout}`);
    if (!result.stdout.includes('phase START')) throw new Error(`--timeline should include log events\n${result.stdout}`);
  });

  it('--timeline exits 0 on missing sinks', () => {
    const bundleDir = makeBundle(tmpDir, 'timeline-missing');
    const result = spawnSync('node', [INSPECT, bundleDir, '--timeline'], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`--timeline on empty sinks should exit 0, got ${result.status}`);
  });
});
