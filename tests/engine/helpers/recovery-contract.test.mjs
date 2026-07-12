import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecoveryRootFindingSchema,
  RecoverySummarySchema,
  assessStructuredRecoveryAction,
} from '../../../DPT_FRAMEWORK/engine/helpers/recovery-contract.mjs';

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
});
