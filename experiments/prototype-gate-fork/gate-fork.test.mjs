// gate-fork.test.mjs — @impl GAF-001, COS-001, FOR-001, CHI-002
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateBranch, forkRouter, convergeRepair,
  passStep, failAStep, failBStep, blockedStep,
  sharedRepairStep,
  loadNextSegment, runForkPipeline,
  checkAndReflect, inspectFailure,
  WorkflowState,
} from './gate-fork.mjs';

describe('Gate fork router (GAF-001)', () => {
  it('routes to pass when all criteria met', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
    assert.equal(evaluateBranch(state), 'pass');
  });

  it('routes to fail_a when ref_count below floor', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
    assert.equal(evaluateBranch(state), 'fail_a');
  });

  it('routes to fail_b when topic not ready', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'not_ready' };
    assert.equal(evaluateBranch(state), 'fail_b');
  });

  it('routes to blocked when topic is blocked (highest priority)', () => {
    // blocked takes priority even when ref_count is also below floor
    const state = { current_gate: 'wave0_complete', ref_count: 0, ref_floor: 5, topicReadiness: 'blocked' };
    assert.equal(evaluateBranch(state), 'blocked');
  });

  it('forkRouter returns correct step for each branch', () => {
    const passState = { current_gate: 'x', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
    const r1 = forkRouter(passState);
    assert.equal(r1.branch, 'pass');
    assert.equal(r1.step.name, 'pass_branch');

    const failAState = { current_gate: 'x', ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
    const r2 = forkRouter(failAState);
    assert.equal(r2.branch, 'fail_a');
    assert.equal(r2.step.name, 'fail_a_branch');

    const failBState = { current_gate: 'x', ref_count: 5, ref_floor: 5, topicReadiness: 'not_ready' };
    const r3 = forkRouter(failBState);
    assert.equal(r3.branch, 'fail_b');
    assert.equal(r3.step.name, 'fail_b_branch');

    const blockedState = { current_gate: 'x', ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' };
    const r4 = forkRouter(blockedState);
    assert.equal(r4.branch, 'blocked');
    assert.equal(r4.step.name, 'blocked_branch');
  });

  it('priority: fail_b (topic) over fail_a (reference)', () => {
    // Both fail_a and fail_b conditions met → fail_b wins
    const state = { current_gate: 'x', ref_count: 2, ref_floor: 5, topicReadiness: 'not_ready' };
    assert.equal(evaluateBranch(state), 'fail_b');
  });
});

describe('Conditional segments (COS-001)', () => {
  it('pass branch advances to next wave', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
    const result = passStep.execute(state);
    assert.equal(result.current_gate, 'wave_next');
  });

  it('fail_a branch records topic repair attempt', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 2, ref_floor: 5, topicReadiness: 'not_ready' };
    const result = failAStep.execute(state);
    assert.equal(result.topicRepairAttempted, true);
    // ref_count unchanged by fail_a (topic repair only)
    assert.equal(result.ref_count, 2);
  });

  it('fail_b branch supplements one reference', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
    const result = failBStep.execute(state);
    assert.equal(result.ref_count, 3);
    // topicReadiness unchanged
    assert.equal(result.topicReadiness, 'ready');
  });

  it('blocked branch halts to HITL', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' };
    const result = blockedStep.execute(state);
    assert.equal(result.current_gate, 'blocked_hitl');
  });

  it('shared repair fixes both reference and topic issues simultaneously', () => {
    const state = { current_gate: 'x', ref_count: 2, ref_floor: 5, topicReadiness: 'not_ready' };
    const result = sharedRepairStep.execute(state);
    assert.equal(result.ref_count, 4); // 2 → 4 (+2)
    assert.equal(result.topicReadiness, 'ready'); // not_ready → ready
  });

  it('shared repair does not change blocked topic readiness', () => {
    const state = { current_gate: 'x', ref_count: 1, ref_floor: 5, topicReadiness: 'blocked' };
    const result = sharedRepairStep.execute(state);
    assert.equal(result.topicReadiness, 'blocked'); // blocked stays blocked
    assert.equal(result.ref_count, 3); // ref_count still repaired
  });

  it('each branch produces distinct state mutation', () => {
    const base = { current_gate: 'start', ref_count: 1, ref_floor: 5, topicReadiness: 'not_ready' };
    const results = {
      pass: passStep.execute(base),
      fail_a: failAStep.execute(base),
      fail_b: failBStep.execute(base),
      blocked: blockedStep.execute(base),
    };
    // All different from base and from each other
    assert.notDeepStrictEqual(results.pass, results.fail_a);
    assert.notDeepStrictEqual(results.fail_a, results.fail_b);
    assert.notDeepStrictEqual(results.fail_b, results.blocked);
    assert.notDeepStrictEqual(results.blocked, results.pass);
  });
});

describe('Fork repair converge (FOR-001)', () => {
  it('fail_a → shared repair → re-enter Gate → pass', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
    const result = convergeRepair(state);

    // After repair: ref_count should reach floor, topic is already ready → pass
    assert.equal(result.outcome, 'pass');
    assert.ok(result.iterations >= 1);
    assert.ok(result.state.ref_count >= result.state.ref_floor);
  });

  it('fail_b → shared repair → re-enter Gate → pass', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'not_ready' };
    const result = convergeRepair(state);

    // After repair: topicReadiness set to ready, refs already met → pass
    assert.equal(result.outcome, 'pass');
    assert.ok(result.iterations >= 1);
    assert.equal(result.state.topicReadiness, 'ready');
  });

  it('both fail_a and fail_b converge through shared repair → pass', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 1, ref_floor: 5, topicReadiness: 'not_ready' };
    const result = convergeRepair(state);

    // Shared repair fixes both issues — may take multiple iterations
    assert.equal(result.outcome, 'pass');
    assert.equal(result.state.topicReadiness, 'ready');
    assert.ok(result.state.ref_count >= result.state.ref_floor);
  });

  it('max iterations exhausted — returns final branch name not sentinel', () => {
    // ref_count=0, ref_floor=100, shared repair adds 2 per iteration
    // Iter 1: 0→2, Iter 2: 2→4, Iter 3: 4→6 — all < 100
    const state = { current_gate: 'x', ref_count: 0, ref_floor: 100, topicReadiness: 'ready' };
    const result = convergeRepair(state, 3);

    assert.equal(result.outcome, 'fail_a'); // returns actual branch name, NOT 'escalated'
    assert.equal(result.iterations, 3);
    assert.ok(result.state.ref_count < result.state.ref_floor); // still below floor
  });

  it('blocked state exits converge immediately without repair', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 0, ref_floor: 5, topicReadiness: 'blocked' };
    const result = convergeRepair(state);

    // blocked is terminal — 0 iterations, no change
    assert.equal(result.outcome, 'blocked');
    assert.equal(result.iterations, 0);
    assert.equal(result.state.topicReadiness, 'blocked');
  });

  it('already-passing state exits converge immediately with 0 iterations', () => {
    const state = { current_gate: 'x', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
    const result = convergeRepair(state);

    assert.equal(result.outcome, 'pass');
    assert.equal(result.iterations, 0);
  });
});

describe('Loop + Fork composition', () => {
  it('full pipeline: fork → fail_b → converge → re-fork → pass', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 3, ref_floor: 5, topicReadiness: 'ready' };
    const result = runForkPipeline(state);

    assert.equal(result.finalState.ref_count, 5); // ref reached floor
    assert.equal(result.finalState.current_gate, 'wave_next'); // advanced
    assert.ok(result.trace.length >= 4); // fork → converge_start → converge_end → re_fork → advance
    assert.equal(result.trace[0].branch, 'fail_a');
  });

  it('blocked pipeline: fork → blocked → halt without repair', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' };
    const result = runForkPipeline(state);

    assert.equal(result.finalState.current_gate, 'blocked_hitl');
    assert.equal(result.trace[0].branch, 'blocked');
  });

  it('direct pass pipeline: fork → pass → advance without repair', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
    const result = runForkPipeline(state);

    assert.equal(result.finalState.current_gate, 'wave_next');
    assert.equal(result.trace[0].branch, 'pass');
  });
});

describe('Dynamic segment loading (fork variant)', () => {
  it('loads known segment from segmentRegistry', () => {
    const step = loadNextSegment('pass_next_wave');
    assert.equal(step.name, 'pass_next_wave');
    assert.equal(typeof step.execute, 'function');
  });

  it('throws on unknown segment key', () => {
    assert.throws(() => loadNextSegment('nonexistent_fork_segment'), /Unknown segment/);
  });
});

describe('C&I feedback loop (CHI-002, fork variant)', () => {
  it('checkAndReflect passes for valid state', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready' };
    const result = checkAndReflect(state);
    assert.equal(result.passed, true);
    assert.equal(result.errors, undefined);
  });

  it('checkAndReflect fails for invalid ref_count type', () => {
    const state = { current_gate: 'x', ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
    const result = checkAndReflect(state);
    assert.equal(result.passed, false);
    assert.ok(result.diagnostics.length >= 1);
    assert.equal(result.diagnostics[0].field, 'ref_count');
  });

  it('checkAndReflect fails for invalid topicReadiness value', () => {
    const state = { current_gate: 'x', ref_count: 5, ref_floor: 5, topicReadiness: 'invalid_value' };
    const result = checkAndReflect(state);
    assert.equal(result.passed, false);
    assert.ok(result.diagnostics.some(d => d.field === 'topicReadiness'));
  });

  it('inspectFailure returns structured diagnostics', () => {
    const result = WorkflowState.safeParse({ current_gate: 'x', ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' });
    const diags = inspectFailure(result.error);
    assert.ok(diags.length >= 1);
    const refDiag = diags.find(d => d.field === 'ref_count');
    assert.ok(refDiag);
    assert.equal(refDiag.code, 'invalid_type');
    assert.ok(refDiag.fix.includes('ref_count'));
  });

  it('inspectFailure produces actionable fix messages', () => {
    // Missing required field
    const result = WorkflowState.safeParse({ ref_count: 5, ref_floor: 5, topicReadiness: 'ready' });
    const diags = inspectFailure(result.error);
    assert.ok(diags.length >= 1);
    for (const d of diags) {
      assert.ok(typeof d.field === 'string');
      assert.ok(typeof d.issue === 'string');
      assert.ok(typeof d.fix === 'string');
      assert.ok(d.fix.length > 0);
    }
  });

  it('full C&I loop: invalid state → Check fail → Inspect → Repair → Check pass', () => {
    const badState = { current_gate: 'x', ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };

    // Step 1: Check fails
    const check1 = checkAndReflect(badState);
    assert.equal(check1.passed, false);
    assert.ok(check1.diagnostics.length >= 1);

    // Step 2: Inspect gives diagnostics
    const diags = check1.diagnostics;
    const refDiag = diags.find(d => d.field === 'ref_count');
    assert.ok(refDiag);

    // Step 3: Repair fixes the issue
    const repaired = { ...badState, ref_count: 5 };

    // Step 4: Re-check passes
    const check2 = checkAndReflect(repaired);
    assert.equal(check2.passed, true);
  });
});

describe('E2E: full fork pipeline with C&I', () => {
  it('fork → converge → C&I check → pass → dynamic load', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };

    // Step 1: Fork routes to fail_a (ref_count below floor)
    const { branch } = forkRouter(state);
    assert.equal(branch, 'fail_a');

    // Step 2: Converge repair fixes the issue
    const repaired = convergeRepair(state);
    assert.equal(repaired.outcome, 'pass');
    assert.ok(repaired.state.ref_count >= repaired.state.ref_floor);

    // Step 3: C&I check passes on repaired state
    const ci = checkAndReflect(repaired.state);
    assert.equal(ci.passed, true);

    // Step 4: Dynamic segment load for next wave
    const step = loadNextSegment('pass_next_wave');
    assert.equal(step.name, 'pass_next_wave');
    const advanced = step.execute(repaired.state);
    assert.equal(advanced.current_gate, 'wave_next');
  });

  it('E2E: multi-issue state — fork → converge → C&I → pass', () => {
    // Both ref_count below floor AND topic not ready
    const state = { current_gate: 'wave0_complete', ref_count: 1, ref_floor: 5, topicReadiness: 'not_ready' };

    // Step 1: Fork routes to fail_b (topic takes priority)
    const { branch } = forkRouter(state);
    assert.equal(branch, 'fail_b');

    // Step 2: runForkPipeline handles everything
    const result = runForkPipeline(state);
    assert.equal(result.finalState.current_gate, 'wave_next');
    assert.equal(result.finalState.topicReadiness, 'ready');
    assert.ok(result.finalState.ref_count >= result.finalState.ref_floor);

    // Step 3: Final C&I check passes
    const ci = checkAndReflect(result.finalState);
    assert.equal(ci.passed, true);
  });

  it('E2E: blocked state halts immediately, C&I still validates shape', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' };

    // Fork halts
    const { branch, step } = forkRouter(state);
    assert.equal(branch, 'blocked');
    const halted = step.execute(state);
    assert.equal(halted.current_gate, 'blocked_hitl');

    // C&I still passes — state is structurally valid even when blocked
    const ci = checkAndReflect(halted);
    assert.equal(ci.passed, true);
  });

  it('E2E: full trace — all phases present in pipeline', () => {
    const state = { current_gate: 'wave0_complete', ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
    const result = runForkPipeline(state);

    // Verify all expected phases in trace
    const phases = result.trace.map(t => t.phase);
    assert.ok(phases.includes('fork'));
    assert.ok(phases.includes('converge_repair_start'));
    assert.ok(phases.includes('converge_repair_end'));
    assert.ok(phases.includes('re_fork'));
    assert.ok(phases.includes('advance'));
    assert.equal(result.finalState.current_gate, 'wave_next');
  });
});
