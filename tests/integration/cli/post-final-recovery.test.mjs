import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { readFinalReportInventory } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs';
import { applyCanonicalTopicState, recoverCanonicalTopicState } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { auditPhaseStatus } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs';
import {
  applyPostFinalRecovery,
  inspectPostFinalRecovery,
  PostFinalRecoveryCrashError,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs';
import { createTerminalFinalBundle, requestFromInspection } from './post-final-recovery-fixture.mjs';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'cli', 'operate-post-final-recovery.mjs');

function runNode(args, { expect = 0 } = {}) {
  const result = spawnSync('node', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  assert.equal(result.status, expect, result.stderr || result.stdout);
  return result.stdout;
}

function runJson(args, options) { return JSON.parse(runNode(args, options)); }

describe('post-final recovery CLI and lifecycle integration', { concurrency: false }, () => {
  let root;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'dpt-post-final-cli-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('uses closed CLI operations, exit codes, and retained input', () => {
    const bundle = createTerminalFinalBundle(root, 'cli');
    const inspected = runJson([CLI, 'inspect', '--bundle', bundle]);
    assert.equal(inspected.verdict, 'eligible');
    const inputPath = join(root, 'request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspected)));
    const applied = runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    assert.equal(applied.verdict, 'committed');
    const ordinaryProfile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
    assert.equal(ordinaryProfile.human_decision_checkpoints.hitl2.rationale, 'Post-final rerun reason:\nNeed additional evidence\n\nRequested scope:\nAdd a focused comparison');
    const ordinaryEvent = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).find((event) => event.event === 'post_final_reentry');
    assert.equal(ordinaryEvent.reason, 'Need additional evidence');
    assert.equal(ordinaryEvent.requested_scope, 'Add a focused comparison');
    const replay = runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    assert.equal(replay.verdict, 'unchanged');
    const invalid = spawnSync('node', [CLI, 'apply', '--bundle', bundle, '--input', inputPath, '--force'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(invalid.status, 2);
    assert.equal(JSON.parse(invalid.stdout).error, 'invalid_invocation');
  });

  it('reports runtime contract failures as blocked exit 1 while keeping invocation and envelope failures at exit 2', () => {
    const missing = spawnSync('node', [CLI, 'inspect', '--bundle', join(root, 'does-not-exist')], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(missing.status, 1, `expected exit 1, got ${missing.status}: ${missing.stderr || missing.stdout}`);
    const verdict = JSON.parse(missing.stdout);
    assert.equal(verdict.verdict, 'blocked');
    assert.equal(verdict.reason_code, 'operation_failed');
    assert.match(verdict.reason, /bundle not found/);
    assert.ok(!('error' in verdict), 'runtime failure must not use the invocation-error shape');

    const bundle = createTerminalFinalBundle(root, 'exit-classes');
    const malformedInput = join(root, 'malformed.json');
    writeFileSync(malformedInput, '{ not json');
    const malformed = spawnSync('node', [CLI, 'apply', '--bundle', bundle, '--input', malformedInput], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(malformed.status, 2);
    assert.equal(JSON.parse(malformed.stdout).error, 'invalid_invocation');

    const badShape = join(root, 'bad-shape.json');
    writeFileSync(badShape, JSON.stringify({ nope: true }));
    const shape = spawnSync('node', [CLI, 'apply', '--bundle', bundle, '--input', badShape], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(shape.status, 2);
    assert.equal(JSON.parse(shape.stdout).error, 'invalid_configuration');
  });

  it('preserves a labelled multiline focus reason and separate scope through exact recovery', () => {
    const bundle = createTerminalFinalBundle(root, 'focus-recovery');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const operationId = '71717171-7171-4717-8717-717171717171';
    const reason = [
      '用户的重点原话（逐字保留）：',
      '请加强现金流压力分析，并比较租赁与购买。',
      '',
      'Agent 对本轮额外研究方向的理解（可由用户修正）：',
      '比较两条路径在现金流压力下的成本、风险和适用条件。',
    ].join('\r\n');
    const input = requestFromInspection(inspection, {
      reason: `  ${reason}  `,
      requested_scope: '  增补现金流压力证据\r\n并更新相关结论  ',
    });
    const normalizedReason = reason.replaceAll('\r\n', '\n');
    const normalizedScope = '增补现金流压力证据\n并更新相关结论';

    assert.throws(() => applyPostFinalRecovery({
      bundlePath: bundle,
      input,
      operationId,
      hooks: { afterProfileCommit() { throw new PostFinalRecoveryCrashError('after_profile'); } },
    }), PostFinalRecoveryCrashError);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).verdict, 'recover_required');

    const recovered = runJson([CLI, 'recover', '--bundle', bundle, '--operation-id', operationId]);
    assert.equal(recovered.verdict, 'committed');
    const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
    assert.equal(
      profile.human_decision_checkpoints.hitl2.rationale,
      `Post-final rerun reason:\n${normalizedReason}\n\nRequested scope:\n${normalizedScope}`,
    );

    const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const event = events.find((candidate) => candidate.event === 'post_final_reentry');
    assert.equal(event.reason, normalizedReason);
    assert.equal(event.requested_scope, normalizedScope);
    assert.equal(events.filter((candidate) => candidate.event_id === event.event_id).length, 1);

    const replayPath = join(root, 'focus-replay.json');
    writeFileSync(replayPath, JSON.stringify(input));
    const replay = runJson([CLI, 'apply', '--bundle', bundle, '--input', replayPath]);
    assert.equal(replay.verdict, 'unchanged');
    assert.equal(readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter((candidate) => candidate.event_id === event.event_id).length, 1);
  });

  it('rejects a retired access envelope at the post-final ProfileSchema reader', () => {
    const bundle = createTerminalFinalBundle(root, 'legacy-access');
    const profilePath = join(bundle, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    profile.research_access = {
      status: 'available',
      probed_at: '2026-07-10T00:00:00.000Z',
      result_url: 'https://fixture.news-research.com/old-envelope',
      fetch_outcome: 'success',
    };
    writeFileSync(profilePath, `${stringifyYaml(profile).trimEnd()}\n`);

    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'blocked');
    assert.equal(inspection.reason_code, 'fresh_final_ineligible');
    assert.match(inspection.reason, /Unrecognized key|sample_observations/);
  });

  it('drives event to enter-phase to idempotent advance-status without a synthetic gate attempt', () => {
    const bundle = createTerminalFinalBundle(root, 'entry');
    assert.equal(JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8')).state, 'completed');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const inputPath = join(root, 'entry-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    assert.equal(auditPhaseStatus(bundle).outcome, 'post_final_reentry_pending_load');
    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    assert.equal(auditPhaseStatus(bundle).outcome, 'post_final_reentry_pending_status_sync');
    const first = runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    assert.equal(first.source_handoff_kind, 'post_final_reentry');
    assert.equal(JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8')).state, 'completed');
    assert.equal(auditPhaseStatus(bundle).outcome, 'passed');
    const before = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
    const second = runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    assert.equal(second.idempotent, true);
    assert.equal(readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'), before);
    const events = before.trim().split('\n').map(JSON.parse);
    assert.equal(events.filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded').length, 0);
    const load = events.find((event) => event.event === 'load_complete' && event.handoff_source_kind === 'post_final_reentry');
    assert.ok(load.handoff_source_event_sha256);
    const transition = events.find((event) => event.event === 'phase_transition' && event.source_handoff_kind === 'post_final_reentry');
    assert.equal(transition.source_handoff_load_index, events.indexOf(load));
  });

  it('allows the existing TopicTreeEvolution owner after complete exceptional synchronization and records the full witness', () => {
    const bundle = createTerminalFinalBundle(root, 'topic');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const inputPath = join(root, 'topic-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    const result = applyCanonicalTopicState({
      bundlePath: bundle,
      input: {
        context: 'rerun',
        actions: [{ action: 'add_topic', title: 'Additional comparison', slug_stem: 'comparison', must_answer: ['What differs?'], scope_role: 'comparison', depends_on_topic_uids: [], direction: { rerun_count: 1, action: 'add', new_search_dimensions: 'comparison', adjusted_depth: 'deeper comparison', search_guardrails: 'retain primary facts', rationale_excerpt: 'recorded rerun rationale' } }],
      },
    });
    assert.equal(result.verdict, 'committed');
    const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    assert.match(plan, /Additional comparison/);
  });

  it('lets a legacy profile without rerun_count complete the ReopenResearchPass rerun topic-state apply', () => {
    const bundle = createTerminalFinalBundle(root, 'legacy-no-count', {
      topicRegistry: [{ topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: 'What matters?' }],
    });
    // Legacy profile shape: hitl2.rerun_count was never materialized.
    const profilePath = join(bundle, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    delete profile.human_decision_checkpoints.hitl2.rerun_count;
    writeFileSync(profilePath, `${stringifyYaml(profile).trimEnd()}\n`);

    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'eligible');
    const inputPath = join(root, 'legacy-no-count-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    const applied = runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    assert.equal(applied.verdict, 'committed');
    // The committed event semantics preserve the absent key.
    const event = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).find((candidate) => candidate.event === 'post_final_reentry');
    assert.equal(Object.hasOwn(event.committed_after_profile_semantics.human_decision_checkpoints.hitl2, 'rerun_count'), false);

    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    const result = applyCanonicalTopicState({
      bundlePath: bundle,
      input: { context: 'rerun', actions: [{ action: 'add_topic', title: 'Legacy comparison', slug_stem: 'legacy-comparison', must_answer: ['What differs?'], scope_role: 'comparison', depends_on_topic_uids: [], direction: { rerun_count: 1, action: 'add', new_search_dimensions: 'comparison', adjusted_depth: 'deeper comparison', search_guardrails: 'retain primary facts', rationale_excerpt: 'recorded rerun rationale' } }] },
    });
    assert.equal(result.verdict, 'committed');
    assert.match(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), /Legacy comparison/);
  });

  it('does not turn post-final reentry into old-plan migration or topic adoption authority', () => {
    const bundle = createTerminalFinalBundle(root, 'old-plan', {
      topicRegistry: [{ topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: 'What matters?' }],
    });
    writeFileSync(join(bundle, 'rb_plan.md'), '---\nplan_basename: old-plan\nderived_topic_count: 1\ntopic_registry:\n  - id: "01"\n    slug: topic-a\n    title: Topic A\n---\n# Historical plan\n');
    const planBefore = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const inputPath = join(root, 'old-plan-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    const result = applyCanonicalTopicState({
      bundlePath: bundle,
      input: { context: 'rerun', actions: [{ action: 'add_topic', title: 'Blocked topic', slug_stem: 'blocked', must_answer: ['What is blocked?'], scope_role: 'supporting', depends_on_topic_uids: [], direction: { rerun_count: 1, action: 'add', new_search_dimensions: 'blocked path', adjusted_depth: 'none', search_guardrails: 'preserve current plan', rationale_excerpt: 'recorded rerun rationale' } }] },
    });
    assert.equal(result.reason_code, 'plan_invalid');
    assert.equal(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), planBefore);
    assert.equal(existsSync(join(bundle, '_diagnostics', 'topic-state')), false);
    assert.doesNotMatch(JSON.stringify(result), /migrat|adopt|upgrade|convert/i);
  });

  it('binds a prepared TopicTreeEvolution operation to the complete original exceptional witness and recovers after lifecycle drift', () => {
    const bundle = createTerminalFinalBundle(root, 'topic-recover');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const inputPath = join(root, 'topic-recover-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    assert.throws(() => applyCanonicalTopicState({
      bundlePath: bundle,
      crashAt: 'after_prepared',
      input: { context: 'rerun', actions: [{ action: 'add_topic', title: 'Recovered topic', slug_stem: 'recovered', must_answer: ['Recovered?'], scope_role: 'primary', depends_on_topic_uids: [], direction: { rerun_count: 1, action: 'add', new_search_dimensions: 'recovery', adjusted_depth: 'recover atomic state', search_guardrails: 'retain primary facts', rationale_excerpt: 'recorded rerun rationale' } }] },
    }), /simulated crash after_prepared/);
    const rootPath = join(bundle, '_diagnostics', 'topic-state');
    const operationId = readdirSync(rootPath)[0];
    const manifest = JSON.parse(readFileSync(join(rootPath, operationId, 'prepared.json'), 'utf8'));
    assert.equal(manifest.authorization.source_handoff_kind, 'post_final_reentry');
    assert.ok(manifest.authorization.source_handoff_event_id);
    assert.ok(manifest.authorization.source_handoff_event_sha256);
    assert.ok(Number.isInteger(manifest.authorization.source_handoff_transition_index));
    assert.equal(manifest.authorization.status_snapshot.current_gate, 'hitl2_recorded');
    const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
    status.current_gate = 'rerun_ready'; status.next_gate = 'seed_topics_ready';
    writeFileSync(join(bundle, 'rb_status.json'), `${JSON.stringify(status, null, 2)}\n`);
    const recovered = recoverCanonicalTopicState({ bundlePath: bundle, operationId });
    assert.equal(recovered.verdict, 'committed');
    assert.match(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), /Recovered topic/);
  });

  it('accepts only the event-bound rerun count delta and then projects descendant ownership', () => {
    const bundle = createTerminalFinalBundle(root, 'count');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const inputPath = join(root, 'count-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    const profilePath = join(bundle, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    profile.human_decision_checkpoints.hitl2.rerun_count = 1;
    writeFileSync(profilePath, `${stringifyYaml(profile).trimEnd()}\n`);
    runNode(['DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs', '--bundle', bundle, '--style', 'quick_factual']);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).stage, 'synchronized_count_incremented');
    const gate = runJson(['DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs', '--bundle', bundle, '--current-node', 'phases/phase-rerun.md']);
    assert.equal(gate.check.passed, true);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).stage, 'descendant_pipeline');
  });

  it('projects one read-only reentry action at event, load, and synchronized stages', () => {
    const bundle = createTerminalFinalBundle(root, 'reentry');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const inputPath = join(root, 'reentry-request.json');
    writeFileSync(inputPath, JSON.stringify(requestFromInspection(inspection)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    const eventStage = runJson(['DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'readiness_passed']);
    assert.equal(eventStage.post_final_recovery.next_action.kind, 'enter_phase');
    runNode(['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-rerun.md']);
    const loadStage = runJson(['DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'readiness_passed']);
    assert.equal(loadStage.post_final_recovery.next_action.kind, 'advance_status');
    runJson(['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', 'hitl2_recorded']);
    const synced = runJson(['DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs', '--bundle', bundle, '--at', 'hitl2_recorded']);
    assert.equal(synced.post_final_recovery.next_action.kind, 'topic_state');
    assert.equal(synced.normalized_target.status_gate, 'hitl2_recorded');
    assert.equal(existsSync(join(bundle, '_diagnostics', 'post-final-recovery')), true);
  });

  // Drive one full rerun cycle after a committed ReopenResearchPass event whose Final stage
  // legally updates a non-primary presentation file and publishes a newer
  // primary revision (BUG-236). Returns nothing; the bundle ends terminal at
  // the newer Final.
  function driveNewerFinalCycle(bundle, { legacyBinding = false, rewriteBase = false } = {}) {
    const tracePath = join(bundle, 'rb_trace.jsonl');
    const eventTimeWholeTreeDigest = readFinalReportInventory(bundle).sha256;
    if (legacyBinding) {
      const lines = readFileSync(tracePath, 'utf8').trim().split('\n');
      const eventIndex = lines.findIndex((line) => JSON.parse(line).event === 'post_final_reentry');
      const event = JSON.parse(lines[eventIndex]);
      delete event.previous_final.final_inventory_basis;
      event.previous_final.final_inventory_sha256 = eventTimeWholeTreeDigest;
      lines[eventIndex] = JSON.stringify(event);
      writeFileSync(tracePath, `${lines.join('\n')}\n`);
    }
    const chain = [
      ['rerun-ready', 'phases/phase-rerun.md', 'phases/phase-seed-topics.md'],
      ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
      ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
      ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
      ['wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md'],
      ['hitl2-recorded', 'phases/phase-hitl2.md', 'phases/phase-readiness.md'],
      ['readiness-passed', 'phases/phase-readiness.md', 'phases/phase-final.md'],
    ];
    const baseIndex = readFileSync(tracePath, 'utf8').trim().split('\n').length;
    const appended = chain.map(([gate, node, next], offset) => ({
      ts: `2026-02-01T00:00:${String(offset).padStart(2, '0')}.000Z`,
      event: 'gate_attempt',
      gate,
      passed: true,
      currentNodeRef: node,
      next,
    }));
    appended.push({
      ts: '2026-02-01T00:01:00.000Z',
      event: 'load_complete',
      entry: 'phases/phase-final.md',
      handoff_source_gate: 'readiness-passed',
      handoff_source_node: 'phases/phase-readiness.md',
      handoff_target_node: 'phases/phase-final.md',
      handoff_source_attempt_index: baseIndex + chain.length - 1,
    });
    writeFileSync(tracePath, `${readFileSync(tracePath, 'utf8').trim()}\n${appended.map(JSON.stringify).join('\n')}\n`);
    const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
    status.current_node = 'phases/phase-final.md';
    status.current_gate = 'readiness_passed';
    status.next_gate = 'none';
    writeFileSync(join(bundle, 'rb_status.json'), `${JSON.stringify(status, null, 2)}\n`);
    mkdirSync(join(bundle, 'final', 'topics'), { recursive: true });
    writeFileSync(join(bundle, 'final', 'topics', 'alpha.md'), '# Topic Alpha (updated)\n');
    writeFileSync(join(bundle, 'final', 'final_v1.md'), '# Newer primary revision\n');
    if (rewriteBase) {
      // BUG-247 shape: the base bytes are rewritten after the ReopenResearchPass event bound
      // its witness (an out-of-band legal reorganization of final/), so no
      // retained prefix can ever reproduce the bound digest again.
      const baseName = existsSync(join(bundle, 'final', 'final.md')) ? 'final.md' : 'report.md';
      writeFileSync(join(bundle, 'final', baseName), '# Delivered Final (reorganized)\n');
    }
  }

  it('keeps the second rerun a fresh candidate after non-primary updates and a newer primary revision', () => {
    const bundle = createTerminalFinalBundle(root, 'second-rerun');
    const first = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(first.verdict, 'eligible');
    const firstPath = join(root, 'second-rerun-request.json');
    writeFileSync(firstPath, JSON.stringify(requestFromInspection(first)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', firstPath]);

    driveNewerFinalCycle(bundle);
    const second = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.notEqual(second.reason_code, 'accepted_lineage_drift');
    assert.equal(second.verdict, 'eligible', JSON.stringify(second));

    const secondPath = join(root, 'second-rerun-request-2.json');
    writeFileSync(secondPath, JSON.stringify(requestFromInspection(second)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', secondPath]);
    const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const newest = events.filter((event) => event.event === 'post_final_reentry').at(-1);
    assert.equal(newest.previous_final.final_inventory_basis, 'primary_series');
    assert.equal(newest.previous_final.final_inventory_sha256, readFinalReportInventory(bundle).primary_sha256);
  });

  // BUG-246: the same second-rerun cycle over a MODERN primary series
  // (final.md base + final_vN.md revisions). The binding digest sorts primary
  // entries with localeCompare while the append proof used to rehash the plain
  // readdir byte order — reversed for modern-series names — so inspect was
  // permanently blocked at accepted_lineage_drift even when the retained bytes
  // were exact. The legacy report.md variant above never exposed the mismatch.
  it('keeps the second rerun a fresh candidate on a modern primary series (final.md base)', () => {
    const bundle = createTerminalFinalBundle(root, 'modern-second-rerun', { modernBase: true });
    const first = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(first.verdict, 'eligible');
    const firstPath = join(root, 'modern-second-rerun-request.json');
    writeFileSync(firstPath, JSON.stringify(requestFromInspection(first)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', firstPath]);

    driveNewerFinalCycle(bundle);
    const second = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.notEqual(second.reason_code, 'accepted_lineage_drift');
    assert.notEqual(second.reason_code, 'newer_final_inventory_drift');
    assert.equal(second.verdict, 'eligible', JSON.stringify(second));

    const secondPath = join(root, 'modern-second-rerun-request-2.json');
    writeFileSync(secondPath, JSON.stringify(requestFromInspection(second)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', secondPath]);
    const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const newest = events.filter((event) => event.event === 'post_final_reentry').at(-1);
    assert.equal(newest.previous_final.final_inventory_basis, 'primary_series');
    assert.equal(newest.previous_final.final_inventory_sha256, readFinalReportInventory(bundle).primary_sha256);
  });

  it('recovers a legacy whole-tree binding through the structural primary-series fallback', () => {
    const bundle = createTerminalFinalBundle(root, 'legacy-binding');
    const first = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(first.verdict, 'eligible');
    const firstPath = join(root, 'legacy-request.json');
    writeFileSync(firstPath, JSON.stringify(requestFromInspection(first)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', firstPath]);

    driveNewerFinalCycle(bundle, { legacyBinding: true });
    const second = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.notEqual(second.reason_code, 'accepted_lineage_drift');
    assert.equal(second.verdict, 'eligible', JSON.stringify(second));
    // The legacy structural fallback acceptance is never silent either.
    assert.ok(second.warnings.some((warning) => warning.includes('legacy_structural_fallback')), JSON.stringify(second.warnings));
    assert.equal(second.facts.retired_append_proof.basis, 'legacy_structural_fallback');
  });

  // BUG-247: the ReopenResearchPass witness bound a primary-series byte state that a later
  // out-of-band legal reorganization of final/ rewrote, so no retained
  // removal prefix can ever reproduce the bound digest (the retained digest
  // set is closed over the surviving immutable bytes). The append proof falls
  // back to the structural primary-series check — mirroring the legacy
  // whole-tree precedent — inspect returns to fresh eligibility with one
  // deterministic warning and exposes the accepted proof, and the fresh ReopenResearchPass
  // event binds the current lineage.
  it('recovers a primary-series binding with unreachable bound bytes through the structural fallback', () => {
    const bundle = createTerminalFinalBundle(root, 'unreachable-binding', { modernBase: true });
    const first = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(first.verdict, 'eligible');
    const firstPath = join(root, 'unreachable-binding-request.json');
    writeFileSync(firstPath, JSON.stringify(requestFromInspection(first)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', firstPath]);

    driveNewerFinalCycle(bundle, { rewriteBase: true });
    const second = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.notEqual(second.reason_code, 'accepted_lineage_drift');
    assert.notEqual(second.reason_code, 'newer_final_inventory_drift');
    assert.equal(second.verdict, 'eligible', JSON.stringify(second));
    assert.ok(second.warnings.some((warning) => warning.includes('primary_series_structural_fallback')), JSON.stringify(second.warnings));
    assert.equal(second.facts.retired_append_proof.basis, 'primary_series_structural_fallback');
    assert.deepEqual(second.facts.retired_append_proof.removed_targets, ['final/final_v1.md']);

    const secondPath = join(root, 'unreachable-binding-request-2.json');
    writeFileSync(secondPath, JSON.stringify(requestFromInspection(second)));
    runJson([CLI, 'apply', '--bundle', bundle, '--input', secondPath]);
    const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const newest = events.filter((event) => event.event === 'post_final_reentry').at(-1);
    assert.equal(newest.previous_final.final_inventory_basis, 'primary_series');
    assert.equal(newest.previous_final.final_inventory_sha256, readFinalReportInventory(bundle).primary_sha256);
  });
});
