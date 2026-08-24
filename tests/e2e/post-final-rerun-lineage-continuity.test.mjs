// @impl VER-001, RES-001, RES-002, REI-006, POF-001, POF-002, POF-003, RRD-002, RRD-008, STM-010
// JS simulates labeled Agent-owned plan/profile/artifact/request/topic/count inputs.
// Production instantiation, Gates, loads, status transitions and C5 own lifecycle authority.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { applyCanonicalTopicState, inspectCanonicalTopicState } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import {
  renderSeedInitializationRegion,
  SEED_TOPIC_INITIALIZATION,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs';
import { inspectPostFinalHandoffStage } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';
import { inspectPostFinalRecovery } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs';
import { requestFromInspection } from '../integration/cli/post-final-recovery-fixture.mjs';
import {
  advanceStatus, cleanupRoot, createTempRoot, enterPhase, readStatus, readTrace,
  REPO_ROOT, restoreBundle, runGate, runNode, snapshotBundle,
} from './helpers/deterministic-chain-harness.mjs';
import {
  buildTerminalFinalBaseline,
  stageHitl2,
  stageSeed,
  stageWave0,
  stageWave1,
  stageWave2,
} from './helpers/research-chain-fixture.mjs';

let root;
let baseline;
let snapshot;

function applyC5(bundle, label) {
  const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
  assert.equal(inspection.verdict, 'eligible');
  const inputPath = join(root, `${label}-request.json`);
  writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
  const result = runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs'),
    'apply', '--bundle', bundle, '--input', inputPath,
  ]);
  assert.equal(JSON.parse(result.stdout).verdict, 'committed');
  enterPhase(bundle, 'phases/phase-rerun.md');
  advanceStatus(bundle, 'hitl2_recorded');
}

function applyStyle(bundle) {
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs'), '--bundle', bundle, '--style', 'quick_factual']);
}

function incrementCount(bundle) {
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2.rerun_count = 1;
  writeFileSync(profilePath, stringifyYaml(profile));
}

function rerunAddDirection() {
  return {
    rerun_count: 1,
    action: 'add',
    new_search_dimensions: 'controlled post-final comparison',
    adjusted_depth: 'compare the new topic with retained evidence',
    search_guardrails: 'retain primary runtime facts',
    rationale_excerpt: 'recorded post-final rerun decision',
  };
}

function rerunSupplementDirection() {
  return {
    ...rerunAddDirection(),
    action: 'supplement',
    new_search_dimensions: 'preserve the existing topic while comparing post-final continuity',
  };
}

function addTopic(bundle) {
  const existingTopic = inspectCanonicalTopicState({ bundlePath: bundle }).topics[0];
  const result = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'rerun',
      actions: [
        { action: 'add_topic', title: 'Additional Comparison', slug_stem: 'additional-comparison', must_answer: ['What differs?'], scope_role: 'comparison', depends_on_topic_uids: [], direction: rerunAddDirection() },
        { action: 'set_rerun_direction', topic_uid: existingTopic.topic_uid, direction: rerunSupplementDirection() },
      ],
    },
  });
  assert.equal(result.verdict, 'committed');

  // Simulated Seed Topics Agent enriches the rerun-added topic's bounded
  // initialization body (STM-010: the gate rejects a current-marker seed that
  // still holds the template pending placeholders).
  const added = inspectCanonicalTopicState({ bundlePath: bundle }).topics.find((topic) => topic.slug.includes('additional-comparison'));
  assert.ok(added, 'added topic is observable after commit');
  let region = renderSeedInitializationRegion();
  for (const section of SEED_TOPIC_INITIALIZATION.sections) {
    region = region.replace(section.content, `Simulated authored content for ${section.heading}.`);
  }
  const addedSeedPath = join(bundle, `seed_topics/${added.slug}.md`);
  const addedRaw = readFileSync(addedSeedPath, 'utf8');
  writeFileSync(addedSeedPath, addedRaw.replace(renderSeedInitializationRegion(), region));
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

function simulatedFinalReport() {
  return [
    '# Rerun Final Delivery',
    '',
    'Simulated Agent action for deterministic lineage coverage only.',
    '',
    '## Evidence Map',
    '',
    '| Finding ID | Declared Key Finding | Submitted Backing |',
    '| --- | --- | --- |',
    '| F-001 | The rerun fixture retains one submitted backing reference. | [submitted source](../artifacts/wave0/topic-a/source.yaml) |',
    '',
  ].join('\n');
}

function driveAcceptedRerunToNewReadiness(bundle) {
  incrementCount(bundle);
  applyStyle(bundle);
  const rerun = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md');
  assert.equal(rerun.output.check.passed, true, JSON.stringify(rerun.output.inspect));
  enterPhase(bundle, rerun.output.check.next);
  advanceStatus(bundle, 'rerun_ready');
  stageSeed(bundle, 1);
  const seed = runGate(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md');
  assert.equal(seed.output.check.passed, true, JSON.stringify(seed.output.inspect));
  enterPhase(bundle, seed.output.check.next);
  advanceStatus(bundle, 'seed_topics_ready');
  for (let index = 1; index <= 5; index += 1) stageWave0(bundle, `rerun-final-${index}`);
  const wave0 = runGate(bundle, 'wave0-complete', 'phases/phase-wave0.md');
  assert.equal(wave0.output.check.passed, true, JSON.stringify(wave0.output.inspect));
  enterPhase(bundle, wave0.output.check.next);
  advanceStatus(bundle, 'wave0_complete');
  const wave1Submissions = [];
  for (let index = 1; index <= 5; index += 1) wave1Submissions.push(stageWave1(bundle, `rerun-final-${index}`));
  const depthReviewPath = join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml');
  const depthReview = parseYaml(readFileSync(depthReviewPath, 'utf8'));
  depthReview.reviewed_work_unit_refs = wave1Submissions.map((submission) => submission.record.paths.work_unit_dir);
  writeFileSync(depthReviewPath, stringifyYaml(depthReview));
  const wave1 = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md');
  assert.equal(wave1.output.check.passed, true, JSON.stringify(wave1.output.inspect));
  enterPhase(bundle, wave1.output.check.next);
  advanceStatus(bundle, 'wave1_complete');
  stageWave2(bundle, { project: false });
  const wave2 = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md');
  assert.equal(wave2.output.check.passed, true, JSON.stringify(wave2.output.inspect));
  enterPhase(bundle, wave2.output.check.next);
  advanceStatus(bundle, 'wave2_complete');
  stageHitl2(bundle, 'proceed_to_readiness', 1);
  const hitl2 = runGate(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md');
  assert.equal(hitl2.output.check.passed, true, JSON.stringify(hitl2.output.inspect));
  enterPhase(bundle, hitl2.output.check.next);
  advanceStatus(bundle, 'hitl2_recorded');
  const readiness = runGate(bundle, 'readiness-passed', 'phases/phase-readiness.md');
  assert.equal(readiness.output.check.passed, true, JSON.stringify(readiness.output.inspect));
  return readiness;
}

function assertStaleStyleGate(bundle) {
  const rerun = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md', { expectedStatus: 1 });
  assert.equal(rerun.output.check.passed, false);
  assert.deepEqual(rerun.output.check.failed_rule_ids, ['style_projection_freshness']);
  assert.equal(rerun.output.hints.length, 1);
  assert.equal(rerun.output.hints[0].rule_id, 'style_projection_freshness');
  assert.match(rerun.output.hints[0].write_to, /apply-research-style\.mjs/);
  assert.match(rerun.output.hints[0].rerun, /check-gate-rerun-ready\.mjs/);
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
    assertStaleStyleGate(bundle);
    applyStyle(bundle);
    passThroughDescendant(bundle);
  });

  it('retains the accepted C5 audit lineage through a newer Final handoff and appends globally', () => {
    const bundle = restoreBundle(snapshot, baseline);
    applyC5(bundle, 'new-final');
    const acceptedEvent = readTrace(bundle).find((event) => event.event === 'post_final_reentry');
    assert.ok(acceptedEvent, 'accepted C5 event is retained as the audit witness');
    const readiness = driveAcceptedRerunToNewReadiness(bundle);
    const entryPending = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(entryPending.stage, 'newer_final_entry_pending');
    assert.equal(entryPending.next_action.kind, 'enter_phase');

    // A copied test branch exercises invalid pre-load inventory without treating deletion as runtime repair.
    // Non-primary presentation drift no longer blocks a primary-series-bound C5
    // event (BUG-236); the fail-closed branch must drift the primary series.
    const preFinalSnapshot = join(root, 'post-final-newer-final-preload-snapshot');
    cpSync(bundle, preFinalSnapshot, { recursive: true, errorOnExist: true });
    const reportPath = join(bundle, 'final', 'report.md');
    const acceptedReport = readFileSync(reportPath, 'utf8');
    writeFileSync(reportPath, `${acceptedReport}<!-- simulated primary drift -->\n`);
    const beforeStatus = readFileSync(join(bundle, 'rb_status.json'), 'utf8');
    const beforeTrace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
    const drifted = enterPhase(bundle, readiness.output.check.next, { expectedStatus: 1 });
    assert.match(drifted.stdout, /prior-inventory digest|inventory drifted/i);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf8'), beforeStatus);
    assert.equal(readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'), beforeTrace);
    rmSync(bundle, { recursive: true });
    cpSync(preFinalSnapshot, bundle, { recursive: true, errorOnExist: true });

    enterPhase(bundle, readiness.output.check.next);
    const loaded = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(loaded.stage, 'newer_final_loaded_pending_status');
    assert.equal(loaded.next_action.kind, 'advance_status');
    advanceStatus(bundle, 'readiness_passed');
    const deliveryPending = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(deliveryPending.stage, 'newer_final_delivery_pending');
    assert.equal(deliveryPending.next_action.kind, 'current_owner');

    const sourceDirectory = join(bundle, '_tmp', 'simulated-rerun-final');
    mkdirSync(sourceDirectory, { recursive: true });
    const source = join(sourceDirectory, 'report.md');
    writeFileSync(source, simulatedFinalReport());
    const publication = JSON.parse(runNode([
      join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs'),
      'publish-final-report', '--bundle', bundle, '--source', source,
    ]).stdout);
    assert.equal(publication.verdict, 'committed');
    assert.equal(publication.target, 'final/final_v1.md');
    assert.equal(readFileSync(join(bundle, 'final', 'report.md'), 'utf8'), '# Deterministic Final\n\nFixture-labeled Agent-owned final content.\n');
    const retired = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(retired.verdict, 'eligible');
    assert.equal(readStatus(bundle).current_node, 'phases/phase-final.md');
    assert.deepEqual(readTrace(bundle).find((event) => event.event === 'post_final_reentry'), acceptedEvent);

    const requestPath = join(root, 'later-explicit-evidence-expansion.json');
    writeFileSync(requestPath, `${JSON.stringify({
      schema_version: '1.0.0',
      action: 'post_final_rerun',
      reason: 'A later explicit request needs a newly retained source.',
      requested_scope: 'Expand the evidence set and reassess one conclusion.',
      ...retired.facts.request_bindings,
    }, null, 2)}\n`);
    const later = JSON.parse(runNode([
      join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs'),
      'apply', '--bundle', bundle, '--input', requestPath,
    ]).stdout);
    assert.equal(later.verdict, 'committed');
    assert.equal(later.stage, 'pre_entry');
  });
});
