// resolve-threshold.test.mjs
// Unit tests for resolveThreshold() — gate-helpers shared utility
// @impl RES-003
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveThreshold } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';

// Test profiles
const profile = {
  research_style_params: {
    wave0_shared_ref_floor: 12,
    wave1_per_topic_ref_floor: 10,
    topic_unique_ratio: 0.5,
    nested: {
      deep_value: 8,
    },
  },
};

describe('resolveThreshold()', () => {
  // 8b.1: threshold_source resolves to value in profile
  it('resolves dynamic threshold from profile path (8b.1)', () => {
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_floor',
      threshold: 1,
    };
    assert.strictEqual(resolveThreshold(rule, profile), 12);
  });

  // 8b.1 variant: different path
  it('resolves wave1 floor from profile', () => {
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor',
      threshold: 1,
    };
    assert.strictEqual(resolveThreshold(rule, profile), 10);
  });

  // 8b.2: path not found → fallback
  it('falls back to hardcoded threshold when path not found (8b.2)', () => {
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/nonexistent_field',
      threshold: 1,
    };
    assert.strictEqual(resolveThreshold(rule, profile), 1);
  });

  // 8b.3: profile is null → fallback
  it('falls back when profile is null (8b.3)', () => {
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_floor',
      threshold: 3,
    };
    assert.strictEqual(resolveThreshold(rule, null), 3);
  });

  // 8b.4: no threshold_source → use hardcoded
  it('uses hardcoded threshold when threshold_source is absent (8b.4)', () => {
    const rule = { threshold: 5 };
    assert.strictEqual(resolveThreshold(rule, profile), 5);
  });

  // 8b.5: resolved value is zero → fallback (safety)
  it('falls back when resolved value is zero (8b.5)', () => {
    const zeroProfile = {
      research_style_params: { wave0_shared_ref_floor: 0 },
    };
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_floor',
      threshold: 7,
    };
    assert.strictEqual(resolveThreshold(rule, zeroProfile), 7);
  });

  // 8b.5 variant: non-number → fallback
  it('falls back when resolved value is a non-numeric string', () => {
    const badProfile = {
      research_style_params: { wave0_shared_ref_floor: 'not_a_number' },
    };
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_floor',
      threshold: 3,
    };
    assert.strictEqual(resolveThreshold(rule, badProfile), 3);
  });

  // 8b.5 variant: negative → fallback
  it('falls back when resolved value is negative', () => {
    const negProfile = {
      research_style_params: { wave0_shared_ref_floor: -5 },
    };
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_floor',
      threshold: 4,
    };
    assert.strictEqual(resolveThreshold(rule, negProfile), 4);
  });

  // 8b.6: deep multi-level path
  it('resolves nested (multi-level) path correctly (8b.6)', () => {
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/nested/deep_value',
      threshold: 1,
    };
    assert.strictEqual(resolveThreshold(rule, profile), 8);
  });

  // YAML string coercion
  it('coerces string "12" to number 12 (YAML type safety)', () => {
    const strProfile = {
      research_style_params: { wave0_shared_ref_floor: '12' },
    };
    const rule = {
      threshold_source: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_floor',
      threshold: 1,
    };
    assert.strictEqual(resolveThreshold(rule, strProfile), 12);
  });

  // Malformed threshold_source (no #/)
  it('falls back when threshold_source has no #/ separator', () => {
    const rule = {
      threshold_source: 'just_a_string_without_hash',
      threshold: 9,
    };
    assert.strictEqual(resolveThreshold(rule, profile), 9);
  });

  // threshold_source with empty path after #/
  it('falls back when threshold_source path after #/ is empty', () => {
    const rule = {
      threshold_source: 'rb_profile.yaml#/',
      threshold: 2,
    };
    assert.strictEqual(resolveThreshold(rule, profile), 2);
  });
});
