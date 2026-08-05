import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTopicLayoutTarget } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs';

const uidA = 'tp_123e4567-e89b-12d3-a456-426614174000';
const uidB = 'tp_123e4567-e89b-12d3-a456-426614174001';
const registry = [
  { topic_uid: uidA, id: '01', slug: '01_alpha', title: 'Alpha', must_answer: ['A?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [{ id: '02', slug: '02_old-alpha' }] },
  { topic_uid: uidB, id: '02', slug: '02_beta', title: 'Beta', must_answer: ['B?'], scope_role: 'supporting', depends_on_topic_uids: [], previous_layouts: [] },
];

describe('topic layout target builder', () => {
  it('renames, reorders and records only changed UIDs', () => {
    const result = buildTopicLayoutTarget(registry, { topics: [
      { topic_uid: uidB, title: 'Beta', slug_stem: 'beta' },
      { topic_uid: uidA, title: 'Alpha revised', slug_stem: 'alpha-new' },
    ], remove_topic_uids: [] });
    assert.deepEqual(result.topic_registry.map((topic) => topic.slug), ['01_beta', '02_alpha-new']);
    assert.deepEqual(new Set(result.affected_topic_uids), new Set([uidA, uidB]));
    assert.deepEqual(result.topic_registry[1].previous_layouts.map((layout) => layout.slug), ['02_old-alpha', '01_alpha']);
  });

  it('promotes an own previous slug and rotates the replaced current layout once', () => {
    const result = buildTopicLayoutTarget(registry, { topics: [
      { topic_uid: uidB, title: 'Beta', slug_stem: 'beta' },
      { topic_uid: uidA, title: 'Alpha', slug_stem: 'old-alpha' },
    ], remove_topic_uids: [] });
    const alpha = result.topic_registry[1];
    assert.equal(alpha.slug, '02_old-alpha');
    assert.deepEqual(alpha.previous_layouts.map((layout) => layout.slug), ['01_alpha']);
  });

  it('rejects incomplete targets, cross-UID history collisions and dependent removal', () => {
    assert.throws(() => buildTopicLayoutTarget(registry, { topics: [{ topic_uid: uidA, title: 'Alpha', slug_stem: 'alpha' }], remove_topic_uids: [] }), /account for every/);
    const collisionRegistry = [{ ...registry[0], previous_layouts: [{ id: '02', slug: '02_beta' }] }, registry[1]];
    assert.throws(() => buildTopicLayoutTarget(collisionRegistry, { topics: [
      { topic_uid: uidA, title: 'Alpha', slug_stem: 'alpha' },
      { topic_uid: uidB, title: 'Beta', slug_stem: 'beta' },
    ], remove_topic_uids: [] }), /layout_slug_collision/);
    const dependent = [{ ...registry[0], depends_on_topic_uids: [uidB] }, registry[1]];
    assert.throws(() => buildTopicLayoutTarget(dependent, { topics: [{ topic_uid: uidA, title: 'Alpha', slug_stem: 'alpha' }], remove_topic_uids: [uidB] }), /remove_has_dependents/);
  });

  it('does not mark byte-equivalent retained topics as affected', () => {
    const result = buildTopicLayoutTarget(registry, { topics: [
      { topic_uid: uidA, title: 'Alpha', slug_stem: 'alpha' },
      { topic_uid: uidB, title: 'Beta', slug_stem: 'beta' },
    ], remove_topic_uids: [] });
    assert.deepEqual(result.affected_topic_uids, []);
    const repeated = buildTopicLayoutTarget(result.topic_registry, { topics: [
      { topic_uid: uidA, title: 'Alpha', slug_stem: 'alpha' },
      { topic_uid: uidB, title: 'Beta', slug_stem: 'beta' },
    ], remove_topic_uids: [] });
    assert.deepEqual(repeated.topic_registry, result.topic_registry);
    assert.deepEqual(repeated.affected_topic_uids, []);
  });
});
