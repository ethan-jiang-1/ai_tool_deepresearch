// @impl ARP-001, ARP-002, ARP-003, ARP-004

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
  ARTIFACT_PERSISTENCE_ROOT,
  ArtifactPersistenceOperationSchema,
  ArtifactPersistenceCrashError,
  FinalReportPublishResultSchema,
  persistBundleFile,
  publishFinalReport,
  sha256File,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  sourceYamlContent,
  writeWave0Scaffold,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const cliPath = path.join(repoRoot, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs');
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

function createSubmittedFinalBundle() {
  const bundle = mkdtempSync(path.join(tmpdir(), 'dpt-final-report-cli-'));
  roots.push(bundle);
  mkdirSync(path.join(bundle, 'final'), { recursive: true });
  mkdirSync(path.join(bundle, '_logs'), { recursive: true });
  writeWave0Scaffold(bundle, { syntheticWave0Trace: false });
  const sourcePath = 'artifacts/wave0/topic-a/source.yaml';
  const submitted = claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0',
    queue_item_id: 'final-report-cli-wave0-source',
    topic_slug: 'topic-a',
    output_path: sourcePath,
    role: 'source_yaml',
    source_url: 'https://evidence.example.test/final-cli/source',
    source_slug: 'final-cli-source',
    output_content: sourceYamlContent({
      source_url: 'https://evidence.example.test/final-cli/source',
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
    `| F-001 | A declared result for structural provenance admission. | ${backing} |`,
    '',
  ].join('\n');
}

function persistenceWorkspaces(bundle) {
  const root = path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
  return existsSync(root) ? readdirSync(root).sort() : [];
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
    const target = path.join(bundle, 'reference/report.md');
    writeFileSync(source, 'replacement\n');
    writeFileSync(target, 'current\n');

    const blocked = runCli('persist', '--bundle', bundle, '--source', source, '--target', 'reference/report.md', '--expect-sha256', '0'.repeat(64));
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

  it('commits an admitted Final Markdown report through the existing exact-byte durability path', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'final-report.md');
    const bytes = finalReport(`[submitted source](../${sourcePath})`);
    writeFileSync(source, bytes);

    const result = runCli('persist-final-report', '--bundle', bundle, '--source', source, '--target', 'final/report.MD', '--expect-absent');
    assert.equal(result.status, 0, result.stderr);
    const json = parseJson(result);
    assert.equal(json.operation, 'persist-final-report');
    assert.equal(json.check.passed, true);
    assert.equal(json.verdict, 'committed');
    assert.equal(readFileSync(path.join(bundle, 'final', 'report.MD'), 'utf8'), bytes);
    assert.deepEqual(persistenceWorkspaces(bundle), []);
  });

  it('publishes the bundle-wide base and globally ordered labelled revision', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const baseSource = path.join(bundle, '_logs', 'primary-base.md');
    const revisionSource = path.join(bundle, '_logs', 'primary-revision.md');
    const secondRevisionSource = path.join(bundle, '_logs', 'primary-revision-2.md');
    const baseBytes = finalReport(`[submitted source](../${sourcePath})`);
    const revisionBytes = finalReport(`[submitted source](../${sourcePath})`);
    writeFileSync(baseSource, baseBytes);
    writeFileSync(revisionSource, revisionBytes);
    writeFileSync(secondRevisionSource, revisionBytes);

    const base = publishFinalReport({ bundlePath: bundle, sourcePath: baseSource, feature: 'ignored_for_base' });
    assert.equal(base.verdict, 'committed');
    assert.equal(base.target, 'final/final.md');
    assert.equal(base.version, 0);
    assert.equal(base.feature, null);
    assert.equal(readFileSync(path.join(bundle, base.target), 'utf8'), baseBytes);

    const revision = publishFinalReport({ bundlePath: bundle, sourcePath: revisionSource, feature: 'technical_deep_dive' });
    assert.equal(revision.verdict, 'committed');
    assert.equal(revision.target, 'final/final_technical_deep_dive_v1.md');
    assert.equal(revision.version, 1);
    assert.equal(revision.previous_target, 'final/final.md');
    assert.equal(readFileSync(path.join(bundle, revision.target), 'utf8'), revisionBytes);
    assert.equal(readFileSync(path.join(bundle, 'final', 'final.md'), 'utf8'), baseBytes);

    const secondRevision = publishFinalReport({ bundlePath: bundle, sourcePath: secondRevisionSource });
    assert.equal(secondRevision.target, 'final/final_v2.md');
    assert.equal(secondRevision.version, 2);
  });

  it('enforces the human-controlled retire confirmation and zero-mutation blocking', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'retire-cli.md');
    writeFileSync(source, finalReport(`[submitted source](../${sourcePath})`));
    const published = runCli('publish-final-report', '--bundle', bundle, '--source', source);
    assert.equal(published.status, 0, published.stderr);
    const second = runCli('publish-final-report', '--bundle', bundle, '--source', source);
    assert.equal(second.status, 0, second.stderr);
    const primaryTarget = parseJson(second).target;
    assert.match(primaryTarget, /^final\/final_v1\.md$/, parseJson(second).reason || '');
    const version = 1;

    const missing = runCli('retire-final-version', '--bundle', bundle, '--version', String(version));
    assert.equal(missing.status, 2);
    assert.equal(parseJson(missing).error, 'invalid_invocation');
    const empty = runCli('retire-final-version', '--bundle', bundle, '--version', String(version), '--user-confirmation', '   ');
    assert.equal(empty.status, 2);
    assert.equal(parseJson(empty).error, 'invalid_invocation');

    // Blocked on an attic collision: final/ stays byte-identical (the run log
    // is an audit surface, not a retire mutation). The bundle carries a
    // version-bound auxiliary directory, and the attic holds a stale entry
    // under the same auxiliary name — the aux-collision pre-check blocks
    // before the primary revision is touched.
    mkdirSync(path.join(bundle, 'final', `final_v${version}`), { recursive: true });
    writeFileSync(path.join(bundle, 'final', `final_v${version}`, '07-evidence-details.md'), 'details\n');
    mkdirSync(path.join(bundle, 'final', 'attic', `final_v${version}`), { recursive: true });
    writeFileSync(path.join(bundle, 'final', 'attic', `final_v${version}`, 'stale.md'), 'stale\n');
    const before = finalTreeSnapshot(bundle);
    const blocked = runCli('retire-final-version', '--bundle', bundle, '--version', String(version), '--user-confirmation', 'retire this version');
    assert.equal(blocked.status, 1, blocked.stderr);
    assert.equal(parseJson(blocked).reason_code, 'retire_aux_collision');
    assert.deepEqual(finalTreeSnapshot(bundle), before, 'blocked retire must not touch final/');

    // Confirmed retire commits through the production CLI.
    rmSync(path.join(bundle, 'final', 'attic', `final_v${version}`), { recursive: true, force: true });
    const ok = runCli('retire-final-version', '--bundle', bundle, '--version', String(version), '--user-confirmation', 'retire this version', '--reason', 'spuriously created');
    assert.equal(ok.status, 0, ok.stderr);
    const okJson = parseJson(ok);
    assert.equal(okJson.verdict, 'committed');
    assert.equal(okJson.reason_code, 'retired');
    assert.equal(existsSync(primaryTarget), false);
    assert.equal(existsSync(path.join(bundle, 'final', 'attic', `final_v${version}.md`)), true);
    assert.equal(existsSync(path.join(bundle, 'final', 'attic', `final_v${version}.retired.json`)), true);
  });

  function finalTreeSnapshot(bundle) {
    const entries = {};
    const root = path.join(bundle, 'final');
    const visit = (absolute, relative) => {
      for (const entry of readdirSync(absolute, { withFileTypes: true })) {
        const childAbsolute = path.join(absolute, entry.name);
        const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) visit(childAbsolute, childRelative);
        else entries[childRelative] = readFileSync(childAbsolute).toString('base64');
      }
    };
    visit(root, 'final');
    return entries;
  }

  it('rejects malformed publication bindings and blocks invalid inventory/backing before workspace creation', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'binding-source.md');
    writeFileSync(source, finalReport(`[submitted source](../${sourcePath})`));
    assert.throws(() => publishFinalReport({
      bundlePath: bundle,
      sourcePath: source,
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);
    const workspace = path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/'), readdirSync(path.join(bundle, ...ARTIFACT_PERSISTENCE_ROOT.split('/')))[0]);
    const operation = JSON.parse(readFileSync(path.join(workspace, 'operation.json'), 'utf8'));
    assert.equal(ArtifactPersistenceOperationSchema.safeParse(operation).success, true);
    assert.equal(ArtifactPersistenceOperationSchema.safeParse({ ...operation, target: 'final/final_v9.md' }).success, false);
    assert.equal(ArtifactPersistenceOperationSchema.safeParse({ ...operation, publication: { ...operation.publication, feature: 'Unsafe' } }).success, false);
    assert.equal(ArtifactPersistenceOperationSchema.safeParse({ ...operation, workspace_kind: 'other' }).success, false);
    assert.equal(FinalReportPublishResultSchema.safeParse({
      schema_version: operation.schema_version,
      operation: 'publish-final-report',
      check: operation.publication.backing.check,
      inspect: [], advice: [], operation_id: null, target: null,
      base_classification: 'empty', version: null, feature: null, previous_target: null, inventory_sha256: null,
      verdict: 'committed', reason_code: 'committed', reason: 'bad', workspace: null,
    }).success, false);
    rmSync(workspace, { recursive: true });

    writeFileSync(path.join(bundle, 'final', 'first.md'), '# one\n');
    writeFileSync(path.join(bundle, 'final', 'second.md'), '# two\n');
    const ambiguous = publishFinalReport({ bundlePath: bundle, sourcePath: source });
    assert.equal(ambiguous.verdict, 'blocked');
    assert.equal(ambiguous.reason_code, 'primary_inventory_ambiguous_legacy_base');
    assert.deepEqual(persistenceWorkspaces(bundle), []);

    rmSync(path.join(bundle, 'final', 'first.md'));
    rmSync(path.join(bundle, 'final', 'second.md'));
    writeFileSync(source, '# Missing Evidence Map\n');
    const backing = publishFinalReport({ bundlePath: bundle, sourcePath: source });
    assert.equal(backing.verdict, 'blocked');
    assert.equal(backing.check.passed, false);
    assert.equal(backing.target, 'final/final.md');
    assert.deepEqual(persistenceWorkspaces(bundle), []);
  });

  it('appends after one legacy version zero without rewriting its bytes', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const legacyPath = path.join(bundle, 'final', 'historical.md');
    const source = path.join(bundle, '_logs', 'legacy-append.md');
    writeFileSync(legacyPath, '# Historical final\n');
    writeFileSync(source, finalReport(`[submitted source](../${sourcePath})`));
    const result = publishFinalReport({ bundlePath: bundle, sourcePath: source });
    assert.equal(result.verdict, 'committed');
    assert.equal(result.base_classification, 'legacy');
    assert.equal(result.target, 'final/final_v1.md');
    assert.equal(readFileSync(legacyPath, 'utf8'), '# Historical final\n');
  });

  it('does not accept caller-selected publication targets, versions, or overwrite controls', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'strict-publish.md');
    writeFileSync(source, finalReport(`[submitted source](../${sourcePath})`));
    for (const extra of [
      { target: 'final/final_v9.md' },
      { version: 9 },
      { expectedTarget: { kind: 'absent' } },
      { overwrite: true },
    ]) {
      assert.throws(() => publishFinalReport({ bundlePath: bundle, sourcePath: source, ...extra }), /unrecognized/i);
    }
    assert.equal(existsSync(path.join(bundle, 'final', 'final.md')), false);
  });

  it('sweeps a prepared primary publication exactly and never overwrites a collision', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'primary-crash.md');
    const bytes = finalReport(`[submitted source](../${sourcePath})`);
    writeFileSync(source, bytes);
    assert.throws(() => publishFinalReport({
      bundlePath: bundle,
      sourcePath: source,
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);

    const swept = runCli('sweep', '--bundle', bundle);
    assert.equal(swept.status, 0, swept.stderr);
    assert.equal(parseJson(swept).entries[0].verdict, 'finalized');
    assert.equal(readFileSync(path.join(bundle, 'final', 'final.md'), 'utf8'), bytes);

    const collisionSource = path.join(bundle, '_logs', 'primary-collision.md');
    writeFileSync(collisionSource, bytes);
    const collision = publishFinalReport({
      bundlePath: bundle,
      sourcePath: collisionSource,
      hooks: {
        beforePrimaryTargetCommit: () => writeFileSync(path.join(bundle, 'final', 'final_v1.md'), 'competing bytes\n'),
      },
    });
    assert.equal(collision.verdict, 'blocked');
    assert.equal(collision.reason_code, 'target_collision_retry');
    assert.equal(readFileSync(path.join(bundle, 'final', 'final_v1.md'), 'utf8'), 'competing bytes\n');
    assert.equal(readFileSync(path.join(bundle, 'final', 'final.md'), 'utf8'), bytes);
  });

  it('exposes the primary publisher through the production CLI with strict argument exclusion', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'cli-primary.md');
    writeFileSync(source, finalReport(`[submitted source](../${sourcePath})`));

    const committed = runCli('publish-final-report', '--bundle', bundle, '--source', source);
    assert.equal(committed.status, 0, committed.stderr);
    assert.equal(parseJson(committed).target, 'final/final.md');
    assert.match(readFileSync(path.join(bundle, '_logs', 'run.log'), 'utf8'), /artifact_persistence_publish_final_report/);

    const labelled = runCli('publish-final-report', '--bundle', bundle, '--source', source, '--feature', 'technical_deep_dive');
    assert.equal(labelled.status, 0, labelled.stderr);
    assert.equal(parseJson(labelled).target, 'final/final_technical_deep_dive_v1.md');
    const v2 = runCli('publish-final-report', '--bundle', bundle, '--source', source);
    assert.equal(v2.status, 0, v2.stderr);
    assert.equal(parseJson(v2).target, 'final/final_v2.md');

    const targetRejected = runCli('publish-final-report', '--bundle', bundle, '--source', source, '--target', 'final/final_v1.md');
    assert.equal(targetRejected.status, 2);
    assert.equal(parseJson(targetRejected).error, 'invalid_invocation');
    const featureRejected = runCli('publish-final-report', '--bundle', bundle, '--source', source, '--feature', 'unsafe-label');
    assert.equal(featureRejected.status, 2);
    assert.equal(parseJson(featureRejected).error, 'invalid_configuration');

    for (const operation of ['persist', 'persist-final-report']) {
      const reserved = runCli(operation, '--bundle', bundle, '--source', source, '--target', 'final/final_v1.md', '--expect-absent');
      assert.equal(reserved.status, 1, reserved.stderr);
      assert.equal(parseJson(reserved).reason_code, 'primary_target_requires_publication');
    }
  });

  it('rejects malformed, unsafe, missing, and unsubmitted Final backing before workspace creation', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const unsubmittedPath = 'artifacts/wave1/topic-a/unsubmitted.md';
    mkdirSync(path.join(bundle, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    writeFileSync(path.join(bundle, unsubmittedPath), 'disk-only artifact\n');
    const cases = [
      ['absent', '# Final Report\n', 'evidence_map_missing'],
      ['malformed', finalReport('plain text only'), 'evidence_map_backing_link_missing'],
      ['unsafe', finalReport('[outside](/tmp/outside.md)'), 'unsafe_backing_href'],
      ['missing', finalReport('[missing](../artifacts/wave0/topic-a/missing.yaml)'), 'backing_file_missing'],
      ['unsubmitted', finalReport(`[unsubmitted](../${unsubmittedPath})`), 'submitted_direct_backing_missing'],
    ];

    for (const [name, content, code] of cases) {
      const source = path.join(bundle, '_logs', `${name}.md`);
      const target = `final/${name}.md`;
      writeFileSync(source, content);
      const result = runCli('persist-final-report', '--bundle', bundle, '--source', source, '--target', target, '--expect-absent');
      assert.equal(result.status, 1, `${name}: ${result.stderr}`);
      const json = parseJson(result);
      assert.equal(json.check.passed, false, `${name}: ${JSON.stringify(json)}`);
      assert.equal(json.inspect[0].code, code);
      assert.equal(json.operation_id, null);
      assert.equal(json.workspace, null);
      assert.equal(existsSync(path.join(bundle, target)), false);
      assert.deepEqual(persistenceWorkspaces(bundle), []);
    }

    assert.equal(sourcePath, 'artifacts/wave0/topic-a/source.yaml');
  });

  it('keeps generic Final Markdown persist blocked and preserves invalid target configuration precedence', () => {
    const { bundle, sourcePath } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'admitted-source.md');
    writeFileSync(source, finalReport(`[submitted source](../${sourcePath})`));

    const redirected = runCli('persist', '--bundle', bundle, '--source', source, '--target', 'final/report.md', '--expect-absent');
    assert.equal(redirected.status, 1, redirected.stderr);
    const redirectedJson = parseJson(redirected);
    assert.equal(redirectedJson.operation, 'persist');
    assert.equal(redirectedJson.reason_code, 'final_markdown_requires_admission');
    assert.match(redirectedJson.reason, /persist-final-report/);
    assert.equal(Object.hasOwn(redirectedJson, 'check'), false);
    assert.equal(existsSync(path.join(bundle, 'final', 'report.md')), false);
    assert.deepEqual(persistenceWorkspaces(bundle), []);

    for (const operation of ['persist', 'persist-final-report']) {
      const invalid = runCli(operation, '--bundle', bundle, '--source', source, '--target', 'final/../outside.md', '--expect-absent');
      assert.equal(invalid.status, 2, `${operation}: ${invalid.stderr}`);
      assert.equal(parseJson(invalid).error, 'invalid_configuration');
    }
    const nonMarkdown = runCli('persist-final-report', '--bundle', bundle, '--source', source, '--target', 'final/report.txt', '--expect-absent');
    assert.equal(nonMarkdown.status, 2, nonMarkdown.stderr);
    assert.equal(parseJson(nonMarkdown).error, 'invalid_configuration');
    assert.equal(existsSync(path.join(bundle, 'outside.md')), false);
    assert.deepEqual(persistenceWorkspaces(bundle), []);
  });

  it('reruns Final-backing admission before sweep finalizes an old prepared workspace', () => {
    const { bundle } = createSubmittedFinalBundle();
    const source = path.join(bundle, '_logs', 'prepared-invalid-final.md');
    writeFileSync(source, '# Final report without an Evidence Map\n');
    assert.throws(() => persistBundleFile({
      bundlePath: bundle,
      sourcePath: source,
      target: 'final/prepared-invalid.md',
      expectedTarget: { kind: 'absent' },
      hooks: { afterPreparedPublished: () => { throw new ArtifactPersistenceCrashError('afterPreparedPublished'); } },
    }), ArtifactPersistenceCrashError);

    const result = runCli('sweep', '--bundle', bundle);
    assert.equal(result.status, 1, result.stderr);
    const json = parseJson(result);
    assert.equal(json.entries[0].reason_code, 'final_backing_evidence_map_missing');
    assert.match(json.entries[0].recommended_action, /persist-final-report/);
    assert.equal(existsSync(path.join(bundle, 'final', 'prepared-invalid.md')), false);
    assert.equal(persistenceWorkspaces(bundle).length, 1);
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
