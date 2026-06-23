// gate-hitl1-recorded integration tests (PRG-002, PRG-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_int_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-hitl1.md'], { encoding: 'utf-8', timeout: 10000 });
}

function writeProfileYaml(bundleDir, yaml) {
  writeFileSync(join(bundleDir, 'rb_profile.yaml'), yaml);
}

const VALID_PROFILE = `plan_basename: test
research_profile: quick_factual
root_must_answer_set:
  - "What is the answer?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`;

describe('check-gate-hitl1-recorded', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('passes with a complete profile', () => {
    const name = unique('valid');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, true, `Expected pass, got: ${JSON.stringify(output.inspect)}`);
  });

  it('fails when rb_profile.yaml is missing', () => {
    const name = unique('noprofile');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    rmSync(join(bundleDir, 'rb_profile.yaml'));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('rb_profile.yaml')), `Expected profile missing: ${JSON.stringify(output.inspect)}`);
  });

  it('fails on YAML parse error', () => {
    const name = unique('badyaml');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, 'not: valid: yaml: [[');

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
  });

  it('fails when research_profile is still not_selected', () => {
    const name = unique('default');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    // Keep default profile (not_selected)

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('not_selected')), `Expected not_selected fail: ${JSON.stringify(output.inspect)}`);
  });

  it('fails when root_must_answer_set is empty', () => {
    const name = unique('emptymust');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, `plan_basename: test
research_profile: exploratory_map
root_must_answer_set: []
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('root_must_answer_set')), `Expected empty must_answer fail: ${JSON.stringify(output.inspect)}`);
  });

  it('fails when hitl1.status is not recorded', () => {
    const name = unique('nostatus');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, `plan_basename: test
research_profile: claim_verification
root_must_answer_set:
  - "Q"
human_decision_checkpoints:
  hitl1:
    status: pending_user
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('recorded')), `Expected status not recorded fail: ${JSON.stringify(output.inspect)}`);
  });

  it('fails when recorded_at is missing', () => {
    const name = unique('noat');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, `plan_basename: test
research_profile: quick_factual
root_must_answer_set:
  - "Q"
human_decision_checkpoints:
  hitl1:
    status: recorded
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('recorded_at')), `Expected recorded_at missing fail: ${JSON.stringify(output.inspect)}`);
  });
});
