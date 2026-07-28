// @impl RRM-007

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  collectEligibleRows,
  collectEligibleWave0CandidateProjection,
} from '../../DPT_FRAMEWORK/engine/work-unit-projection.mjs';
import { buildCanonicalTopicRegistryFact } from '../../DPT_FRAMEWORK/engine/helpers/topic-registry-fact.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from './work-unit-test-helpers.mjs';

const TOPIC_UID = 'tp_123e4567-e89b-42d3-a456-426614174010';
const bundles = [];
const DUPLICATE_SOURCE_YAML = [
  '- url: https://example.com/duplicate',
  '  title: Duplicate source one',
  '  retrieved_date: 2026-07-20',
  '  topic_tag: current-topic',
  '- url: https://example.com/duplicate',
  '  title: Duplicate source two',
  '  retrieved_date: 2026-07-20',
  '  topic_tag: current-topic',
  '',
].join('\n');

function writeProjectionPlan(dir, {
  slug = 'current-topic',
  previousLayouts = [{ id: '00', slug: 'old-topic' }],
} = {}) {
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: projection
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: ${TOPIC_UID}
    id: "01"
    slug: ${slug}
    title: Current Topic
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts:${previousLayouts.length > 0 ? `
${previousLayouts.map((layout) => `      - id: "${layout.id}"
        slug: ${layout.slug}`).join('\n')}` : ' []'}
---
# Plan
`);
}

function bundle({ rerunCount = 2, includeRound = true, slug, previousLayouts } = {}) {
  const dir = tempWorkUnitBundle('work-unit-projection-');
  bundles.push(dir);
  const round = includeRound ? `\n    rerun_count: ${rerunCount}` : ' {}';
  writeFileSync(path.join(dir, 'rb_profile.yaml'), `human_decision_checkpoints:\n  hitl2:${round}\n`);
  writeProjectionPlan(dir, { slug, previousLayouts });
  return dir;
}

function submit(dir, { slug = 'current-topic', queueItemId = 'queue-current' } = {}) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: slug },
      lineage: { topic_uid: TOPIC_UID, topic_slug: slug, phase: 'wave1' },
    },
  });
}

function submitWave0(dir, {
  slug = 'current-topic',
  queueItemId = 'queue-wave0',
  sourceContent = DUPLICATE_SOURCE_YAML,
  legacyAssignment = false,
} = {}) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave0',
    queueItemId,
    preserveQueue: true,
    legacyAssignment,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: slug },
      lineage: { topic_uid: TOPIC_UID, topic_slug: slug, phase: 'wave0' },
    },
    outputs: [{
      path: `artifacts/wave0/${slug}/source.yaml`,
      role: 'source_yaml',
      content: sourceContent,
    }],
  });
}

function collectWave0Candidates(dir, options = {}) {
  return collectEligibleWave0CandidateProjection(dir, {
    topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
    ...options,
  });
}

after(() => bundles.forEach(cleanupWorkUnitBundle));

describe('eligible work-unit projection', () => {
  it('treats no submitted declarations as a valid empty set', () => {
    const dir = bundle();
    assert.deepEqual(collectEligibleRows(dir, 'wave1'), {
      passed: true, rows: [], root_findings: [], warnings: [],
    });
  });

  it('normalizes only an absent HITL2 round to zero', () => {
    const absent = bundle({ includeRound: false });
    assert.equal(collectEligibleRows(absent, 'wave1').passed, true);
    writeFileSync(path.join(absent, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: "2"\n');
    const malformed = collectEligibleRows(absent, 'wave1');
    assert.equal(malformed.passed, false);
    assert.match(malformed.root_findings[0].missing_fact, /non-negative integer/);
  });

  it('projects current rows through UID and previous-layout binding', () => {
    const dir = bundle({ slug: 'old-topic', previousLayouts: [] });
    const submitted = submit(dir, { slug: 'old-topic' });
    writeProjectionPlan(dir);
    const result = collectEligibleRows(dir, 'wave1', 'current-topic');
    assert.equal(result.passed, true, JSON.stringify(result.root_findings));
    assert.equal(result.rows[0].work_id, submitted.record.work_id);
    assert.equal(result.rows[0].topic_uid, TOPIC_UID);
    assert.equal(result.rows[0].topic_slug, 'current-topic');
    assert.deepEqual(result.rows[0].accepted_slugs, ['current-topic', 'old-topic']);
  });

  it('fails closed when stored snapshot hashes drift together', () => {
    const dir = bundle();
    const submitted = submit(dir);
    const indexPath = path.join(dir, '_work_units/_index.json');
    const manifestPath = path.join(dir, submitted.record.paths.manifest_ref);
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    index.work_units[submitted.record.work_id].queue_item_snapshot_hash = 'same-drift';
    manifest.queue_item_snapshot_hash = 'same-drift';
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = collectEligibleRows(dir, 'wave1');
    assert.equal(result.passed, false);
    assert.match(result.root_findings[0].missing_fact, /snapshot hash mismatch/);
  });

  it('does not import unrelated lease, receipt, cache, or orphan health', () => {
    const dir = bundle();
    const submitted = submit(dir);
    writeFileSync(path.join(dir, submitted.record.paths.runtime_receipt_ref), ': unrelated broken receipt\n');
    mkdirSync(path.join(dir, '_work_units/wave1/wu-w1-b000-deep-i9999'), { recursive: true });
    const result = collectEligibleRows(dir, 'wave1');
    assert.equal(result.passed, true, JSON.stringify(result.root_findings));
    assert.equal(result.rows.length, 1);
  });

  it('derives ordered current result-declared candidate coordinates and preserves duplicate URLs by position', () => {
    const dir = bundle({ slug: 'old-topic', previousLayouts: [] });
    const submitted = submitWave0(dir, { slug: 'old-topic' });
    writeProjectionPlan(dir);

    const candidates = collectWave0Candidates(dir, { topic: 'current-topic' });
    assert.equal(candidates.passed, true, JSON.stringify(candidates.root_findings));
    assert.deepEqual(candidates.candidates.map((candidate) => ({
      work_id: candidate.work_id,
      topic_uid: candidate.topic_uid,
      topic_slug: candidate.topic_slug,
      source_ordinal: candidate.source_ordinal,
      entry_id: candidate.entry_id,
    })), [
      {
        work_id: submitted.record.work_id,
        topic_uid: TOPIC_UID,
        topic_slug: 'current-topic',
        source_ordinal: 1,
        entry_id: `${submitted.record.work_id}/1`,
      },
      {
        work_id: submitted.record.work_id,
        topic_uid: TOPIC_UID,
        topic_slug: 'current-topic',
        source_ordinal: 2,
        entry_id: `${submitted.record.work_id}/2`,
      },
    ]);

    writeFileSync(path.join(dir, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 3\n');
    assert.deepEqual(collectWave0Candidates(dir), {
      passed: true, candidates: [], root_findings: [], warnings: [],
    });
  });

  it('returns an empty valid candidate set for a declared empty source array', () => {
    const dir = bundle();
    submitWave0(dir, { sourceContent: '[]\n' });
    assert.deepEqual(collectWave0Candidates(dir), {
      passed: true, candidates: [], root_findings: [], warnings: [],
    });
  });

  it('short-circuits candidates on result-hash, tuple, and direct-output parent roots', () => {
    const hashDir = bundle();
    const hashSubmitted = submitWave0(hashDir);
    const resultPath = path.join(hashDir, hashSubmitted.record.paths.result_ref);
    const result = JSON.parse(readFileSync(resultPath, 'utf8'));
    result.summary = 'changed after submit';
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    const hashFailure = collectWave0Candidates(hashDir);
    assert.equal(hashFailure.passed, false);
    assert.deepEqual(hashFailure.candidates, []);
    assert.equal(hashFailure.root_findings.length, 1);
    assert.match(hashFailure.root_findings[0].missing_fact, /result hash mismatch/);

    const tupleDir = bundle();
    submitWave0(tupleDir, { legacyAssignment: true });
    const tupleFailure = collectWave0Candidates(tupleDir);
    assert.equal(tupleFailure.passed, false);
    assert.deepEqual(tupleFailure.candidates, []);
    assert.equal(tupleFailure.root_findings.length, 1);
    assert.match(tupleFailure.root_findings[0].missing_fact, /exactly one source_yaml direct-output tuple/);

    const directDir = bundle();
    submitWave0(directDir);
    writeFileSync(path.join(directDir, 'artifacts/wave0/current-topic/source.yaml'), 'not: an array\n');
    const directFailure = collectWave0Candidates(directDir);
    assert.equal(directFailure.passed, false);
    assert.deepEqual(directFailure.candidates, []);
    assert.equal(directFailure.root_findings.length, 1);
    assert.equal(directFailure.root_findings[0].checkpoint_context.direct_root.code, 'source_metadata_top_level_array_missing');
  });

  it('keeps the reader/projection import direction acyclic', () => {
    const reader = readFileSync(path.resolve('DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs'), 'utf8');
    const projection = readFileSync(path.resolve('DPT_FRAMEWORK/engine/work-unit-projection.mjs'), 'utf8');
    assert.doesNotMatch(reader, /work-unit-(?:projection|validation)\.mjs/);
    assert.match(projection, /gate-helpers-readers\.mjs/);
    assert.match(projection, /work-unit-validation\.mjs/);
  });
});
