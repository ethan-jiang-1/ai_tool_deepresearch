// @impl GSK-004, RWG-021
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { projectWaveGatePublicVerdict } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-gate-verdict.mjs';

describe('Wave Gate public verdict projection', () => {
  it('projects a clean routed pass without quality debt', () => {
    assert.deepEqual(projectWaveGatePublicVerdict({ routeAvailable: true }), {
      passed: true,
      failed_rule_ids: [],
      degraded: false,
      degraded_rules: [],
    });
  });

  it('keeps unresolved routing blockers public when no eligible handoff exists', () => {
    assert.deepEqual(projectWaveGatePublicVerdict({
      failedRuleIds: ['queue_drained', 'shared_ref_count_floor'],
      routeAvailable: false,
    }), {
      passed: false,
      failed_rule_ids: ['queue_drained', 'shared_ref_count_floor'],
      degraded: false,
      degraded_rules: [],
    });
  });

  it('moves only an already-approved all-quality debt set into degraded_rules', () => {
    const directFailedRuleIds = ['shared_ref_count_floor'];
    const verdict = projectWaveGatePublicVerdict({
      failedRuleIds: directFailedRuleIds,
      degradedRuleIds: ['shared_ref_count_floor'],
      routeAvailable: true,
    });

    assert.deepEqual(verdict, {
      passed: true,
      failed_rule_ids: [],
      degraded: true,
      degraded_rules: ['shared_ref_count_floor'],
    });
    assert.deepEqual(directFailedRuleIds, ['shared_ref_count_floor']);
  });

  it('suppresses a candidate degraded handoff when another blocker or route is unavailable', () => {
    for (const input of [
      { failedRuleIds: ['shared_ref_count_floor', 'queue_drained'], degradedRuleIds: ['shared_ref_count_floor'], routeAvailable: true },
      { failedRuleIds: ['shared_ref_count_floor'], degradedRuleIds: ['shared_ref_count_floor'], routeAvailable: false },
    ]) {
      const verdict = projectWaveGatePublicVerdict(input);
      assert.equal(verdict.passed, false);
      assert.equal(verdict.degraded, false);
      assert.deepEqual(verdict.degraded_rules, []);
      assert.deepEqual(verdict.failed_rule_ids, input.failedRuleIds.slice().sort());
    }
  });
});
