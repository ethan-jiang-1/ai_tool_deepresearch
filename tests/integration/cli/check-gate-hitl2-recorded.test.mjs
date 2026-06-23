// gate-hitl2-recorded integration tests (CDG-003)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_h2_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-hitl2.md'], { encoding: 'utf-8', timeout: 10000 });
}

const VALID_PROFILE = `
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set:
      - "How to measure alignment?"
    answerability_class: ready_substantive
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
    rationale: "The research is complete and ready for final delivery."
    recorded_at: "2026-06-20T10:00:00Z"
`;

/** Create a bundle with hitl2-ready state. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Set status for hitl2
  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'hitl2_recorded';
  status.next_gate = 'readiness_passed';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Create hitl2 artifact directory and decision brief
  mkdirSync(join(dir, 'artifacts', 'hitl2'), { recursive: true });

  return dir;
}

describe('check-gate-hitl2-recorded', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: valid decision brief + profile decision + trace event → pass', () => {
    const dir = createBundle(unique('happy'));

    // Write decision brief
    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'),
      '# Final Review Decision Brief\n\n## Key Findings\n\nThe research produced strong evidence across 3 topics.\n\n## Open Questions\n\n1. How to generalize?\n\n## Recommended Actions\n\nProceed to final delivery.\n');

    // Write profile with valid hitl2 decision
    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);

    // Write trace with hitl2_recorded event
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'gate_attempt', gate: 'wave2-complete', passed: true, ts: new Date().toISOString() }) + '\n' +
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}`);
  });

  it('2. fails when decision brief is missing', () => {
    const dir = createBundle(unique('nobrief'));

    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('decision-brief.md') || m.includes('Missing file')),
      `Expected missing brief fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when decision brief is empty', () => {
    const dir = createBundle(unique('emptybrief'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '---\n---\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('field_non_empty')),
      `Expected empty brief fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when hitl2.status is not recorded', () => {
    const dir = createBundle(unique('badstatus'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    const badProfile = VALID_PROFILE.replace('status: recorded\n    user_decision: proceed_to_readiness', 'status: pending_user\n    user_decision: proceed_to_readiness');
    writeFileSync(join(dir, 'rb_profile.yaml'), badProfile);
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('recorded') || m.includes('status')),
      `Expected status fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when user_decision is empty', () => {
    const dir = createBundle(unique('nodecision'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    const noDecisionProfile = VALID_PROFILE.replace('user_decision: proceed_to_readiness', 'user_decision: ');
    writeFileSync(join(dir, 'rb_profile.yaml'), noDecisionProfile);
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('user_decision')),
      `Expected empty decision fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when user_decision is not in accepted enum', () => {
    const dir = createBundle(unique('badenum'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    const badEnumProfile = VALID_PROFILE.replace('user_decision: proceed_to_readiness', 'user_decision: random_choice');
    writeFileSync(join(dir, 'rb_profile.yaml'), badEnumProfile);
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('random_choice') || (m.includes('accepted') && m.includes('in'))),
      `Expected invalid enum fail: ${JSON.stringify(output.inspect)}`);
  });

  it('7. fails when hitl2_recorded trace event is missing', () => {
    const dir = createBundle(unique('notrace'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);
    writeFileSync(join(dir, 'rb_trace.jsonl'), '');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('hitl2_recorded') || m.includes('Trace event')),
      `Expected missing trace fail: ${JSON.stringify(output.inspect)}`);
  });

  it('8. fails when rb_profile.yaml is unparseable YAML', () => {
    const dir = createBundle(unique('badyaml'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), '{invalid: [yaml: :}:');
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML') || m.includes('parse')),
      `Expected YAML parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('9. fails on status drift (wrong next_gate)', () => {
    const dir = createBundle(unique('drift'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);
    writeFileSync(join(dir, 'rb_trace.jsonl'),
      JSON.stringify({ event: 'hitl2_recorded', ts: new Date().toISOString() }) + '\n');

    // Drift next_gate
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'wave2_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')),
      `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });
});
