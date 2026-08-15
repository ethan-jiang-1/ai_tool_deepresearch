import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalJson,
  evaluateCompositionHandoffConsistency,
  evaluateCompositionProceed,
  evaluateLegacyCompositionMigration,
  selectCompositionHandoffWitness,
  validateCompositionHandoffMigrationInput,
  validateCompositionHandoffReceipt,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/composition-handoff.mjs';

function profile(overrides = {}) {
  return {
    plan_basename: 'composition-test',
    research_profile: 'quick_factual',
    root_must_answer_set: ['What should be decided?'],
    human_decision_checkpoints: {
      hitl1: { status: 'recorded' },
      hitl2: {
        status: 'recorded',
        answerability_class: 'ready_substantive',
        user_decision: 'proceed_to_readiness',
        final_report_view: 'executive_brief',
        rerun_count: 0,
        composition_handoff: {
          contract_version: 1,
          for_rerun_count: 0,
          reader: { description: 'Decision makers', familiarity: 'working' },
          intended_use: 'Choose next actions.',
          primary_focus: 'Risks and trade-offs.',
          content_priorities: { foreground: ['Decision implications'], compress: ['Background'] },
          delivery: { language: 'en-US', length: 'standard', evidence_exposure: 'balanced', appendix: 'as_needed' },
        },
      },
    },
    ...overrides,
  };
}

function withHitl2(base, hitl2) {
  return {
    ...base,
    human_decision_checkpoints: {
      ...base.human_decision_checkpoints,
      hitl2,
    },
  };
}

function migrationProjection(base = profile()) {
  const hitl2 = base.human_decision_checkpoints.hitl2;
  return {
    final_report_view: hitl2.final_report_view,
    custom_slug: null,
    composition_handoff: hitl2.composition_handoff,
  };
}

describe('composition handoff evaluator', () => {
  it('uses recursive canonical JSON with sorted object keys and preserved array order', () => {
    assert.equal(canonicalJson({ b: [2, 1], a: { z: true, y: null } }), canonicalJson({ a: { y: null, z: true }, b: [2, 1] }));
    assert.notEqual(canonicalJson([2, 1]), canonicalJson([1, 2]));
  });

  it('creates one normalized receipt for a valid current-round proceed', () => {
    const result = evaluateCompositionProceed(profile());
    assert.equal(result.ok, true);
    assert.equal(result.receipt.schema_version, 'composition-handoff-receipt/v1');
    assert.match(result.receipt.projection_sha256, /^[a-f0-9]{64}$/);
    assert.match(result.receipt.profile_context_sha256, /^[a-f0-9]{64}$/);
  });

  it('rejects absent, stale, not_started, and unresolved custom proceed projections', () => {
    const base = profile();
    const noHandoff = withHitl2(base, { ...base.human_decision_checkpoints.hitl2, composition_handoff: undefined });
    const staleRound = withHitl2(base, { ...base.human_decision_checkpoints.hitl2, rerun_count: 1 });
    const notStarted = withHitl2(base, { ...base.human_decision_checkpoints.hitl2, final_report_view: 'not_started' });
    const unresolvedCustom = withHitl2(base, { ...base.human_decision_checkpoints.hitl2, final_report_view: 'custom', custom_slug: ' ', composition_handoff: { ...base.human_decision_checkpoints.hitl2.composition_handoff, view_instructions: undefined } });

    for (const item of [noHandoff, staleRound, notStarted, unresolvedCustom]) {
      assert.equal(evaluateCompositionProceed(item).ok, false);
    }
  });

  it('distinguishes an exact match, projection drift, and unrelated context drift', () => {
    const base = profile();
    const receipt = evaluateCompositionProceed(base).receipt;
    assert.equal(evaluateCompositionHandoffConsistency(base, receipt).kind, 'match');

    const projectionDrift = withHitl2(base, { ...base.human_decision_checkpoints.hitl2, final_report_view: 'claim_judgment' });
    assert.equal(evaluateCompositionHandoffConsistency(projectionDrift, receipt).kind, 'composition_projection_drift');

    const contextDrift = { ...base, root_must_answer_set: ['A changed question'] };
    assert.equal(evaluateCompositionHandoffConsistency(contextDrift, receipt).kind, 'profile_context_drift');
  });

  it('rejects malformed and fingerprint-inconsistent witnesses', () => {
    const receipt = evaluateCompositionProceed(profile()).receipt;
    assert.equal(validateCompositionHandoffReceipt({ ...receipt, projection_sha256: '0'.repeat(64) }).ok, false);
    assert.equal(validateCompositionHandoffReceipt({ ...receipt, custom_slug: 'not-allowed' }).ok, false);
  });

  it('classifies only one explicit pre-v1 predecessor as eligible for migration', () => {
    const predecessor = {
      gate: 'hitl2-recorded',
      passed: true,
      currentNodeRef: 'phases/phase-hitl2.md',
      next: 'phases/phase-readiness.md',
    };
    const input = migrationProjection();
    assert.equal(evaluateLegacyCompositionMigration({ profile: profile(), projection: input, predecessor }).kind, 'eligible_migration');
    assert.equal(evaluateLegacyCompositionMigration({ profile: profile(), projection: input, predecessor: { ...predecessor, composition_handoff_receipt: {} } }).kind, 'ineligible_migration');
    assert.equal(evaluateLegacyCompositionMigration({ profile: profile(), projection: input, predecessor, has_final_entry: true }).kind, 'ineligible_migration');
    assert.equal(evaluateLegacyCompositionMigration({ profile: profile(), predecessor }).reason_code, 'composition_migration_input_schema_invalid');
  });

  it('requires one complete current-round migration input and an exact predecessor-bound witness', () => {
    const base = profile();
    const input = migrationProjection(base);
    assert.equal(validateCompositionHandoffMigrationInput(input).ok, true);
    assert.equal(validateCompositionHandoffMigrationInput({ ...input, unknown: true }).ok, false);
    assert.equal(validateCompositionHandoffMigrationInput({ ...input, composition_handoff: { ...input.composition_handoff, for_rerun_count: 1 } }).ok, true);

    const predecessor = {
      index: 12,
      sourceGate: 'hitl2-recorded',
      sourceNode: 'phases/phase-hitl2.md',
      targetNode: 'phases/phase-readiness.md',
      sourceAttemptTs: '2026-08-15T00:00:00.000Z',
      sourceAttemptLineSha256: 'a'.repeat(64),
      event: {},
    };
    const receipt = evaluateCompositionProceed(base).receipt;
    const selected = selectCompositionHandoffWitness({
      predecessor,
      trace_events: [{
        index: 14,
        event: {
          event: 'composition_handoff_migration',
          source_gate: predecessor.sourceGate,
          source_attempt_index: predecessor.index,
          source_attempt_ts: predecessor.sourceAttemptTs,
          source_attempt_sha256: predecessor.sourceAttemptLineSha256,
          historical_context_equality: 'unproven',
          composition_handoff_receipt: receipt,
        },
      }],
    });
    assert.equal(selected.kind, 'legacy_migration_receipt');
    assert.equal(selectCompositionHandoffWitness({ predecessor, trace_events: [] }).reason_code, 'legacy_migration_witness_missing');
    assert.equal(selectCompositionHandoffWitness({
      predecessor,
      trace_events: [{ event: { event: 'composition_handoff_migration', source_attempt_index: predecessor.index } }],
    }).reason_code, 'legacy_migration_witness_missing');
  });
});
