// tests/schema/contracts/profile.test.mjs — 1:1 for DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfileSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs';

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

  it('defaults a legacy profile without delegated_concurrency_cap to 12', () => {
    const result = ProfileSchema.parse(valid);
    assert.equal(result.delegated_concurrency_cap, 12);
  });

  it('accepts explicit delegated_concurrency_cap bounds', () => {
    for (const delegated_concurrency_cap of [1, 12, 20]) {
      const result = ProfileSchema.safeParse({ ...valid, delegated_concurrency_cap });
      assert.equal(result.success, true, `expected ${delegated_concurrency_cap} to parse`);
      assert.equal(result.data.delegated_concurrency_cap, delegated_concurrency_cap);
    }
  });

  it('rejects invalid delegated_concurrency_cap values', () => {
    for (const delegated_concurrency_cap of [0, -1, 1.5, 20.5, 21]) {
      const result = ProfileSchema.safeParse({ ...valid, delegated_concurrency_cap });
      assert.equal(result.success, false, `expected ${delegated_concurrency_cap} to fail`);
    }
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

  it('accepts legacy profile without research_access', () => {
    assert.ok(ProfileSchema.safeParse(valid).success);
  });

  it('accepts strict unprobed research_access', () => {
    assert.ok(ProfileSchema.safeParse({ ...valid, research_access: { status: 'unprobed' } }).success);
  });

  it('rejects unprobed research_access with success facts', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unprobed',
        probed_at: '2026-07-10T00:00:00.000Z',
        result_url: 'https://example.com/',
        fetch_outcome: 'success',
      },
    });
    assert.equal(result.success, false);
  });

  it('accepts valid available research_access', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'available',
        probed_at: '2026-07-10T00:00:00.000Z',
        result_url: 'https://example.com/',
        fetch_outcome: 'success',
        search_surface: 'WebSearch',
        fetch_surface: 'WebFetch',
      },
    });
    assert.equal(result.success, true);
  });

  it('rejects available research_access with invalid timestamp', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'available',
        probed_at: 'not-a-timestamp',
        result_url: 'https://example.com/',
        fetch_outcome: 'success',
      },
    });
    assert.equal(result.success, false);
  });

  it('rejects available research_access with non-HTTP URL', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'available',
        probed_at: '2026-07-10T00:00:00.000Z',
        result_url: 'ftp://example.com/file',
        fetch_outcome: 'success',
      },
    });
    assert.equal(result.success, false);
  });

  it('rejects available research_access with non-success outcome', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'available',
        probed_at: '2026-07-10T00:00:00.000Z',
        result_url: 'https://example.com/',
        fetch_outcome: 'failed',
      },
    });
    assert.equal(result.success, false);
  });

  it('accepts valid unavailable research_access', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-07-10T00:00:00.000Z',
        fetch_outcome: 'blocked',
        reason: 'Fetch surface is blocked in this environment',
        result_url: 'https://example.com/',
      },
    });
    assert.equal(result.success, true);
  });

  it('rejects unavailable research_access without reason', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-07-10T00:00:00.000Z',
        fetch_outcome: 'not_attempted',
      },
    });
    assert.equal(result.success, false);
  });

  it('rejects unavailable research_access claiming success', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-07-10T00:00:00.000Z',
        fetch_outcome: 'success',
        reason: 'Contradictory success claim',
      },
    });
    assert.equal(result.success, false);
  });

  it('accepts current bounded candidate metadata without changing legacy readability', () => {
    const noCandidate = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-07-10T00:00:00.000Z',
        fetch_outcome: 'not_attempted',
        reason: 'Search returned no eligible HTTP(S) candidate',
        eligible_candidate_count: 0,
      },
    });
    const attempted = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-07-10T00:00:00.000Z',
        fetch_outcome: 'failed',
        reason: 'Native fetch did not return requested page content',
        result_url: 'https://example.com/',
        eligible_candidate_count: 2,
        final_candidate_ordinal: 2,
      },
    });
    const available = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'available',
        probed_at: '2026-07-10T00:00:00.000Z',
        result_url: 'https://example.com/',
        fetch_outcome: 'success',
        eligible_candidate_count: 1,
        final_candidate_ordinal: 1,
      },
    });
    assert.equal(noCandidate.success, true);
    assert.equal(attempted.success, true);
    assert.equal(available.success, true);
  });

  it('rejects contradictory candidate metadata', () => {
    const baseUnavailable = {
      status: 'unavailable',
      probed_at: '2026-07-10T00:00:00.000Z',
      fetch_outcome: 'not_attempted',
      reason: 'No legal fetch surface',
    };
    const invalid = [
      { ...baseUnavailable, eligible_candidate_count: 0, final_candidate_ordinal: 1 },
      { ...baseUnavailable, eligible_candidate_count: 1 },
      { ...baseUnavailable, eligible_candidate_count: 4, final_candidate_ordinal: 1, result_url: 'https://example.com/' },
      { ...baseUnavailable, eligible_candidate_count: 2, final_candidate_ordinal: 3, result_url: 'https://example.com/' },
      { ...baseUnavailable, eligible_candidate_count: 1, final_candidate_ordinal: 1 },
      {
        status: 'available', probed_at: '2026-07-10T00:00:00.000Z', result_url: 'https://example.com/', fetch_outcome: 'success', eligible_candidate_count: 0,
      },
      { status: 'unprobed', eligible_candidate_count: 1, final_candidate_ordinal: 1 },
    ];
    for (const research_access of invalid) {
      assert.equal(ProfileSchema.safeParse({ ...valid, research_access }).success, false, JSON.stringify(research_access));
    }
  });
});
