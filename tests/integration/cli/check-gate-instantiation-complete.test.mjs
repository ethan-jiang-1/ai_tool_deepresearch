// gate-instantiation-complete integration tests (PRG-001, PRG-004)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_int_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath, currentNode = 'phases/phase-instantiation.md', extraArgs = []) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', currentNode, ...extraArgs], {
    encoding: 'utf-8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
}

function assertCompleteHint(hint) {
  assert.ok(hint?.rule_id);
  assert.ok(hint?.repair_kind);
  assert.ok(hint?.missing_fact);
  assert.ok(hint?.write_to);
  assert.ok(hint?.rerun);
}

describe('check-gate-instantiation-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('passes on a valid disposable bundle', () => {
    const name = unique('valid');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    if (r.status !== 0) throw new Error(`new-disposable-bundle failed: ${r.stderr}`);
    const bundleDir = track(r.stdout.trim());

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, true, `Expected pass, got: ${JSON.stringify(output.inspect)}`);
    assert.equal(output.routing.kind, 'next');
    assert.ok(output.routing.next);
    assert.deepEqual(output.hints, []);
  });

  it('fails when a control file is missing', () => {
    const name = unique('missing');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());

    // Remove rb_profile.yaml
    rmSync(join(bundleDir, 'rb_profile.yaml'));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('rb_profile.yaml')), `Expected inspect to mention rb_profile.yaml, got: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'rb_profile_exists');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'engine_operation');
    assert.match(hint.missing_fact, /rb_profile\.yaml/);
    assert.match(hint.write_to, /instantiate-run-bundle\.mjs/);
    assert.match(hint.rerun, new RegExp(`--bundle ${bundleDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  it('fails when BUNDLE_MAP.md is missing even if legacy START_FROM_HERE.md exists', () => {
    const name = unique('missing-map');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());

    rmSync(join(bundleDir, 'BUNDLE_MAP.md'));
    writeFileSync(join(bundleDir, 'START_FROM_HERE.md'), '# Legacy only\n');

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('BUNDLE_MAP.md')), `Expected inspect to mention BUNDLE_MAP.md, got: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'bundle_map_exists');
    assertCompleteHint(hint);
    assert.match(hint.missing_fact, /BUNDLE_MAP\.md/);
  });

  it('fails on illegal bundle name (spaces)', () => {
    const illegalName = join(BUNDLES_DIR, 'dpt_rb_bad name');
    const bundleDir = track(illegalName);
    mkdirSync(bundleDir, { recursive: true });

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('pattern') || m.includes('naming')), `Expected name pattern fail: ${JSON.stringify(output.inspect)}`);
  });

  it('fails when status has drifted', () => {
    const name = unique('drift');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());

    // Corrupt current_gate
    const statusPath = join(bundleDir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.current_gate = 'wave0_complete';
    writeFileSync(statusPath, JSON.stringify(status));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('current_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('projects binding helper finding with the legal same-Gate rerun node', () => {
    const name = unique('binding');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());

    const result = runGate(bundleDir, 'phases/phase-wave0.md');
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'gate_node_binding_mismatch');

    assert.equal(output.check.passed, false);
    assert.equal(output.routing.kind, 'invalid_input');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'engine_operation');
    assert.match(hint.write_to, /phases\/phase-instantiation\.md/);
    assert.match(hint.rerun, /--current-node phases\/phase-instantiation\.md$/);
  });

  it('projects routing helper finding instead of reporting a successful Gate', () => {
    const name = unique('routing');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());

    const result = runGate(bundleDir, 'phases/phase-instantiation.md', ['--transitions', join(bundleDir, 'missing-transitions.json')]);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'gate_routing_configuration_invalid');

    assert.equal(output.check.passed, false);
    assert.equal(output.routing.kind, 'config_error');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
  });

  it('keeps compatibility advice while structured hints own the repair contract', () => {
    const name = unique('advice');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    rmSync(join(bundleDir, 'rb_plan.md'));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.advice.length > 0, 'Expected bounded compatibility advice');
    assertCompleteHint(output.hints.find((candidate) => candidate.rule_id === 'rb_plan_exists'));
  });
});
