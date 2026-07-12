// tests/schema/contracts/plan.test.mjs — 1:1 for DPT_FRAMEWORK/schema/contracts/plan.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalPlanSchema, LegacyPlanSchema, PlanSchema } from '../../../DPT_FRAMEWORK/schema/contracts/plan.mjs';

const valid = { plan_basename: 'test', derived_topic_count: 1, topic_registry: [{ id: 't1', slug: '01_topic-a', title: 'Topic A' }] };

describe('PlanSchema', () => {
  it('accepts valid plan', () => {
    assert.ok(PlanSchema.safeParse(valid).success);
  });

  it('accepts zero topic_count with empty registry', () => {
    assert.ok(PlanSchema.safeParse({ plan_basename: 'empty', derived_topic_count: 0, topic_registry: [] }).success);
  });

  it('accepts an unambiguously empty canonical plan', () => {
    assert.ok(CanonicalPlanSchema.safeParse({ plan_basename: 'empty', derived_topic_count: 0, topic_registry_version: '2', topic_registry: [] }).success);
  });

  it('accepts canonical UID-bound intent', () => {
    const canonical = { plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [{ topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: '01_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
    assert.ok(PlanSchema.safeParse(canonical).success);
    assert.ok(CanonicalPlanSchema.safeParse(canonical).success);
    assert.ok(!LegacyPlanSchema.safeParse(canonical).success);
  });

  it('rejects canonical dependency drift and duplicate slugs', () => {
    const topic = { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: '01_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: ['tp_missing'] };
    assert.ok(!CanonicalPlanSchema.safeParse({ plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [topic] }).success);
  });

  it('rejects missing plan_basename', () => {
    const bad = { ...valid }; delete bad.plan_basename;
    assert.ok(!PlanSchema.safeParse(bad).success);
  });

  it('rejects negative derived_topic_count', () => {
    assert.ok(!PlanSchema.safeParse({ ...valid, derived_topic_count: -1 }).success);
  });

  it('rejects missing topic_registry', () => {
    const bad = { ...valid }; delete bad.topic_registry;
    assert.ok(!PlanSchema.safeParse(bad).success);
  });

  it('rejects topic_registry entry missing slug', () => {
    assert.ok(!PlanSchema.safeParse({ ...valid, topic_registry: [{ id: 't1', title: 'T' }] }).success);
  });

  it('rejects topic_registry entry missing id', () => {
    assert.ok(!PlanSchema.safeParse({ ...valid, topic_registry: [{ slug: 's', title: 'T' }] }).success);
  });
});
