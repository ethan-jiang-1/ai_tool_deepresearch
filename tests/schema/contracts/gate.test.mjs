// tests/schema/contracts/gate.test.mjs — 1:1 for DEEP_RESEARCH_HARNESS/schema/contracts/gate.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE_MACHINE_STATES,
  GATE_EVENT_TYPES,
  GATE_TRANSITIONS,
  validateTransitions,
  isValidTransition,
} from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/gate.mjs';

describe('GATE_MACHINE_STATES', () => {
  it('is a non-empty array', () => {
    assert.ok(Array.isArray(GATE_MACHINE_STATES));
    assert.ok(GATE_MACHINE_STATES.length > 0);
  });

  it('contains key states', () => {
    for (const s of ['setup_ready', 'wave0_complete', 'wave1_complete', 'wave2_complete', 'readiness_passed', 'blocked_terminal']) {
      assert.ok(GATE_MACHINE_STATES.includes(s), `missing state: ${s}`);
    }
  });
});

describe('GATE_EVENT_TYPES', () => {
  it('is a non-empty array', () => {
    assert.ok(Array.isArray(GATE_EVENT_TYPES));
    assert.ok(GATE_EVENT_TYPES.length > 0);
  });

  it('contains key events', () => {
    for (const e of ['PASS_WAVE0', 'PASS_WAVE1', 'PASS_WAVE2', 'USER_PROCEED', 'USER_REPAIR']) {
      assert.ok(GATE_EVENT_TYPES.includes(e), `missing event: ${e}`);
    }
  });
});

describe('GATE_TRANSITIONS', () => {
  it('every non-terminal state has at least one transition', () => {
    const terminal = new Set(['readiness_passed', 'blocked_terminal']);
    for (const [state, transitions] of Object.entries(GATE_TRANSITIONS)) {
      if (!terminal.has(state)) {
        assert.ok(transitions.length > 0, `non-terminal state ${state} has no transitions`);
      }
    }
  });

  it('terminal states have empty transition arrays', () => {
    assert.deepEqual(GATE_TRANSITIONS.readiness_passed, []);
    assert.deepEqual(GATE_TRANSITIONS.blocked_terminal, []);
  });

  it('every transition references a valid target state', () => {
    for (const [from, transitions] of Object.entries(GATE_TRANSITIONS)) {
      for (const t of transitions) {
        assert.ok(GATE_MACHINE_STATES.includes(t.next), `${from} → ${t.event}: target "${t.next}" not in GATE_MACHINE_STATES`);
      }
    }
  });
});

describe('validateTransitions', () => {
  it('returns empty array (no dead states)', () => {
    assert.deepEqual(validateTransitions(), []);
  });
});

describe('isValidTransition', () => {
  it('returns true for valid transition', () => {
    assert.equal(isValidTransition('wave0_complete', 'PASS_WAVE1'), true);
  });

  it('returns false for invalid event on valid state', () => {
    assert.equal(isValidTransition('wave0_complete', 'USER_PROCEED'), false);
  });

  it('returns false for unknown from-state', () => {
    assert.equal(isValidTransition('nonexistent', 'PASS_WAVE1'), false);
  });

  it('returns false for terminal state', () => {
    assert.equal(isValidTransition('readiness_passed', 'PASS_WAVE2'), false);
  });
});
