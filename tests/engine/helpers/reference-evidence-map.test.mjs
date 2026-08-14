// @impl REF-003, REF-004

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderReferenceEvidenceMap } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/reference-index-sync.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../../engine/work-unit-test-helpers.mjs';

const bundles = [];
const TOPIC = 'topic-a';
const TOPIC_UID = 'tp_123e4567-e89b-12d3-a456-426614174000';

after(() => bundles.splice(0).forEach(cleanupWorkUnitBundle));

function bundle({ rerunCount = 0 } = {}) {
  const dir = tempWorkUnitBundle('reference-evidence-map-');
  bundles.push(dir);
  mkdirSync(join(dir, 'reference'), { recursive: true });
  writeFileSync(join(dir, 'rb_profile.yaml'), [
    'research_style_params:',
    '  wave1_per_topic_ref_floor: 1',
    '  topic_unique_ratio: 0',
    '  counterexample_search: false',
    '  cross_verification: false',
    'human_decision_checkpoints:',
    '  hitl2:',
    '    rerun_count: ' + rerunCount,
    '',
  ].join('\n'));
  const plan = {
    plan_basename: 'reference-evidence-map-test',
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [{
      topic_uid: TOPIC_UID,
      id: '01',
      slug: TOPIC,
      title: 'Topic A',
      must_answer: ['What establishes focus coverage?'],
      scope_role: 'primary',
      depends_on_topic_uids: [],
      previous_layouts: [],
    }],
  };
  writeFileSync(join(dir, 'rb_plan.md'), ['---', JSON.stringify(plan, null, 2), '---', '# Plan', ''].join('\n'));
  return dir;
}

function writeReference(dir, name, options) {
  writeFileSync(join(dir, 'reference', name), referenceContent(options));
}

function submitCurrentWave1(dir) {
  const sourceUrl = 'https://example.test/current-focus-source';
  const sourceRef = 'reference/topic-a-current-focus-source.md';
  const cacheTrail = '_cache/wave1/primary/topic-a/current-focus-source';
  const evidenceRef = 'artifacts/wave1/' + TOPIC + '/evidence-summary.md';
  const questionsRef = 'artifacts/wave1/' + TOPIC + '/question-list.md';
  const submitted = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: TOPIC,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: TOPIC, wave: 1, assignment_mode: 'primary' },
    },
    outputs: [
      { path: sourceRef, role: 'reference', source_url: sourceUrl, source_slug: 'current-focus-source', content: referenceContent({ source_url: sourceUrl, related_topic_uid: TOPIC_UID }) },
      { path: evidenceRef, role: 'evidence_summary', content: '[Source](' + sourceUrl + ')\n\n## Key Findings\n1. Current backing.\n' },
      { path: questionsRef, role: 'question_list', content: '## Topic Investigation Targets\n\nCurrent.\n\n## Question Reconciliation\n\nCurrent.\n\n## Emergent Question Protocol\n\nCurrent.\n\n## Exploration / Exploitation Decision\n\nCurrent.\n' },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        source_ref: sourceRef,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
  assert.equal(submitted.submitted.ok, true, JSON.stringify(submitted.submitted));
  return submitted.record;
}

function reviewFor(record, focusCoverage = undefined) {
  return {
    version: 'depth-review.v1',
    topic_slug: TOPIC,
    reviewed_work_unit_refs: [record.paths.work_unit_dir],
    depth_dimensions: {
      mechanism: { status: 'covered', refs: [record.paths.result_ref] },
      trend_or_difficulty: { status: 'covered', refs: [record.paths.result_ref] },
      limitation_or_dispute: { status: 'covered', refs: [record.paths.result_ref] },
    },
    profile_checks: {
      counterexample_search: { status: 'not_required', refs: [] },
      cross_verification: { status: 'not_required', refs: [] },
    },
    decision: 'accept',
    supplementary_queue_item_ids: [],
    ...(focusCoverage ? { focus_coverage: focusCoverage } : {}),
  };
}

function writeReview(dir, review) {
  const target = join(dir, 'artifacts', 'wave1', TOPIC, 'depth-review.yaml');
  mkdirSync(join(dir, 'artifacts', 'wave1', TOPIC), { recursive: true });
  writeFileSync(target, JSON.stringify(review, null, 2) + '\n');
}

function focusCovered(record, rerunCount = 0) {
  return {
    topic_uid: TOPIC_UID,
    rerun_count: rerunCount,
    outcome: 'covered',
    commitments: [{
      id: 'focus-covered',
      statement: 'Establish current focus backing.',
      state: 'covered',
      submitted_work_unit_refs: [record.paths.work_unit_dir],
    }],
  };
}

function focusPartial(record, rerunCount = 0) {
  return {
    ...focusCovered(record, rerunCount),
    outcome: 'partial',
    commitments: [
      ...focusCovered(record, rerunCount).commitments,
      {
        id: 'focus-limited',
        statement: 'Resolve source access.',
        state: 'limited',
        limitation: 'The source owner must grant access.',
        boundary_kind: 'external_action',
      },
    ],
  };
}

function focusBlocked(rerunCount = 0) {
  return {
    topic_uid: TOPIC_UID,
    rerun_count: rerunCount,
    outcome: 'blocked',
    commitments: [{
      id: 'focus-blocked',
      statement: 'Obtain a required decision.',
      state: 'limited',
      limitation: 'A scoped user decision is still required.',
      boundary_kind: 'user_decision',
    }],
  };
}

function render(dir) {
  const rendered = renderReferenceEvidenceMap(dir, { syncDate: '2026-08-08' });
  assert.equal(rendered.ok, true, JSON.stringify(rendered));
  return rendered;
}

describe('Reference Evidence Map renderer', () => {
  it('renders direct relationship classes in path order and keeps an unclassifiable reference unknown', () => {
    const dir = bundle();
    writeReference(dir, 'topic-a-specific.md', { related_topic_uid: TOPIC_UID });
    writeReference(dir, '00-cross-comparison.md', { related_topic_uid: 'all' });
    writeReference(dir, '00-shared-foundation.md', { related_topic_uid: 'all' });
    writeReference(dir, 'unclassifiable.md', { related_topic_uid: 'tp_00000000-0000-4000-8000-000000000000' });

    const first = render(dir);
    const second = render(dir);
    assert.equal(first.bytes, second.bytes);
    assert.deepEqual(first.relationships.map(({ ref_file, relationship }) => [ref_file, relationship]), [
      ['reference/00-cross-comparison.md', 'cross-Topic'],
      ['reference/00-shared-foundation.md', 'shared'],
      ['reference/topic-a-specific.md', 'Topic-specific'],
      ['reference/unclassifiable.md', 'unknown'],
    ]);
    assert.match(first.bytes, /topic-a \(tp_123e4567-e89b-12d3-a456-426614174000\)/);
    assert.match(first.bytes, /reference\/unclassifiable\.md.*reference_topic_uid_unknown/);
    assert.match(first.bytes, /A Topic-level focus status does not attribute an individual reference file/);
  });

  it('renders valid current focus outcomes and does not attribute them to a reference', () => {
    const dir = bundle();
    const record = submitCurrentWave1(dir);

    writeReview(dir, reviewFor(record));
    assert.equal(render(dir).topics[0].status, 'not declared');

    writeReview(dir, reviewFor(record, focusCovered(record)));
    const covered = render(dir);
    assert.equal(covered.topics[0].status, 'covered');
    assert.ok(covered.topics[0].coordinate.includes('[' + record.paths.work_unit_dir + '](../' + record.paths.work_unit_dir + ')'));
    assert.doesNotMatch(covered.bytes, /topic-a-current-focus-source\.md \| Topic-specific \|[^\n]*covered/);

    writeReview(dir, reviewFor(record, focusPartial(record)));
    const partial = render(dir);
    assert.equal(partial.topics[0].status, 'partial');
    assert.match(partial.topics[0].detail, /The source owner must grant access\. \(external_action\)/);

    writeReview(dir, reviewFor(record, focusBlocked()));
    const blocked = render(dir);
    assert.equal(blocked.topics[0].status, 'blocked');
    assert.match(blocked.topics[0].detail, /A scoped user decision is still required\. \(user_decision\)/);
  });

  it('distinguishes historical context from malformed, mismatched, and future focus declarations', () => {
    const dir = bundle({ rerunCount: 1 });
    const record = submitCurrentWave1(dir);
    const historical = focusBlocked(0);

    writeReview(dir, reviewFor(record, historical));
    assert.equal(render(dir).topics[0].status, 'historical context');

    writeReview(dir, reviewFor(record, { ...historical, extra: 'invalid' }));
    assert.equal(render(dir).topics[0].status, 'unknown');

    writeReview(dir, reviewFor(record, { ...historical, topic_uid: 'tp_00000000-0000-4000-8000-000000000000' }));
    assert.equal(render(dir).topics[0].status, 'unknown');

    writeReview(dir, reviewFor(record, { ...historical, rerun_count: 2 }));
    assert.equal(render(dir).topics[0].status, 'unknown');
  });

  it('keeps the template empty state explicitly non-evidentiary before synchronization', () => {
    const template = readFileSync(join(process.cwd(), 'DEEP_RESEARCH_HARNESS/rb_templates/reference/README.md.tmpl'), 'utf8');
    assert.match(template, /## Reference Evidence Map/);
    assert.match(template, /No synchronized projection is available yet/);
    assert.match(template, /asserts no reference relationship or current focus outcome/);
    assert.doesNotMatch(template, /\| Reference \| Relationship \|/);
  });
});
