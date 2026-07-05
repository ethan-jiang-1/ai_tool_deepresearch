// actual-gate-cli-exit-code-contract.test.mjs
// Verifies an actual gate CLI wrapper preserves the documented 0/1/2 exit-code contract.
// @impl CLE-004, GSK-009

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function uniqueName(label) {
  return `gate-exit-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDisposableBundle(label) {
  const result = spawnSync(
    process.execPath,
    [NEW_BUNDLE, uniqueName(label), '--force', '--target-dir', BUNDLES_DIR],
    { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 10000 },
  );
  assert.equal(result.status, 0, result.stderr);

  const bundlePath = result.stdout.trim();
  createdDirs.push(bundlePath);
  return bundlePath;
}

function runInstantiationGate(args) {
  return spawnSync(process.execPath, [GATE_CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function parseGateStdout(result) {
  assert.ok(result.stdout.trim(), `gate stdout must not be empty; stderr=${result.stderr}`);
  return JSON.parse(result.stdout);
}

describe('actual gate CLI exit-code tri-state', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('exits 0 when the gate passes', () => {
    const bundlePath = createDisposableBundle('pass');
    const result = runInstantiationGate([
      '--bundle', bundlePath,
      '--current-node', 'phases/phase-instantiation.md',
    ]);
    const output = parseGateStdout(result);

    assert.equal(result.status, 0);
    assert.equal(output.check.passed, true);
    assert.equal(output.routing.kind, 'next');
    assert.equal(output.check.next, output.routing.next);
  });

  it('exits 1 when the gate fails with a repairable rule failure', () => {
    const bundlePath = createDisposableBundle('fail');
    rmSync(join(bundlePath, 'rb_profile.yaml'));

    const result = runInstantiationGate([
      '--bundle', bundlePath,
      '--current-node', 'phases/phase-instantiation.md',
    ]);
    const output = parseGateStdout(result);

    assert.equal(result.status, 1);
    assert.equal(output.check.passed, false);
    assert.notEqual(output.routing.kind, 'invalid_input');
    assert.notEqual(output.routing.kind, 'config_error');
    assert.ok(output.inspect.some((line) => line.includes('rb_profile.yaml')));
    assert.ok(output.advice.length > 0);
  });

  it('exits 2 when the gate is called with invalid input', () => {
    const result = runInstantiationGate([]);
    const output = parseGateStdout(result);

    assert.equal(result.status, 2);
    assert.equal(output.check.passed, false);
    assert.equal(output.routing.kind, 'invalid_input');
    assert.ok(output.inspect.length > 0);
    assert.ok(output.advice.length > 0);
  });
});
