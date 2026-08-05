// @impl FRE-001, WDC-001, WDC-004, WDC-005, EXA-002, TEF-001, VEM-001, VEM-003
// Deterministic migration chain only. It does not claim Agent research behavior.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { after, describe, it } from 'node:test';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

const REPO_ROOT = process.cwd();
const HARNESS_ROOT = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS');
const CANONICAL_INSTANTIATE = join(HARNESS_ROOT, 'cli', 'instantiate-run-bundle.mjs');
const CANONICAL_INSPECT = join(HARNESS_ROOT, 'cli', 'inspect-bundle.mjs');
const CANONICAL_LOG = join(HARNESS_ROOT, 'cli', 'log-event.mjs');
const roots = new Set();

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'deep-research-harness-migration-'));
  roots.add(root);
  return root;
}

function uniqueName(label) {
  return `harness-migration-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sourceRuntimeState() {
  const paths = [
    join(HARNESS_ROOT, 'rb_trace.jsonl'),
    join(HARNESS_ROOT, 'rb_status.json'),
    join(HARNESS_ROOT, 'rb_queue.json'),
    join(HARNESS_ROOT, '_logs', 'run.log'),
  ];
  return paths.map((path) => [path, existsSync(path)]);
}

describe('Deep Research Harness migration', () => {
  after(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  it('creates and inspects a temporary bundle through the canonical Harness coordinate', () => {
    const root = makeRoot();
    const target = join(root, 'canonical-target');
    const name = uniqueName('canonical');
    const created = run(CANONICAL_INSTANTIATE, [name, '--target-dir', target]);
    const bundle = join(target, `dpt_rb_${name}`);

    assert.equal(created.status, 0, created.stderr);
    assert.equal(created.stdout.trim(), realpathSync(bundle));
    assert.equal(isAbsolute(created.stdout.trim()), true);

    const inspection = run(CANONICAL_INSPECT, [bundle]);
    assert.equal(inspection.status, 0, `${inspection.stdout}\n${inspection.stderr}`);
    assert.doesNotMatch(inspection.stdout, /RUN_BUNDLE\.md not found/);

    const entry = readFileSync(join(bundle, 'BUNDLE_ENTRY.md'), 'utf8');
    const expectedRelativeRoot = relative(realpathSync(bundle), realpathSync(HARNESS_ROOT)) || '.';
    assert.ok(entry.includes(`Deep Research Harness: \`${expectedRelativeRoot}\``));
    assert.equal(existsSync(join(bundle, 'RUN_BUNDLE.md')), false);
  });

  it('keeps runtime writes under the supplied bundle root and release paths aligned', () => {
    const root = makeRoot();
    const target = join(root, 'runtime-target');
    const name = uniqueName('runtime');
    const created = run(CANONICAL_INSTANTIATE, [name, '--target-dir', target]);
    const bundle = join(target, `dpt_rb_${name}`);
    assert.equal(created.status, 0, created.stderr);

    const sourceBefore = sourceRuntimeState();
    const beforeTrace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
    const canonicalLog = run(CANONICAL_LOG, ['--bundle', bundle, '--event', 'harness_migration']);
    assert.equal(canonicalLog.status, 0, canonicalLog.stderr);

    const afterTrace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
    assert.ok(afterTrace.length > beforeTrace.length);
    assert.match(afterTrace, /harness_migration/);
    assert.deepEqual(sourceRuntimeState(), sourceBefore, 'Harness source tree must not receive run state');

    const changelog = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    const runEntry = readFileSync(join(HARNESS_ROOT, 'RUN.md'), 'utf8');
    const releaseEnd = changelog.indexOf('\n## ', changelog.indexOf('## v0.74') + 1);
    const release = changelog.slice(0, releaseEnd === -1 ? undefined : releaseEnd);
    assert.match(release, /^## v0\.74$/m);
    assert.match(release, /Breaking:/);
    assert.match(release, /sole reusable Harness source/);
    assert.match(runEntry, /> \*\*DEEP_RESEARCH_HARNESS v0\.74\*\*/);
    assert.match(runEntry, /## Current Release: v0\.74/);
    assert.equal(existsSync(join(HARNESS_ROOT, 'CHANGELOG.md')), false);
  });
});
