import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml } from 'yaml';
import {
  applyPostFinalRecovery,
  inspectPostFinalRecovery,
  PostFinalRecoveryCrashError,
  recoverPostFinalRecovery,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs';
import { createTerminalFinalBundle, requestFromInspection } from '../../integration/cli/post-final-recovery-fixture.mjs';

const rerunDefinition = JSON.parse(readFileSync('DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json', 'utf8'));
const rerunCountRule = rerunDefinition.rules.find((rule) => rule.id === 'rerun_count_valid' && rule.check === 'rerun_count_limit');
assert.equal(rerunCountRule?.operator, 'less_than');
assert.ok(Number.isInteger(rerunCountRule?.value) && rerunCountRule.value > 0);

describe('post-final recovery helper', { concurrency: false }, () => {
  let root;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'dpt-post-final-helper-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('inspects, normalizes semantics, commits event-last, and replays unchanged', () => {
    const bundle = createTerminalFinalBundle(root, 'happy');
    const beforeStatus = readFileSync(join(bundle, 'rb_status.json'));
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'eligible');
    const request = requestFromInspection(inspection, { reason: '  Need\r\nmore evidence  ', requested_scope: ' Compare A\rB ' });
    const applied = applyPostFinalRecovery({ bundlePath: bundle, input: request });
    assert.equal(applied.verdict, 'committed');
    assert.equal(applied.stage, 'pre_entry');
    assert.deepEqual(readFileSync(join(bundle, 'rb_status.json')), beforeStatus);
    const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
    assert.equal(profile.human_decision_checkpoints.hitl2.user_decision, 'rerun');
    assert.equal(profile.human_decision_checkpoints.hitl2.rerun_count, 0);
    assert.equal(profile.human_decision_checkpoints.hitl2.rationale, 'Post-final rerun reason:\nNeed\nmore evidence\n\nRequested scope:\nCompare A\nB');
    const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events.filter((event) => event.event === 'post_final_reentry').length, 1);
    const replay = applyPostFinalRecovery({ bundlePath: bundle, input: request });
    assert.equal(replay.verdict, 'unchanged');
    assert.equal(readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter((event) => event.event === 'post_final_reentry').length, 1);
    const different = applyPostFinalRecovery({ bundlePath: bundle, input: { ...request, reason: 'Different semantics' } });
    assert.equal(different.verdict, 'blocked');
    assert.equal(different.reason_code, 'different_request_same_final');
  });

  it('keeps inspect read-only and leaves semantic request selection outside the Engine', () => {
    const bundle = createTerminalFinalBundle(root, 'inspect-only');
    const before = {
      status: readFileSync(join(bundle, 'rb_status.json'), 'utf8'),
      profile: readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'),
      trace: readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'),
      final: readFileSync(join(bundle, 'final', 'report.md'), 'utf8'),
      recoveryRootExists: existsSync(join(bundle, '_diagnostics', 'post-final-recovery')),
    };

    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'eligible');
    assert.equal(inspection.next_action.kind, 'prepare_request');
    assert.deepEqual({
      status: readFileSync(join(bundle, 'rb_status.json'), 'utf8'),
      profile: readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'),
      trace: readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'),
      final: readFileSync(join(bundle, 'final', 'report.md'), 'utf8'),
      recoveryRootExists: existsSync(join(bundle, '_diagnostics', 'post-final-recovery')),
    }, before);

    // The Engine retains opaque Agent-selected request text; it does not classify feedback.
    const request = requestFromInspection(inspection, {
      reason: 'Need a newly retained source before changing the conclusion.',
      requested_scope: 'Compare the new source with the current evidence map.',
    });
    const applied = applyPostFinalRecovery({ bundlePath: bundle, input: request });
    assert.equal(applied.verdict, 'committed');
    const event = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).at(-1);
    assert.equal(event.reason, request.reason);
    assert.equal(event.requested_scope, request.requested_scope);
  });

  it('blocks the next rerun before workspace creation when the active rule would fail', () => {
    const bundle = createTerminalFinalBundle(root, 'limit', { rerunCount: rerunCountRule.value - 1 });
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'blocked');
    assert.equal(inspection.reason_code, 'rerun_limit_exhausted');
    assert.equal(inspection.next_action.kind, 'new_bundle_decision');
    assert.equal(existsSync(join(bundle, '_diagnostics', 'post-final-recovery')), false);
  });

  it('uses the shared primary-series resolver while retaining the complete Final inventory digest', () => {
    const bundle = createTerminalFinalBundle(root, 'primary-series');
    mkdirSync(join(bundle, 'final', 'supplementary'), { recursive: true });
    writeFileSync(join(bundle, 'final', 'supplementary', 'notes.md'), '# Supplementary\n');

    const accepted = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(accepted.verdict, 'eligible');
    assert.equal(accepted.facts.request_bindings.expected_final_lineage.final_inventory_sha256.length, 64);

    writeFileSync(join(bundle, 'final', 'final_v2.md'), '# Gapped canonical revision\n');
    const rejected = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(rejected.verdict, 'blocked');
    assert.equal(rejected.reason_code, 'fresh_final_ineligible');
    assert.match(rejected.reason, /non_contiguous_revisions/);
  });

  it('short-circuits ResearchConfigLock, TopicTreeEvolution, and accepted ReopenResearchPass workspace owners', () => {
    const c2 = createTerminalFinalBundle(root, 'c2');
    mkdirSync(join(c2, '_diagnostics', 'artifact-persistence', 'op'), { recursive: true });
    writeFileSync(join(c2, '_diagnostics', 'artifact-persistence', 'op', 'operation.json'), '{}');
    assert.equal(inspectPostFinalRecovery({ bundlePath: c2 }).reason_code, 'artifact_persistence_owner');
    const c3 = createTerminalFinalBundle(root, 'c3');
    mkdirSync(join(c3, '_diagnostics', 'topic-state', 'op'), { recursive: true });
    writeFileSync(join(c3, '_diagnostics', 'topic-state', 'op', 'prepared.json'), '{}');
    assert.equal(inspectPostFinalRecovery({ bundlePath: c3 }).reason_code, 'topic_state_owner');
    const c5 = createTerminalFinalBundle(root, 'c5');
    const inspection = inspectPostFinalRecovery({ bundlePath: c5 });
    const operationId = '11111111-1111-4111-8111-111111111111';
    assert.throws(() => applyPostFinalRecovery({ bundlePath: c5, input: requestFromInspection(inspection), operationId, hooks: { afterPreparedPublication() { throw new PostFinalRecoveryCrashError('after_prepared'); } } }), PostFinalRecoveryCrashError);
    const owned = inspectPostFinalRecovery({ bundlePath: c5 });
    assert.equal(owned.verdict, 'recover_required');
    assert.equal(owned.operation_id, operationId);
  });

  it('rolls forward exact prepared state after profile interruption', () => {
    const bundle = createTerminalFinalBundle(root, 'crash-profile');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const operationId = '22222222-2222-4222-8222-222222222222';
    assert.throws(() => applyPostFinalRecovery({ bundlePath: bundle, input: requestFromInspection(inspection), operationId, hooks: { afterProfileCommit() { throw new PostFinalRecoveryCrashError('after_profile'); } } }), PostFinalRecoveryCrashError);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).verdict, 'recover_required');
    const recovered = recoverPostFinalRecovery({ bundlePath: bundle, operationId });
    assert.equal(recovered.verdict, 'committed');
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).stage, 'pre_entry');
  });

  it('blocks terminal-status drift and missing or drifted staged files without overwrite', () => {
    const statusBundle = createTerminalFinalBundle(root, 'status-drift');
    const statusInspection = inspectPostFinalRecovery({ bundlePath: statusBundle });
    const statusId = '55555555-5555-4555-8555-555555555555';
    assert.throws(() => applyPostFinalRecovery({ bundlePath: statusBundle, input: requestFromInspection(statusInspection), operationId: statusId, hooks: { afterPreparedPublication() { throw new PostFinalRecoveryCrashError('after_prepared'); } } }), PostFinalRecoveryCrashError);
    const status = JSON.parse(readFileSync(join(statusBundle, 'rb_status.json'), 'utf8'));
    status.state = 'changed';
    writeFileSync(join(statusBundle, 'rb_status.json'), `${JSON.stringify(status, null, 2)}\n`);
    assert.equal(recoverPostFinalRecovery({ bundlePath: statusBundle, operationId: statusId }).reason_code, 'terminal_status_drift');

    const missingBundle = createTerminalFinalBundle(root, 'missing-stage');
    const missingInspection = inspectPostFinalRecovery({ bundlePath: missingBundle });
    const missingId = '66666666-6666-4666-8666-666666666666';
    assert.throws(() => applyPostFinalRecovery({ bundlePath: missingBundle, input: requestFromInspection(missingInspection), operationId: missingId, hooks: { afterPreparedPublication() { throw new PostFinalRecoveryCrashError('after_prepared'); } } }), PostFinalRecoveryCrashError);
    rmSync(join(missingBundle, '_diagnostics', 'post-final-recovery', missingId, 'event.jsonl'));
    assert.equal(recoverPostFinalRecovery({ bundlePath: missingBundle, operationId: missingId }).reason_code, 'staged_file_missing');

    const hashBundle = createTerminalFinalBundle(root, 'hash-stage');
    const hashInspection = inspectPostFinalRecovery({ bundlePath: hashBundle });
    const hashId = '77777777-7777-4777-8777-777777777777';
    assert.throws(() => applyPostFinalRecovery({ bundlePath: hashBundle, input: requestFromInspection(hashInspection), operationId: hashId, hooks: { afterPreparedPublication() { throw new PostFinalRecoveryCrashError('after_prepared'); } } }), PostFinalRecoveryCrashError);
    appendFileSync(join(hashBundle, '_diagnostics', 'post-final-recovery', hashId, 'profile.after.yaml'), '# drift\n');
    assert.equal(recoverPostFinalRecovery({ bundlePath: hashBundle, operationId: hashId }).reason_code, 'staged_hash_drift');
  });

  it('blocks rewritten, truncated, and malformed trace suffixes', () => {
    for (const [name, mutate, expected] of [
      ['rewrite', (bundle) => { const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'); writeFileSync(join(bundle, 'rb_trace.jsonl'), trace.replace('readiness-passed', 'readiness-altered')); }, 'trace_prefix_drift'],
      ['truncate', (bundle) => { writeFileSync(join(bundle, 'rb_trace.jsonl'), ''); }, 'trace_prefix_truncated'],
      ['malformed', (bundle) => { appendFileSync(join(bundle, 'rb_trace.jsonl'), '{bad json}\n'); }, 'trace_suffix_malformed'],
    ]) {
      const bundle = createTerminalFinalBundle(root, `trace-${name}`);
      const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
      const result = applyPostFinalRecovery({ bundlePath: bundle, input: requestFromInspection(inspection), hooks: { afterPreparedPublication() { mutate(bundle); } } });
      assert.equal(result.reason_code, expected);
    }
  });

  it('cleans an event-committed workspace exactly and leaves one event', () => {
    const bundle = createTerminalFinalBundle(root, 'cleanup');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const operationId = '88888888-8888-4888-8888-888888888888';
    assert.throws(() => applyPostFinalRecovery({ bundlePath: bundle, input: requestFromInspection(inspection), operationId, hooks: { afterEventAppend() { throw new PostFinalRecoveryCrashError('after_event'); } } }), PostFinalRecoveryCrashError);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).verdict, 'recover_required');
    const cleaned = recoverPostFinalRecovery({ bundlePath: bundle, operationId });
    assert.equal(cleaned.verdict, 'cleaned');
    const events = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events.filter((event) => event.event_id === `post_final_reentry:${operationId}`).length, 1);
    assert.equal(inspectPostFinalRecovery({ bundlePath: bundle }).stage, 'pre_entry');
  });

  it('tolerates authority-neutral trace suffix and blocks relevant authority suffix', () => {
    const neutral = createTerminalFinalBundle(root, 'neutral');
    const neutralInspection = inspectPostFinalRecovery({ bundlePath: neutral });
    const neutralId = '33333333-3333-4333-8333-333333333333';
    const neutralResult = applyPostFinalRecovery({ bundlePath: neutral, input: requestFromInspection(neutralInspection), operationId: neutralId, hooks: { afterPreparedPublication() { appendFileSync(join(neutral, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'diagnostic', detail: 'neutral' })}\n`); } } });
    assert.equal(neutralResult.verdict, 'committed');

    const relevant = createTerminalFinalBundle(root, 'relevant');
    const relevantInspection = inspectPostFinalRecovery({ bundlePath: relevant });
    const relevantId = '44444444-4444-4444-8444-444444444444';
    const blocked = applyPostFinalRecovery({ bundlePath: relevant, input: requestFromInspection(relevantInspection), operationId: relevantId, hooks: { afterPreparedPublication() { appendFileSync(join(relevant, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'gate_attempt', gate: 'readiness-passed', passed: false, currentNodeRef: 'phases/phase-readiness.md', next: null })}\n`); } } });
    assert.equal(blocked.verdict, 'blocked');
    assert.equal(blocked.reason_code, 'trace_authority_suffix');
  });

  it('keeps safe pre-prepared residue advisory and blocks unsafe root entries', () => {
    const bundle = createTerminalFinalBundle(root, 'residue');
    mkdirSync(join(bundle, '_diagnostics', 'post-final-recovery', 'partial'), { recursive: true });
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(inspection.verdict, 'eligible');
    assert.equal(inspection.warnings.length, 1);
    const applied = applyPostFinalRecovery({ bundlePath: bundle, input: requestFromInspection(inspection) });
    assert.equal(applied.verdict, 'committed');
    assert.equal(lstatSync(join(bundle, '_diagnostics', 'post-final-recovery', 'partial')).isDirectory(), true);

    const unsafe = createTerminalFinalBundle(root, 'unsafe');
    mkdirSync(join(unsafe, '_diagnostics', 'post-final-recovery'), { recursive: true });
    symlinkSync(join(unsafe, 'final'), join(unsafe, '_diagnostics', 'post-final-recovery', 'bad'));
    assert.equal(inspectPostFinalRecovery({ bundlePath: unsafe }).reason_code, 'workspace_root_unsafe');
  });

  it('blocks stale logical identity and unknown request fields without mutation', () => {
    const bundle = createTerminalFinalBundle(root, 'stale');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    const stale = requestFromInspection(inspection);
    stale.expected_bundle_identity.plan_basename = 'other';
    assert.equal(applyPostFinalRecovery({ bundlePath: bundle, input: stale }).reason_code, 'request_lineage_mismatch');
    assert.throws(() => applyPostFinalRecovery({ bundlePath: bundle, input: { ...requestFromInspection(inspection), force: true } }), /unrecognized/i);
  });

  it('retires the old accepted lineage only after a newer legal Final delivery', () => {
    const bundle = createTerminalFinalBundle(root, 'new-final');
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });
    applyPostFinalRecovery({ bundlePath: bundle, input: requestFromInspection(inspection) });
    appendFileSync(join(bundle, 'rb_trace.jsonl'), [
      { ts: '2026-02-01T00:00:00.000Z', event: 'gate_attempt', gate: 'readiness-passed', phase: 'readiness', passed: true, currentNodeRef: 'phases/phase-readiness.md', next: 'phases/phase-final.md' },
      { ts: '2026-02-01T00:00:01.000Z', event: 'load_complete', entry: 'phases/phase-final.md', handoff_source_gate: 'readiness-passed', handoff_source_node: 'phases/phase-readiness.md', handoff_target_node: 'phases/phase-final.md', handoff_source_attempt_index: 3 },
    ].map(JSON.stringify).join('\n') + '\n');
    const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
    status.current_node = 'phases/phase-final.md'; status.current_gate = 'readiness_passed'; status.next_gate = 'none';
    writeFileSync(join(bundle, 'rb_status.json'), `${JSON.stringify(status, null, 2)}\n`);
    writeFileSync(join(bundle, 'final', 'report.md'), '# Premature New Final\n');
    const fresh = inspectPostFinalRecovery({ bundlePath: bundle });
    assert.equal(fresh.verdict, 'blocked');
    assert.equal(fresh.reason_code, 'accepted_lineage_drift');
    assert.match(fresh.reason, /normal descendant lineage/);
  });
});
