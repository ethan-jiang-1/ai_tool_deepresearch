// gate-definition-threshold-source.test.mjs
// Schema tests: gate definition JSON round-trip with threshold_source
// @impl RES-002, RES-003
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResearchStyleParamsSchema, ProfileSchema } from '../../DEEP_RESEARCH_HARNESS/schema/index.mjs';
import { readGateDefinitionSnapshot } from '../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFS_DIR = join(__dirname, '..', '..', 'DEEP_RESEARCH_HARNESS', 'schema', 'gate_definitions');

function loadDef(filename) {
  return readGateDefinitionSnapshot(join(DEFS_DIR, filename)).definition;
}

describe('Gate definitions with threshold_source', () => {
  // 8d.1
  it('gate-wave0-complete has threshold_source on all count_floor rules (8d.1)', () => {
    const def = loadDef('gate-wave0-complete.definition.json');
    assert.ok(def.rules.length > 0);
    const countFloorRules = def.rules.filter(r => r.check === 'count_floor');
    assert.ok(countFloorRules.length > 0, 'should have count_floor rules');
    for (const rule of countFloorRules) {
      assert.ok(rule.threshold_source, `${rule.id} should have threshold_source`);
      assert.ok(rule.threshold_source.includes('#/'), `${rule.id} threshold_source should contain #/`);
      assert.strictEqual(typeof rule.threshold, 'number', `${rule.id} should retain threshold as number`);
    }
  });

  // 8d.2
  it('gate-wave1-complete has threshold_source on count_floor rule (8d.2)', () => {
    const def = loadDef('gate-wave1-complete.definition.json');
    const countFloorRules = def.rules.filter(r => r.check === 'count_floor');
    assert.ok(countFloorRules.length > 0, 'should have count_floor rules');
    for (const rule of countFloorRules) {
      assert.ok(rule.threshold_source, `${rule.id} should have threshold_source`);
      assert.strictEqual(typeof rule.threshold, 'number', `${rule.id} should retain threshold as number`);
    }
  });

  it('wave gate definitions omit retired content heuristic rules', () => {
    for (const filename of ['gate-wave0-complete.definition.json', 'gate-wave1-complete.definition.json']) {
      const def = loadDef(filename);
      const checks = def.rules.map((rule) => rule.check);
      const ids = def.rules.map((rule) => rule.id);
      assert.equal(checks.includes('content_dedup'), false, `${filename} must not include retired content_dedup`);
      assert.equal(ids.includes('content_dedup'), false, `${filename} must not include retired content_dedup id`);
      assert.equal(JSON.stringify(def).includes('jaccard'), false, `${filename} must not include retired Jaccard thresholds`);
      assert.equal(JSON.stringify(def).includes('homepage_detect'), false, `${filename} must not include retired homepage detection`);
    }

    const wave1 = loadDef('gate-wave1-complete.definition.json');
    assert.equal(wave1.rules.some((rule) => rule.check === 'reference_source_url_article_level'), false);
    assert.equal(wave1.rules.some((rule) => rule.id === 'source_url_article_level'), false);
    assert.ok(wave1.rules.some((rule) => rule.check === 'reference_source_url_parseable'));
  });

  // 8d.3
  it('all other gate definition JSONs parse without error (8d.3)', () => {
    const allDefs = [
      'gate-hitl1-recorded.definition.json',
      'gate-hitl2-recorded.definition.json',
      'gate-instantiation-complete.definition.json',
      'gate-readiness-passed.definition.json',
      'gate-rerun-ready.definition.json',
      'gate-seed-topics-ready.definition.json',
      'gate-setup-ready.definition.json',
      'gate-wave2-complete.definition.json',
    ];
    for (const filename of allDefs) {
      assert.doesNotThrow(() => loadDef(filename), `${filename} should parse`);
    }
  });
});

describe('ResearchStyleParamsSchema', () => {
  // 8d.4
  it('accepts valid style params (8d.4)', () => {
    const valid = {
      user_visible: true,
      wave0_per_topic_source_floor: 12,
      wave0_shared_ref_total: 12,
      wave1_per_topic_ref_floor: 10,
      topic_unique_ratio: 0.5,
      counterexample_search: true,
      cross_verification: true,
      p0p1_independent_backing: 2,
      quality_min_tier: 'tier_2',
      quality_min_substance: 'substantive',
      wave2_cross_topic_depth: 3,
      wave2_emergent_search_rounds: 2,
    };
    const result = ResearchStyleParamsSchema.safeParse(valid);
    assert.ok(result.success, `should accept valid params: ${result.error ? JSON.stringify(result.error.issues) : 'ok'}`);
  });

  it('accepts debug style (lowest values)', () => {
    const debug = {
      user_visible: false,
      wave0_per_topic_source_floor: 1,
      wave0_shared_ref_total: 1,
      wave1_per_topic_ref_floor: 1,
      topic_unique_ratio: 0,
      counterexample_search: false,
      cross_verification: false,
      p0p1_independent_backing: 1,
      quality_min_tier: 'tier_4',
      quality_min_substance: 'none',
      wave2_cross_topic_depth: 0,
      wave2_emergent_search_rounds: 0,
    };
    const result = ResearchStyleParamsSchema.safeParse(debug);
    assert.ok(result.success);
  });

  it('rejects missing required fields (8d.4)', () => {
    const incomplete = {
      user_visible: true,
      // missing wave0_per_topic_source_floor
      wave1_per_topic_ref_floor: 10,
    };
    const result = ResearchStyleParamsSchema.safeParse(incomplete);
    assert.strictEqual(result.success, false);
  });

  it('rejects invalid enum values', () => {
    const badTier = {
      user_visible: true,
      wave0_per_topic_source_floor: 12,
      wave0_shared_ref_total: 12,
      wave1_per_topic_ref_floor: 10,
      topic_unique_ratio: 0.5,
      counterexample_search: true,
      cross_verification: true,
      p0p1_independent_backing: 2,
      quality_min_tier: 'tier_5', // invalid — max is tier_4
      quality_min_substance: 'substantive',
      wave2_cross_topic_depth: 3,
      wave2_emergent_search_rounds: 2,
    };
    const result = ResearchStyleParamsSchema.safeParse(badTier);
    assert.strictEqual(result.success, false);
  });
});

describe('ProfileSchema with research_style_params', () => {
  const baseProfile = {
    plan_basename: 'test-bundle',
    research_profile: 'quick_factual',
    root_must_answer_set: ['What is X?'],
    human_decision_checkpoints: {
      hitl1: { status: 'not_started' },
      hitl2: {
        status: 'not_started',
        answerability_class: 'not_assessed',
        user_decision: 'not_started',
        final_report_view: 'not_started',
      },
    },
  };

  // 8d.5
  it('accepts profile with research_style_params (8d.5)', () => {
    const withParams = {
      ...baseProfile,
      research_style_params: {
        user_visible: true,
        wave0_per_topic_source_floor: 6,
        wave0_shared_ref_total: 6,
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
    };
    const result = ProfileSchema.safeParse(withParams);
    assert.ok(result.success, `should accept profile with params: ${result.error ? JSON.stringify(result.error.issues) : 'ok'}`);
  });

  it('accepts profile without research_style_params (optional, backward compat) (8d.5)', () => {
    const result = ProfileSchema.safeParse(baseProfile);
    assert.ok(result.success, `should accept profile without params: ${result.error ? JSON.stringify(result.error.issues) : 'ok'}`);
  });

  it('accepts profile with debug research_profile', () => {
    const debugProfile = {
      ...baseProfile,
      research_profile: 'debug',
      research_style_params: {
        user_visible: false,
        wave0_per_topic_source_floor: 1,
        wave0_shared_ref_total: 1,
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
    };
    const result = ProfileSchema.safeParse(debugProfile);
    assert.ok(result.success);
  });
});
