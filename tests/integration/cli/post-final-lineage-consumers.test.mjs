// @impl RES-001, RES-002, REI-006, POF-001, POF-002, POF-003, RRD-002, RRD-008

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { inspectPostFinalHandoffStage } from '../../../DPT_FRAMEWORK/engine/helpers/handoff-helpers.mjs';
import { inspectPostFinalRecovery } from '../../../DPT_FRAMEWORK/engine/helpers/post-final-recovery.mjs';
import { buildRecoverySummary } from '../../../DPT_FRAMEWORK/engine/helpers/recovery-contract.mjs';
import { createTerminalFinalBundle, requestFromInspection } from './post-final-recovery-fixture.mjs';

const REPO_ROOT = resolve('.');
const C5_CLI = resolve('DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs');
const STYLE_CLI = resolve('DPT_FRAMEWORK/cli/apply-research-style.mjs');
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
  execFileSync(process.execPath, ['DPT_FRAMEWORK/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md'], { cwd: REPO_ROOT });
  run(['DPT_FRAMEWORK/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
  return { bundle, name, eventProfile: parseYaml(readFileSync(profilePath, 'utf8')), profilePath };
}

function projectSecondTopic(lineage) {
  writePlan(lineage.bundle, lineage.name, [topic(1), topic(2)]);
  applyStyle(lineage.bundle);
  return parseYaml(readFileSync(lineage.profilePath, 'utf8'));
}

describe('shared post-final lineage stage and owner', () => {
  it('recognizes exact style-before-count projection and exposes the existing count owner everywhere', () => {
    const lineage = enterSynchronizedLineage('style-before-count');
    projectSecondTopic(lineage);

    const shared = inspectPostFinalHandoffStage(lineage.bundle);
    assert.equal(shared.ok, true);
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
});
