// profile.test.mjs — ProfileSchema regression tests (rerun_count field)
// @impl SCO-002, REI-002

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProfileSchema } from '../../DEEP_RESEARCH_HARNESS/schema/index.mjs';

const VALID_HITL2_BASE = {
  plan_basename: 'test-profile',
  research_profile: 'quick_factual',
  root_must_answer_set: ['test question'],
  human_decision_checkpoints: {
    hitl1: { status: 'recorded' },
    hitl2: {
      status: 'recorded',
      answerability_class: 'ready_substantive',
      user_decision: 'proceed_to_readiness',
      final_report_view: 'profile_default',
    },
  },
};

describe('ProfileSchema — rerun_count', () => {
  it('accepts rerun_count = 0', () => {
    const profile = {
      ...VALID_HITL2_BASE,
      human_decision_checkpoints: {
        ...VALID_HITL2_BASE.human_decision_checkpoints,
        hitl2: {
          ...VALID_HITL2_BASE.human_decision_checkpoints.hitl2,
          rerun_count: 0,
        },
      },
    };
    const result = ProfileSchema.safeParse(profile);
    assert.strictEqual(result.success, true);
  });

  it('accepts rerun_count = 2', () => {
    const profile = {
      ...VALID_HITL2_BASE,
      human_decision_checkpoints: {
        ...VALID_HITL2_BASE.human_decision_checkpoints,
        hitl2: {
          ...VALID_HITL2_BASE.human_decision_checkpoints.hitl2,
          rerun_count: 2,
          rationale: 'Second rerun with more specific direction',
        },
      },
    };
    const result = ProfileSchema.safeParse(profile);
    assert.strictEqual(result.success, true);
  });

  it('accepts missing rerun_count (default 0, backward compat)', () => {
    const result = ProfileSchema.safeParse(VALID_HITL2_BASE);
    assert.strictEqual(result.success, true);
  });

  it('rejects negative rerun_count', () => {
    const profile = {
      ...VALID_HITL2_BASE,
      human_decision_checkpoints: {
        ...VALID_HITL2_BASE.human_decision_checkpoints,
        hitl2: {
          ...VALID_HITL2_BASE.human_decision_checkpoints.hitl2,
          rerun_count: -1,
        },
      },
    };
    const result = ProfileSchema.safeParse(profile);
    assert.strictEqual(result.success, false);
  });

  it('rejects non-integer rerun_count', () => {
    const profile = {
      ...VALID_HITL2_BASE,
      human_decision_checkpoints: {
        ...VALID_HITL2_BASE.human_decision_checkpoints,
        hitl2: {
          ...VALID_HITL2_BASE.human_decision_checkpoints.hitl2,
          rerun_count: 1.5,
        },
      },
    };
    const result = ProfileSchema.safeParse(profile);
    assert.strictEqual(result.success, false);
  });

  it('accepts rerun_count with rerun user_decision', () => {
    const profile = {
      ...VALID_HITL2_BASE,
      human_decision_checkpoints: {
        ...VALID_HITL2_BASE.human_decision_checkpoints,
        hitl2: {
          ...VALID_HITL2_BASE.human_decision_checkpoints.hitl2,
          user_decision: 'rerun',
          rerun_count: 1,
          rationale: 'Need to adjust topic coverage',
        },
      },
    };
    const result = ProfileSchema.safeParse(profile);
    assert.strictEqual(result.success, true);
  });

  it('accepts rationale as optional field', () => {
    const profile = {
      ...VALID_HITL2_BASE,
      human_decision_checkpoints: {
        ...VALID_HITL2_BASE.human_decision_checkpoints,
        hitl2: {
          ...VALID_HITL2_BASE.human_decision_checkpoints.hitl2,
          rationale: 'User provided detailed reasoning',
        },
      },
    };
    const result = ProfileSchema.safeParse(profile);
    assert.strictEqual(result.success, true);
  });

  it('accepts missing rationale (optional)', () => {
    const result = ProfileSchema.safeParse(VALID_HITL2_BASE);
    assert.strictEqual(result.success, true);
  });
});
