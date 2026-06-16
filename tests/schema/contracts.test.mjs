// tests/schema/contracts.test.mjs — @impl SCO-002
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StatusSchema, QueueSchema, ProfileSchema,
  PlanSchema, TraceSchema,
} from '../../DPT_FRAMEWORK/schema/index.mjs';

describe('StatusSchema', () => {
  const valid = { current_mode: 'execution', state: 'not_started', current_gate: 'setup_ready', next_gate: 'wave0_complete' };
  it('accepts valid skeleton', () => {
    assert.ok(StatusSchema.safeParse(valid).success);
  });
  it('rejects missing field', () => {
    assert.ok(!StatusSchema.safeParse({ current_mode: 'execution' }).success);
  });
  it('rejects invalid enum', () => {
    assert.ok(!StatusSchema.safeParse({ ...valid, current_gate: 'invalid' }).success);
  });
});

describe('QueueSchema', () => {
  const valid = { queue_health: 'ready', stop_authorization_state: 'unauthorized_continue_required', slot_1_current: null, slot_2_next: null, slot_3_pending: null, slot_4_pending: null, slot_5_tail: null, refill_pool: [] };
  it('accepts valid skeleton', () => {
    assert.ok(QueueSchema.safeParse(valid).success);
  });
  it('rejects missing refill_pool', () => {
    const missing = { ...valid }; delete missing.refill_pool;
    assert.ok(!QueueSchema.safeParse(missing).success);
  });
});

describe('ProfileSchema', () => {
  const valid = {
    plan_basename: 'test',
    research_profile: 'quick_factual',
    root_must_answer_set: [],
    human_decision_checkpoints: {
      hitl1: { status: 'recorded' },
      hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' },
    },
  };
  it('accepts valid skeleton', () => {
    assert.ok(ProfileSchema.safeParse(valid).success);
  });
  it('rejects invalid research_profile', () => {
    assert.ok(!ProfileSchema.safeParse({ ...valid, research_profile: 'invalid' }).success);
  });
  it('rejects invalid hitl2 status', () => {
    const bad = { ...valid, human_decision_checkpoints: { ...valid.human_decision_checkpoints, hitl2: { ...valid.human_decision_checkpoints.hitl2, status: 'invalid' } } };
    assert.ok(!ProfileSchema.safeParse(bad).success);
  });
});

describe('PlanSchema', () => {
  const valid = { plan_basename: 'test', derived_topic_count: 0, topic_registry: [] };
  it('accepts valid skeleton', () => {
    assert.ok(PlanSchema.safeParse(valid).success);
  });
  it('rejects negative topic count', () => {
    assert.ok(!PlanSchema.safeParse({ ...valid, derived_topic_count: -1 }).success);
  });
});

describe('TraceSchema', () => {
  it('accepts empty array', () => {
    assert.ok(TraceSchema.safeParse([]).success);
  });
  it('accepts valid entry', () => {
    const entry = { timestamp: '2026-01-01', gate_transition: 'wave0_complete', evidence_bundle: 'test', queue_consequence: 'promote', status_pointer_sync: 'ok' };
    assert.ok(TraceSchema.safeParse([entry]).success);
  });
  it('rejects invalid entry', () => {
    assert.ok(!TraceSchema.safeParse([{ timestamp: 'x' }]).success);
  });
});
