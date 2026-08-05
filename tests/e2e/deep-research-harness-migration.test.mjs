// @impl FRE-001, WDC-001, WDC-004, WDC-005, EXA-002, TEF-001, VEM-001, VEM-003
// Deterministic migration chain only. It does not claim Agent research behavior.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { after, describe, it } from 'node:test';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

const REPO_ROOT = process.cwd();
const HARNESS_ROOT = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS');
const LEGACY_ROOT = join(REPO_ROOT, 'DPT_FRAMEWORK');
const CANONICAL_INSTANTIATE = join(HARNESS_ROOT, 'cli', 'instantiate-run-bundle.mjs');
const LEGACY_INSTANTIATE = join(LEGACY_ROOT, 'cli', 'instantiate-run-bundle.mjs');
const CANONICAL_INSPECT = join(HARNESS_ROOT, 'cli', 'inspect-bundle.mjs');
const LEGACY_INSPECT = join(LEGACY_ROOT, 'cli', 'inspect-bundle.mjs');
const FIXTURE_INSPECT = join(REPO_ROOT, 'tests', 'fixtures', 'DEEP_RESEARCH_HARNESS', 'cli', 'inspect-bundle.mjs');
const CANONICAL_LOG = join(HARNESS_ROOT, 'cli', 'log-event.mjs');
const LEGACY_LOG = join(LEGACY_ROOT, 'cli', 'log-event.mjs');
const CANONICAL_AUTORUN = join(HARNESS_ROOT, 'host_tools', 'run-agent-experiment.mjs');
const LEGACY_AUTORUN = join(LEGACY_ROOT, 'host_tools', 'run-agent-experiment.mjs');
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
    join(LEGACY_ROOT, 'rb_trace.jsonl'),
    join(LEGACY_ROOT, 'rb_status.json'),
    join(LEGACY_ROOT, 'rb_queue.json'),
    join(LEGACY_ROOT, '_logs', 'run.log'),
  ];
  return paths.map((path) => [path, existsSync(path)]);
}

describe('Deep Research Harness migration', () => {
  after(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  it('creates and inspects temporary bundles through canonical and legacy Harness coordinates', () => {
    const root = makeRoot();
    const canonicalTarget = join(root, 'canonical-target');
    const legacyTarget = join(root, 'legacy-target');
    const canonicalName = uniqueName('canonical');
    const legacyName = uniqueName('legacy');

    assert.equal(lstatSync(LEGACY_ROOT).isSymbolicLink(), true);
    assert.equal(realpathSync(LEGACY_ROOT), realpathSync(HARNESS_ROOT));
    assert.equal(realpathSync(LEGACY_AUTORUN), realpathSync(CANONICAL_AUTORUN));

    const canonicalResult = run(CANONICAL_INSTANTIATE, [canonicalName, '--target-dir', canonicalTarget]);
    const canonicalBundle = join(canonicalTarget, `dpt_rb_${canonicalName}`);
    assert.equal(canonicalResult.status, 0, canonicalResult.stderr);
    assert.equal(canonicalResult.stdout.trim(), realpathSync(canonicalBundle));
    assert.equal(isAbsolute(canonicalResult.stdout.trim()), true);

    const legacyResult = run(LEGACY_INSTANTIATE, [
      legacyName,
      '--target-dir',
      relative(REPO_ROOT, legacyTarget),
    ]);
    const legacyBundle = join(legacyTarget, `dpt_rb_${legacyName}`);
    assert.equal(legacyResult.status, 0, legacyResult.stderr);
    assert.equal(legacyResult.stdout.trim(), realpathSync(legacyBundle));
    assert.equal(isAbsolute(legacyResult.stdout.trim()), true);

    for (const [inspect, bundle] of [
      [CANONICAL_INSPECT, legacyBundle],
      [LEGACY_INSPECT, canonicalBundle],
      [FIXTURE_INSPECT, canonicalBundle],
    ]) {
      const inspection = run(inspect, [bundle]);
      assert.equal(inspection.status, 0, `${inspect}: ${inspection.stdout}\n${inspection.stderr}`);
      assert.doesNotMatch(inspection.stdout, /RUN_BUNDLE\.md not found/);
    }

    for (const bundle of [canonicalBundle, legacyBundle]) {
      const entry = readFileSync(join(bundle, 'BUNDLE_ENTRY.md'), 'utf8');
      const expectedRelativeRoot = relative(realpathSync(bundle), realpathSync(HARNESS_ROOT)) || '.';
      assert.ok(entry.includes(`Deep Research Harness: \`${expectedRelativeRoot}\``));
      assert.doesNotMatch(entry, /DPT_FRAMEWORK/);
      assert.equal(existsSync(join(bundle, 'RUN_BUNDLE.md')), false);
    }
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
    const canonicalLog = run(CANONICAL_LOG, ['--bundle', bundle, '--event', 'harness_migration_canonical']);
    const legacyLog = run(LEGACY_LOG, ['--bundle', bundle, '--event', 'harness_migration_legacy']);
    assert.equal(canonicalLog.status, 0, canonicalLog.stderr);
    assert.equal(legacyLog.status, 0, legacyLog.stderr);

    const afterTrace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
    assert.ok(afterTrace.length > beforeTrace.length);
    assert.match(afterTrace, /harness_migration_canonical/);
    assert.match(afterTrace, /harness_migration_legacy/);
    assert.deepEqual(sourceRuntimeState(), sourceBefore, 'Harness source trees must not receive run state');

    const changelog = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    const runEntry = readFileSync(join(HARNESS_ROOT, 'RUN.md'), 'utf8');
    assert.match(changelog, /^## v0\.73$/m);
    assert.match(runEntry, /> \*\*DEEP_RESEARCH_HARNESS v0\.73\*\*/);
    assert.match(runEntry, /## Current Release: v0\.73/);
    assert.equal(existsSync(join(HARNESS_ROOT, 'CHANGELOG.md')), false);
  });
});
