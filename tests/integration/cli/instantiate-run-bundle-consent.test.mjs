// @impl CMI-010: instantiate-run-bundle sibling preflight consent — Integration test
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = process.cwd();
const INSTANTIATE = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdBundleDirs = new Set();

function uniqueName(label) {
  return `test-consent-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function runInstantiate(...args) {
  return spawnSync('node', [INSTANTIATE, ...args, '--target-dir', BUNDLES_DIR], { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 10000 });
}

function trackBundle(name) {
  const dir = join(BUNDLES_DIR, `dpt_rb_${name}`);
  createdBundleDirs.add(dir);
  rmSync(dir, { recursive: true, force: true });
  return dir;
}

describe('instantiate-run-bundle consent integration', () => {
  before(() => {
    mkdirSync(BUNDLES_DIR, { recursive: true });
  });

  beforeEach(() => {
    // Clean all leftover bundles from prior test to ensure isolation
    for (const entry of readdirSync(BUNDLES_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('dpt_rb_')) {
        rmSync(join(BUNDLES_DIR, entry.name), { recursive: true, force: true });
      }
    }
  });
  after(() => {
    for (const dir of createdBundleDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects name-similar sibling without ack', () => {
    const baseName = `sim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const existingName = baseName;
    const newName = `${baseName}-v2`;
    const existingDir = trackBundle(existingName);
    const newDir = trackBundle(newName);

    // Create the existing bundle
    const createResult = runInstantiate(existingName);
    assert.equal(createResult.status, 0, createResult.stderr);

    // Try to create a similar-named bundle — should be rejected
    const rejectResult = runInstantiate(newName);
    assert.equal(rejectResult.status, 1);
    assert.ok(rejectResult.stderr.includes('name-similar') || rejectResult.stderr.includes('consent'), rejectResult.stderr);
    assert.equal(existsSync(newDir), false, 'bundle should not have been created');
  });

  it('rejects creation when a non-Final sibling exists', () => {
    const existingName = uniqueName('nonfinal');
    const newName = uniqueName('other');

    const existingDir = trackBundle(existingName);
    const newDir = trackBundle(newName);

    // Create an existing bundle
    const createResult = runInstantiate(existingName);
    assert.equal(createResult.status, 0, createResult.stderr);

    // At instantiation time, the bundle is not yet Final — sibling preflight flags it
    // Try to create another with unrelated name
    const rejectResult = runInstantiate(newName);
    assert.equal(rejectResult.status, 1);
    assert.ok(rejectResult.stderr.includes('not in Final') || rejectResult.stderr.includes('consent'), rejectResult.stderr);
    assert.equal(existsSync(newDir), false, 'bundle should not have been created');
  });

  it('accepts --acknowledge-existing-bundle after user consent', () => {
    const existingName = uniqueName('consent');
    const siblingName = `${existingName}-v2`;
    const existingDir = trackBundle(existingName);
    const siblingDir = trackBundle(siblingName);

    // Create existing bundle
    const createResult = runInstantiate(existingName);
    assert.equal(createResult.status, 0, createResult.stderr);

    // Create sibling with explicit ack — should succeed
    const ackResult = runInstantiate(siblingName, `--acknowledge-existing-bundle=${existingName}`);
    assert.equal(ackResult.status, 0, ackResult.stderr);
    assert.equal(existsSync(siblingDir), true, 'sibling bundle should have been created');

    // Verify bundle has standard content and no ack trace
    const entry = readFileSync(join(siblingDir, 'BUNDLE_ENTRY.md'), 'utf-8');
    assert.ok(entry.includes(siblingName));
    // Verify bundle does not contain ack in durable files
    for (const f of ['rb_status.json', 'rb_plan.md', 'rb_queue.json', 'BUNDLE_ENTRY.md', 'BUNDLE_MAP.md']) {
      const content = readFileSync(join(siblingDir, f), 'utf-8');
      assert.doesNotMatch(content, /acknowledge-existing-bundle/, `${f} must not contain ack flag`);
    }
  });

  it('rejects --acknowledge-existing-bundle when no sibling was flagged', () => {
    const name = uniqueName('noflag');
    const result = runInstantiate(name, '--acknowledge-existing-bundle=nonexistent');
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('no sibling was flagged'), result.stderr);
  });

  it('rejects --acknowledge-existing-bundle with wrong sibling name', () => {
    const existingName = uniqueName('wrongack');
    const otherName = uniqueName('other');
    const bystanderName = uniqueName('bystander');

    // Create existing bundle
    const createResult = runInstantiate(existingName);
    assert.equal(createResult.status, 0, createResult.stderr);

    // Try to create a new bundle with ack pointing to a different non-existent name
    const rejectResult = runInstantiate(otherName, `--acknowledge-existing-bundle=${bystanderName}`);
    assert.equal(rejectResult.status, 1);
    assert.ok(rejectResult.stderr.includes('does not match flagged sibling') || rejectResult.stderr.includes('consent'), rejectResult.stderr);
  });

  it('rejects unknown --acknowledge-existing-bundle option shape', () => {
    // Repeated ack
    const name = uniqueName('repeat');
    const result = runInstantiate(name, '--acknowledge-existing-bundle=x', '--acknowledge-existing-bundle=y');
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('supplied only once') || result.stderr.includes('repeated'), result.stderr);
  });

  it('creates first bundle without ack and with no siblings', () => {
    const name = uniqueName('first');
    const dir = trackBundle(name);
    const result = runInstantiate(name);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(dir), true);
  });
});