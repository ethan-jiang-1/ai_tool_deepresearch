// @impl GSK-002, REI-003, REI-005

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const TARGET = 'rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count';

function definition(overrides = {}) {
  return {
    gate: 'rerun-ready',
    rules: [{
      id: 'rerun_count_valid',
      check: 'rerun_count_limit',
      target: TARGET,
      operator: 'less_than',
      value: 3,
      ...overrides,
    }],
  };
}

function profile(count = 0) {
  const hitl2 = {};
  if (count !== undefined) hitl2.rerun_count = count;
  return { plan_basename: 'test', human_decision_checkpoints: { hitl2 } };
}

async function evaluator() {
  const module = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/rerun-availability.mjs');
  assert.equal(typeof module.evaluateRerunAvailability, 'function');
  return module.evaluateRerunAvailability;
}

function assertUnsupported(result) {
  assert.deepEqual(Object.keys(result).sort(), ['reason', 'supported']);
  assert.equal(result.supported, false);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0);
}

describe('evaluateRerunAvailability', () => {
  it('returns the exact closed supported shape for current and next-count modes', async () => {
    const evaluate = await evaluator();
    const def = definition();
    const parsedProfile = profile(1);
    const beforeDefinition = structuredClone(def);
    const beforeProfile = structuredClone(parsedProfile);

    assert.deepEqual(evaluate({ definition: def, profile: parsedProfile, includeNextIncrement: false }), {
      supported: true,
      available: true,
      currentCount: 1,
      evaluatedCount: 1,
      exclusiveLimit: 3,
    });
    assert.deepEqual(evaluate({ definition: def, profile: parsedProfile, includeNextIncrement: true }), {
      supported: true,
      available: true,
      currentCount: 1,
      evaluatedCount: 2,
      exclusiveLimit: 3,
    });
    assert.deepEqual(def, beforeDefinition);
    assert.deepEqual(parsedProfile, beforeProfile);
  });

  it('uses the active exclusive boundary and distinguishes Gate from pre-increment advice', async () => {
    const evaluate = await evaluator();
    assert.equal(evaluate({ definition: definition(), profile: profile(2), includeNextIncrement: false }).available, true);
    assert.equal(evaluate({ definition: definition(), profile: profile(2), includeNextIncrement: true }).available, false);
    assert.equal(evaluate({ definition: definition(), profile: profile(3), includeNextIncrement: false }).available, false);
  });

  it('defaults only an absent nested count to zero', async () => {
    const evaluate = await evaluator();
    assert.deepEqual(evaluate({ definition: definition(), profile: profile(undefined), includeNextIncrement: true }), {
      supported: true,
      available: true,
      currentCount: 0,
      evaluatedCount: 1,
      exclusiveLimit: 3,
    });
    for (const count of [null, '0', -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assertUnsupported(evaluate({ definition: definition(), profile: profile(count), includeNextIncrement: false }));
    }
  });

  it('requires object-shaped full profile, checkpoints, and HITL2 parents', async () => {
    const evaluate = await evaluator();
    const invalidProfiles = [
      null,
      [],
      {},
      { human_decision_checkpoints: null },
      { human_decision_checkpoints: [] },
      { human_decision_checkpoints: {} },
      { human_decision_checkpoints: { hitl2: null } },
      { human_decision_checkpoints: { hitl2: [] } },
    ];
    for (const invalidProfile of invalidProfiles) {
      assertUnsupported(evaluate({ definition: definition(), profile: invalidProfile, includeNextIncrement: false }));
    }
  });

  it('requires an explicitly supplied boolean mode', async () => {
    const evaluate = await evaluator();
    assertUnsupported(evaluate({ definition: definition(), profile: profile(1) }));
    for (const mode of [null, 0, 1, '', 'false', {}, []]) {
      assertUnsupported(evaluate({ definition: definition(), profile: profile(1), includeNextIncrement: mode }));
    }
  });

  it('fails closed unless exactly one canonical active rule is supported', async () => {
    const evaluate = await evaluator();
    const invalidDefinitions = [
      null,
      {},
      { ...definition(), gate: 'other' },
      { ...definition(), rules: [] },
      { ...definition(), rules: [...definition().rules, ...definition().rules] },
      definition({ id: 'other' }),
      definition({ check: 'other' }),
      definition({ target: 'rb_profile.yaml#/rerun_count' }),
      definition({ operator: 'less_than_or_equal' }),
      definition({ value: 0 }),
      definition({ value: 1.5 }),
    ];
    for (const invalidDefinition of invalidDefinitions) {
      assertUnsupported(evaluate({ definition: invalidDefinition, profile: profile(1), includeNextIncrement: false }));
    }
  });
});
