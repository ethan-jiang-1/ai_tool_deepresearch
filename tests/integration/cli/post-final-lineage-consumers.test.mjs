// @impl RES-001, RES-002, REI-006, POF-001, POF-002, POF-003, RRD-002, RRD-008

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { inspectPostFinalHandoffStage } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';
import { inspectPostFinalRecovery } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs';
import { buildRecoverySummary } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/recovery-contract.mjs';
import { createTerminalFinalBundle, requestFromInspection } from './post-final-recovery-fixture.mjs';

const REPO_ROOT = resolve('.');
const C5_CLI = resolve('DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs');
const STYLE_CLI = resolve('DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs');
const roots = [];

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop(), { recursive: true, force: true });
});

function topic(index) {
  return { topic_uid: `topic-00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, id: String(index), slug: `${String(index).padStart(2, '0')}_topic-${index}`, title: `Topic ${index}` };
}

function writePlan(bundle, name, topics) {
  writeFileSync(join(bundle, 'rb_plan.md'), [
    '---',
    `plan_basename: ${name}`,
    `derived_topic_count: ${topics.length}`,
    'topic_registry_version: "2"',
    'topic_registry:',
    ...topics.flatMap((item) => [
      `  - topic_uid: ${item.topic_uid}`,
      `    id: "${item.id}"`,
      `    slug: ${item.slug}`,
      `    title: ${item.title}`,
      '    must_answer:',
      '      - What matters?',
      '    scope_role: primary',
      '    depends_on_topic_uids: []',
    ]),
    '---',
    '# Plan',
    '',
  ].join('\n'));
}

function run(args) {
  return JSON.parse(execFileSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8' }));
}

function applyStyle(bundle) {
  return run([STYLE_CLI, '--bundle', bundle, '--style', 'quick_factual']);
}

function enterSynchronizedLineage(name) {
  const root = mkdtempSync(join(tmpdir(), 'post-final-lineage-'));
  roots.push(root);
  const topics = [topic(1)];
  const bundle = createTerminalFinalBundle(root, name, { topicRegistry: topics });
  const profilePath = join(bundle, 'rb_profile.yaml');
  applyStyle(bundle);
  const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
  const requestPath = join(root, `${name}-request.json`);
  writeFileSync(requestPath, JSON.stringify(requestFromInspection(inspection)));
  run([C5_CLI, 'apply', '--bundle', bundle, '--input', requestPath]);
  execFileSync(process.execPath, ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md'], { cwd: REPO_ROOT });
  run(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
  return { bundle, name, eventProfile: parseYaml(readFileSync(profilePath, 'utf8')), profilePath };
}

function projectSecondTopic(lineage) {
  writePlan(lineage.bundle, lineage.name, [topic(1), topic(2)]);
  applyStyle(lineage.bundle);
  return parseYaml(readFileSync(lineage.profilePath, 'utf8'));
}

function appendNormalDescendantToFinal(lineage) {
  const tracePath = join(lineage.bundle, 'rb_trace.jsonl');
  const events = readFileSync(tracePath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const suffix = [];
  const appendHandoff = ({ gate, phase, sourceNode, targetNode, load = true }) => {
    const sourceIndex = events.length + suffix.length;
    suffix.push({
      ts: `2026-03-01T00:00:${String(sourceIndex).padStart(2, '0')}.000Z`,
      event: 'gate_attempt',
      gate,
      phase,
      passed: true,
      currentNodeRef: sourceNode,
      next: targetNode,
    });
    if (load) {
      suffix.push({
        ts: `2026-03-01T00:00:${String(sourceIndex + 1).padStart(2, '0')}.000Z`,
        event: 'load_complete',
        entry: targetNode,
        handoff_source_gate: gate,
        handoff_source_node: sourceNode,
        handoff_target_node: targetNode,
        handoff_source_attempt_index: sourceIndex,
      });
    }
  };

  appendHandoff({ gate: 'rerun-ready', phase: 'rerun', sourceNode: 'phases/phase-rerun.md', targetNode: 'phases/phase-seed-topics.md' });
  appendHandoff({ gate: 'seed-topics-ready', phase: 'seed-topics', sourceNode: 'phases/phase-seed-topics.md', targetNode: 'phases/phase-wave0.md' });
  appendHandoff({ gate: 'wave0-complete', phase: 'wave0', sourceNode: 'phases/phase-wave0.md', targetNode: 'phases/phase-wave1.md' });
  appendHandoff({ gate: 'wave1-complete', phase: 'wave1', sourceNode: 'phases/phase-wave1.md', targetNode: 'phases/phase-wave2.md' });
  appendHandoff({ gate: 'wave2-complete', phase: 'wave2', sourceNode: 'phases/phase-wave2.md', targetNode: 'phases/phase-hitl2.md' });
  appendHandoff({ gate: 'hitl2-recorded', phase: 'hitl2', sourceNode: 'phases/phase-hitl2.md', targetNode: 'phases/phase-readiness.md' });
  appendHandoff({ gate: 'readiness-passed', phase: 'readiness', sourceNode: 'phases/phase-readiness.md', targetNode: 'phases/phase-final.md', load: false });
  appendFileSync(tracePath, `${suffix.map((event) => JSON.stringify(event)).join('\n')}\n`);

  const statusPath = join(lineage.bundle, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  status.current_node = 'phases/phase-readiness.md';
  status.current_gate = 'wave2_complete';
  status.next_gate = 'readiness_passed';
  status.state = 'in_progress';
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
}

function enterFinal(lineage, expectFailure = false) {
  try {
    return execFileSync(process.execPath, ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', lineage.bundle, '--node', 'phases/phase-final.md'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
  } catch (error) {
    if (expectFailure) return error.stdout;
    throw error;
  }
}

describe('shared post-final lineage stage and owner', () => {
  it('recognizes exact style-before-count projection and exposes the existing count owner everywhere', () => {
    const lineage = enterSynchronizedLineage('style-before-count');
    projectSecondTopic(lineage);

    const shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.equal(shared.ok, true, JSON.stringify(shared));
    assert.equal(shared.stage, 'synchronized_initial_profile');
    assert.deepEqual(shared.owner, {
      kind: 'current_owner',
      target_ref: 'rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count',
    });

    const inspection = inspectPostFinalRecovery({ bundlePath: lineage.bundle });
    assert.equal(inspection.stage, shared.stage);
    assert.equal(inspection.next_action.kind, shared.owner.kind);
    assert.equal(inspection.next_action.target_ref, shared.owner.target_ref);

    const summary = buildRecoverySummary({ postFinalInspection: inspection });
    assert.equal(summary.root_findings[0].recommended_action.kind, 'current_owner');
    assert.equal(summary.root_findings[0].recommended_action.target_ref, shared.owner.target_ref);
  });

  it('accepts exact projection after the bound count increment and preserves unchanged-style compatibility', () => {
    for (const projected of [false, true]) {
      const lineage = enterSynchronizedLineage(`count-${projected}`);
      if (projected) projectSecondTopic(lineage);
      const profile = parseYaml(readFileSync(lineage.profilePath, 'utf8'));
      profile.human_decision_checkpoints.hitl2.rerun_count = 1;
      writeFileSync(lineage.profilePath, stringifyYaml(profile));
      const shared = inspectPostFinalHandoffStage(lineage.bundle);
      assert.equal(shared.ok, true);
      assert.equal(shared.stage, 'synchronized_count_incremented');
      assert.equal(shared.owner.kind, 'rerun_gate');
    }
  });

  it('blocks wrong style, changed profile name, and unrelated profile drift', () => {
    for (const mutate of [
      (profile) => { profile.research_style_params.wave0_shared_ref_total += 7; },
      (profile) => { profile.research_profile = 'debug'; },
      (profile) => { profile.root_must_answer_set = ['drift']; },
    ]) {
      const lineage = enterSynchronizedLineage(`drift-${Math.random().toString(36).slice(2)}`);
      projectSecondTopic(lineage);
      const profile = parseYaml(readFileSync(lineage.profilePath, 'utf8'));
      mutate(profile);
      writeFileSync(lineage.profilePath, stringifyYaml(profile));
      assert.equal(inspectPostFinalHandoffStage(lineage.bundle).ok, false);
      assert.equal(inspectPostFinalRecovery({ bundlePath: lineage.bundle }).verdict, 'blocked');
    }
  });

  it('does not accept a wrong-source orphan rerun-ready pass as descendant ownership', () => {
    const lineage = enterSynchronizedLineage('orphan-pass');
    appendFileSync(join(lineage.bundle, 'rb_trace.jsonl'), `${JSON.stringify({
      ts: '2026-01-01T00:00:09.000Z',
      event: 'gate_attempt',
      gate: 'rerun-ready',
      passed: true,
      currentNodeRef: 'phases/phase-wave1.md',
      next: 'phases/phase-seed-topics.md',
    })}\n`);
    const shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.notEqual(shared.stage, 'descendant_pipeline');
  });

  it('hands a newer Final through entry, status sync, delivery, then proven immutable append ownership', () => {
    const lineage = enterSynchronizedLineage('newer-final-owner');
    appendNormalDescendantToFinal(lineage);

    let shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.equal(shared.ok, true, JSON.stringify(shared));
    assert.equal(shared.stage, 'newer_final_entry_pending');
    assert.deepEqual(shared.owner, { kind: 'enter_phase', target_ref: 'phases/phase-final.md' });

    enterFinal(lineage);
    shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.equal(shared.ok, true);
    assert.equal(shared.stage, 'newer_final_loaded_pending_status');
    assert.deepEqual(shared.owner, { kind: 'advance_status', target_ref: 'readiness_passed' });

    run(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', lineage.bundle, '--to', 'readiness_passed']);
    shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.equal(shared.ok, true);
    assert.equal(shared.stage, 'newer_final_delivery_pending');
    assert.deepEqual(shared.owner, { kind: 'current_owner', target_ref: 'phases/phase-final.md' });
    const deliveryPending = inspectPostFinalRecovery({ bundlePath: lineage.bundle });
    assert.equal(deliveryPending.verdict, 'unchanged');
    assert.equal(deliveryPending.stage, 'newer_final_delivery_pending');

    writeFileSync(join(lineage.bundle, 'final', 'final_v1.md'), '# Simulated newer lineage delivery\n');
    shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.equal(shared.ok, true);
    assert.equal(shared.stage, 'retired_by_newer_final');
    assert.deepEqual(shared.append_proof.removed_targets, ['final/final_v1.md']);
    const retired = inspectPostFinalRecovery({ bundlePath: lineage.bundle });
    assert.equal(retired.verdict, 'eligible');
  });

  it('rejects pre-load supplementary drift and conflicting newer descendant evidence without Final entry mutation', () => {
    const drifted = enterSynchronizedLineage('newer-final-drift');
    appendNormalDescendantToFinal(drifted);
    writeFileSync(join(drifted.bundle, 'final', 'supplementary.md'), '# Premature supplementary file\n');
    const statusPath = join(drifted.bundle, 'rb_status.json');
    const tracePath = join(drifted.bundle, 'rb_trace.jsonl');
    const beforeStatus = readFileSync(statusPath, 'utf8');
    const beforeTrace = readFileSync(tracePath, 'utf8');
    const blocked = JSON.parse(enterFinal(drifted, true));
    assert.match(blocked.reason, /Final primary inventory is invalid|Final inventory drifted from the accepted C5 prior-inventory digest/);
    assert.equal(readFileSync(statusPath, 'utf8'), beforeStatus);
    assert.equal(readFileSync(tracePath, 'utf8'), beforeTrace);

    const conflicting = enterSynchronizedLineage('newer-final-conflict');
    appendNormalDescendantToFinal(conflicting);
    appendFileSync(join(conflicting.bundle, 'rb_trace.jsonl'), `${JSON.stringify({
      ts: '2026-03-01T00:10:00.000Z',
      event: 'gate_attempt',
      gate: 'wave0-complete',
      phase: 'wave0',
      passed: true,
      currentNodeRef: 'phases/phase-wave0.md',
      next: 'phases/phase-wave1.md',
    })}\n`);
    const shared = inspectPostFinalHandoffStage(conflicting.bundle);
    assert.equal(shared.ok, false);
    assert.equal(shared.reason_code, 'descendant_lineage_drift');
  });
});
