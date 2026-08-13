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

const currentDirectSampleObservations = [
  { sample_id: 'gov_cn', source_group: 'china', outcome: 'content', retrieval_surface: 'native' },
  { sample_id: 'gitee', source_group: 'china', outcome: 'http_denied' },
  { sample_id: 'xinhuanet', source_group: 'china', outcome: 'challenge' },
  { sample_id: 'cnki_catalog', source_group: 'china', outcome: 'login_required' },
  { sample_id: 'wikipedia', source_group: 'overseas', outcome: 'transport_inconclusive' },
  { sample_id: 'github', source_group: 'overseas', outcome: 'rate_limited' },
  { sample_id: 'iana', source_group: 'overseas', outcome: 'failed' },
  { sample_id: 'arxiv', source_group: 'overseas', outcome: 'round_budget_not_attempted' },
  { sample_id: 'rfc_editor', source_group: 'overseas', outcome: 'round_budget_not_attempted' },
];

function currentDirectAccess({
  status = 'available',
  sample_observations = currentDirectSampleObservations,
  ...overrides
} = {}) {
  return {
    status,
    probed_at: '2026-08-11T00:00:00.000Z',
    sample_observations,
    ...(status === 'unavailable' ? { reason: 'No non-diagnostic core sample returned content.' } : {}),
    ...overrides,
  };
}

function noCoreContentObservations(outcome = 'failed') {
  return currentDirectSampleObservations.map(({ sample_id, source_group }) => ({
    sample_id,
    source_group,
    outcome,
  }));
}

describe('ProfileSchema', () => {
  it('accepts valid profile', () => {
    assert.ok(ProfileSchema.safeParse(valid).success);
  });

  it('defaults a profile without delegated_concurrency_cap to 12', () => {
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

  it('accepts a profile without optional research_access', () => {
    assert.ok(ProfileSchema.safeParse(valid).success);
  });

  it('accepts strict unprobed research_access', () => {
    assert.ok(ProfileSchema.safeParse({ ...valid, research_access: { status: 'unprobed' } }).success);
  });

  it('rejects every retired access-envelope field family', () => {
    const legacyFields = [
      ['result_url', 'https://example.com/returned'],
      ['fetch_outcome', 'success'],
      ['search_surface', 'WebSearch'],
      ['fetch_surface', 'WebFetch'],
      ['eligible_candidate_count', 1],
      ['final_candidate_ordinal', 1],
      ['source_class_reachability', [{ source_class: 'encyclopedia', reachability: 'reachable' }]],
      ['access_boundary', { location: 'network_path', extent: 'universal' }],
    ];

    for (const [field, value] of legacyFields) {
      const research_access = currentDirectAccess({ [field]: value });
      assert.equal(ProfileSchema.safeParse({ ...valid, research_access }).success, false, field);
    }
  });

  it('accepts a complete current direct-sample observation', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: currentDirectAccess(),
    });

    assert.equal(result.success, true);
  });

  it('requires every declared current sample exactly once with its fixed group', () => {
    const duplicate = structuredClone(currentDirectSampleObservations);
    duplicate[duplicate.length - 1] = { ...duplicate[duplicate.length - 1], sample_id: 'arxiv' };
    const mismatchedGroup = structuredClone(currentDirectSampleObservations);
    mismatchedGroup[0] = { ...mismatchedGroup[0], source_group: 'overseas' };
    const unknownSample = structuredClone(currentDirectSampleObservations);
    unknownSample[0] = { ...unknownSample[0], sample_id: 'other_site' };
    const missing = currentDirectSampleObservations.slice(0, -1);

    for (const sample_observations of [duplicate, mismatchedGroup, unknownSample, missing]) {
      assert.equal(
        ProfileSchema.safeParse({ ...valid, research_access: currentDirectAccess({ sample_observations }) }).success,
        false,
        JSON.stringify(sample_observations),
      );
    }
  });

  it('allows retrieval_surface only with real content', () => {
    const missingContentSurface = structuredClone(currentDirectSampleObservations);
    delete missingContentSurface[0].retrieval_surface;
    const surfaceOnFailure = structuredClone(currentDirectSampleObservations);
    surfaceOnFailure[1] = { ...surfaceOnFailure[1], retrieval_surface: 'browser' };

    for (const sample_observations of [missingContentSurface, surfaceOnFailure]) {
      assert.equal(
        ProfileSchema.safeParse({ ...valid, research_access: currentDirectAccess({ sample_observations }) }).success,
        false,
      );
    }
  });

  it('enforces current status from non-diagnostic core content and unavailable reason', () => {
    const noCoreContent = noCoreContentObservations();
    const diagnosticOnlyContent = noCoreContentObservations();
    diagnosticOnlyContent[3] = {
      ...diagnosticOnlyContent[3],
      outcome: 'content',
      retrieval_surface: 'native',
    };
    const unavailableWithCoreContent = currentDirectAccess({
      status: 'unavailable',
      sample_observations: currentDirectSampleObservations,
    });
    const unavailableWithoutReason = currentDirectAccess({
      status: 'unavailable',
      sample_observations: noCoreContent,
    });
    delete unavailableWithoutReason.reason;

    const acceptedUnavailable = ProfileSchema.safeParse({
      ...valid,
      research_access: currentDirectAccess({
        status: 'unavailable',
        sample_observations: noCoreContent,
      }),
    });
    assert.equal(acceptedUnavailable.success, true);
    for (const research_access of [
      currentDirectAccess({ sample_observations: noCoreContent }),
      currentDirectAccess({ sample_observations: diagnosticOnlyContent }),
      unavailableWithCoreContent,
      unavailableWithoutReason,
    ]) {
      assert.equal(ProfileSchema.safeParse({ ...valid, research_access }).success, false, JSON.stringify(research_access));
    }
  });

  it('rejects dynamic or provider-specific material in a current direct observation', () => {
    for (const field of [
      'result_url',
      'page_body',
      'headers',
      'query',
      'candidate',
      'eligible_candidate_count',
      'retry_count',
      'provider',
      'fetch_surface',
    ]) {
      const research_access = currentDirectAccess({ [field]: 'forbidden' });
      assert.equal(ProfileSchema.safeParse({ ...valid, research_access }).success, false, field);
    }
  });

  it('distinguishes a whole no-request observation from round-budget expiry', () => {
    const allNotAttempted = noCoreContentObservations('not_attempted');
    const allBudgetNotAttempted = noCoreContentObservations('round_budget_not_attempted');
    const mixedNotAttempted = structuredClone(allBudgetNotAttempted);
    mixedNotAttempted[0] = { ...mixedNotAttempted[0], outcome: 'not_attempted' };

    const wholeNoRequest = ProfileSchema.safeParse({
      ...valid,
      research_access: currentDirectAccess({
        status: 'unavailable',
        sample_observations: allNotAttempted,
        reason: 'The isolated probe could not start a direct page request.',
      }),
    });
    const spentRound = ProfileSchema.safeParse({
      ...valid,
      research_access: currentDirectAccess({
        status: 'unavailable',
        sample_observations: allBudgetNotAttempted,
      }),
    });
    const invalidMixed = ProfileSchema.safeParse({
      ...valid,
      research_access: currentDirectAccess({
        status: 'unavailable',
        sample_observations: mixedNotAttempted,
      }),
    });

    assert.equal(wholeNoRequest.success, true);
    assert.equal(spentRound.success, true);
    assert.equal(invalidMixed.success, false);
  });
});
