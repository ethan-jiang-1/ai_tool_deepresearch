import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecoveryRootFindingSchema,
  RecoverySummarySchema,
  assessStructuredRecoveryAction,
  buildRecoverySummary,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/recovery-contract.mjs';

describe('recovery contract', () => {
  it('enforces per-root action/status cross-field rules', () => {
    assert.equal(RecoveryRootFindingSchema.safeParse({
      id: 'root-a', source_kind: 'canonical_topic', source_ref: 'finding-a',
      sanctioned_path_status: 'reachable', direct_blocker: null, recommended_action: null,
    }).success, false);
    assert.equal(RecoveryRootFindingSchema.safeParse({
      id: 'root-a', source_kind: 'canonical_topic', source_ref: 'finding-a',
      sanctioned_path_status: 'missing_contract', direct_blocker: 'missing capability',
      recommended_action: { kind: 'repair_surface', target_ref: 'reference/a.md', sanctioned: true },
    }).success, false);
  });

  it('requires every blocking canonical finding to project to a root', () => {
    const finding = {
      id: 'finding-a', rule_id: 'unregistered_durable_topic', classification: 'blocking',
      topic_identity: 'topic-x', primary_surface: 'reference/x.md', supporting_details: [], repair_kind: 'reconcile_topic_identity',
    };
    assert.equal(RecoverySummarySchema.safeParse({
      canonical_topic_findings: [finding], root_findings: [], supporting_finding_count: 0,
    }).success, false);
  });

  it('returns one reachable sanctioned surface action and rejects unsanctioned repair', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'recovery-contract-'));
    try {
      const reachable = assessStructuredRecoveryAction(dir, {
        kind: 'repair_surface', target_ref: 'reference/a.md', sanctioned: true, preconditions: [],
      });
      assert.equal(reachable.sanctioned_path_status, 'reachable');
      assert.equal(reachable.recommended_action.target_ref, 'reference/a.md');
      const unavailable = assessStructuredRecoveryAction(dir, {
        kind: 'repair_surface', target_ref: 'reference/a.md', preconditions: [],
      });
      assert.equal(unavailable.sanctioned_path_status, 'not_applicable');
      assert.equal(unavailable.recommended_action, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps a clean Final at the Final owner instead of turning C5 availability into a default action', () => {
    const summary = buildRecoverySummary({
      statusPosition: { current_node: 'phases/phase-final.md' },
      finalInventory: { valid: true, classification: 'modern_base' },
      postFinalInspection: {
        verdict: 'eligible',
        reason: 'C5 is mechanically available only.',
        next_action: { kind: 'prepare_request', command: null, target_ref: 'retained request JSON' },
      },
    });
    assert.deepEqual(summary.root_findings[0].recommended_action, {
      kind: 'current_owner',
      target_ref: 'phases/phase-final.md',
      preconditions: [],
      sanctioned: true,
      delivery_stage: 'refinement',
    });
  });

  it('puts an inventory blocker before active C5 and preserves exact accepted C5 owners otherwise', () => {
    const inventoryBlocked = buildRecoverySummary({
      statusPosition: { current_node: 'phases/phase-final.md' },
      finalInventory: { valid: false, reason: 'Final primary inventory is invalid: gapped_revision' },
      postFinalInspection: {
        verdict: 'unchanged',
        reason: 'An accepted C5 lineage is active.',
        next_action: { kind: 'enter_phase', command: 'node enter-phase', target_ref: 'phases/phase-rerun.md' },
      },
    });
    assert.equal(inventoryBlocked.root_findings[0].sanctioned_path_status, 'missing_contract');
    assert.equal(inventoryBlocked.root_findings[0].recommended_action, null);
    assert.match(inventoryBlocked.root_findings[0].direct_blocker, /gapped_revision/);

    const activeC5 = buildRecoverySummary({
      statusPosition: { current_node: 'phases/phase-final.md' },
      finalInventory: { valid: true, classification: 'modern_base' },
      postFinalInspection: {
        verdict: 'unchanged',
        reason: 'An accepted C5 lineage is active.',
        next_action: { kind: 'advance_status', command: 'node advance-status', target_ref: 'readiness_passed' },
      },
    });
    assert.equal(activeC5.root_findings[0].recommended_action.kind, 'advance_status');
    assert.equal(activeC5.root_findings[0].recommended_action.target_ref, 'readiness_passed');
  });
});
