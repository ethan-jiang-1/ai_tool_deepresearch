// subagent-relay-fork-dispatch.test.mjs — @impl FRE-004
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { rmSync } from 'node:fs';

import {
  classifyBranch,
  forkRouter,
  convergeRepair,
  validateAndDiagnose,
  inspectFailure,
  SubagentWorkflowState,
  SlotResult,
  mergeResults,
  forkAndStageSubagents,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { baseState, tempDir } from './subagent-relay-helpers.mjs';

describe('Gate fork router', () => {
  it('routes deterministically by priority', () => {
    assert.equal(classifyBranch(baseState()), 'pass');
    assert.equal(classifyBranch(baseState({ ref_count: 2 })), 'fail_a');
    assert.equal(classifyBranch(baseState({ topicReadiness: 'not_ready' })), 'fail_b');
    assert.equal(classifyBranch(baseState({ ref_count: 0, topicReadiness: 'blocked' })), 'blocked');
    assert.equal(classifyBranch(baseState({ ref_count: 0, topicReadiness: 'not_ready' })), 'fail_b');
  });

  it('forkRouter returns the branch and step', () => {
    const routed = forkRouter(baseState());
    assert.equal(routed.branch, 'pass');
    assert.equal(routed.step.name, 'pass_branch');
  });
});

describe('Repair, C&I, and pipeline split', () => {
  it('all failed routes through repair semantics', () => {
    const results = [
      { slotKey: 'a', roleAgentKey: 'dpt-source-intake', status: 'failed', summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [] },
      { slotKey: 'b', roleAgentKey: 'dpt-source-diagnostic', status: 'failed', summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [] },
    ];
    const merged = mergeResults(results, baseState());
    assert.equal(merged.subagent_all_failed, true);
    assert.equal(convergeRepair(merged).outcome, 'pass');
  });

  it('validateAndDiagnose produces diagnostics for invalid state', () => {
    const result = validateAndDiagnose({ ...baseState(), ref_count: 'bad' }, SubagentWorkflowState);
    assert.equal(result.passed, false);
    assert.ok(inspectFailure(result.errors).length > 0);
  });

  it('forkAndStageSubagents stages slots and signals parent to launch agents', () => {
    const testDir = tempDir();
    try {
      const result = forkAndStageSubagents(baseState(), testDir);
      assert.equal(result.awaitingAgent, true);
      assert.equal(result.slots.length, 4);
      assert.ok(result.phaseLog.some((t) => t.phase === 'await_agent'));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('convergeRepair detects stall when state stops changing', () => {
    // blocked → classifyBranch returns 'blocked' immediately, before any iteration
    const dead = { ...baseState(), ref_count: 0, topicReadiness: 'blocked' };
    const deadResult = convergeRepair(dead, 3);
    assert.equal(deadResult.outcome, 'blocked');
    assert.equal(deadResult.iterations, 0);
  });

  it('convergeRepair respects maxIterations', () => {
    // ref_count=0 < ref_floor=5 → fail_a. Repair adds 2 per iteration.
    // With maxIterations=1, only one repair cycle runs.
    const low = baseState({ ref_count: 0 });
    const result = convergeRepair(low, 1);
    assert.equal(result.iterations, 1);
    assert.equal(result.state.ref_count, 2);
  });

  it('validateAndDiagnose returns passed for valid state', () => {
    const result = validateAndDiagnose(baseState(), SubagentWorkflowState);
    assert.equal(result.passed, true);
  });

  it('forkAndStageSubagents routes non-pass branch through convergeRepair', () => {
    const testDir = tempDir();
    try {
      const result = forkAndStageSubagents(baseState({ ref_count: 0 }), testDir);
      // fail_a → convergeRepair should run, no slots dispatched
      assert.equal(result.slots.length, 0);
      assert.ok(result.phaseLog.some((t) => t.phase === 'converge_repair'));
      assert.ok(result.finalState.ref_count >= 2);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('inspectFailure handles multiple Zod error codes', () => {
    // invalid_enum_value
    const badEnum = SubagentWorkflowState.safeParse({ ...baseState(), topicReadiness: 'unknown' });
    assert.equal(badEnum.success, false);
    const enumDiags = inspectFailure(badEnum.error);
    const enumDiag = enumDiags.find((d) => d.code === 'invalid_value');
    assert.ok(enumDiag, 'should diagnose invalid_value');

    // too_small
    const negEvidence = SlotResult.safeParse({
      slotKey: 'test', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: -1, references: [], confidence: 0, notes: [],
    });
    assert.equal(negEvidence.success, false);
    const smallDiags = inspectFailure(negEvidence.error);
    const smallDiag = smallDiags.find((d) => d.code === 'too_small');
    assert.ok(smallDiag, 'should diagnose too_small');
  });

});
