// @impl WAI-005, RWG-002, RWG-003
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  cleanupRoot,
  createTempRoot,
  instantiateBundle,
  parseJsonOutput,
  REPO_ROOT,
  restoreBundle,
  runNode,
  snapshotBundle,
} from '../../e2e/helpers/deterministic-chain-harness.mjs';
import {
  PRIMARY_TOPIC,
  passAndEnter,
  stageWave0,
  stageWave1,
  writePlanAndProfile,
} from '../../e2e/helpers/research-chain-fixture.mjs';

const roots = [];

// Shared immutable Wave1-ready baseline: built once per test run via
// production predecessors, byte-snapshotted, and restored to its original
// path before each variant's independent focus_coverage mutation. Restoring
// the original path preserves the bundle-identity invariant
// (check-gate-setup-ready compares the normalized bundle basename with
// rb_plan.md/rb_profile.yaml plan_basename).
let baseline;
let snapshot;

function restoredBundle() {
  restoreBundle(snapshot, baseline);
  return baseline;
}

function prepareWave1Bundle(label) {
  const root = createTempRoot();
  roots.push(root);
  const bundle = instantiateBundle(root, label);
  writePlanAndProfile(bundle);
  passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
  passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
  passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle));
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle));
  return bundle;
}

function runWave1Gate(bundle, { attempt = null, expectedStatus = 0 } = {}) {
  const args = [
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs'),
    '--bundle', bundle,
    '--current-node', 'phases/phase-wave1.md',
  ];
  if (attempt !== null) args.push('--attempt', String(attempt));
  return parseJsonOutput(runNode(args, { expectedStatus }));
}

function inspectWave1(bundle, expectedStatus) {
  return parseJsonOutput(runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs'),
    '--bundle', bundle,
  ], { expectedStatus }));
}

function writeFocusCoverage(bundle, focusCoverage) {
  const path = join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml');
  const depth = parseYaml(readFileSync(path, 'utf8'));
  depth.focus_coverage = focusCoverage;
  writeFileSync(path, stringifyYaml(depth));
  return depth;
}

function coveredCommitment(review) {
  return {
    id: 'focus-current-backing',
    statement: 'Establish current submitted backing for the accepted focus.',
    state: 'covered',
    submitted_work_unit_refs: [review.reviewed_work_unit_refs[0]],
  };
}

function baseFocus(outcome, review) {
  return {
    topic_uid: PRIMARY_TOPIC.topic_uid,
    rerun_count: 0,
    outcome,
    commitments: [],
  };
}

describe('Wave1 focus coverage contract through inspect and formal Gate', () => {
  after(() => roots.forEach(cleanupRoot));

  before(() => {
    baseline = prepareWave1Bundle('focus-shared');
    snapshot = snapshotBundle(baseline, dirname(baseline));
  });

  it('keeps missing focus and covered focus on the existing clean Wave1 path', () => {
    const noFocusBundle = restoredBundle();
    const noFocus = runWave1Gate(noFocusBundle);
    assert.equal(noFocus.check.passed, true, noFocus.inspect.join('\n'));
    assert.equal(noFocus.check.failed_rule_ids.includes('focus_coverage_limit'), false);

    const coveredBundle = restoredBundle();
    const review = parseYaml(readFileSync(join(coveredBundle, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
    const focus = baseFocus('covered', review);
    focus.commitments = [coveredCommitment(review)];
    writeFocusCoverage(coveredBundle, focus);
    const covered = runWave1Gate(coveredBundle);
    assert.equal(covered.check.passed, true, covered.inspect.join('\n'));
    assert.equal(covered.check.failed_rule_ids.includes('focus_coverage_limit'), false);
  });

  for (const outcome of ['partial', 'blocked']) {
    it(`${outcome} emits only the existing definition-owned degradable limit`, () => {
      const bundle = restoredBundle();
      const review = parseYaml(readFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
      const focus = baseFocus(outcome, review);
      const limitation = {
        id: 'focus-boundary',
        statement: 'Resolve the current externally controlled source boundary.',
        state: 'limited',
        limitation: 'The source owner has not granted the required access.',
        boundary_kind: 'external_action',
      };
      focus.commitments = outcome === 'partial'
        ? [coveredCommitment(review), limitation]
        : [limitation];
      writeFocusCoverage(bundle, focus);

      const inspected = inspectWave1(bundle, 1);
      const failed = runWave1Gate(bundle, { expectedStatus: 1 });
      for (const output of [inspected, failed]) {
        assert.deepEqual(output.check.failed_rule_ids, ['focus_coverage_limit'], output.inspect.join('\n'));
        assert.equal(output.check.masked_rule_ids.includes('focus_coverage_limit'), false);
        assert.ok(output.inspect.some((line) => line.includes('[focus_coverage_limit]')), output.inspect.join('\n'));
      }

      const degraded = runWave1Gate(bundle, { attempt: 3 });
      assert.equal(degraded.check.passed, true, degraded.inspect.join('\n'));
      assert.equal(degraded.check.degraded, true);
      assert.deepEqual(degraded.check.degraded_rules, ['focus_coverage_limit']);
    });
  }

  it('keeps an invalid focus declaration under the non-degradable depth contract and masks the limit', () => {
    const bundle = restoredBundle();
    const review = parseYaml(readFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
    const focus = baseFocus('covered', review);
    focus.topic_uid = 'tp_00000000-0000-4000-8000-000000000000';
    focus.commitments = [coveredCommitment(review)];
    writeFocusCoverage(bundle, focus);

    const failed = runWave1Gate(bundle, { attempt: 3, expectedStatus: 1 });
    assert.equal(failed.check.passed, false);
    assert.ok(failed.check.failed_rule_ids.includes('per_topic_depth_review_contract'), failed.inspect.join('\n'));
    assert.equal(failed.check.failed_rule_ids.includes('focus_coverage_limit'), false);
    assert.ok(failed.check.masked_rule_ids.includes('focus_coverage_limit:topic-a'), failed.inspect.join('\n'));
    assert.notEqual(failed.check.degraded, true);
  });
});
