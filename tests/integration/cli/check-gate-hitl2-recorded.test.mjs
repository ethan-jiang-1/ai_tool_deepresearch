// gate-hitl2-recorded integration tests (CDG-003)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_h2_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-hitl2.md'], { encoding: 'utf-8', timeout: 10000 });
}

const VALID_PROFILE = `
plan_basename: hitl2-recorded-test
research_profile: quick_factual
root_must_answer_set:
  - "How to measure alignment?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/hitl2-recorded-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: profile_default
    rationale: "The research is complete and ready for final delivery."
    rerun_count: 0
`;

function profileWithDecision(decision) {
  return VALID_PROFILE.replace('user_decision: proceed_to_readiness', `user_decision: ${decision}`);
}

function writePassingHitl2Inputs(dir, decision = 'proceed_to_readiness') {
  writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'),
    '# Final Review Decision Brief\n\n## Key Findings\n\nThe research produced strong evidence across 3 topics.\n\n## Open Questions\n\n1. How to generalize?\n\n## Recommended Actions\n\nProceed to final delivery.\n');
  writeFileSync(join(dir, 'rb_profile.yaml'), profileWithDecision(decision));
  writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);
}

function readTrace(dir) {
  return readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

/** Create a bundle with hitl2-ready state. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Set source-gate status window for hitl2 entry
  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'wave2_complete';
  status.next_gate = 'hitl2_recorded';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Create hitl2 artifact directory and decision brief
  mkdirSync(join(dir, 'artifacts', 'hitl2'), { recursive: true });

  return dir;
}

function writeHitl2HandoffTrace(dir, extraEvents = []) {
  const source = {
    event: 'gate_attempt',
    gate: 'wave2-complete',
    phase: 'wave2',
    passed: true,
    currentNodeRef: 'phases/phase-wave2.md',
    next: 'phases/phase-hitl2.md',
    ts: new Date().toISOString(),
  };
  const load = {
    event: 'load_complete',
    entry: 'phases/phase-hitl2.md',
    handoff_source_gate: 'wave2-complete',
    handoff_source_node: 'phases/phase-wave2.md',
    handoff_target_node: 'phases/phase-hitl2.md',
    handoff_source_attempt_index: 0,
    ts: new Date().toISOString(),
  };
  writeFileSync(join(dir, 'rb_trace.jsonl'), [source, load, ...extraEvents].map(e => JSON.stringify(e)).join('\n') + '\n');
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

    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}`);
  });

  it('2. fails when decision brief is missing', () => {
    const dir = createBundle(unique('nobrief'));

    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

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
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('field_non_empty')),
      `Expected empty brief fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when hitl2.status is not recorded', () => {
    const dir = createBundle(unique('badstatus'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    const badProfile = VALID_PROFILE.replace(
      '  hitl2:\n    status: recorded\n    answerability_class: ready_substantive',
      '  hitl2:\n    status: pending_user\n    answerability_class: ready_substantive',
    );
    writeFileSync(join(dir, 'rb_profile.yaml'), badProfile);
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

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
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

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
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('random_choice') || (m.includes('accepted') && m.includes('in'))),
      `Expected invalid enum fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6b. rejects not_started sentinel as a recorded gate decision', () => {
    const dir = createBundle(unique('sentinel'));
    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), profileWithDecision('not_started'));
    writeHitl2HandoffTrace(dir);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(result.status, 1);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('not_started') || m.includes('accepted')),
      `Expected sentinel rejection: ${JSON.stringify(output.inspect)}`);
  });

  it('7. gate passes without hitl2_recorded trace event (rule removed — redundant with artifact checks)', () => {
    const dir = createBundle(unique('notrace'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);
    writeHitl2HandoffTrace(dir);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true);
  });

  it('8. fails when rb_profile.yaml is unparseable YAML', () => {
    const dir = createBundle(unique('badyaml'));

    writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Brief\n\nContent.\n');
    writeFileSync(join(dir, 'rb_profile.yaml'), '{invalid: [yaml: :}:');
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

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
    writeHitl2HandoffTrace(dir, [{ event: 'hitl2_recorded', ts: new Date().toISOString() }]);

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

  it('10. proceed_to_readiness emits readiness target in check.next and trace', () => {
    const dir = createBundle(unique('proceed-next'));
    writePassingHitl2Inputs(dir, 'proceed_to_readiness');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true);
    assert.equal(output.check.next, 'phases/phase-readiness.md');

    const attempts = readTrace(dir).filter(e => e.event === 'gate_attempt' && e.gate === 'hitl2-recorded');
    assert.equal(attempts.at(-1).next, 'phases/phase-readiness.md');
  });

  it('11. rerun emits rerun target in check.next and trace', () => {
    const dir = createBundle(unique('rerun-next'));
    writePassingHitl2Inputs(dir, 'rerun');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true);
    assert.equal(output.check.next, 'phases/phase-rerun.md');

    const attempts = readTrace(dir).filter(e => e.event === 'gate_attempt' && e.gate === 'hitl2-recorded');
    assert.equal(attempts.at(-1).next, 'phases/phase-rerun.md');
  });

  it('12. non-deterministic decisions do not default to readiness handoff', () => {
    const dir = createBundle(unique('repair-no-default'));
    writePassingHitl2Inputs(dir, 'repair');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(result.status, 0);
    assert.equal(output.check.passed, true);
    assert.equal(output.routing.kind, 'no_transition');
    assert.equal(output.check.next, null);

    const attempts = readTrace(dir).filter(e => e.event === 'gate_attempt' && e.gate === 'hitl2-recorded');
    assert.ok(attempts.length > 0);
    assert.equal(attempts.at(-1).passed, true);
    assert.equal(attempts.at(-1).next, null);
  });
});
