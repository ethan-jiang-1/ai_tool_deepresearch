// tests/schema/contracts/profile.test.mjs — 1:1 for DPT_FRAMEWORK/schema/contracts/profile.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfileSchema } from '../../../DPT_FRAMEWORK/schema/contracts/profile.mjs';

const valid = {
  plan_basename: 'test',
  research_profile: 'quick_factual',
  root_must_answer_set: ['Q1'],
  human_decision_checkpoints: {
    hitl1: { status: 'recorded' },
    hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' },
  },
};

describe('ProfileSchema', () => {
  it('accepts valid profile', () => {
    assert.ok(ProfileSchema.safeParse(valid).success);
  });

  it('rejects invalid research_profile', () => {
    assert.ok(!ProfileSchema.safeParse({ ...valid, research_profile: 'invalid_mode' }).success);
  });

  it('accepts exploratory_map research_profile', () => {
    assert.ok(ProfileSchema.safeParse({ ...valid, research_profile: 'exploratory_map' }).success);
  });

  it('rejects missing root_must_answer_set', () => {
    const bad = { ...valid }; delete bad.root_must_answer_set;
    assert.ok(!ProfileSchema.safeParse(bad).success);
  });

  it('rejects invalid hitl1 status', () => {
    const bad = { ...valid, human_decision_checkpoints: { ...valid.human_decision_checkpoints, hitl1: { status: 'invalid' } } };
    assert.ok(!ProfileSchema.safeParse(bad).success);
  });

  it('rejects invalid hitl2 status', () => {
    const bad = { ...valid, human_decision_checkpoints: { ...valid.human_decision_checkpoints, hitl2: { ...valid.human_decision_checkpoints.hitl2, status: 'invalid' } } };
    assert.ok(!ProfileSchema.safeParse(bad).success);
  });

  it('rejects invalid hitl2 user_decision', () => {
    const bad = { ...valid, human_decision_checkpoints: { ...valid.human_decision_checkpoints, hitl2: { ...valid.human_decision_checkpoints.hitl2, user_decision: 'invalid' } } };
    assert.ok(!ProfileSchema.safeParse(bad).success);
  });

  it('accepts optional custom_slug on hitl2', () => {
    const withSlug = { ...valid, human_decision_checkpoints: { ...valid.human_decision_checkpoints, hitl2: { ...valid.human_decision_checkpoints.hitl2, custom_slug: 'my-slug' } } };
    assert.ok(ProfileSchema.safeParse(withSlug).success);
  });
});
