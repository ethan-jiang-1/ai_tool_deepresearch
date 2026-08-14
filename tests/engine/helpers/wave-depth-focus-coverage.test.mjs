// @impl WAI-005, RWG-002, RWG-003
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  checkWave1DepthReviewContract,
  evaluateWave1FocusCoverage,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs';
import {
  claimAndSubmitWorkUnit,
  referenceContent,
} from '../work-unit-test-helpers.mjs';

const dirs = [];
const TOPIC = 'topic-a';
const TOPIC_UID = 'tp_123e4567-e89b-12d3-a456-426614174000';

function bundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'focus-coverage-'));
  dirs.push(dir);
  writeFileSync(path.join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 0
  counterexample_search: false
  cross_verification: false
human_decision_checkpoints:
  hitl2:
    rerun_count: 0
`);
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: focus-coverage-test
topic_registry_version: "2"
derived_topic_count: 1
topic_registry:
  - topic_uid: ${TOPIC_UID}
    id: "01"
    slug: ${TOPIC}
    title: Topic A
    must_answer: ["What establishes current focus coverage?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
  return dir;
}

function submitCurrentWave1(dir) {
  const sourceUrl = 'https://example.test/current-focus-source';
  const cacheTrail = '_cache/wave1/primary/topic-a/current-focus-source';
  const sourceRef = 'reference/topic-a-current-focus-source.md';
  const evidenceRef = `artifacts/wave1/${TOPIC}/evidence-summary.md`;
  const questionsRef = `artifacts/wave1/${TOPIC}/question-list.md`;
  const claim = {
    url: sourceUrl,
    source_ref: sourceRef,
    acceptance_status: 'accepted',
    is_new_vs_wave0: true,
    cache_trail_refs: [cacheTrail],
  };
  const { record, submitted } = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: TOPIC,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: TOPIC, wave: 1, assignment_mode: 'primary' },
    },
    outputs: [
      { path: sourceRef, role: 'reference', source_url: sourceUrl, source_slug: 'current-focus-source', content: referenceContent({ source_url: sourceUrl, related_topic_uid: TOPIC_UID }) },
      { path: evidenceRef, role: 'evidence_summary', content: `[Source](${sourceUrl})\n\n## Key Findings\n1. Current backing.\n` },
      { path: questionsRef, role: 'question_list', content: '## Topic Investigation Targets\n\nCurrent.\n\n## Question Reconciliation\n\nCurrent.\n\n## Emergent Question Protocol\n\nCurrent.\n\n## Exploration / Exploitation Decision\n\nCurrent.\n' },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: { source_claims: [claim], accepted_source_urls: [sourceUrl] },
  });
  assert.equal(submitted.ok, true, JSON.stringify(submitted));
  return record;
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
  const file = path.join(dir, 'artifacts', 'wave1', TOPIC, 'depth-review.yaml');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(review, null, 2)}\n`);
}

function coveredFocus(record) {
  return {
    topic_uid: TOPIC_UID,
    rerun_count: 0,
    outcome: 'covered',
    commitments: [{
      id: 'focus-1',
      statement: 'Establish current focus backing.',
      state: 'covered',
      submitted_work_unit_refs: [record.paths.work_unit_dir],
    }],
  };
}

describe('Wave1 focus coverage direct-fact contract', () => {
  after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('preserves the no-focus baseline and accepts current reviewed covered backing', () => {
    const dir = bundle();
    const record = submitCurrentWave1(dir);
    const noFocus = reviewFor(record);
    writeReview(dir, noFocus);
    assert.equal(checkWave1DepthReviewContract(dir, { topic: TOPIC }).passed, true);

    const focus = coveredFocus(record);
    writeReview(dir, reviewFor(record, focus));
    const result = checkWave1DepthReviewContract(dir, { topic: TOPIC });
    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.equal(result.focus_coverage.status, 'covered');
  });

  it('rejects non-strict commitment shape and impossible outcome combinations', () => {
    const dir = bundle();
    const record = submitCurrentWave1(dir);
    const invalid = coveredFocus(record);
    invalid.commitments[0].limitation = 'Unexpected mixed shape.';
    invalid.outcome = 'partial';
    const review = reviewFor(record, invalid);
    writeReview(dir, review);
    const result = evaluateWave1FocusCoverage(dir, {
      topic: TOPIC,
      review,
    });
    assert.equal(result.passed, false);
    assert.equal(result.status, 'invalid');
    assert.match(result.inspect.join('\n'), /commitment_shape_invalid/);
    assert.match(result.inspect.join('\n'), /outcome_matrix_invalid/);
  });

  it('requires an explicit current index round and current reviewed backing', () => {
    const dir = bundle();
    const record = submitCurrentWave1(dir);
    const profilePath = path.join(dir, 'rb_profile.yaml');
    writeFileSync(profilePath, `research_style_params:
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 0
  counterexample_search: false
  cross_verification: false
human_decision_checkpoints:
  hitl2:
    rerun_count: 1
`);
    const focus = { ...coveredFocus(record), rerun_count: 1 };
    const review = reviewFor(record, focus);
    writeReview(dir, review);
    const result = evaluateWave1FocusCoverage(dir, {
      topic: TOPIC,
      review,
    });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /focus_coverage_ref_round_mismatch/);
  });

  it('accepts only exact partial and blocked limitation matrices', () => {
    const dir = bundle();
    const record = submitCurrentWave1(dir);
    const partial = {
      ...coveredFocus(record),
      outcome: 'partial',
      commitments: [
        ...coveredFocus(record).commitments,
        {
          id: 'focus-2',
          statement: 'Resolve external source access.',
          state: 'limited',
          limitation: 'The source owner must grant access.',
          boundary_kind: 'external_action',
        },
      ],
    };
    const partialReview = reviewFor(record, partial);
    writeReview(dir, partialReview);
    const partialResult = evaluateWave1FocusCoverage(dir, { topic: TOPIC, review: partialReview });
    assert.equal(partialResult.passed, true, partialResult.inspect.join('\n'));
    assert.equal(partialResult.status, 'limited');
    assert.equal(partialResult.outcome, 'partial');

    const blocked = {
      ...partial,
      outcome: 'blocked',
      commitments: [partial.commitments[1]],
    };
    const blockedReview = reviewFor(record, blocked);
    writeReview(dir, blockedReview);
    const blockedResult = evaluateWave1FocusCoverage(dir, { topic: TOPIC, review: blockedReview });
    assert.equal(blockedResult.passed, true, blockedResult.inspect.join('\n'));
    assert.equal(blockedResult.status, 'limited');
    assert.equal(blockedResult.outcome, 'blocked');
  });
});
