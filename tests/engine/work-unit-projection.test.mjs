// @impl RRM-007, REF-009

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  collectEligibleRows,
  collectSubmittedWave0ContributionProjection,
  readSubmittedWave0Backing,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs';
import { buildCanonicalTopicRegistryFact } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
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

function sourceArray(count, slug = 'current-topic') {
  return Array.from({ length: count }, (_, index) => [
    `- url: https://example.com/source-${index + 1}`,
    `  title: Source ${index + 1}`,
    '  retrieved_date: 2026-07-20',
    `  topic_tag: ${slug}`,
  ].join('\n')).join('\n') + '\n';
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashValue(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function removeRecordedSourceContribution(dir, workId) {
  const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
  const rows = readFileSync(ledgerPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const row = rows.find((candidate) => candidate.work_id === workId);
  assert.ok(row, `missing submitted ledger row for ${workId}`);
  delete row.source_contribution;
  const { ledger_record_hash: _existing, ...ledgerBase } = row;
  row.ledger_record_hash = hashValue(ledgerBase);
  writeFileSync(ledgerPath, `${rows.map((candidate) => JSON.stringify(candidate)).join('\n')}\n`);

  const indexPath = path.join(dir, '_work_units/_index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const record = index.work_units[workId];
  if (record.submission_contract_version === 'work-unit.submission.v1') {
    record.accepted_ledger_record_hash = row.ledger_record_hash;
  } else {
    record.ledger_record_hash = row.ledger_record_hash;
  }
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

function assertContributionRoot(result, ruleId) {
  assert.equal(result.passed, false);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.root_findings.length, 1);
  assert.equal(result.root_findings[0].rule_id, ruleId);
}

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
  cacheTrails = null,
} = {}) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave0',
    queueItemId,
    preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: slug },
      lineage: { topic_uid: TOPIC_UID, topic_slug: slug, phase: 'wave0' },
    },
    outputs: [{
      path: `artifacts/wave0/${slug}/source.yaml`,
      role: 'source_yaml',
      content: sourceContent,
    }],
    cacheTrails,
  });
}

function retireAssignmentProfile(dir, record) {
  const indexPath = path.join(dir, '_work_units', '_index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const current = index.work_units[record.work_id];
  current.assignment_contract_version = 'work-unit.assignment.v1';
  for (const ref of [current.paths.manifest_ref, current.paths.beacon_ref]) {
    const target = path.join(dir, ref);
    const surface = JSON.parse(readFileSync(target, 'utf8'));
    surface.assignment_contract_version = 'work-unit.assignment.v1';
    writeFileSync(target, `${JSON.stringify(surface, null, 2)}\n`);
  }
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

function collectWave0Candidates(dir, options = {}) {
  return collectSubmittedWave0ContributionProjection(dir, {
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

  it('derives ordered retained contribution coordinates and preserves duplicate URLs by position', () => {
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
    assert.deepEqual(collectEligibleRows(dir, 'wave0'), {
      passed: true, rows: [], root_findings: [], warnings: [],
    });
    assert.deepEqual(
      collectWave0Candidates(dir).candidates.map((candidate) => candidate.entry_id),
      [`${submitted.record.work_id}/1`, `${submitted.record.work_id}/2`],
    );
  });

  it('does not reassign appended source ordinals to historical submitted work', () => {
    const dir = bundle();
    const initial = submitWave0(dir, {
      queueItemId: 'queue-wave0-initial',
      sourceContent: sourceArray(19),
    });
    const supplement = submitWave0(dir, {
      queueItemId: 'queue-wave0-supplement',
      sourceContent: sourceArray(20),
    });

    const candidates = collectWave0Candidates(dir);
    assert.equal(candidates.passed, true, JSON.stringify(candidates.root_findings));
    assert.deepEqual(
      candidates.candidates
        .filter((candidate) => candidate.work_id === initial.record.work_id)
        .map((candidate) => candidate.source_ordinal),
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      candidates.candidates
        .filter((candidate) => candidate.work_id === supplement.record.work_id)
        .map((candidate) => candidate.source_ordinal),
      [20],
    );
  });

  it('keeps retained Wave0 source-prefix lineage across a later rerun while generic eligibility stays current-round', () => {
    const dir = bundle({ rerunCount: 0 });
    const initial = submitWave0(dir, {
      queueItemId: 'queue-wave0-round-zero',
      sourceContent: sourceArray(19),
    });
    writeFileSync(path.join(dir, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 1\n');
    const supplement = submitWave0(dir, {
      queueItemId: 'queue-wave0-round-one',
      sourceContent: sourceArray(20),
    });

    // Claim/index insertion order is not source contribution order. Reordering
    // this object preserves its authority facts and proves the reader uses the
    // submitted ledger's append order.
    const indexPath = path.join(dir, '_work_units/_index.json');
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    index.work_units = Object.fromEntries(Object.entries(index.work_units).reverse());
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

    const currentRows = collectEligibleRows(dir, 'wave0');
    assert.equal(currentRows.passed, true, JSON.stringify(currentRows.root_findings));
    assert.deepEqual(currentRows.rows.map((row) => row.work_id), [supplement.record.work_id]);

    const candidates = collectWave0Candidates(dir);
    assert.equal(candidates.passed, true, JSON.stringify(candidates.root_findings));
    assert.deepEqual(
      candidates.candidates
        .filter((candidate) => candidate.work_id === initial.record.work_id)
        .map((candidate) => candidate.source_ordinal),
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      candidates.candidates
        .filter((candidate) => candidate.work_id === supplement.record.work_id)
        .map((candidate) => candidate.source_ordinal),
      [20],
    );

    assert.equal(readSubmittedWave0Backing(dir, {
      work_id: initial.record.work_id,
      entry_id: `${initial.record.work_id}/1`,
    }).passed, true);
    assert.equal(readSubmittedWave0Backing(dir, {
      work_id: supplement.record.work_id,
      entry_id: `${supplement.record.work_id}/20`,
    }).passed, true);
    const reowned = readSubmittedWave0Backing(dir, {
      work_id: supplement.record.work_id,
      entry_id: `${supplement.record.work_id}/1`,
    });
    assert.equal(reowned.passed, false);
    assert.match(reowned.root_findings[0].missing_fact, /retained direct source lineage/i);
  });

  it('returns one submitted contribution root for current prefix drift and masks candidates', () => {
    const dir = bundle();
    submitWave0(dir, { sourceContent: sourceArray(2) });
    writeFileSync(path.join(dir, 'artifacts/wave0/current-topic/source.yaml'), sourceArray(2).replace('Source 1', 'Changed source 1'));

    assertContributionRoot(
      collectWave0Candidates(dir),
      'submitted_source_contribution_prefix_drift',
    );
  });

  it('returns direct roots for a shortened prefix and an unsubmitted suffix', () => {
    const shortened = bundle();
    submitWave0(shortened, { sourceContent: sourceArray(2) });
    writeFileSync(path.join(shortened, 'artifacts/wave0/current-topic/source.yaml'), sourceArray(1));
    assertContributionRoot(
      collectWave0Candidates(shortened),
      'submitted_source_contribution_prefix_shortened',
    );

    const suffix = bundle();
    submitWave0(suffix, { sourceContent: sourceArray(2) });
    writeFileSync(path.join(suffix, 'artifacts/wave0/current-topic/source.yaml'), sourceArray(3));
    assertContributionRoot(
      collectWave0Candidates(suffix),
      'submitted_source_contribution_unsubmitted_suffix',
    );
  });

  it('rejects non-monotonic declared contribution lengths without assigning candidates', () => {
    const dir = bundle();
    submitWave0(dir, { queueItemId: 'queue-wave0-first', sourceContent: sourceArray(2) });
    submitWave0(dir, { queueItemId: 'queue-wave0-second', sourceContent: sourceArray(2) });

    assertContributionRoot(
      collectWave0Candidates(dir),
      'submitted_source_contribution_non_monotonic',
    );
  });

  it('keeps one current row without a recorded contribution distinct from an unsubmitted suffix', () => {
    const dir = bundle();
    const submitted = submitWave0(dir, { sourceContent: sourceArray(2) });
    removeRecordedSourceContribution(dir, submitted.record.work_id);
    writeFileSync(path.join(dir, 'artifacts/wave0/current-topic/source.yaml'), sourceArray(3));

    const candidates = collectWave0Candidates(dir);
    assert.equal(candidates.passed, true, JSON.stringify(candidates.root_findings));
    assert.deepEqual(
      candidates.candidates.map((candidate) => candidate.entry_id),
      [1, 2, 3].map((ordinal) => `${submitted.record.work_id}/${ordinal}`),
    );
  });

  it('rejects mixed and multi-row missing-contribution groups without inferring an ordinal split', () => {
    const mixed = bundle();
    const initial = submitWave0(mixed, { queueItemId: 'queue-wave0-initial', sourceContent: sourceArray(2) });
    submitWave0(mixed, { queueItemId: 'queue-wave0-supplement', sourceContent: sourceArray(3) });
    removeRecordedSourceContribution(mixed, initial.record.work_id);
    assertContributionRoot(
      collectWave0Candidates(mixed),
      'submitted_source_contribution_missing_boundary',
    );

    const missing = bundle();
    const first = submitWave0(missing, { queueItemId: 'queue-wave0-missing-first', sourceContent: sourceArray(2) });
    const second = submitWave0(missing, { queueItemId: 'queue-wave0-missing-second', sourceContent: sourceArray(3) });
    removeRecordedSourceContribution(missing, first.record.work_id);
    removeRecordedSourceContribution(missing, second.record.work_id);
    assertContributionRoot(
      collectWave0Candidates(missing),
      'submitted_source_contribution_missing_boundary',
    );
  });

  it('returns an empty valid candidate set for a declared empty source array', () => {
    const dir = bundle();
    submitWave0(dir, { sourceContent: '[]\n' });
    assert.deepEqual(collectWave0Candidates(dir), {
      passed: true, candidates: [], root_findings: [], warnings: [],
    });
  });

  it('reads one exact submitted Wave0 backing without collapsing duplicate URLs', () => {
    const dir = bundle();
    const cacheTrail = '_cache/wave0/primary/queue-wave0/s01_duplicate';
    const submitted = submitWave0(dir, {
      cacheTrails: [{ path: cacheTrail, url: 'https://example.com/duplicate' }],
    });
    const entryId = `${submitted.record.work_id}/2`;

    const backing = readSubmittedWave0Backing(dir, {
      work_id: submitted.record.work_id,
      entry_id: entryId,
    });

    assert.equal(backing.passed, true, JSON.stringify(backing.root_findings));
    assert.deepEqual(backing.backing, {
      work_id: submitted.record.work_id,
      entry_id: entryId,
      source_ordinal: 2,
      source_url: 'https://example.com/duplicate',
      source_yaml_ref: 'artifacts/wave0/current-topic/source.yaml',
      cache_trail_refs: [cacheTrail],
      result_ref: submitted.record.paths.result_ref,
      work_unit_ref: submitted.record.paths.work_unit_dir,
    });

    const first = readSubmittedWave0Backing(dir, {
      work_id: submitted.record.work_id,
      entry_id: `${submitted.record.work_id}/1`,
    });
    assert.equal(first.passed, true, JSON.stringify(first.root_findings));
    assert.equal(first.backing.source_url, backing.backing.source_url);
    assert.notEqual(first.backing.entry_id, backing.backing.entry_id);
  });

  it('rejects URL-only, mismatched, unsafe, and unsubmitted submitted-backing selectors', () => {
    const dir = bundle();
    const submitted = submitWave0(dir);

    const urlOnly = readSubmittedWave0Backing(dir, { source_url: 'https://example.com/duplicate' });
    assert.equal(urlOnly.passed, false);
    assert.match(urlOnly.root_findings[0].missing_fact, /safe work_id/i);

    const mismatched = readSubmittedWave0Backing(dir, {
      work_id: submitted.record.work_id,
      entry_id: 'wu-other/1',
    });
    assert.equal(mismatched.passed, false);
    assert.match(mismatched.root_findings[0].missing_fact, /must exactly match/i);

    const unsafe = readSubmittedWave0Backing(dir, {
      work_id: '../unsafe',
      entry_id: '../unsafe/1',
    });
    assert.equal(unsafe.passed, false);
    assert.match(unsafe.root_findings[0].missing_fact, /safe work_id/i);

    const unsubmitted = readSubmittedWave0Backing(dir, {
      work_id: 'wu-unsubmitted',
      entry_id: 'wu-unsubmitted/1',
    });
    assert.equal(unsubmitted.passed, false);
    assert.match(unsubmitted.root_findings[0].missing_fact, /retained direct source lineage/i);
  });

  it('fails closed when the submitted contribution cache trail drifts after submit', () => {
    const dir = bundle();
    const submitted = submitWave0(dir);
    const cacheTrail = '_cache/wave0/primary/queue-wave0/s01_source';
    writeFileSync(path.join(dir, cacheTrail, 'meta.json'), '{ invalid json\n');

    const backing = readSubmittedWave0Backing(dir, {
      work_id: submitted.record.work_id,
      entry_id: `${submitted.record.work_id}/1`,
    });
    assert.equal(backing.passed, false);
    assert.match(backing.root_findings[0].missing_fact, /cache trail/i);
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
    const tupleSubmitted = submitWave0(tupleDir);
    retireAssignmentProfile(tupleDir, tupleSubmitted.record);
    const tupleFailure = collectWave0Candidates(tupleDir);
    assert.equal(tupleFailure.passed, false);
    assert.deepEqual(tupleFailure.candidates, []);
    assert.equal(tupleFailure.root_findings.length, 1);
    assert.equal(tupleFailure.root_findings[0].rule_id, 'unsupported_current_contract');

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
    const reader = readFileSync(path.resolve('DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-readers.mjs'), 'utf8');
    const projection = readFileSync(path.resolve('DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs'), 'utf8');
    const directOutput = readFileSync(path.resolve('DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs'), 'utf8');
    assert.doesNotMatch(reader, /work-unit-(?:projection|validation)\.mjs/);
    assert.match(projection, /gate-helpers-readers\.mjs/);
    assert.match(projection, /work-unit-validation\.mjs/);
    assert.doesNotMatch(directOutput, /gate-helpers-checks\.mjs/);
    assert.match(directOutput, /markdown-semantic-sections\.mjs/);
  });
});
