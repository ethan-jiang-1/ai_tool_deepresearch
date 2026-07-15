// research-styles-computation.test.mjs
// Validates all 4 JSON style files and the apply-research-style.mjs computation
// @impl RES-001, RES-002
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResearchStyleParamsSchema } from '../../DPT_FRAMEWORK/schema/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = join(__dirname, '..', '..', 'DPT_FRAMEWORK', 'schema', 'research-styles');

const STYLES = ['debug', 'quick_factual', 'exploratory_map', 'claim_verification'];

// Expected values table: [style][field] = expected
const EXPECTED = {
  debug: {
    user_visible: false,
    wave0_per_topic_source_floor: 1,
    wave0_shared_ref_base: 1,
    wave0_shared_ref_per_topic: 0,
    wave1_per_topic_ref_floor: 1,
    topic_unique_ratio: 0,
    counterexample_search: false,
    cross_verification: false,
    p0p1_independent_backing: 1,
    quality_min_tier: 'tier_4',
    quality_min_substance: 'none',
    wave2_cross_topic_depth: 0,
    wave2_emergent_search_rounds: 0,
  },
  quick_factual: {
    user_visible: true,
    wave0_per_topic_source_floor: 6,
    wave0_shared_ref_base: 3,
    wave0_shared_ref_per_topic: 1,
    wave1_per_topic_ref_floor: 5,
    topic_unique_ratio: 0.3,
    counterexample_search: false,
    cross_verification: false,
    p0p1_independent_backing: 1,
    quality_min_tier: 'tier_3',
    quality_min_substance: 'thin',
    wave2_cross_topic_depth: 0,
    wave2_emergent_search_rounds: 0,
  },
  exploratory_map: {
    user_visible: true,
    wave0_per_topic_source_floor: 10,
    wave0_shared_ref_base: 4,
    wave0_shared_ref_per_topic: 1,
    wave1_per_topic_ref_floor: 8,
    topic_unique_ratio: 0.4,
    counterexample_search: false,
    cross_verification: false,
    p0p1_independent_backing: 1,
    quality_min_tier: 'tier_3',
    quality_min_substance: 'thin',
    wave2_cross_topic_depth: 1,
    wave2_emergent_search_rounds: 1,
  },
  claim_verification: {
    user_visible: true,
    wave0_per_topic_source_floor: 12,
    wave0_shared_ref_base: 6,
    wave0_shared_ref_per_topic: 2,
    wave1_per_topic_ref_floor: 10,
    topic_unique_ratio: 0.5,
    counterexample_search: true,
    cross_verification: true,
    p0p1_independent_backing: 2,
    quality_min_tier: 'tier_2',
    quality_min_substance: 'substantive',
    wave2_cross_topic_depth: 2,
    wave2_emergent_search_rounds: 2,
  },
};

// Expected shared_ref_total for various topic counts: base + per_topic × N
const EXPECTED_TOTAL = {
  debug:               { 0: 1, 1: 1, 3: 1, 5: 1, 10: 1 },
  quick_factual:       { 0: 3, 1: 4, 3: 6, 5: 8, 10: 13 },
  exploratory_map:     { 0: 4, 1: 5, 3: 7, 5: 9, 10: 14 },
  claim_verification:  { 0: 6, 1: 8, 3: 12, 5: 16, 10: 26 },
};

const TOPIC_COUNTS = [0, 1, 3, 5, 10];

// ── Helpers ──
function loadStyle(name) {
  const path = join(STYLES_DIR, `${name}.json`);
  assert.ok(existsSync(path), `${name}.json should exist`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ── Static validation of all 4 JSON files ──
describe('JSON style files — static validation', () => {
  for (const name of STYLES) {
    describe(name, () => {
      it('parses as valid JSON with all required keys', () => {
        const s = loadStyle(name);
        const expected = EXPECTED[name];
        // Check direct keys (skip base/per_topic — they're nested under wave0_shared_ref)
        for (const [key, val] of Object.entries(expected)) {
          if (key === 'wave0_shared_ref_base' || key === 'wave0_shared_ref_per_topic') continue;
          assert.ok(key in s, `${name}.json missing key: ${key}`);
          assert.strictEqual(s[key], val, `${name}.${key}`);
        }
        // Check nested wave0_shared_ref
        assert.strictEqual(s.wave0_shared_ref.base, expected.wave0_shared_ref_base, `${name} wave0_shared_ref.base`);
        assert.strictEqual(s.wave0_shared_ref.per_topic, expected.wave0_shared_ref_per_topic, `${name} wave0_shared_ref.per_topic`);
      });

      it('has wave0_shared_ref as object with base and per_topic', () => {
        const s = loadStyle(name);
        assert.equal(typeof s.wave0_shared_ref, 'object', 'wave0_shared_ref should be object');
        assert.equal(typeof s.wave0_shared_ref.base, 'number', 'base should be number');
        assert.equal(typeof s.wave0_shared_ref.per_topic, 'number', 'per_topic should be number');
      });

      it('user_visible matches expected', () => {
        const s = loadStyle(name);
        assert.strictEqual(s.user_visible, EXPECTED[name].user_visible);
      });

      // Only debug has user_visible: false
      if (name === 'debug') {
        it('is hidden from users', () => {
          const s = loadStyle(name);
          assert.strictEqual(s.user_visible, false);
        });
      } else {
        it('is visible to users', () => {
          const s = loadStyle(name);
          assert.strictEqual(s.user_visible, true);
        });
      }
    });
  }
});

// ── Topic-count-aware computation: shared_ref_total ──
describe('wave0_shared_ref_total computation', () => {
  for (const name of STYLES) {
    describe(name, () => {
      const s = loadStyle(name);
      for (const n of TOPIC_COUNTS) {
        it(`topic_count=${n} → total=${EXPECTED_TOTAL[name][n]}`, () => {
          const total = s.wave0_shared_ref.base + s.wave0_shared_ref.per_topic * n;
          assert.strictEqual(total, EXPECTED_TOTAL[name][n],
            `${name}: base=${s.wave0_shared_ref.base} + ${s.wave0_shared_ref.per_topic}×${n} = ${total}, expected ${EXPECTED_TOTAL[name][n]}`);
        });
      }
    });
  }
});

// ── Cross-style gradient validation ──
describe('cross-style gradient consistency', () => {
  it('w0_per_topic_source_floor: debug < quick < exploratory < claim', () => {
    const vals = STYLES.map(n => loadStyle(n).wave0_per_topic_source_floor);
    for (let i = 1; i < vals.length; i++) {
      assert.ok(vals[i] >= vals[i - 1], `${STYLES[i]}.w0_per_topic (${vals[i]}) >= ${STYLES[i - 1]} (${vals[i - 1]})`);
    }
  });

  it('w1_per_topic_ref_floor: debug < quick < exploratory < claim', () => {
    const vals = STYLES.map(n => loadStyle(n).wave1_per_topic_ref_floor);
    for (let i = 1; i < vals.length; i++) {
      assert.ok(vals[i] >= vals[i - 1], `${STYLES[i]}.w1_per_topic (${vals[i]}) >= ${STYLES[i - 1]} (${vals[i - 1]})`);
    }
  });

  it('w2 params: only claim and exploratory have depth/rounds > 0', () => {
    assert.strictEqual(loadStyle('debug').wave2_cross_topic_depth, 0);
    assert.strictEqual(loadStyle('quick_factual').wave2_cross_topic_depth, 0);
    assert.ok(loadStyle('exploratory_map').wave2_cross_topic_depth > 0);
    assert.ok(loadStyle('claim_verification').wave2_cross_topic_depth > 0);

    assert.strictEqual(loadStyle('debug').wave2_emergent_search_rounds, 0);
    assert.strictEqual(loadStyle('quick_factual').wave2_emergent_search_rounds, 0);
    assert.ok(loadStyle('exploratory_map').wave2_emergent_search_rounds > 0);
    assert.ok(loadStyle('claim_verification').wave2_emergent_search_rounds > 0);
  });

  it('claim_verification is strictest in all quality dimensions', () => {
    const styles = STYLES.map(n => loadStyle(n));
    const cv = styles[3]; // claim_verification
    // Highest floors
    assert.strictEqual(Math.max(...styles.map(s => s.wave0_per_topic_source_floor)), cv.wave0_per_topic_source_floor);
    assert.strictEqual(Math.max(...styles.map(s => s.wave1_per_topic_ref_floor)), cv.wave1_per_topic_ref_floor);
    // Strictest quality requirements
    assert.strictEqual(Math.max(...styles.map(s => s.p0p1_independent_backing)), cv.p0p1_independent_backing);
    assert.strictEqual(Math.max(...styles.map(s => s.wave2_cross_topic_depth)), cv.wave2_cross_topic_depth);
    assert.strictEqual(Math.max(...styles.map(s => s.wave2_emergent_search_rounds)), cv.wave2_emergent_search_rounds);
  });
});

// ── Schema validation — all style params pass ResearchStyleParamsSchema ──
describe('ResearchStyleParamsSchema validates computed output', () => {
  for (const name of STYLES) {
    it(`${name} computed params pass schema`, () => {
      const s = loadStyle(name);
      // Build the profile-side params (what CLI writes to profile)
      const params = {
        user_visible: s.user_visible,
        wave0_per_topic_source_floor: s.wave0_per_topic_source_floor,
        wave0_shared_ref_total: s.wave0_shared_ref.base + s.wave0_shared_ref.per_topic * 3, // topic_count=3
        wave1_per_topic_ref_floor: s.wave1_per_topic_ref_floor,
        topic_unique_ratio: s.topic_unique_ratio,
        counterexample_search: s.counterexample_search,
        cross_verification: s.cross_verification,
        p0p1_independent_backing: s.p0p1_independent_backing,
        quality_min_tier: s.quality_min_tier,
        quality_min_substance: s.quality_min_substance,
        wave2_cross_topic_depth: s.wave2_cross_topic_depth,
        wave2_emergent_search_rounds: s.wave2_emergent_search_rounds,
      };
      const result = ResearchStyleParamsSchema.safeParse(params);
      assert.ok(result.success, `${name}: ${result.error ? JSON.stringify(result.error.issues) : 'ok'}`);
    });
  }

  it('debug params have lowest possible values', () => {
    const s = loadStyle('debug');
    const params = {
      user_visible: s.user_visible,
      wave0_per_topic_source_floor: s.wave0_per_topic_source_floor,
      wave0_shared_ref_total: s.wave0_shared_ref.base,
      wave1_per_topic_ref_floor: s.wave1_per_topic_ref_floor,
      topic_unique_ratio: s.topic_unique_ratio,
      counterexample_search: s.counterexample_search,
      cross_verification: s.cross_verification,
      p0p1_independent_backing: s.p0p1_independent_backing,
      quality_min_tier: s.quality_min_tier,
      quality_min_substance: s.quality_min_substance,
      wave2_cross_topic_depth: s.wave2_cross_topic_depth,
      wave2_emergent_search_rounds: s.wave2_emergent_search_rounds,
    };
    const result = ResearchStyleParamsSchema.safeParse(params);
    assert.ok(result.success, `debug params should pass schema: ${result.error ? JSON.stringify(result.error.issues) : 'ok'}`);
  });
});
