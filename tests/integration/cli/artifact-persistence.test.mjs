// @impl ARP-001, ARP-002, ARP-003

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ArtifactPersistenceCrashError,
  persistBundleFile,
  sha256File,
} from '../../../DPT_FRAMEWORK/engine/helpers/artifact-persistence.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const cliPath = path.join(repoRoot, 'DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs');
const roots = [];

function createBundle() {
  const bundle = mkdtempSync(path.join(tmpdir(), 'dpt-artifact-cli-'));
  roots.push(bundle);
  for (const directory of ['reference', 'artifacts/wave0', 'final', '_cache/source', '_logs', '_work_units']) {
    mkdirSync(path.join(bundle, directory), { recursive: true });
  }
  const controls = {
    'rb_status.json': JSON.stringify({ bundle: path.basename(bundle), current_gate: 'readiness_passed' }),
    'rb_queue.json': JSON.stringify({ active_window: [], refill_pool: [], delegated_in_flight: {} }),
    'rb_trace.jsonl': '',
    'rb_output_declarations.jsonl': '',
    'rb_profile.yaml': 'research_profile: debug\n',
    'rb_plan.md': '# Plan\n',
  };
  for (const [relative, content] of Object.entries(controls)) writeFileSync(path.join(bundle, relative), `${content}\n`);
  return bundle;
}

function runCli(...args) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

function parseJson(result) {
  assert.ok(result.stdout.trim(), result.stderr);
  return JSON.parse(result.stdout);
}

function controlSnapshot(bundle) {
  const paths = [
    'rb_status.json',
    'rb_queue.json',
    'rb_trace.jsonl',
    'rb_output_declarations.jsonl',
    'rb_profile.yaml',
    'rb_plan.md',
  ];
  return Object.fromEntries(paths.map((relative) => [relative, readFileSync(path.join(bundle, relative), 'utf8')]));
}

function recursiveFileSnapshot(root) {
  const snapshot = {};
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else snapshot[path.relative(root, absolute)] = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    }
  };
  visit(root);
  return snapshot;
}

function changedPaths(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((relative) => before[relative] !== after[relative])
    .sort();
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('operate-artifact-persistence CLI', () => {
  it('persists content with stable JSON and run-log projection', () => {
    const bundle = createBundle();
    const source = path.join(bundle, '_logs/staging.md');
    writeFileSync(source, 'content\n');
    const before = controlSnapshot(bundle);
    const beforeTree = recursiveFileSnapshot(bundle);
    const result = runCli('persist', '--bundle', bundle, '--source', source, '--target', 'reference/content.md', '--expect-absent');
    assert.equal(result.status, 0, result.stderr);
    const json = parseJson(result);
    assert.equal(json.verdict, 'committed');
    assert.equal(readFileSync(path.join(bundle, 'reference/content.md'), 'utf8'), 'content\n');
    assert.equal(readFileSync(source, 'utf8'), 'content\n');
    assert.deepEqual(controlSnapshot(bundle), before);
    assert.match(readFileSync(path.join(bundle, '_logs/run.log'), 'utf8'), /artifact_persistence_persist/);
    assert.deepEqual(changedPaths(beforeTree, recursiveFileSnapshot(bundle)), ['_logs/run.log', 'reference/content.md']);
  });

  it('uses exit 1 for CAS blocker and exit 2 for invalid invocation', () => {
    const bundle = createBundle();
    const source = path.join(bundle, '_logs/replacement.md');
    const target = path.join(bundle, 'final/report.md');
    writeFileSync(source, 'replacement\n');
    writeFileSync(target, 'current\n');

    const blocked = runCli('persist', '--bundle', bundle, '--source', source, '--target', 'final/report.md', '--expect-sha256', '0'.repeat(64));
    assert.equal(blocked.status, 1);
    assert.equal(parseJson(blocked).reason_code, 'initial_target_mismatch');
    assert.equal(readFileSync(target, 'utf8'), 'current\n');

    const invalid = runCli('persist', '--bundle', bundle, '--source', source, '--target', 'final/report.md');
    assert.equal(invalid.status, 2);
    assert.equal(parseJson(invalid).error, 'invalid_invocation');
  });

  it('finalizes prepared crash state through production sweep', () => {
    const bundle = createBundle();
    const source = path.join(bundle, '_logs/prepared.md');
    writeFileSync(source, 'prepared\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: '_cache/source/page.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);

    const result = runCli('sweep', '--bundle', bundle);
    assert.equal(result.status, 0, result.stderr);
    const json = parseJson(result);
    assert.equal(json.entries[0].verdict, 'finalized');
    assert.equal(readFileSync(path.join(bundle, '_cache/source/page.md'), 'utf8'), 'prepared\n');
    assert.match(readFileSync(path.join(bundle, '_logs/run.log'), 'utf8'), /artifact_persistence_sweep/);
  });

  it('reports preparing state as one blocked action without control mutation', () => {
    const bundle = createBundle();
    const source = path.join(bundle, '_logs/preparing.md');
    writeFileSync(source, 'preparing\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'artifacts/wave0/preparing.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparingPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparingPublished'); } },
    }), ArtifactPersistenceCrashError);
    const before = controlSnapshot(bundle);

    const result = runCli('sweep', '--bundle', bundle);
    assert.equal(result.status, 1);
    const json = parseJson(result);
    assert.equal(json.entries.length, 1);
    assert.equal(json.entries[0].reason_code, 'operation_not_prepared');
    assert.match(json.entries[0].recommended_action, /retry persist/);
    assert.deepEqual(controlSnapshot(bundle), before);
  });

  it('cleans post-rename crash state and documents quiescence', () => {
    const bundle = createBundle();
    const source = path.join(bundle, '_logs/renamed.md');
    writeFileSync(source, 'renamed\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/renamed.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterTargetRename: () => { throw new ArtifactPersistenceCrashError('afterTargetRename'); } },
    }), ArtifactPersistenceCrashError);

    const sweep = runCli('sweep', '--bundle', bundle);
    assert.equal(sweep.status, 0);
    assert.equal(parseJson(sweep).entries[0].verdict, 'cleaned');
    const help = runCli('--help');
    assert.equal(help.status, 0);
    assert.match(help.stdout, /quiescent bundle/);
  });

  it('supports compare-and-swap replacement with the current digest', () => {
    const bundle = createBundle();
    const source = path.join(bundle, '_logs/cas.md');
    const target = path.join(bundle, 'reference/cas.md');
    writeFileSync(source, 'new\n');
    writeFileSync(target, 'old\n');
    const result = runCli('persist', '--bundle', bundle, '--source', source, '--target', 'reference/cas.md', '--expect-sha256', sha256File(target));
    assert.equal(result.status, 0);
    assert.equal(readFileSync(target, 'utf8'), 'new\n');
  });

  it('does not mutate an outside sentinel', () => {
    const bundle = createBundle();
    const outside = mkdtempSync(path.join(tmpdir(), 'dpt-artifact-outside-'));
    roots.push(outside);
    const sentinel = path.join(outside, 'sentinel.txt');
    writeFileSync(sentinel, 'unchanged\n');
    const result = runCli('sweep', '--bundle', bundle);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(sentinel, 'utf8'), 'unchanged\n');
    assert.equal(existsSync(path.join(bundle, '_diagnostics/artifact-persistence')), false);
  });
});
