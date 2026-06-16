// tests/schema/enums.test.mjs — @impl SCO-001
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CurrentGate, StopAuthorizationState, QueueHealth,
  RunState, ResearchProfile, GateResult,
} from '../../DPT_FRAMEWORK/schema/index.mjs';

describe('CurrentGate', () => {
  it('accepts all 6 valid values', () => {
    for (const v of ['instantiation_complete', 'setup_ready', 'wave0_complete', 'wave1_complete', 'wave2_complete', 'readiness_passed']) {
      assert.ok(CurrentGate.safeParse(v).success, `${v} should be valid`);
    }
  });
  it('rejects invalid value', () => {
    assert.ok(!CurrentGate.safeParse('invalid').success);
  });
});

describe('StopAuthorizationState', () => {
  it('accepts all 4 valid values', () => {
    for (const v of ['unauthorized_continue_required', 'final_delivery', 'decision_blocker', 'empty_queue_after_refill']) {
      assert.ok(StopAuthorizationState.safeParse(v).success, `${v} should be valid`);
    }
  });
  it('rejects invalid value', () => {
    assert.ok(!StopAuthorizationState.safeParse('invalid').success);
  });
});

describe('QueueHealth', () => {
  it('accepts valid values', () => {
    assert.ok(QueueHealth.safeParse('ready').success);
    assert.ok(QueueHealth.safeParse('thin').success);
    assert.ok(QueueHealth.safeParse('blocked').success);
    assert.ok(QueueHealth.safeParse('closed').success);
  });
  it('rejects invalid value', () => {
    assert.ok(!QueueHealth.safeParse('invalid').success);
  });
});

describe('RunState', () => {
  it('accepts valid values', () => {
    assert.ok(RunState.safeParse('not_started').success);
    assert.ok(RunState.safeParse('in_progress').success);
    assert.ok(RunState.safeParse('blocked').success);
    assert.ok(RunState.safeParse('completed').success);
  });
  it('rejects invalid value', () => {
    assert.ok(!RunState.safeParse('invalid').success);
  });
});

describe('ResearchProfile', () => {
  it('accepts valid values', () => {
    assert.ok(ResearchProfile.safeParse('quick_factual').success);
    assert.ok(ResearchProfile.safeParse('exploratory_map').success);
    assert.ok(ResearchProfile.safeParse('claim_verification').success);
  });
  it('rejects invalid value', () => {
    assert.ok(!ResearchProfile.safeParse('invalid').success);
  });
});

describe('GateResult', () => {
  it('accepts pass and fail', () => {
    assert.ok(GateResult.safeParse('pass').success);
    assert.ok(GateResult.safeParse('fail').success);
  });
  it('rejects invalid value', () => {
    assert.ok(!GateResult.safeParse('invalid').success);
  });
});
