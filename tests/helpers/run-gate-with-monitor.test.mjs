// run-gate-with-monitor.test.mjs — Tests for gate monitor wrapper
// @impl EXO-003, EXO-004
// Location: tests/helpers/run-gate-with-monitor.test.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = new URL('.', import.meta.url).pathname;
const WRAPPER = join(__dirname, '..', '..', 'experiments_env', 'shared', 'run-gate-with-monitor.mjs');
const FIXTURE_BASE = join(__dirname, '..', 'fixtures', 'gate-wrapper');

// ═══════════════════════════════════════════════════════════════════════════
// Fake Gate Commands
// ═══════════════════════════════════════════════════════════════════════════

// These are passed as inline `node -e "..."` commands to the wrapper.
// Each simulates a different gate behavior.

const FAKE_PASS = [
  'node', '-e',
  `console.log(JSON.stringify({check:{passed:true,gate:"wave0-complete",next:"phase-wave1.md"},routing:{kind:"next",next:"phase-wave1.md"},inspect:["All checks passed"],advice:["Proceed to wave1"]}));process.exit(0)`,
];

const FAKE_FAIL = [
  'node', '-e',
  `console.log(JSON.stringify({check:{passed:false,gate:"wave0-complete",next:null},routing:{kind:"no_transition",next:null},inspect:["Count floor not met: 3/5 references"],advice:["Add more references to meet the threshold"]}));process.exit(1)`,
];

const FAKE_MALFORMED = [
  'node', '-e',
  `console.log("not json at all");process.exit(1)`,
];

const FAKE_INSPECT_ADVICE = [
  'node', '-e',
  `console.log(JSON.stringify({check:{passed:false,gate:"wave1-complete",next:null},routing:{kind:"no_transition",next:null},inspect:["Missing foundation-placeholder marker","2 dead links in wave1 synthesis"],advice:["Check backfill step","Re-run topic expansion"]}));process.exit(1)`,
];

const FAKE_STDERR = [
  'node', '-e',
  `console.error("warning: deprecated flag --old-mode");console.log(JSON.stringify({check:{passed:true,gate:"seed-topics-ready",next:"phase-wave0.md"},routing:{kind:"next",next:"phase-wave0.md"},inspect:[],advice:[]}));process.exit(0)`,
];

const FAKE_INVALID_INPUT = [
  'node', '-e',
  `console.log(JSON.stringify({check:{passed:false,gate:"unknown",next:null},routing:{kind:"invalid_input",next:null},inspect:["Missing required argument"],advice:[]}));process.exit(2)`,
];

const FAKE_LARGE = [
  'node', '-e',
  `const payload={check:{passed:false,gate:"wave1-complete",next:null},routing:{kind:"no_transition",next:null},inspect:["x".repeat(12000)],advice:[],hints:[]};process.stdout.write(JSON.stringify(payload));process.exitCode=1`,
];

// ═══════════════════════════════════════════════════════════════════════════
// Fixture Helpers
// ═══════════════════════════════════════════════════════════════════════════

function cleanFixtures() {
  if (existsSync(FIXTURE_BASE)) rmSync(FIXTURE_BASE, { recursive: true, force: true });
}

function createBundle(name) {
  const dir = join(FIXTURE_BASE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Pre-create trace with existing events to verify diagnostic isolation
  writeFileSync(join(dir, 'rb_trace.jsonl'), [
    JSON.stringify({ ts: '2026-01-01T00:00:00.000Z', event: 'run_start' }),
    JSON.stringify({ ts: '2026-01-01T00:00:01.000Z', event: 'check', passed: true, detail: 'pre-existing check' }),
  ].join('\n') + '\n');
  return dir;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('run-gate-with-monitor.mjs', () => {
  before(() => {
    cleanFixtures();
    mkdirSync(FIXTURE_BASE, { recursive: true });
  });

  after(() => {
    cleanFixtures();
  });

  // ── Exit Code Preservation — EXO-003 ───────────────────────────────────

  describe('exit code preservation', () => {
    it('exits 0 when wrapped gate passes', () => {
      const dir = createBundle('exit-pass');
      const r = spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_PASS], { encoding: 'utf-8', timeout: 10000 });
      assert.strictEqual(r.status, 0);
    });

    it('exits 1 when wrapped gate fails', () => {
      const dir = createBundle('exit-fail');
      const r = spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_FAIL], { encoding: 'utf-8', timeout: 10000 });
      assert.strictEqual(r.status, 1);
    });

    it('exits 2 when wrapped gate exits 2 (config error)', () => {
      const dir = createBundle('exit-config');
      const r = spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'unknown', '--', ...FAKE_INVALID_INPUT], { encoding: 'utf-8', timeout: 10000 });
      assert.strictEqual(r.status, 2);
    });
  });

  // ── Artifact Persistence — EXO-003 ─────────────────────────────────────

  describe('artifact persistence', () => {
    it('creates _observability/gates/<seq>-<gate>.json on pass', () => {
      const dir = createBundle('artifact-pass');
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_PASS], { encoding: 'utf-8', timeout: 10000 });

      const gatesDir = join(dir, '_observability', 'gates');
      assert.ok(existsSync(gatesDir), '_observability/gates/ should exist');

      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
      assert.strictEqual(files.length, 1);
      assert.ok(files[0].startsWith('0001-'));
      assert.ok(files[0].includes('wave0-complete'));

      const artifact = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));
      assert.strictEqual(artifact.sequence, 1);
      assert.strictEqual(artifact.gate, 'wave0-complete');
      assert.strictEqual(artifact.exit_code, 0);
      assert.ok(artifact.parsed_json);
      assert.ok(artifact.captured_at);
    });

    it('persists artifact on gate failure', () => {
      const dir = createBundle('artifact-fail');
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_FAIL], { encoding: 'utf-8', timeout: 10000 });

      const gatesDir = join(dir, '_observability', 'gates');
      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
      assert.strictEqual(files.length, 1);

      const artifact = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));
      assert.strictEqual(artifact.exit_code, 1);
      assert.ok(Array.isArray(artifact.inspect));
      assert.ok(artifact.inspect.length > 0);
    });

    it('monotonic sequence increments across invocations (retry)', () => {
      const dir = createBundle('artifact-retry');
      // First invocation
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_FAIL], { encoding: 'utf-8', timeout: 10000 });
      // Second invocation (retry/repair)
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_PASS], { encoding: 'utf-8', timeout: 10000 });

      const gatesDir = join(dir, '_observability', 'gates');
      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json')).sort();
      assert.strictEqual(files.length, 2);
      assert.ok(files[0].startsWith('0001-'));
      assert.ok(files[1].startsWith('0002-'));

      const artifact1 = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));
      const artifact2 = JSON.parse(readFileSync(join(gatesDir, files[1]), 'utf-8'));
      assert.strictEqual(artifact1.sequence, 1);
      assert.strictEqual(artifact2.sequence, 2);
      // Earlier artifact is NOT overwritten
      assert.strictEqual(artifact1.exit_code, 1);
      assert.strictEqual(artifact2.exit_code, 0);
    });
  });

  // ── Diagnostics — EXO-004 ─────────────────────────────────────────────

  describe('diagnostic trace event', () => {
    it('appends a non-verdict diagnostic event to rb_trace.jsonl', () => {
      const dir = createBundle('diag-trace');
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_PASS], { encoding: 'utf-8', timeout: 10000 });

      const traceRaw = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim();
      const events = traceRaw.split('\n').map(l => JSON.parse(l));

      const diagnosticEvents = events.filter(e => e.event === 'diagnostic');
      assert.ok(diagnosticEvents.length >= 1, 'Should have diagnostic event');
      assert.strictEqual(diagnosticEvents[0].source, 'experiment-observability');
      assert.strictEqual(diagnosticEvents[0].kind, 'gate_output');
      assert.strictEqual(diagnosticEvents[0].gate, 'wave0-complete');

      // Existing check events preserved
      const checkEvents = events.filter(e => e.event === 'check');
      assert.strictEqual(checkEvents.length, 1); // only the pre-existing one
    });

    it('diagnostic event for failed gate includes inspect and advice', () => {
      const dir = createBundle('diag-fail');
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave0-complete', '--', ...FAKE_FAIL], { encoding: 'utf-8', timeout: 10000 });

      const traceRaw = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim();
      const events = traceRaw.split('\n').map(l => JSON.parse(l));
      const diag = events.find(e => e.event === 'diagnostic');

      assert.ok(diag);
      assert.strictEqual(diag.passed, false);
      assert.ok(Array.isArray(diag.inspect));
      assert.ok(diag.inspect.length > 0);
    });

    it('never creates check events', () => {
      const dir = createBundle('no-check');
      const initialCheckCount = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').filter(l => JSON.parse(l).event === 'check').length;
      assert.strictEqual(initialCheckCount, 1);

      // Run multiple gate invocations
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'gate-a', '--', ...FAKE_PASS], { encoding: 'utf-8', timeout: 10000 });
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'gate-b', '--', ...FAKE_FAIL], { encoding: 'utf-8', timeout: 10000 });

      const traceRaw = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim();
      const events = traceRaw.split('\n').map(l => JSON.parse(l));
      const finalCheckCount = events.filter(e => e.event === 'check').length;
      assert.strictEqual(finalCheckCount, 1); // unchanged
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles malformed gate stdout gracefully', () => {
      const dir = createBundle('malformed');
      const r = spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'bad-gate', '--', ...FAKE_MALFORMED], { encoding: 'utf-8', timeout: 10000 });
      assert.strictEqual(r.status, 1); // preserves exit code

      const gatesDir = join(dir, '_observability', 'gates');
      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
      const artifact = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));
      assert.strictEqual(artifact.parsed_json, null);
      assert.ok(artifact.inspect.includes('Gate stdout is not valid JSON'));
    });

    it('captures stderr separately from stdout', () => {
      const dir = createBundle('stderr-capture');
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'seed-topics-ready', '--', ...FAKE_STDERR], { encoding: 'utf-8', timeout: 10000 });

      const gatesDir = join(dir, '_observability', 'gates');
      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
      const artifact = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));

      assert.ok(artifact.stderr.includes('deprecated flag'));
      assert.ok(artifact.parsed_json); // stdout still parsed
      assert.strictEqual(artifact.exit_code, 0);
    });

    it('extracts inspect[] and advice[] from gate output', () => {
      const dir = createBundle('extract-diags');
      spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave1-complete', '--', ...FAKE_INSPECT_ADVICE], { encoding: 'utf-8', timeout: 10000 });

      const gatesDir = join(dir, '_observability', 'gates');
      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
      const artifact = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));

      assert.ok(Array.isArray(artifact.inspect));
      assert.ok(artifact.inspect.length >= 2);
      assert.ok(artifact.inspect.some(i => i.includes('foundation-placeholder')));
      assert.ok(Array.isArray(artifact.advice));
      assert.ok(artifact.advice.length >= 2);
    });

    it('preserves gate stdout as wrapper stdout', () => {
      const dir = createBundle('stdout-pass');
      const r = spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'gate', '--', ...FAKE_PASS], { encoding: 'utf-8', timeout: 10000 });

      // Gate's own stdout should be passed through
      const gateOutput = JSON.parse(r.stdout.trim());
      assert.strictEqual(gateOutput.check.passed, true);
    });

    it('preserves structured gate stdout larger than a small pipe buffer', () => {
      const dir = createBundle('stdout-large');
      const r = spawnSync('node', [WRAPPER, '--bundle', dir, '--gate', 'wave1-complete', '--', ...FAKE_LARGE], { encoding: 'utf-8', timeout: 10000 });

      assert.strictEqual(r.status, 1);
      assert.ok(r.stdout.length > 8192);
      const gateOutput = JSON.parse(r.stdout);
      assert.strictEqual(gateOutput.inspect[0].length, 12000);

      const gatesDir = join(dir, '_observability', 'gates');
      const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
      const artifact = JSON.parse(readFileSync(join(gatesDir, files[0]), 'utf-8'));
      assert.strictEqual(artifact.stdout, r.stdout);
      assert.strictEqual(artifact.parsed_json.inspect[0].length, 12000);
    });
  });
});
