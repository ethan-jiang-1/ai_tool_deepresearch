// @impl BUI-003: inspect-bundle cross-reference diagnostic — Integration test
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const INSTANTIATE = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs');
const INSPECT = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const tempBundles = [];

function createBundle(name) {
  const result = spawnSync('node', [INSTANTIATE, name, '--target-dir', BUNDLES_DIR], { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 10000 });
  if (result.status !== 0) throw new Error(`create bundle failed: ${result.stderr}`);
  const bundleDir = result.stdout.trim();
  tempBundles.push(bundleDir);
  return bundleDir;
}

describe('inspect-bundle cross-reference scan', () => {
  before(() => mkdirSync(BUNDLES_DIR, { recursive: true }));
  beforeEach(() => {
    for (const entry of readdirSync(BUNDLES_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('dpt_rb_')) {
        rmSync(join(BUNDLES_DIR, entry.name), { recursive: true, force: true });
      }
    }
  });
  after(() => {
    for (const dir of tempBundles) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports cross-bundle references in inspect output', () => {
    const name = `xref-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const bundle = createBundle(name);

    // Inject a cross-bundle reference into rb_plan.md
    writeFileSync(join(bundle, 'rb_plan.md'), '# Plan\nCompare with dpt_rb_other-bundle results.', 'utf-8');

    const result = spawnSync('node', [INSPECT, bundle], { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 10000 });
    assert.ok(result.stdout.includes('cross-bundle') || result.stdout.includes('dpt_rb_other-bundle'),
      `expected cross-bundle diagnostic, got: ${result.stdout.slice(0, 500)}`);
    assert.equal(result.status, 1, 'inspect should exit 1 with cross-bundle blocker');
  });

  it('passes on clean bundle without cross-references', () => {
    const name = `clean-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const bundle = createBundle(name);

    const result = spawnSync('node', [INSPECT, bundle], { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 10000 });
    // Should exit 0 since a fresh bundle has no cross-bundle references
    assert.doesNotMatch(result.stdout, /cross-bundle|Cross-bundle/, 'clean bundle should not have cross-bundle diagnostic');
  });
});