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

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-instantiation.md'], { encoding: 'utf-8', timeout: 10000 });
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

  it('advice contains failure_message for each failed rule', () => {
    const name = unique('advice');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    rmSync(join(bundleDir, 'rb_plan.md'));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.advice.length > 0, 'Expected advice with failure messages');
    assert.ok(output.advice.some(a => a.includes('rb_plan')));
  });
});
