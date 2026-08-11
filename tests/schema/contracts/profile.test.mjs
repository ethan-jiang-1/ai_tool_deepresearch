// tests/schema/contracts/profile.test.mjs — 1:1 for DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProfileSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs';

const sourceClassReachability = [
  { source_class: 'encyclopedia', reachability: 'unreachable' },
  { source_class: 'code_host', reachability: 'reachable' },
  { source_class: 'general_web', reachability: 'not_attempted' },
];

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

  it('accepts a statically bounded partial-reachability envelope', () => {
    const result = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'available',
        probed_at: '2026-08-11T00:00:00.000Z',
        result_url: 'https://example.com/returned',
        fetch_outcome: 'success',
        source_class_reachability: sourceClassReachability,
        access_boundary: { location: 'network_path', extent: 'class_scoped' },
      },
    });

    assert.equal(result.success, true);
  });

  it('accepts an unavailable universal boundary without defaulting unclassified observations', () => {
    const universal = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-08-11T00:00:00.000Z',
        fetch_outcome: 'not_attempted',
        reason: 'The isolated probe could not start.',
        source_class_reachability: sourceClassReachability.map((entry) => ({ ...entry, reachability: 'unreachable' })),
        access_boundary: { location: 'probe_relay', extent: 'universal' },
      },
    });
    const unclassified = ProfileSchema.safeParse({
      ...valid,
      research_access: {
        status: 'unavailable',
        probed_at: '2026-08-11T00:00:00.000Z',
        fetch_outcome: 'failed',
        reason: 'Different attempted classes exposed unrelated failures.',
        source_class_reachability: sourceClassReachability.map((entry) => ({ ...entry, reachability: 'unreachable' })),
      },
    });

    assert.equal(universal.success, true);
    assert.equal(unclassified.success, true);
    assert.equal(unclassified.data.research_access.access_boundary, undefined);
  });

  it('rejects malformed source-class envelopes and boundary combinations', () => {
    const available = {
      status: 'available',
      probed_at: '2026-08-11T00:00:00.000Z',
      result_url: 'https://example.com/returned',
      fetch_outcome: 'success',
    };
    const unavailable = {
      status: 'unavailable',
      probed_at: '2026-08-11T00:00:00.000Z',
      fetch_outcome: 'failed',
      reason: 'No declared class was reachable.',
    };
    const invalid = [
      { ...available, source_class_reachability: [{ source_class: 'encyclopedia', reachability: 'unreachable' }] },
      { ...unavailable, source_class_reachability: sourceClassReachability },
      {
        ...available,
        source_class_reachability: [
          ...sourceClassReachability,
          { source_class: 'encyclopedia', reachability: 'reachable' },
        ],
      },
      { ...available, source_class_reachability: [{ source_class: 'unknown', reachability: 'reachable' }] },
      {
        ...available,
        source_class_reachability: sourceClassReachability,
        access_boundary: { location: 'network_path', extent: 'universal' },
      },
      {
        ...available,
        source_class_reachability: [{ source_class: 'code_host', reachability: 'reachable' }],
        access_boundary: { location: 'network_path', extent: 'class_scoped' },
      },
      {
        ...unavailable,
        source_class_reachability: sourceClassReachability.map((entry) => ({ ...entry, reachability: 'unreachable' })),
        access_boundary: { location: 'network_path', extent: 'class_scoped' },
      },
      {
        status: 'unprobed',
        source_class_reachability: [{ source_class: 'encyclopedia', reachability: 'not_attempted' }],
      },
      {
        status: 'unprobed',
        access_boundary: { location: 'probe_relay', extent: 'universal' },
      },
    ];

    for (const research_access of invalid) {
      assert.equal(ProfileSchema.safeParse({ ...valid, research_access }).success, false, JSON.stringify(research_access));
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
