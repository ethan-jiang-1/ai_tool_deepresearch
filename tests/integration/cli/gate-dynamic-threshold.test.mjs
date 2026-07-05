// gate-dynamic-threshold.test.mjs
// Integration tests: dynamic threshold in wave0/wave1 gate CLI
// @impl RES-003
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const GATE_W0 = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs');
const GATE_W1 = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_dyn_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(cli, bundlePath, nodeRef) {
  return spawnSync('node', [cli, '--bundle', bundlePath, '--current-node', nodeRef], { encoding: 'utf-8', timeout: 10000 });
}

/** Create a minimal bundle with research_style_params in rb_profile.yaml. */
function createBundle(name, styleParams) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Write rb_profile.yaml with research_style_params
  if (styleParams) {
    const profilePath = join(dir, 'rb_profile.yaml');
    const raw = readFileSync(profilePath, 'utf-8');
    const profile = parseYaml(raw);
    profile.research_profile = styleParams.research_profile || 'quick_factual';
    profile.research_style_params = styleParams;
    profile.root_must_answer_set = ['test question'];
    profile.human_decision_checkpoints.hitl1.status = 'recorded';
    profile.human_decision_checkpoints.hitl1.recorded_at = new Date().toISOString();
    writeFileSync(profilePath, stringifyYaml(profile));
  }

  // Write topic_registry into rb_plan.md frontmatter
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": 2,\n  "topic_registry": [\n    { "id": "t1", "slug": "01_test-topic-a", "title": "Test Topic A" },\n    { "id": "t2", "slug": "02_test-topic-b", "title": "Test Topic B" }\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  return dir;
}

/** Minimal YAML stringify — handles the flat structure we need. */
function stringifyYaml(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string') lines.push(`  ${k}: ${v}`);
        else if (typeof v === 'boolean') lines.push(`  ${k}: ${v ? 'true' : 'false'}`);
        else lines.push(`  ${k}: ${v}`);
      }
    } else if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - "${item}"`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value ? 'true' : 'false'}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n') + '\n';
}

/** Set up wave0 status so gate can run. */
function setupWave0Status(dir) {
  setStatusWindow(dir, 'seed_topics_ready', 'wave0_complete');
}

/** Set up wave1 status so gate can run. */
function setupWave1Status(dir) {
  setStatusWindow(dir, 'wave0_complete', 'wave1_complete');
}

/** Create the minimal reference/ directory structure the gate needs. */
function ensureRefDir(dir) {
  const refDir = join(dir, 'reference');
  if (!existsSync(refDir)) mkdirSync(refDir, { recursive: true });
}

/** Create artifacts/wave0/ dirs for topics. */
function ensureWave0ArtifactDirs(dir) {
  const topics = ['01_test-topic-a', '02_test-topic-b'];
  for (const t of topics) {
    const d = join(dir, 'artifacts', 'wave0', t);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

/** Create artifacts/wave1/ dirs for topics. */
function ensureWave1ArtifactDirs(dir) {
  const topics = ['01_test-topic-a', '02_test-topic-b'];
  for (const t of topics) {
    const d = join(dir, 'artifacts', 'wave1', t);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function writeTraceEvent(dir, eventName) {
  const handoff = eventName === 'wave1_completion'
    ? witnessedHandoffEvents({
      sourceGate: 'wave0-complete',
      phase: 'wave0',
      sourceNode: 'phases/phase-wave0.md',
      targetNode: 'phases/phase-wave1.md',
    })
    : witnessedHandoffEvents({
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
      targetNode: 'phases/phase-wave0.md',
    });
  writeTraceEvents(dir, [...handoff, { event: eventName, ts: new Date().toISOString() }]);
}

// ═══════════════════════════════════════════════════════════════════════════

describe('Gate dynamic threshold — wave0', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  // 8c.1
  it('claim_verification → wave0 gate fails with threshold 12 (8c.1)', () => {
    const dir = createBundle(unique('cv_w0'), {
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
    });
    setupWave0Status(dir);
    ensureRefDir(dir);
    ensureWave0ArtifactDirs(dir);
    writeTraceEvent(dir, 'wave0_completion');
    // Create _INDEX.md and README.md so only count_floor fails
    writeFileSync(join(dir, 'reference/_INDEX.md'), '| ref_file | source_type | tier | related_topic |\n| --- | --- | --- | --- |\n');
    writeFileSync(join(dir, 'reference/README.md'), '# Reference\n');
    // Write empty source.yaml for topics (0 entries → below floor 12)
    writeFileSync(join(dir, 'artifacts/wave0/01_test-topic-a/source.yaml'), '[]');
    writeFileSync(join(dir, 'artifacts/wave0/02_test-topic-b/source.yaml'), '[]');
    // 0 shared ref files → below floor 12

    const result = runGate(GATE_W0, dir, 'phases/phase-wave0.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected fail, got: ${JSON.stringify(output.check)}`);
    const hasThreshold12 = output.inspect.some(m => m.includes('threshold: 12'));
    assert.ok(hasThreshold12, `Expected threshold 12 in inspect, got: ${JSON.stringify(output.inspect)}`);
  });

  // 8c.3
  it('quick_factual → wave0 gate fails with threshold 6 (8c.3)', () => {
    const dir = createBundle(unique('qf_w0'), {
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
    });
    setupWave0Status(dir);
    ensureRefDir(dir);
    ensureWave0ArtifactDirs(dir);
    writeTraceEvent(dir, 'wave0_completion');
    writeFileSync(join(dir, 'reference/_INDEX.md'), '| ref_file | source_type | tier | related_topic |\n| --- | --- | --- | --- |\n');
    writeFileSync(join(dir, 'reference/README.md'), '# Reference\n');
    writeFileSync(join(dir, 'artifacts/wave0/01_test-topic-a/source.yaml'), '[]');
    writeFileSync(join(dir, 'artifacts/wave0/02_test-topic-b/source.yaml'), '[]');

    const result = runGate(GATE_W0, dir, 'phases/phase-wave0.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const hasThreshold6 = output.inspect.some(m => m.includes('threshold: 6'));
    assert.ok(hasThreshold6, `Expected threshold 6, got: ${JSON.stringify(output.inspect)}`);
  });

  // 8c.4
  it('no research_style_params → falls back to hardcoded threshold 1 (8c.4)', () => {
    const dir = createBundle(unique('noparams'), null); // null = no style params
    // Remove research_style_params from profile entirely
    const profilePath = join(dir, 'rb_profile.yaml');
    const raw = readFileSync(profilePath, 'utf-8');
    // Replace the empty research_style_params section with nothing
    const cleaned = raw.replace(/research_style_params:\n(\s*#.*\n)*/, '');
    writeFileSync(profilePath, cleaned);

    setupWave0Status(dir);
    ensureRefDir(dir);
    ensureWave0ArtifactDirs(dir);
    writeTraceEvent(dir, 'wave0_completion');
    writeFileSync(join(dir, 'reference/_INDEX.md'), '| ref_file | source_type | tier | related_topic |\n| --- | --- | --- | --- |\n');
    writeFileSync(join(dir, 'reference/README.md'), '# Reference\n');
    writeFileSync(join(dir, 'artifacts/wave0/01_test-topic-a/source.yaml'), '[]');

    const result = runGate(GATE_W0, dir, 'phases/phase-wave0.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const hasThreshold1 = output.inspect.some(m => m.includes('threshold: 1'));
    assert.ok(hasThreshold1, `Expected threshold 1 (fallback), got: ${JSON.stringify(output.inspect)}`);
  });

  // 8c.5
  it('debug profile → wave0 gate uses threshold 1 (8c.5)', () => {
    const dir = createBundle(unique('dbg_w0'), {
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
    });
    setupWave0Status(dir);
    ensureRefDir(dir);
    ensureWave0ArtifactDirs(dir);
    writeTraceEvent(dir, 'wave0_completion');
    writeFileSync(join(dir, 'reference/_INDEX.md'), '| ref_file | source_type | tier | related_topic |\n| --- | --- | --- | --- |\n');
    writeFileSync(join(dir, 'reference/README.md'), '# Reference\n');
    // Still 0 files → even threshold 1 should fail
    writeFileSync(join(dir, 'artifacts/wave0/01_test-topic-a/source.yaml'), '[]');

    const result = runGate(GATE_W0, dir, 'phases/phase-wave0.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const hasThreshold1 = output.inspect.some(m => m.includes('threshold: 1'));
    assert.ok(hasThreshold1, `Expected threshold 1, got: ${JSON.stringify(output.inspect)}`);
  });

  // 8c.7
  it('bad threshold_source path → falls back to hardcoded 1 (8c.7)', () => {
    // Create profile WITHOUT wave0_per_topic_source_floor — the threshold_source
    // path resolves undefined → Number(undefined)=NaN → fallback to threshold:1
    const dir = createBundle(unique('badpath'), {
      user_visible: true,
      // deliberately omit wave0_per_topic_source_floor
      wave1_per_topic_ref_floor: 10,
      topic_unique_ratio: 0.5,
      counterexample_search: true,
      cross_verification: true,
      p0p1_independent_backing: 2,
      quality_min_tier: 'tier_2',
      quality_min_substance: 'substantive',
    });
    // Manually fix the profile — remove wave0_per_topic_source_floor after createBundle
    // createBundle writes all params. We need to remove just that one key.
    // Actually, we passed params without wave0_per_topic_source_floor to createBundle,
    // but the stringifyYaml will try to write them. Let's check...
    // The params object above doesn't have wave0_per_topic_source_floor, so it won't be written.
    // But createBundle's stringifyYaml writes whatever is in the object.
    // So rb_profile.yaml won't have wave0_per_topic_source_floor → resolveThreshold falls back.

    setupWave0Status(dir);
    ensureRefDir(dir);
    ensureWave0ArtifactDirs(dir);
    writeTraceEvent(dir, 'wave0_completion');
    writeFileSync(join(dir, 'reference/_INDEX.md'), '| ref_file | source_type | tier | related_topic |\n| --- | --- | --- | --- |\n');
    writeFileSync(join(dir, 'reference/README.md'), '# Reference\n');
    writeFileSync(join(dir, 'artifacts/wave0/01_test-topic-a/source.yaml'), '[]');

    const result = runGate(GATE_W0, dir, 'phases/phase-wave0.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const hasThreshold1 = output.inspect.some(m => m.includes('threshold: 1'));
    assert.ok(hasThreshold1, `Expected threshold 1 (fallback for missing path), got: ${JSON.stringify(output.inspect)}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════

describe('Gate dynamic threshold — wave1', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  /** Set up minimal wave1 artifacts so only count_floor fails. */
  function setupMinimalWave1(dir) {
    setupWave1Status(dir);
    ensureRefDir(dir);
    ensureWave1ArtifactDirs(dir);
    writeTraceEvent(dir, 'wave1_completion');
    // Create evidence-summary.md + question-list.md per topic
    for (const t of ['01_test-topic-a', '02_test-topic-b']) {
      const ad = join(dir, 'artifacts', 'wave1', t);
      writeFileSync(join(ad, 'evidence-summary.md'),
        '# Evidence Summary\n\n## Source URLs\n- [Test](https://example.com) — retrieved 2026-06-15\n\n## Key Findings\n1. **机制理解**: Test finding.\n\n## Open Questions\n1. [开放] Test question.\n');
      writeFileSync(join(ad, 'question-list.md'),
        '## Topic Investigation Targets\n\n## Question Reconciliation\n\n## Emergent Question Protocol\n\n## Exploration / Exploitation Decision\n');
    }
    // No reference/*{topic}*.md files → count_floor will fail
  }

  // 8c.2
  it('claim_verification → wave1 gate fails with threshold 10 (8c.2)', () => {
    const dir = createBundle(unique('cv_w1'), {
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
    });
    setupMinimalWave1(dir);

    const result = runGate(GATE_W1, dir, 'phases/phase-wave1.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected fail, got: ${JSON.stringify(output.check)}`);
    const hasThreshold10 = output.inspect.some(m => m.includes('threshold: 10'));
    assert.ok(hasThreshold10, `Expected threshold 10 in inspect, got: ${JSON.stringify(output.inspect)}`);
  });
});
