// @impl VER-001, RES-001, RES-002, REI-006, POF-001, POF-002, POF-003, RRD-002, RRD-008
// JS simulates labeled Agent-owned plan/profile/artifact/request/topic/count inputs.
// Production instantiation, Gates, loads, status transitions and C5 own lifecycle authority.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { applyCanonicalTopicState, inspectCanonicalTopicState } from '../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { inspectPostFinalHandoffStage } from '../../DPT_FRAMEWORK/engine/helpers/handoff-helpers.mjs';
import { inspectPostFinalRecovery } from '../../DPT_FRAMEWORK/engine/helpers/post-final-recovery.mjs';
import { requestFromInspection } from '../integration/cli/post-final-recovery-fixture.mjs';
import {
  advanceStatus, cleanupRoot, createTempRoot, enterPhase, readStatus, readTrace,
  REPO_ROOT, restoreBundle, runGate, runNode, snapshotBundle,
} from './helpers/deterministic-chain-harness.mjs';
import { buildTerminalFinalBaseline } from './helpers/research-chain-fixture.mjs';

let root;
let baseline;
let snapshot;

function applyC5(bundle, label) {
  const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
  assert.equal(inspection.verdict, 'eligible');
  const inputPath = join(root, `${label}-request.json`);
  writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
  const result = runNode([
    join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs'),
    'apply', '--bundle', bundle, '--input', inputPath,
  ]);
  assert.equal(JSON.parse(result.stdout).verdict, 'committed');
  enterPhase(bundle, 'phases/phase-rerun.md');
  advanceStatus(bundle, 'hitl2_recorded');
}

function applyStyle(bundle) {
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK/cli/apply-research-style.mjs'), '--bundle', bundle, '--style', 'quick_factual']);
}

function incrementCount(bundle) {
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2.rerun_count = 1;
  writeFileSync(profilePath, stringifyYaml(profile));
}

function addTopic(bundle) {
  const result = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'rerun',
      actions: [{ action: 'add_topic', title: 'Additional Comparison', slug_stem: 'additional-comparison', must_answer: ['What differs?'], scope_role: 'comparison', depends_on_topic_uids: [] }],
    },
  });
  assert.equal(result.verdict, 'committed');
}

function addThenRemoveTopic(bundle) {
  const before = new Set(inspectCanonicalTopicState({ bundlePath: bundle }).layout_baseline.topics.map((topic) => topic.topic_uid));
  addTopic(bundle);
  const inspected = inspectCanonicalTopicState({ bundlePath: bundle });
  const added = inspected.layout_baseline.topics.find((topic) => !before.has(topic.topic_uid));
  assert.ok(added, 'newly added topic UID is observable in canonical layout');
  const input = {
    ...inspected.layout_baseline,
    topics: inspected.layout_baseline.topics.filter((topic) => topic.topic_uid !== added.topic_uid),
    remove_topic_uids: [added.topic_uid],
  };
  assert.equal(applyCanonicalTopicState({ bundlePath: bundle, input }).verdict, 'committed');
}

function assertRealTerminalPredecessor(bundle) {
  const status = readStatus(bundle);
  assert.equal(status.current_node, 'phases/phase-final.md');
  const trace = readTrace(bundle);
  const readiness = trace.find((event) => event.event === 'gate_attempt' && event.gate === 'readiness-passed' && event.passed === true && event.next === 'phases/phase-final.md');
  assert.ok(readiness, 'missing real readiness Gate pass');
  assert.ok(trace.find((event) => event.event === 'load_complete' && event.entry === 'phases/phase-final.md' && event.handoff_source_attempt_index === trace.indexOf(readiness)), 'missing real Final load');
}

function passThroughDescendant(bundle) {
  const rerun = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md');
  assert.equal(rerun.output.check.passed, true, JSON.stringify(rerun.output.inspect));
  enterPhase(bundle, rerun.output.check.next);
  advanceStatus(bundle, 'rerun_ready');
  const seed = runGate(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md');
  assert.equal(seed.output.check.passed, true, JSON.stringify(seed.output.inspect));
  enterPhase(bundle, seed.output.check.next);
  advanceStatus(bundle, 'seed_topics_ready');
  const shared = inspectPostFinalHandoffStage(bundle);
  assert.equal(shared.ok, true, JSON.stringify(shared));
  assert.equal(shared.stage, 'descendant_pipeline');
  assert.equal(shared.owner.kind, 'current_owner');
}

before(() => {
  root = createTempRoot();
  baseline = buildTerminalFinalBaseline(root, 'post-final-lineage');
  assertRealTerminalPredecessor(baseline);
  snapshot = snapshotBundle(baseline, root);
});
after(() => cleanupRoot(root));

describe('post-final rerun lineage continuity from a production terminal chain', { timeout: 120000 }, () => {
  it('resumes add style-before-count and reaches one later normal handoff', () => {
    const bundle = restoreBundle(snapshot, baseline);
    applyC5(bundle, 'add');
    addTopic(bundle);
    applyStyle(bundle);
    const beforeCount = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(beforeCount.stage, 'synchronized_initial_profile');
    assert.equal(beforeCount.next_action.kind, 'current_owner');
    incrementCount(bundle);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).next_action.kind, 'rerun_gate');
    passThroughDescendant(bundle);
  });

  it('resumes safe-remove style-before-count and reaches one later normal handoff', () => {
    const bundle = restoreBundle(snapshot, baseline);
    applyC5(bundle, 'remove');
    addThenRemoveTopic(bundle);
    applyStyle(bundle);
    incrementCount(bundle);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).stage, 'synchronized_count_incremented');
    passThroughDescendant(bundle);
  });

  it('keeps event-bound style params on count-only compatibility even when exact current projection differs', () => {
    const bundle = restoreBundle(snapshot, baseline);
    applyC5(bundle, 'count-only');
    addTopic(bundle);
    const retained = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8')).research_style_params;
    incrementCount(bundle);
    assert.deepEqual(parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8')).research_style_params, retained);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).stage, 'synchronized_count_incremented');
    passThroughDescendant(bundle);
  });
});
