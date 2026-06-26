// gate-readiness-passed integration tests (CDG-004)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_rd_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-readiness.md'], { encoding: 'utf-8', timeout: 10000 });
}

const VALID_PROFILE = `
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
`;

// Expected prior gates (derived from manifest topology: all phases before readiness with gate != null).
// This list matches the current manifest; it is the test's expectation of what readiness should verify.
const PRIOR_GATES = [
  'instantiation-complete', 'hitl1-recorded', 'setup-ready',
  'seed-topics-ready', 'wave0-complete', 'wave1-complete',
  'wave2-complete', 'hitl2-recorded',
];

/** Build a trace with gate_attempt(passed:true) for the given gate names. */
function buildTrace(gateNames) {
  return gateNames.map(g =>
    JSON.stringify({ event: 'gate_attempt', gate: g, passed: true, ts: new Date().toISOString() })
  ).join('\n') + '\n';
}

/** Create a bundle with readiness-ready state (all artifacts present). */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Set status for readiness
  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'readiness_passed';
  status.next_gate = 'none';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Create all required artifacts
  writeFileSync(join(dir, 'seed_topics/dummy.md'), '---\nslug: dummy\ntitle: Dummy\n---\n# Dummy\n');
  writeFileSync(join(dir, 'reference/_INDEX.md'), '# Reference Index\n\n| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 00-shared-dummy.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
  mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), '# Synthesis\n\nCross-topic analysis.\n');
  mkdirSync(join(dir, 'artifacts', 'hitl2'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Decision Brief\n\nProceed to readiness.\n');

  // Write profile
  writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);

  // Write trace with 8 passed gates
  writeFileSync(join(dir, 'rb_trace.jsonl'), buildTrace(PRIOR_GATES));

  return dir;
}

describe('check-gate-readiness-passed', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: all artifacts + 8 gates + valid YAML + valid JSONL → pass', () => {
    const dir = createBundle(unique('happy'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}`);
  });

  it('2. fails when seed_topics/ is missing', () => {
    const dir = createBundle(unique('noseed'));
    rmSync(join(dir, 'seed_topics'), { recursive: true, force: true });
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('seed_topics')),
      `Expected missing seed_topics fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when seed_topics/ is empty', () => {
    const dir = createBundle(unique('emptyseed'));
    rmSync(join(dir, 'seed_topics'), { recursive: true, force: true });
    mkdirSync(join(dir, 'seed_topics'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('seed_topics')),
      `Expected empty seed_topics fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when reference/_INDEX.md is missing', () => {
    const dir = createBundle(unique('noref'));
    rmSync(join(dir, 'reference/_INDEX.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('_INDEX.md')),
      `Expected missing index fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when artifacts/wave2/synthesis.md is missing', () => {
    const dir = createBundle(unique('nosynthesis'));
    rmSync(join(dir, 'artifacts/wave2/synthesis.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('synthesis.md')),
      `Expected missing synthesis fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when artifacts/hitl2/decision-brief.md is missing', () => {
    const dir = createBundle(unique('nobrief'));
    rmSync(join(dir, 'artifacts/hitl2/decision-brief.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('decision-brief.md')),
      `Expected missing brief fail: ${JSON.stringify(output.inspect)}`);
  });

  it('7. fails when fewer than 8 gate_attempt events with passed=true', () => {
    const dir = createBundle(unique('fewgates'));

    // Overwrite trace with only 5 passed gates
    const partialTrace = buildTrace(PRIOR_GATES.slice(0, 5));
    // Add one failed gate_attempt to ensure it's not counted
    const traceWithFail = partialTrace +
      JSON.stringify({ event: 'gate_attempt', gate: 'wave1-complete', passed: false, ts: new Date().toISOString() }) + '\n';
    writeFileSync(join(dir, 'rb_trace.jsonl'), traceWithFail);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('5') || (m.includes('trace_has_events') || m.includes('gate_attempt'))),
      `Expected insufficient gates fail (should report actual count < 8): ${JSON.stringify(output.inspect)}`);
  });

  it('8. fails when rb_profile.yaml is unparseable', () => {
    const dir = createBundle(unique('badyaml'));

    writeFileSync(join(dir, 'rb_profile.yaml'), 'key: [bad: > yaml:');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML') || m.includes('parse')),
      `Expected YAML parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('9. fails when rb_trace.jsonl has unparseable lines', () => {
    const dir = createBundle(unique('badjsonl'));

    const badTrace = buildTrace(PRIOR_GATES) + 'this is not json\n' + 'neither is this\n';
    writeFileSync(join(dir, 'rb_trace.jsonl'), badTrace);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('unparseable') || m.includes('JSONL') || m.includes('JSON')),
      `Expected JSONL parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. fails on status drift (wrong next_gate)', () => {
    const dir = createBundle(unique('drift'));

    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'hitl2_recorded'; // wrong — should be 'none'
    writeFileSync(statusPath, JSON.stringify(status));

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')),
      `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });
});
