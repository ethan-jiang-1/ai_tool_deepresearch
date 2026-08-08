// @impl REF-003, REF-004
// Fixture-labeled Agent content is projected by the production synchronizer.

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  cleanupRoot,
  createTempRoot,
  runNode,
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

function readReview(bundle) {
  return parseYaml(readFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
}

function writeReview(bundle, review) {
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), stringifyYaml(review));
}

function sync(bundle) {
  const result = runNode([
    join(process.cwd(), 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs'),
    '--bundle',
    bundle,
  ]);
  return JSON.parse(result.stdout);
}

function focusBlocked(rerunCount) {
  return {
    topic_uid: PRIMARY_TOPIC.topic_uid,
    rerun_count: rerunCount,
    outcome: 'blocked',
    commitments: [{
      id: 'focus-historical-boundary',
      statement: 'Obtain the prior bounded decision.',
      state: 'limited',
      limitation: 'The earlier request retained an explicit user boundary.',
      boundary_kind: 'user_decision',
    }],
  };
}

function focusCovered(review, rerunCount) {
  return {
    topic_uid: PRIMARY_TOPIC.topic_uid,
    rerun_count: rerunCount,
    outcome: 'covered',
    commitments: [{
      id: 'focus-current-round',
      statement: 'Establish current-round submitted backing.',
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
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle, 'evidence-map-r2'));
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete');
}

describe('Reference Evidence Map rerun continuity', { timeout: 60000 }, () => {
  it('keeps historical and current Topic-level focus facts distinct through the production synchronizer', () => {
    root = createTempRoot();
    const bundle = buildHitl2Baseline(root, 'reference-evidence-map');

    enterRerunWave1(bundle);
    stageWave1(bundle, 'evidence-map-r2');
    const review = readReview(bundle);

    review.focus_coverage = focusBlocked(0);
    writeReview(bundle, review);
    const historical = sync(bundle);
    assert.equal(historical.verdict, 'committed');
    const historicalReadme = readFileSync(join(bundle, 'reference/README.md'), 'utf8');
    assert.match(historicalReadme, /\| topic-a .* \| historical context \|/);

    const currentReview = readReview(bundle);
    currentReview.focus_coverage = focusCovered(currentReview, 1);
    writeReview(bundle, currentReview);
    const current = sync(bundle);
    assert.equal(current.verdict, 'committed');
    const readme = readFileSync(join(bundle, 'reference/README.md'), 'utf8');
    assert.match(readme, /\| topic-a .* \| covered \|/);
    assert.match(readme, /submitted refs: \[_work_units\/[^]+\]\(\.\.\/_work_units\//);

    const relationshipSection = readme.match(/### Reference relationships[\s\S]*?### Current focus increments/);
    assert.ok(relationshipSection);
    assert.doesNotMatch(relationshipSection[0], /\| (covered|partial|blocked) \|/);
  });
});
