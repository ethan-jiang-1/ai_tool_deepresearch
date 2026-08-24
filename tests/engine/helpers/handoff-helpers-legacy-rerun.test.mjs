import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { classifyPostFinalProfile } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';

function makeBundle(root, name, topicCount = 2) {
  const bundle = join(root, `dpt_rb_${name}`);
  mkdirSync(bundle, { recursive: true });
  const topics = Array.from({ length: topicCount }, (_, index) => ({
    topic_uid: `tp_${String(index + 1).padStart(2, '0')}000000-0000-4000-8000-000000000000`,
    id: String(index + 1),
    slug: `${String(index + 1).padStart(2, '0')}_topic-${index + 1}`,
    title: `Topic ${index + 1}`,
  }));
  writeFileSync(join(bundle, 'rb_plan.md'), [
    '---',
    `plan_basename: ${name}`,
    `derived_topic_count: ${topics.length}`,
    'topic_registry_version: "2"',
    'topic_registry:',
    ...topics.flatMap((topic) => [
      `  - topic_uid: ${topic.topic_uid}`,
      `    id: "${topic.id}"`,
      `    slug: ${topic.slug}`,
      `    title: ${topic.title}`,
      '    must_answer:',
      '      - What matters?',
      '    scope_role: primary',
      '    depends_on_topic_uids: []',
    ]),
    '---',
    '# Plan',
    '',
  ].join('\n'));
  return bundle;
}

const styleParams = {
  user_visible: true,
  wave0_per_topic_source_floor: 6,
  wave0_shared_ref_total: 5,
  wave1_per_topic_ref_floor: 5,
  topic_unique_ratio: 0.3,
  counterexample_search: false,
  cross_verification: false,
  p0p1_independent_backing: 1,
  quality_min_tier: 'tier_3',
  quality_min_substance: 'thin',
  wave2_cross_topic_depth: 0,
  wave2_emergent_search_rounds: 0,
};

function baseProfile(overrides = {}, topLevel = {}) {
  return {
    plan_basename: 'legacy',
    research_profile: 'quick_factual',
    root_must_answer_set: [],
    research_style_params: styleParams,
    ...topLevel,
    human_decision_checkpoints: {
      hitl1: { status: 'recorded' },
      hitl2: {
        status: 'recorded',
        answerability_class: 'ready_substantive',
        user_decision: 'rerun',
        final_report_view: 'profile_default',
        rationale: 'Post-final rerun reason:\nNeed more evidence\n\nRequested scope:\nAdd evidence',
        ...overrides,
      },
    },
  };
}

const guard = { rule_id: 'rerun_count_valid', definition_sha256: 'a'.repeat(64), current_count: 0, next_count: 1, limit: 3 };

describe('classifyPostFinalProfile legacy absence handling', { concurrency: false }, () => {
  let root;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'dpt-classify-legacy-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('accepts a legacy profile and event both lacking rerun_count as current count', () => {
    const bundle = makeBundle(root, 'legacy');
    const current = baseProfile();
    const accepted = baseProfile({ user_decision: 'rerun' });
    delete accepted.human_decision_checkpoints.hitl2.rerun_count;
    delete current.human_decision_checkpoints.hitl2.rerun_count;
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, true);
    assert.equal(result.count, 'current');
    assert.equal(result.style, 'event_bound');
  });

  it('accepts a legacy profile incremented to next count after a sanctioned phase-rerun write', () => {
    const bundle = makeBundle(root, 'legacy-next');
    // Legacy event semantics never carried the key; the phase-rerun increment
    // wrote rerun_count: 1 into the current profile.
    const current = baseProfile({ rerun_count: 1 });
    const accepted = baseProfile({ user_decision: 'rerun' });
    delete accepted.human_decision_checkpoints.hitl2.rerun_count;
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, true);
    assert.equal(result.count, 'next');
  });

  it('keeps the exact window check for a keyed profile', () => {
    const bundle = makeBundle(root, 'keyed');
    const current = baseProfile({ rerun_count: 0 });
    const accepted = baseProfile({ user_decision: 'rerun', rerun_count: 0 });
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, true);
    assert.equal(result.count, 'current');
  });

  it('accepts a keyed next-count profile as next', () => {
    const bundle = makeBundle(root, 'keyed-next');
    const current = baseProfile({ rerun_count: 1 });
    const accepted = baseProfile({ user_decision: 'rerun', rerun_count: 0 });
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, true);
    assert.equal(result.count, 'next');
  });

  it('still rejects a keyed profile outside the event-bound window', () => {
    const bundle = makeBundle(root, 'keyed-outside');
    const current = baseProfile({ rerun_count: 2 });
    const accepted = baseProfile({ user_decision: 'rerun', rerun_count: 0 });
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, false);
    assert.match(result.reason, /outside the event-bound current\/next delta/);
  });

  it('still rejects research_profile drift from the event-bound value', () => {
    const bundle = makeBundle(root, 'profile-drift');
    const current = baseProfile({}, { research_profile: 'exploratory_map' });
    const accepted = baseProfile({ user_decision: 'rerun' });
    delete accepted.human_decision_checkpoints.hitl2.rerun_count;
    delete current.human_decision_checkpoints.hitl2.rerun_count;
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, false);
    assert.match(result.reason, /research_profile drifted/);
  });

  it('still rejects style parameters matching neither event-bound nor exact projection', () => {
    const bundle = makeBundle(root, 'style-drift');
    const current = baseProfile({}, { research_style_params: { ...styleParams, wave0_shared_ref_total: 99 } });
    const accepted = baseProfile({ user_decision: 'rerun' });
    delete accepted.human_decision_checkpoints.hitl2.rerun_count;
    delete current.human_decision_checkpoints.hitl2.rerun_count;
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, false);
    assert.match(result.reason, /match neither event-bound values nor the exact current projection/);
  });

  it('rejects unrelated profile field drift on the legacy path', () => {
    const bundle = makeBundle(root, 'unrelated-drift');
    const current = baseProfile({ user_decision: 'rerun' });
    current.plan_basename = 'mutated';
    const accepted = baseProfile({ user_decision: 'rerun' });
    delete accepted.human_decision_checkpoints.hitl2.rerun_count;
    delete current.human_decision_checkpoints.hitl2.rerun_count;
    const result = classifyPostFinalProfile(bundle, current, accepted, guard);
    assert.equal(result.ok, false);
    assert.match(result.reason, /unrelated event-lineage drift/);
  });
});
