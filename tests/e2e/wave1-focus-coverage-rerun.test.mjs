// @impl WAI-005, RWG-002, RWG-003, RWP-002
// Fixture-labeled Agent content travels through the production rerun and Gate chain.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  cleanupRoot,
  createTempRoot,
  readStatus,
  runGate,
} from './helpers/deterministic-chain-harness.mjs';
import {
  PRIMARY_TOPIC,
  buildHitl2Baseline,
  passAndEnter,
  stageHitl2,
  stageSeed,
  stageWave0,
  stageWave1,
} from './helpers/research-chain-fixture.mjs';

let root;

after(() => cleanupRoot(root));

function readDepthReview(bundle) {
  return parseYaml(readFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
}

function writeDepthReview(bundle, review) {
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), stringifyYaml(review));
}

function coveredFocus(review, rerunCount) {
  return {
    topic_uid: PRIMARY_TOPIC.topic_uid,
    rerun_count: rerunCount,
    outcome: 'covered',
    commitments: [{
      id: 'focus-current-round',
      statement: 'Establish current-round submitted backing for the accepted focus.',
      state: 'covered',
      submitted_work_unit_refs: [review.reviewed_work_unit_refs[0]],
    }],
  };
}

function enterRerunWave1(bundle) {
  stageHitl2(bundle, 'rerun', 1);
  passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
  passAndEnter(bundle, 'rerun-ready', 'phases/phase-rerun.md', 'rerun_ready');
  stageSeed(bundle, 1);
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle, 'focus-r2'));
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete');
  assert.equal(readStatus(bundle).current_node, 'phases/phase-wave1.md');
}

describe('Wave1 focus coverage rerun continuity', { timeout: 60000 }, () => {
  it('rejects historical focus backing and accepts a current submitted increment through the normal Wave1 route', () => {
    root = createTempRoot();
    const bundle = buildHitl2Baseline(root, 'focus-rerun');
    const historicalReview = readDepthReview(bundle);
    const historicalRef = historicalReview.reviewed_work_unit_refs[0];

    enterRerunWave1(bundle);
    const staleReview = readDepthReview(bundle);
    staleReview.focus_coverage = coveredFocus(staleReview, 1);
    writeDepthReview(bundle, staleReview);

    const historical = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md', { expectedStatus: 1 }).output;
    assert.equal(historical.check.passed, false);
    assert.ok(historical.check.failed_rule_ids.includes('per_topic_depth_review_contract'), historical.inspect.join('\n'));
    assert.equal(historical.check.failed_rule_ids.includes('focus_coverage_limit'), false);
    assert.match(historical.inspect.join('\n'), /focus_coverage_ref_round_mismatch/);
    assert.ok(historical.hints.some((hint) => hint.rule_id === 'per_topic_depth_review_contract'), JSON.stringify(historical.hints));

    // Existing Wave1 work-unit and submit operations create the current increment.
    stageWave1(bundle, 'focus-r2');
    const currentReview = readDepthReview(bundle);
    const currentRef = currentReview.reviewed_work_unit_refs[0];
    assert.notEqual(currentRef, historicalRef);
    currentReview.focus_coverage = coveredFocus(currentReview, 1);
    writeDepthReview(bundle, currentReview);

    const passed = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md').output;
    assert.equal(passed.check.passed, true, passed.inspect.join('\n'));
    assert.deepEqual(passed.check.failed_rule_ids, []);
    assert.equal(passed.check.degraded, undefined);
    assert.equal(passed.check.next, 'phases/phase-wave2.md');
  });
});
