// tests/schema/contracts/plan.test.mjs — 1:1 for DEEP_RESEARCH_HARNESS/schema/contracts/plan.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalPlanSchema, PlanSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/plan.mjs';

const valid = { plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [{ topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: 't1', slug: '01_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] };

describe('PlanSchema', () => {
  it('accepts valid plan', () => {
    assert.ok(PlanSchema.safeParse(valid).success);
  });

  it('rejects a markerless mutable plan without conversion', () => {
    const legacy = { plan_basename: 'test', derived_topic_count: 1, topic_registry: [{ id: 't1', slug: '01_topic-a', title: 'Topic A' }] };
    assert.equal(PlanSchema.safeParse(legacy).success, false);
  });

  it('accepts an unambiguously empty canonical plan', () => {
    assert.ok(CanonicalPlanSchema.safeParse({ plan_basename: 'empty', derived_topic_count: 0, topic_registry_version: '2', topic_registry: [] }).success);
  });

  it('accepts canonical UID-bound intent', () => {
    const canonical = { plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [{ topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: '01_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
    assert.ok(PlanSchema.safeParse(canonical).success);
    assert.ok(CanonicalPlanSchema.safeParse(canonical).success);
  });

  it('defaults absent C3A layout history and preserves non-normalized current coordinates', () => {
    const canonical = { plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [{ topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: 'legacy-id', slug: 'topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
    const parsed = CanonicalPlanSchema.parse(canonical);
    assert.deepEqual(parsed.topic_registry[0].previous_layouts, []);
    assert.equal(parsed.topic_registry[0].id, 'legacy-id');
    assert.equal(parsed.topic_registry[0].slug, 'topic-a');
  });

  it('accepts unique previous layouts', () => {
    const topic = { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '02', slug: '02_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [{ id: '01', slug: '01_topic-a' }] };
    assert.ok(CanonicalPlanSchema.safeParse({ plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [topic] }).success);
  });

  it('rejects duplicate history and current-history collisions', () => {
    const base = { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '02', slug: '02_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] };
    for (const previous_layouts of [
      [{ id: '01', slug: '01_topic-a' }, { id: '03', slug: '01_topic-a' }],
      [{ id: '02', slug: '02_topic-a' }],
    ]) {
      assert.ok(!CanonicalPlanSchema.safeParse({ plan_basename: 'test', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [{ ...base, previous_layouts }] }).success);
    }
  });

  it('rejects cross-UID current and historical slug collisions', () => {
    const first = { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: '01_topic-a', title: 'Topic A', must_answer: ['A?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [{ id: '03', slug: '03_topic-a' }] };
    const second = { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', id: '02', slug: '02_topic-b', title: 'Topic B', must_answer: ['B?'], scope_role: 'supporting', depends_on_topic_uids: [] };
    for (const collision of ['01_topic-a', '03_topic-a']) {
      assert.ok(!CanonicalPlanSchema.safeParse({ plan_basename: 'test', derived_topic_count: 2, topic_registry_version: '2', topic_registry: [first, { ...second, previous_layouts: [{ id: '04', slug: collision }] }] }).success);
    }
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
