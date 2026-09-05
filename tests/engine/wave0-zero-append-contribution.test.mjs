// Zero-append Wave0 source-contribution admission unit tests
// (change: admit-zero-append-wave0-contributions)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { claimAndSubmitWorkUnit } from './work-unit-test-helpers.mjs';
import { collectSubmittedWave0ContributionProjection } from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs';
import { buildCanonicalTopicRegistryFact } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';

const REPO_ROOT = process.cwd();
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_w0z_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const dir = track(r.stdout.trim());
  const topics = [
    { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['A?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] },
    { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', id: '02', slug: 'topic-b', title: 'Topic B', must_answer: ['B?'], scope_role: 'supporting', depends_on_topic_uids: [], previous_layouts: [] },
  ];
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": ${topics.length},\n  "topic_registry_version": "2",\n  "topic_registry": [\n${topics.map((topic) => `    ${JSON.stringify(topic)}`).join(',\n')}\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));
  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = 'phases/phase-wave0.md';
  writeFileSync(statusPath, JSON.stringify(status));
  return dir;
}

function sourceMetadataArray(count, { variant = '' } = {}) {
  return Array.from({ length: count }, (_, index) => [
    `- url: "https://fixture.news-research.com/article-${variant}${index + 1}"`,
    `  title: "Wave0 Source ${variant}${index + 1}"`,
    '  retrieved_date: "2026-06-15"',
    '  topic_tag: "topic-a"',
  ].join('\n')).join('\n') + '\n';
}

function submitTopicAIntake(dir, { queueItemId, sourceContent }) {
  const submission = claimAndSubmitWorkUnit(dir, {
    phase: 'wave0',
    queueItemId,
    preserveQueue: true,
    queueItemOverrides: {
      payload: {
        wave: 0,
        topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
        topic_slug: 'topic-a',
      },
      required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
      writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    },
    outputs: [{
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      content: sourceContent,
    }],
    cacheTrails: [{
      path: `_cache/wave0/primary/topic-a/${queueItemId}`,
      url: 'https://fixture.news-research.com/research/ai-safety-intake',
    }],
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  return submission;
}

function collectProjection(dir) {
  return collectSubmittedWave0ContributionProjection(dir, {
    topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
  });
}

describe('zero-append Wave0 source contribution admission', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('2.1 admits an equal-length identical-digest contribution as a no-op interval', () => {
    const dir = createBundle(unique('noop'));
    const base = submitTopicAIntake(dir, { queueItemId: 'topic-a-base', sourceContent: sourceMetadataArray(10) });
    const zero = submitTopicAIntake(dir, { queueItemId: 'topic-a-zero', sourceContent: sourceMetadataArray(10) });

    const projection = collectProjection(dir);
    assert.equal(projection.passed, true, JSON.stringify(projection.root_findings));
    const byWork = (workId) => projection.candidates
      .filter((candidate) => candidate.work_id === workId)
      .map((candidate) => candidate.source_ordinal);
    assert.deepEqual(byWork(base.record.work_id), Array.from({ length: 10 }, (_, index) => index + 1));
    assert.deepEqual(byWork(zero.record.work_id), [], 'zero-append row owns no ordinal identity');
  });

  it('2.2 keeps failing equal length with a differing digest as non-monotonic missing contract', () => {
    const dir = createBundle(unique('diffdigest'));
    const baseContent = sourceMetadataArray(10);
    submitTopicAIntake(dir, { queueItemId: 'topic-a-base', sourceContent: baseContent });
    submitTopicAIntake(dir, { queueItemId: 'topic-a-drift', sourceContent: sourceMetadataArray(10, { variant: 'x-' }) });
    // Retain the base prefix on disk so the only boundary fact is the second
    // contribution's declared prefix differing from the retained one.
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), baseContent);

    const projection = collectProjection(dir);
    assert.equal(projection.passed, false);
    const root = projection.root_findings.find((finding) => (
      String(finding.id || '').includes('submitted_source_contribution_non_monotonic')
    ));
    assert.ok(root, JSON.stringify(projection.root_findings).slice(0, 400));
    assert.equal(root.repair_kind, 'missing_contract');
  });

  it('2.3 keeps exposing only the appended interval for a strictly longer contribution', () => {
    const dir = createBundle(unique('append'));
    const base = submitTopicAIntake(dir, { queueItemId: 'topic-a-base', sourceContent: sourceMetadataArray(10) });
    const longer = submitTopicAIntake(dir, { queueItemId: 'topic-a-longer', sourceContent: sourceMetadataArray(11) });

    const projection = collectProjection(dir);
    assert.equal(projection.passed, true, JSON.stringify(projection.root_findings));
    const byWork = (workId) => projection.candidates
      .filter((candidate) => candidate.work_id === workId)
      .map((candidate) => candidate.source_ordinal);
    assert.deepEqual(byWork(base.record.work_id), Array.from({ length: 10 }, (_, index) => index + 1));
    assert.deepEqual(byWork(longer.record.work_id), [11]);
  });

  it('2.4 keeps ordinal math anchored to the retained prefix across a zero-append row', () => {
    const dir = createBundle(unique('noopappend'));
    const base = submitTopicAIntake(dir, { queueItemId: 'topic-a-base', sourceContent: sourceMetadataArray(10) });
    submitTopicAIntake(dir, { queueItemId: 'topic-a-zero', sourceContent: sourceMetadataArray(10) });
    const longer = submitTopicAIntake(dir, { queueItemId: 'topic-a-longer', sourceContent: sourceMetadataArray(11) });

    const projection = collectProjection(dir);
    assert.equal(projection.passed, true, JSON.stringify(projection.root_findings));
    const byWork = (workId) => projection.candidates
      .filter((candidate) => candidate.work_id === workId)
      .map((candidate) => candidate.source_ordinal);
    assert.deepEqual(byWork(base.record.work_id), Array.from({ length: 10 }, (_, index) => index + 1));
    assert.deepEqual(byWork(longer.record.work_id), [11]);
  });

  it('2.5 zero-append admission does not mask a drifted retained prefix', () => {
    const dir = createBundle(unique('driftguard'));
    submitTopicAIntake(dir, { queueItemId: 'topic-a-base', sourceContent: sourceMetadataArray(10) });
    submitTopicAIntake(dir, { queueItemId: 'topic-a-zero', sourceContent: sourceMetadataArray(10) });

    const drifted = sourceMetadataArray(10).replace('Wave0 Source 5', 'Wave0 Source 5 EDITED');
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), drifted);

    const projection = collectProjection(dir);
    assert.equal(projection.passed, false);
    const driftRoot = projection.root_findings.find((finding) => (
      String(finding.id || '').includes('submitted_source_contribution_prefix_drift')
    ));
    assert.ok(driftRoot, JSON.stringify(projection.root_findings).slice(0, 400));
    assert.equal(driftRoot.repair_kind, 'agent_action');
  });
});
