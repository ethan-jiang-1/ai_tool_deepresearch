import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptedTopicSlugs,
  evaluateTopicLayouts,
  losslessTopicSlugStem,
  resolveReferenceTopicBinding,
  resolveStructuredTopicBinding,
  resolveTopicLayout,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs';

const topics = [
  {
    topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
    id: '03',
    slug: '03_current-a',
    previous_layouts: [{ id: '01', slug: '01_old-a' }, { id: '02', slug: '02_middle-a' }],
  },
  {
    topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001',
    id: '01',
    slug: '01_current-b',
    previous_layouts: [],
  },
];

describe('topic layout resolver', () => {
  const layouts = evaluateTopicLayouts(topics);

  it('evaluates current, previous and accepted layouts by UID', () => {
    assert.deepEqual(acceptedTopicSlugs(layouts, topics[0].topic_uid), ['03_current-a', '01_old-a', '02_middle-a']);
    assert.equal(layouts.uidByCurrentSlug.get('03_current-a'), topics[0].topic_uid);
    assert.equal(layouts.uidByAnySlug.get('01_old-a'), topics[0].topic_uid);
  });

  it('resolves UID, current slug and historical slug without inference', () => {
    assert.deepEqual(resolveTopicLayout(layouts, { topic_uid: topics[0].topic_uid }), {
      ok: true, topic_uid: topics[0].topic_uid, recorded_slug: '03_current-a', current_slug: '03_current-a', historical: false,
    });
    assert.deepEqual(resolveTopicLayout(layouts, { topic_slug: '01_old-a' }), {
      ok: true, topic_uid: topics[0].topic_uid, recorded_slug: '01_old-a', current_slug: '03_current-a', historical: true,
    });
  });

  it('rejects previous layouts for current-only consumers with a current suggestion', () => {
    assert.deepEqual(resolveTopicLayout(layouts, { topic_slug: '01_old-a' }, { currentOnly: true }), {
      ok: false, reason_code: 'previous_layout_not_current', topic_uid: topics[0].topic_uid, topic_slug: '01_old-a', current_slug: '03_current-a',
    });
  });

  it('resolves queue payload and immutable work-unit queue snapshots', () => {
    assert.equal(resolveStructuredTopicBinding(layouts, { payload: { topic_uid: topics[0].topic_uid, topic_slug: '03_current-a' } }).topic_uid, topics[0].topic_uid);
    const legacy = resolveStructuredTopicBinding(layouts, { queue_item: { payload: { topic_slug: '01_old-a' } } });
    assert.equal(legacy.topic_uid, topics[0].topic_uid);
    assert.equal(legacy.historical, true);
  });

  it('fails closed on mismatched, unsupported and free-text-only records', () => {
    assert.equal(resolveStructuredTopicBinding(layouts, { payload: { topic_uid: topics[0].topic_uid, topic_slug: '01_current-b' } }).reason_code, 'topic_uid_slug_mismatch');
    assert.equal(resolveStructuredTopicBinding(layouts, { payload: { topic_slug: '03_current-a' }, lineage: { topic_slug: '01_current-b' } }).reason_code, 'structured_topic_binding_ambiguous');
    assert.equal(resolveStructuredTopicBinding(layouts, { work_unit_ref: '_work_units/wave0/wu-1' }).reason_code, 'structured_topic_binding_missing');
    assert.equal(resolveStructuredTopicBinding(layouts, { summary: 'work about 01_old-a' }).reason_code, 'structured_topic_binding_missing');
  });

  it('extracts only lossless accepted slug stems', () => {
    assert.equal(losslessTopicSlugStem('03_current-a'), 'current-a');
    assert.equal(losslessTopicSlugStem('current-a'), 'current-a');
    assert.equal(losslessTopicSlugStem('03_Current A'), null);
  });

  it('resolves UID-only, legacy, unpadded ordinal, and agreeing dual reference bindings', () => {
    assert.deepEqual(resolveReferenceTopicBinding(layouts, new Map([
      ['related_topic_uid', topics[0].topic_uid],
    ])).topic_uids, [topics[0].topic_uid]);

    for (const legacyValue of ['03_current-a', '01_old-a', '03', '3']) {
      assert.deepEqual(resolveReferenceTopicBinding(layouts, new Map([
        ['related_topic', legacyValue],
      ])).topic_uids, [topics[0].topic_uid]);
    }

    const dual = resolveReferenceTopicBinding(layouts, new Map([
      ['related_topic_uid', topics[0].topic_uid],
      ['related_topic', '01_old-a'],
    ]));
    assert.equal(dual.ok, true);
    assert.deepEqual(dual.topic_uids, [topics[0].topic_uid]);
  });

  it('fails one reference-binding root for conflicting or ambiguous legacy forms', () => {
    const conflict = resolveReferenceTopicBinding(layouts, new Map([
      ['related_topic_uid', topics[0].topic_uid],
      ['related_topic', '01_current-b'],
    ]));
    assert.equal(conflict.ok, false);
    assert.equal(conflict.reason_code, 'reference_topic_binding_conflict');

    const ambiguousLayouts = evaluateTopicLayouts([
      topics[0],
      { ...topics[1], previous_layouts: [{ id: '03', slug: '03_old-b' }] },
    ]);
    const ambiguous = resolveReferenceTopicBinding(ambiguousLayouts, new Map([
      ['related_topic', '03'],
    ]));
    assert.equal(ambiguous.ok, false);
    assert.equal(ambiguous.reason_code, 'reference_topic_binding_ambiguous');
  });

  it('resolves an exact UID subset without inferring all Topics', () => {
    const binding = resolveReferenceTopicBinding(layouts, new Map([
      ['related_topic_uids', [topics[1].topic_uid, topics[0].topic_uid]],
    ]));
    assert.equal(binding.ok, true);
    assert.equal(binding.all, false);
    assert.deepEqual(binding.topic_uids, [topics[0].topic_uid, topics[1].topic_uid]);
  });

  it('rejects invalid and conflicting UID-array forms at one binding boundary', () => {
    const cases = [
      [new Map([['related_topic_uids', []]]), 'reference_topic_uids_empty'],
      [new Map([['related_topic_uids', [topics[0].topic_uid, topics[0].topic_uid]]]), 'reference_topic_uids_duplicate'],
      [new Map([['related_topic_uids', ['tp_unknown']]]), 'reference_topic_uids_unknown'],
      [new Map([['related_topic_uids', topics[0].topic_uid]]), 'reference_topic_uids_invalid'],
      [new Map([['related_topic_uid', topics[0].topic_uid], ['related_topic_uids', [topics[1].topic_uid]]]), 'reference_topic_binding_conflict'],
    ];
    for (const [metadata, reasonCode] of cases) {
      const binding = resolveReferenceTopicBinding(layouts, metadata);
      assert.equal(binding.ok, false);
      assert.equal(binding.reason_code, reasonCode);
    }
  });
});
