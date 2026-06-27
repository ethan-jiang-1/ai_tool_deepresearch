// read-bundle-profile.test.mjs
// Unit tests for readBundleProfile() — gate-helpers shared utility
// @impl RES-003
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBundleProfile } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-read-bundle-profile-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

describe('readBundleProfile()', () => {
  it('returns null when profile file is missing (8a.2)', () => {
    const result = readBundleProfile(TMP);
    assert.strictEqual(result, null);
  });

  it('returns parsed YAML object for a valid file (8a.1)', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(join(TMP, 'rb_profile.yaml'), [
      'plan_basename: test-bundle',
      'research_profile: quick_factual',
      'root_must_answer_set:',
      '  - "What is X?"',
    ].join('\n'));

    const profile = readBundleProfile(TMP);
    assert.ok(profile !== null, 'profile should not be null');
    assert.strictEqual(typeof profile, 'object');
    assert.strictEqual(profile.plan_basename, 'test-bundle');
    assert.strictEqual(profile.research_profile, 'quick_factual');
    assert.deepStrictEqual(profile.root_must_answer_set, ['What is X?']);
  });

  it('returns null for empty YAML (8a.5)', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(join(TMP, 'rb_profile.yaml'), '');

    const profile = readBundleProfile(TMP);
    // parseYaml returns null for empty string, our wrapper returns null
    assert.strictEqual(profile, null);
  });

  it('returns null for YAML parse error (8a.4)', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(join(TMP, 'rb_profile.yaml'), '{{{ invalid yaml');

    const profile = readBundleProfile(TMP);
    assert.strictEqual(profile, null);
  });

  it('returns parsed object with research_style_params when present', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(join(TMP, 'rb_profile.yaml'), [
      'plan_basename: test',
      'research_profile: claim_verification',
      'research_style_params:',
      '  user_visible: true',
      '  wave0_shared_ref_floor: 12',
      '  wave1_per_topic_ref_floor: 10',
      '  topic_unique_ratio: 0.5',
      '  counterexample_search: true',
      '  cross_verification: true',
      '  p0p1_independent_backing: 2',
      '  quality_min_tier: tier_2',
      '  quality_min_substance: substantive',
    ].join('\n'));

    const profile = readBundleProfile(TMP);
    assert.ok(profile !== null);
    assert.ok(profile.research_style_params);
    assert.strictEqual(profile.research_style_params.wave0_shared_ref_floor, 12);
    assert.strictEqual(profile.research_style_params.wave1_per_topic_ref_floor, 10);
    assert.strictEqual(profile.research_style_params.counterexample_search, true);
    assert.strictEqual(profile.research_style_params.cross_verification, true);
    assert.strictEqual(profile.research_style_params.user_visible, true);
  });
});
