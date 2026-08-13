import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { applyCanonicalTopicState, recoverCanonicalTopicState } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { auditPhaseStatus } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs';
import { inspectPostFinalRecovery } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs';
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
    const replay = runJson([CLI, 'apply', '--bundle', bundle, '--input', inputPath]);
    assert.equal(replay.verdict, 'unchanged');
    const invalid = spawnSync('node', [CLI, 'apply', '--bundle', bundle, '--input', inputPath, '--force'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(invalid.status, 2);
    assert.equal(JSON.parse(invalid.stdout).error, 'invalid_invocation');
  });

  it('rejects a retired access envelope at the post-final ProfileSchema reader', () => {
    const bundle = createTerminalFinalBundle(root, 'legacy-access');
    const profilePath = join(bundle, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    profile.research_access = {
      status: 'available',
      probed_at: '2026-07-10T00:00:00.000Z',
      result_url: 'https://example.com/old-envelope',
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

  it('allows the existing C3 owner after complete exceptional synchronization and records the full witness', () => {
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

  it('binds a prepared C3 operation to the complete original exceptional witness and recovers after lifecycle drift', () => {
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
});
