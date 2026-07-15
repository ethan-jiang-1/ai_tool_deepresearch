// @impl RES-001, RES-002
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const ROOT = process.cwd();
const NEW_BUNDLE = join(ROOT, 'experiments_env', 'shared', 'new-disposable-bundle.mjs');
const APPLY_STYLE = join(ROOT, 'DPT_FRAMEWORK', 'cli', 'apply-research-style.mjs');
const BUNDLES_DIR = join(ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function unique() { return `rt_style_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
function createBundleWithTopics(topicCount) {
  const result = spawnSync(process.execPath, [NEW_BUNDLE, unique(), '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const dir = result.stdout.trim();
  createdDirs.push(dir);
  const topics = Array.from({ length: topicCount }, (_, index) => ({ id: String(index + 1), slug: `${String(index + 1).padStart(2, '0')}_topic-${index + 1}`, title: `Topic ${index + 1}` }));
  writeFileSync(join(dir, 'rb_plan.md'), `---\n{\n  "plan_basename": "test",\n  "derived_topic_count": ${topicCount},\n  "topic_registry": ${JSON.stringify(topics)}\n}\n---`);
  return dir;
}
function runApply(dir, style) {
  return spawnSync(process.execPath, [APPLY_STYLE, '--bundle', dir, '--style', style], { encoding: 'utf8', timeout: 5000 });
}

after(() => { for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true }); });

describe('apply-research-style.mjs CLI integration', () => {
  for (const [style, topicCount, expected] of [
    ['claim_verification', 3, 12], ['quick_factual', 5, 8], ['debug', 10, 1], ['exploratory_map', 1, 5], ['claim_verification', 0, 6],
  ]) {
    it(`${style} with ${topicCount} topics computes total=${expected}`, () => {
      const dir = createBundleWithTopics(topicCount);
      const result = runApply(dir, style);
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.equal(output.applied, style);
      assert.equal(output.topic_count, topicCount);
      assert.equal(output.wave0_shared_ref_total, expected);
    });
  }

  it('writes computed research_style_params to profile YAML', () => {
    const dir = createBundleWithTopics(3);
    const result = runApply(dir, 'exploratory_map');
    assert.equal(result.status, 0, result.stderr);
    const profile = parseYaml(readFileSync(join(dir, 'rb_profile.yaml'), 'utf8'));
    assert.equal(profile.research_profile, 'exploratory_map');
    assert.equal(profile.research_style_params.wave0_per_topic_source_floor, 10);
    assert.equal(profile.research_style_params.wave0_shared_ref_total, 7);
    assert.equal(profile.research_style_params.wave1_per_topic_ref_floor, 8);
    assert.equal(profile.research_style_params.wave2_cross_topic_depth, 1);
  });

  it('preserves available research_access and HITL fields across rerun recompute', () => {
    const dir = createBundleWithTopics(2);
    const profilePath = join(dir, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    profile.root_must_answer_set = ['Keep this must-answer'];
    profile.human_decision_checkpoints.hitl1 = { status: 'recorded', recorded_at: '2026-07-10T00:00:00.000Z' };
    profile.human_decision_checkpoints.hitl2.rerun_count = 2;
    profile.human_decision_checkpoints.hitl2.rationale = 'Preserve rerun context';
    profile.research_access = { status: 'available', probed_at: '2026-07-10T00:00:00.000Z', result_url: 'https://example.com/', fetch_outcome: 'success', search_surface: 'WebSearch', fetch_surface: 'WebFetch' };
    writeFileSync(profilePath, stringifyYaml(profile));
    assert.equal(runApply(dir, 'quick_factual').status, 0);
    const topics = Array.from({ length: 4 }, (_, index) => ({ id: String(index + 1), slug: `${String(index + 1).padStart(2, '0')}_topic-${index + 1}`, title: `Topic ${index + 1}` }));
    writeFileSync(join(dir, 'rb_plan.md'), `---\n{\n  "plan_basename": "test",\n  "derived_topic_count": 4,\n  "topic_registry": ${JSON.stringify(topics)}\n}\n---`);
    assert.equal(runApply(dir, 'quick_factual').status, 0);
    const after = parseYaml(readFileSync(profilePath, 'utf8'));
    assert.deepEqual(after.root_must_answer_set, profile.root_must_answer_set);
    assert.deepEqual(after.human_decision_checkpoints, profile.human_decision_checkpoints);
    assert.deepEqual(after.research_access, profile.research_access);
    assert.equal(after.research_style_params.wave0_shared_ref_total, 7);
  });

  it('preserves unavailable research_access while changing style', () => {
    const dir = createBundleWithTopics(1);
    const profilePath = join(dir, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    profile.research_access = { status: 'unavailable', probed_at: '2026-07-10T00:00:00.000Z', fetch_outcome: 'not_attempted', reason: 'Search surface is unavailable' };
    writeFileSync(profilePath, stringifyYaml(profile));
    const result = runApply(dir, 'claim_verification');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(parseYaml(readFileSync(profilePath, 'utf8')).research_access, profile.research_access);
  });
});
