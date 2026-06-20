// @impl CMI-004: instantiate-run-bundle.mjs integration test
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const INSTANTIATE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs');
const createdBundleDirs = new Set();

describe('instantiate-run-bundle.mjs integration', () => {
  after(() => {
    for (const dir of createdBundleDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates a fresh production bundle', () => {
    const name = uniqueName('fresh');
    const dir = trackBundle(name);

    const result = runInstantiate(name);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), dir);
    for (const entry of [
      'START_FROM_HERE.md',
      'rb_plan.md',
      'rb_profile.yaml',
      'rb_status.json',
      'rb_queue.json',
      'rb_trace.jsonl',
      'seed_topics',
      'reference',
      'artifacts/wave1',
      'artifacts/wave2',
      '_cache',
      'final',
    ]) {
      assert.equal(existsSync(join(dir, entry)), true, `missing ${entry}`);
    }
  });

  it('fails on name collision without overwriting existing content', () => {
    const name = uniqueName('collision');
    const dir = trackBundle(name);
    mkdirSync(dir, { recursive: true });
    const marker = join(dir, 'marker.txt');
    writeFileSync(marker, 'keep me');

    const result = runInstantiate(name);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /already exists/);
    assert.equal(readFileSync(marker, 'utf-8'), 'keep me');
    assert.equal(existsSync(join(dir, 'rb_status.json')), false);
  });

  it('rejects --force and does not overwrite existing content', () => {
    const name = uniqueName('force');
    const dir = trackBundle(name);
    mkdirSync(dir, { recursive: true });
    const marker = join(dir, 'marker.txt');
    writeFileSync(marker, 'keep me');

    const result = runInstantiate(name, '--force');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /overwrite is not allowed/);
    assert.equal(readFileSync(marker, 'utf-8'), 'keep me');
    assert.equal(existsSync(join(dir, 'rb_status.json')), false);
  });
});

function runInstantiate(...args) {
  return spawnSync('node', [INSTANTIATE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function uniqueName(label) {
  return `test-inst-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trackBundle(name) {
  const dir = join(REPO_ROOT, `dpt_rb_${name}`);
  createdBundleDirs.add(dir);
  rmSync(dir, { recursive: true, force: true }); // clean any leftover from previous aborted run
  return dir;
}
