// tests/schema/gate.test.mjs — @impl SCO-003
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  GATE_TRANSITIONS, GATE_MACHINE_STATES,
  validateTransitions, isValidTransition,
} from '../../DPT_FRAMEWORK/schema/index.mjs';

describe('GateTransitionTable', () => {
  it('has 8 states', () => {
    assert.equal(GATE_MACHINE_STATES.length, 8);
  });

  it('every non-terminal state has at least one transition', () => {
    const dead = validateTransitions();
    assert.equal(dead.length, 0, `Dead states: ${dead.join(', ')}`);
  });

  it('PASS_SETUP from instantiation_complete goes to setup_ready', () => {
    assert.ok(isValidTransition('instantiation_complete', 'PASS_SETUP'));
  });

  it('PASS_WAVE0 from setup_ready goes to wave0_complete', () => {
    assert.ok(isValidTransition('setup_ready', 'PASS_WAVE0'));
  });

  it('REOPEN from wave0_complete goes to setup_ready', () => {
    assert.ok(isValidTransition('wave0_complete', 'REOPEN'));
  });

  it('USER_PROCEED from hitl2_pending_user goes to readiness_passed', () => {
    assert.ok(isValidTransition('hitl2_pending_user', 'USER_PROCEED'));
  });

  it('USER_REPAIR from hitl2_pending_user goes to wave1_complete', () => {
    assert.ok(isValidTransition('hitl2_pending_user', 'USER_REPAIR'));
  });

  it('terminal states have no transitions', () => {
    assert.equal(GATE_TRANSITIONS.readiness_passed.length, 0);
    assert.equal(GATE_TRANSITIONS.blocked_terminal.length, 0);
  });

  it('rejects invalid transition', () => {
    assert.ok(!isValidTransition('setup_ready', 'REOPEN'));
    assert.ok(!isValidTransition('readiness_passed', 'PASS_WAVE0'));
  });
});
