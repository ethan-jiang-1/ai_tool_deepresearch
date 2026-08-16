// @impl ARP-001, ARP-002, ARP-003

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ARTIFACT_PERSISTENCE_ROOT,
  ArtifactPersistResultSchema,
  ArtifactPersistenceConfigError,
  ArtifactPersistenceCrashError,
  ArtifactSweepSummarySchema,
  persistBundleFile,
  publishFinalReport,
  sha256File,
  sweepPendingArtifactWrites,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  sourceYamlContent,
  writeWave0Scaffold,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

const roots = [];
const repoRoot = path.resolve(import.meta.dirname, '../../..');
const artifactCli = path.join(repoRoot, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs');

function createBundle(name = 'artifact-persistence') {
  const bundle = mkdtempSync(path.join(tmpdir(), `dpt-${name}-`));
  roots.push(bundle);
  for (const directory of ['reference', 'artifacts/wave0', 'final', '_cache/source', '_logs']) {
    mkdirSync(path.join(bundle, directory), { recursive: true });
  }
  writeFileSync(path.join(bundle, 'rb_status.json'), `${JSON.stringify({ bundle: path.basename(bundle) })}\n`);
  return bundle;
}

function stagingFile(bundle, name, content) {
  const filePath = path.join(bundle, '_logs', name);
  writeFileSync(filePath, content);
  return filePath;
}

function workspaces(bundle) {
  const root = path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
  return existsSync(root) ? readdirSync(root).map((entry) => path.join(root, entry)) : [];
}

function submittedFinalBundle() {
  const bundle = createBundle('primary-publication');
  writeWave0Scaffold(bundle, { syntheticWave0Trace: false });
  const sourcePath = 'artifacts/wave0/topic-a/source.yaml';
  const submitted = claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0',
    queue_item_id: 'primary-publication-source',
    topic_slug: 'topic-a',
    output_path: sourcePath,
    role: 'source_yaml',
    source_url: 'https://evidence.example.test/primary-publication/source',
    source_slug: 'primary-publication-source',
    output_content: sourceYamlContent({
      source_url: 'https://evidence.example.test/primary-publication/source',
      topic_slug: 'topic-a',
    }),
  });
  assert.equal(submitted.submit.ok, true, JSON.stringify(submitted.submit));
  return { bundle, sourcePath };
}

function finalReport(backing) {
  return [
    '# Final Report',
    '',
    '## Evidence Map',
    '',
    '| Finding ID | Declared Key Finding | Submitted Backing |',
    '| --- | --- | --- |',
    `| F-001 | A mechanically backed declaration. | ${backing} |`,
    '',
  ].join('\n');
}

function runPublishCli(bundle, source) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [artifactCli, 'publish-final-report', '--bundle', bundle, '--source', source], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('artifact persistence workspace', () => {
  it('commits a new target and retains the staging source', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'source.md', '# Evidence\n');
    const result = persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/source.md',
      expectedTarget: { kind: 'absent' },
    });

    assert.equal(result.verdict, 'committed');
    assert.equal(readFileSync(path.join(bundle, 'reference/source.md'), 'utf8'), '# Evidence\n');
    assert.equal(readFileSync(source, 'utf8'), '# Evidence\n');
    assert.deepEqual(workspaces(bundle), []);
    assert.deepEqual(ArtifactPersistResultSchema.parse(result), result);
  });

  it('keeps an inventory-selected legacy Final report immutable', () => {
    const bundle = createBundle();
    const targetPath = path.join(bundle, 'final/report.md');
    writeFileSync(targetPath, 'old\n');
    const source = stagingFile(bundle, 'replacement.md', 'new\n');
    const wrongDigest = '0'.repeat(64);
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'final/report.md',
      expectedTarget: { kind: 'sha256', value: wrongDigest },
    }), (error) => error instanceof ArtifactPersistenceConfigError && error.code === 'legacy_primary_immutable');
    assert.equal(readFileSync(targetPath, 'utf8'), 'old\n');
    assert.deepEqual(workspaces(bundle), []);

    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'final/report.md',
      expectedTarget: { kind: 'sha256', value: sha256File(targetPath) },
    }), (error) => error instanceof ArtifactPersistenceConfigError && error.code === 'legacy_primary_immutable');
    assert.equal(readFileSync(targetPath, 'utf8'), 'old\n');
  });

  it('uses no-clobber publication across concurrent production CLI processes', async () => {
    const { bundle, sourcePath } = submittedFinalBundle();
    const sourceA = stagingFile(bundle, 'primary-a.md', finalReport(`[submitted source](../${sourcePath})`));
    const sourceB = stagingFile(bundle, 'primary-b.md', finalReport(`[submitted source](../${sourcePath})`));
    const [first, second] = await Promise.all([runPublishCli(bundle, sourceA), runPublishCli(bundle, sourceB)]);
    const results = [first, second].map((result) => ({
      ...result,
      json: result.stdout.trim() ? JSON.parse(result.stdout) : null,
    }));

    assert.ok(existsSync(path.join(bundle, 'final', 'final.md')));
    const committed = results.filter((result) => result.status === 0);
    const committedTargets = committed.map((result) => result.json.target);
    assert.equal(new Set(committedTargets).size, committedTargets.length);
    assert.ok(results.every((result) => [0, 1, 2].includes(result.status)), JSON.stringify(results));
    for (const result of results.filter((result) => result.status !== 0)) {
      assert.ok(
        result.json?.reason_code === 'target_collision_retry'
        || result.json?.reason_code === 'primary_inventory_drift'
        || result.json?.reason_code === 'artifact_persistence_owner'
        || result.json?.error === 'operation_failed',
        JSON.stringify(result),
      );
    }
    const seriesFiles = readdirSync(path.join(bundle, 'final')).filter((name) => /^final(?:_.+)?\.md$/.test(name));
    assert.equal(seriesFiles.filter((name) => name === 'final.md').length, 1);
    assert.ok(seriesFiles.length <= 2, JSON.stringify(seriesFiles));
  });

  it('sweeps an exact prepared primary publication after target creation', () => {
    const { bundle, sourcePath } = submittedFinalBundle();
    const source = stagingFile(bundle, 'primary-after-target.md', finalReport(`[submitted source](../${sourcePath})`));
    assert.throws(() => publishFinalReport({
      bundlePath: bundle,
      sourcePath: source,
      hooks: { afterPrimaryTargetCommit: () => { throw new ArtifactPersistenceCrashError('afterPrimaryTargetCommit'); } },
    }), ArtifactPersistenceCrashError);
    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.passed, true, JSON.stringify(sweep));
    assert.equal(sweep.entries[0].verdict, 'cleaned');
    assert.equal(readFileSync(path.join(bundle, 'final', 'final.md'), 'utf8'), readFileSync(source, 'utf8'));
  });

  it('blocks late target drift and removes only its accepted workspace', () => {
    const bundle = createBundle();
    const targetPath = path.join(bundle, 'reference/late-drift.md');
    writeFileSync(targetPath, 'old\n');
    const source = stagingFile(bundle, 'late-drift.md', 'prepared\n');
    const result = persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/late-drift.md',
      expectedTarget: { kind: 'sha256', value: sha256File(targetPath) },
      hooks: { afterPreparedPublished: () => writeFileSync(targetPath, 'concurrent\n') },
    });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'late_target_mismatch');
    assert.equal(readFileSync(targetPath, 'utf8'), 'concurrent\n');
    assert.equal(readFileSync(source, 'utf8'), 'prepared\n');
    assert.deepEqual(workspaces(bundle), []);
  });

  it('blocks accepted preparing state with direct retry context', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'preparing.md', 'content\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'artifacts/wave0/preparing.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparingPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparingPublished'); } },
    }), ArtifactPersistenceCrashError);

    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
  assert.equal(sweep.passed, false);
  assert.equal(sweep.entries[0].reason_code, 'operation_not_prepared');
    assert.equal(sweep.entries[0].source_path, realpathSync(source));
    assert.equal(sweep.entries[0].target, 'artifacts/wave0/preparing.md');
    assert.equal(existsSync(path.join(bundle, 'artifacts/wave0/preparing.md')), false);
    assert.deepEqual(ArtifactSweepSummarySchema.parse(sweep), sweep);
  });

  it('does not overclaim a crash before canonical preparing publication', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'before-preparing.md', 'not accepted\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/before-preparing.md',
      expectedTarget: { kind: 'absent' },
      hooks: { beforePreparingPublished: () => { throw new ArtifactPersistenceCrashError('beforePreparingPublished'); } },
    }), ArtifactPersistenceCrashError);
    assert.equal(readFileSync(source, 'utf8'), 'not accepted\n');
    assert.deepEqual(workspaces(bundle), []);
    assert.equal(sweepPendingArtifactWrites({ bundlePath: bundle }).entries.length, 0);
  });

  it('blocks an accepted operation that crashed after payload fsync', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'payload-fsync.md', 'payload\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'artifacts/wave0/payload-fsync.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPayloadFsync: () => { throw new ArtifactPersistenceCrashError('afterPayloadFsync'); } },
    }), ArtifactPersistenceCrashError);
    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.entries[0].reason_code, 'operation_not_prepared');
    assert.equal(workspaces(bundle).length, 1);
  });

  it('finalizes a valid prepared payload after crash', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'prepared.md', 'prepared\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: '_cache/source/page.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);

    const first = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(first.passed, true);
    assert.equal(first.entries[0].verdict, 'finalized');
    assert.equal(readFileSync(path.join(bundle, '_cache/source/page.md'), 'utf8'), 'prepared\n');
    const second = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.deepEqual(second.entries, []);
  });

  it('cleans a stale workspace after target rename crash', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'renamed.md', 'renamed\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/renamed.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterTargetRename: () => { throw new ArtifactPersistenceCrashError('afterTargetRename'); } },
    }), ArtifactPersistenceCrashError);

    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.entries[0].verdict, 'cleaned');
    assert.equal(readFileSync(path.join(bundle, 'reference/renamed.md'), 'utf8'), 'renamed\n');
    assert.deepEqual(workspaces(bundle), []);
  });

  it('recovers a commit interrupted before workspace cleanup', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'cleanup-interrupted.md', 'committed\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/cleanup-interrupted.md',
      expectedTarget: { kind: 'absent' },
      hooks: { beforeWorkspaceCleanup: () => { throw new ArtifactPersistenceCrashError('beforeWorkspaceCleanup'); } },
    }), ArtifactPersistenceCrashError);
    assert.equal(readFileSync(path.join(bundle, 'reference/cleanup-interrupted.md'), 'utf8'), 'committed\n');
    assert.equal(sweepPendingArtifactWrites({ bundlePath: bundle }).entries[0].verdict, 'cleaned');
  });

  it('blocks target parent path drift before commit', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'path-drift.md', 'prepared\n');
    const parent = path.join(bundle, 'artifacts/wave0');
    const movedParent = path.join(bundle, 'artifacts/wave0-moved');
    const outside = mkdtempSync(path.join(tmpdir(), 'dpt-path-drift-outside-'));
    roots.push(outside);
    const result = persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'artifacts/wave0/path-drift.md',
      expectedTarget: { kind: 'absent' },
      hooks: {
        afterPreparedPublished: () => {
          renameSync(parent, movedParent);
          symlinkSync(outside, parent);
        },
      },
    });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'target_parent_unsafe');
    assert.equal(existsSync(path.join(outside, 'path-drift.md')), false);
    assert.equal(workspaces(bundle).length, 1);
  });

  it('blocks target conflict without changing either version', () => {
    const bundle = createBundle();
    const targetPath = path.join(bundle, 'reference/conflict.md');
    writeFileSync(targetPath, 'old\n');
    const expectedDigest = sha256File(targetPath);
    const source = stagingFile(bundle, 'conflict.md', 'prepared\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/conflict.md',
      expectedTarget: { kind: 'sha256', value: expectedDigest },
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);
    writeFileSync(targetPath, 'newer\n');

    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.entries[0].verdict, 'blocked');
    assert.equal(sweep.entries[0].reason_code, 'target_conflict');
    assert.equal(readFileSync(targetPath, 'utf8'), 'newer\n');
    assert.equal(workspaces(bundle).length, 1);
  });

  it('blocks payload mismatch and leaves workspace untouched', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'mismatch.md', 'expected\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/mismatch.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);
    const workspace = workspaces(bundle)[0];
    writeFileSync(path.join(workspace, 'payload'), 'tampered\n');

    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.entries[0].reason_code, 'payload_mismatch');
    assert.equal(existsSync(workspace), true);
    assert.equal(existsSync(path.join(bundle, 'reference/mismatch.md')), false);
  });

  it('blocks invalid and incomplete workspaces without deleting them', () => {
    const bundle = createBundle();
    const root = path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
    mkdirSync(path.join(root, 'not-an-operation'), { recursive: true });
    writeFileSync(path.join(root, 'not-an-operation', 'operation.json.next'), '{}\n');
    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.passed, false);
    assert.equal(sweep.entries[0].reason_code, 'operation_invalid');
    assert.equal(existsSync(path.join(root, 'not-an-operation')), true);
  });

  it('reports mixed finalized and blocked entries in one deterministic summary', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'mixed.md', 'mixed\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/mixed.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);
    const root = path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
    mkdirSync(path.join(root, 'incomplete'));
    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.passed, false);
    assert.equal(sweep.blocked_count, 1);
    assert.deepEqual(sweep.entries.map((entry) => entry.verdict).sort(), ['blocked', 'finalized']);
    assert.equal(readFileSync(path.join(bundle, 'reference/mixed.md'), 'utf8'), 'mixed\n');
  });

  it('rejects unsafe targets and symlink staging sources', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'safe.md', 'safe\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'rb_status.json',
      expectedTarget: { kind: 'absent' },
    }), ArtifactPersistenceConfigError);
    const link = path.join(bundle, '_logs', 'source-link.md');
    symlinkSync(source, link);
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: link,
      target: 'reference/link.md',
      expectedTarget: { kind: 'absent' },
    }), ArtifactPersistenceConfigError);
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/missing/parent.md',
      expectedTarget: { kind: 'absent' },
    }), ArtifactPersistenceConfigError);
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: '../reference/escape.md',
      expectedTarget: { kind: 'absent' },
    }), ArtifactPersistenceConfigError);
    const aliasTarget = path.join(bundle, 'reference/alias.md');
    renameSync(source, aliasTarget);
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: aliasTarget,
      target: 'reference/alias.md',
      expectedTarget: { kind: 'sha256', value: sha256File(aliasTarget) },
    }), ArtifactPersistenceConfigError);
  });

  it('rejects operation-id collision without changing staging or target', () => {
    const bundle = createBundle();
    const source = stagingFile(bundle, 'collision.md', 'collision\n');
    const operationId = '11111111-1111-4111-8111-111111111111';
    const root = path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
    mkdirSync(path.join(root, operationId), { recursive: true });
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'reference/collision.md',
      expectedTarget: { kind: 'absent' },
      operationId,
    }));
    assert.equal(readFileSync(source, 'utf8'), 'collision\n');
    assert.equal(existsSync(path.join(bundle, 'reference/collision.md')), false);
  });

  it('rejects invalid cross-field result combinations', () => {
    assert.equal(ArtifactPersistResultSchema.safeParse({
      schema_version: '1.0.0', operation: 'persist', operation_id: null, target: null,
      verdict: 'committed', reason_code: 'committed', reason: 'invalid', workspace: null,
    }).success, false);
    assert.equal(ArtifactSweepSummarySchema.safeParse({
      schema_version: '1.0.0', operation: 'sweep', quiescent_required: true,
      passed: true, blocked_count: 1, entries: [],
    }).success, false);
  });

  it('does not scan arbitrary temp files outside the persistence root', () => {
    const bundle = createBundle();
    writeFileSync(path.join(bundle, 'reference/legacy.tmp'), 'legacy\n');
    const sweep = sweepPendingArtifactWrites({ bundlePath: bundle });
    assert.equal(sweep.passed, true);
    assert.deepEqual(sweep.entries, []);
    assert.equal(readFileSync(path.join(bundle, 'reference/legacy.tmp'), 'utf8'), 'legacy\n');
  });
});
