// @impl CMI-004: instantiate-run-bundle.mjs integration test
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = process.cwd();
const INSTANTIATE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
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
      'BUNDLE_MAP.md',
      'rb_plan.md',
      'rb_profile.yaml',
      'rb_status.json',
      'rb_queue.json',
      'rb_trace.jsonl',
      'seed_topics',
      'reference',
      'reference/_INDEX.md',
      'reference/README.md',
      'artifacts/README.md',
      'artifacts/wave0',
      'artifacts/wave1',
      'artifacts/wave2',
      '_cache',
      '_cache/README.md',
      '_logs/README.md',
      'final',
      '_work_units',
    ]) {
      assert.equal(existsSync(join(dir, entry)), true, `missing ${entry}`);
    }
    assert.equal(existsSync(join(dir, 'START_FROM_HERE.md')), false, 'fresh bundles must not generate START_FROM_HERE.md');
    const bundleMap = readFileSync(join(dir, 'BUNDLE_MAP.md'), 'utf-8');
    assert.ok(bundleMap.includes('passive bundle map'), 'BUNDLE_MAP.md should identify itself as passive');
    assert.ok(bundleMap.includes('Research Content Map'), 'BUNDLE_MAP.md should include Research Content Map');
    assert.ok(bundleMap.includes('Runtime Control Map'), 'BUNDLE_MAP.md should include Runtime Control Map');
    assert.ok(bundleMap.includes('Diagnostics Map'), 'BUNDLE_MAP.md should include Diagnostics Map');
    assert.ok(bundleMap.includes('Reentry Pointers'), 'BUNDLE_MAP.md should include Reentry Pointers');
    assert.match(result.stderr, /BUNDLE_MAP/);
    assert.doesNotMatch(result.stderr, /START_FROM_HERE/);
    // Verify README content is non-empty
    const cacheReadme = readFileSync(join(dir, '_cache/README.md'), 'utf-8');
    assert.ok(cacheReadme.includes('_cache/') && cacheReadme.includes('{wave}/{batch}/{scope}/{source_dir}'),
      '_cache/README.md should explain the four-level directory structure');
    assert.ok(cacheReadme.includes('websearch.json') && cacheReadme.includes('page.md') && cacheReadme.includes('meta.json'),
      '_cache/README.md should document the three-file-per-source convention');
    const logsReadme = readFileSync(join(dir, '_logs/README.md'), 'utf-8');
    assert.ok(logsReadme.includes('run.log') && logsReadme.includes('rb_trace.jsonl'),
      '_logs/README.md should explain the log and trace file inventory');
    const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
    assert.equal(status.current_node, null);
    const profile = parseYaml(readFileSync(join(dir, 'rb_profile.yaml'), 'utf-8'));
    assert.deepEqual(profile.research_access, { status: 'unprobed' });
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
  return spawnSync('node', [INSTANTIATE, ...args, '--target-dir', BUNDLES_DIR], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function uniqueName(label) {
  return `test-inst-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trackBundle(name) {
  const dir = join(BUNDLES_DIR, `dpt_rb_${name}`);
  createdBundleDirs.add(dir);
  rmSync(dir, { recursive: true, force: true }); // clean any leftover from previous aborted run
  return dir;
}
