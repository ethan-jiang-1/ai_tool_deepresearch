// gate-dynamic-threshold.test.mjs
// Integration tests: dynamic threshold in wave0/wave1 gate CLI
// @impl RES-003
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { applyCanonicalTopicState, renderSeedProjectionAppendix } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import { claimAndSubmitWorkUnit, referenceContent } from '../../engine/work-unit-test-helpers.mjs';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const GATE_W0 = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs');
const GATE_W1 = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const ARTIFACT_PERSISTENCE = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs');
const SYNC_REFERENCE_INDEX = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_dyn_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(cli, bundlePath, nodeRef) {
  return spawnSync('node', [cli, '--bundle', bundlePath, '--current-node', nodeRef], { encoding: 'utf-8', timeout: 10000 });
}

function materializeWave1Reference(dir, { topic, sourceUrl, sourceRef, cacheTrail, submission }) {
  const canonical = canonicalWave1ReferencePath({ topicSlug: topic.slug, sourceUrl });
  assert.equal(canonical.ok, true, JSON.stringify(canonical));
  const stagingPath = join(dir, '_tmp', `${submission.record.work_id}.wave1-reference.md`);
  mkdirSync(join(dir, '_tmp'), { recursive: true });
  writeFileSync(stagingPath, `${referenceContent({
    source_url: sourceUrl,
    related_topic_uid: topic.topic_uid,
  })}\n## Submitted Backing\n- source_ref: ${sourceRef}\n- cache_trail_ref: ${cacheTrail}\n- result_ref: ${submission.record.paths.result_ref}\n- work_unit_ref: ${submission.record.paths.work_unit_dir}\n`);
  const persisted = spawnSync('node', [
    ARTIFACT_PERSISTENCE,
    'persist', '--bundle', dir, '--source', stagingPath, '--target', canonical.path,
    '--expect-absent',
  ], { encoding: 'utf-8', timeout: 10000 });
  assert.equal(persisted.status, 0, persisted.stderr || persisted.stdout);
  assert.equal(JSON.parse(persisted.stdout).verdict, 'committed', persisted.stdout);
  return canonical.path;
}

function syncReferenceIndex(dir) {
  const synced = spawnSync('node', [SYNC_REFERENCE_INDEX, '--bundle', dir], { encoding: 'utf-8', timeout: 10000 });
  assert.equal(synced.status, 0, synced.stderr || synced.stdout);
  assert.ok(['committed', 'unchanged'].includes(JSON.parse(synced.stdout).verdict), synced.stdout);
}

/** Create a minimal bundle with research_style_params in rb_profile.yaml. */
function createBundle(name, styleParams) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
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
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": 2,\n  "topic_registry_version": "2",\n  "topic_registry": [\n    { "topic_uid": "tp_11111111-1111-4111-8111-111111111111", "id": "01", "slug": "01_test-topic-a", "title": "Test Topic A", "must_answer": ["What does Test Topic A require?"], "scope_role": "primary", "depends_on_topic_uids": [], "previous_layouts": [] },\n    { "topic_uid": "tp_22222222-2222-4222-8222-222222222222", "id": "02", "slug": "02_test-topic-b", "title": "Test Topic B", "must_answer": ["What does Test Topic B require?"], "scope_role": "supporting", "depends_on_topic_uids": [], "previous_layouts": [] }\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  return dir;
}

/** Set up wave0 status so gate can run. */
function setupWave0Status(dir) {
  setStatusWindow(dir, 'seed_topics_ready', 'wave0_complete');
}

/** Set up wave1 status so gate can run. */
function setupWave1Status(dir) {
  setStatusWindow(dir, 'wave0_complete', 'wave1_complete');
  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = 'phases/phase-wave1.md';
  writeFileSync(statusPath, JSON.stringify(status));
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
        '## Topic Investigation Targets\n\nOne deterministic target.\n\n## Question Reconciliation\n\nOne reconciled question.\n\n## Emergent Question Protocol\n\nChecked.\n\n## Exploration / Exploitation Decision\n\nContinue.\n');
    }
    const topics = [
      { topic_uid: 'tp_11111111-1111-4111-8111-111111111111', id: '01', slug: '01_test-topic-a', title: 'Test Topic A', scope_role: 'primary' },
      { topic_uid: 'tp_22222222-2222-4222-8222-222222222222', id: '02', slug: '02_test-topic-b', title: 'Test Topic B', scope_role: 'supporting' },
    ];
    mkdirSync(join(dir, 'seed_topics'), { recursive: true });
    for (const topic of topics) {
      const submissions = [];
      for (let ordinal = 1; ordinal <= 5; ordinal += 1) {
        const sourceUrl = `https://example.com/${topic.slug}/deepening/${ordinal}`;
        const referencePath = `reference/${topic.id}-${topic.slug}-deepening-${ordinal}.md`;
        const sourceRef = `artifacts/wave1/${topic.slug}/evidence-summary.md`;
        const cacheTrail = `_cache/wave1/primary/${topic.slug}/deepening-${ordinal}`;
        const submission = claimAndSubmitWorkUnit(dir, {
          phase: 'wave1',
          queueItemId: `dynamic-${topic.slug}-${ordinal}`,
          preserveQueue: true,
          queueItemOverrides: {
            payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, wave: 1 },
            lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave1' },
          },
          outputs: [
            { path: referencePath, role: 'reference', source_url: sourceUrl, source_slug: `${topic.slug}-deepening-${ordinal}`, content: referenceContent({ source_url: sourceUrl, related_topic_uid: topic.topic_uid }) },
            { path: sourceRef, role: 'evidence_summary' },
            { path: `artifacts/wave1/${topic.slug}/question-list.md`, role: 'question_list' },
          ],
          cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
          resultOverrides: {
            source_claims: [{ url: sourceUrl, source_ref: sourceRef, acceptance_status: 'accepted', is_new_vs_wave0: true, cache_trail_refs: [cacheTrail] }],
            accepted_source_urls: [sourceUrl],
          },
        });
        assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
        const canonicalReferencePath = materializeWave1Reference(dir, {
          topic,
          sourceUrl,
          sourceRef,
          cacheTrail,
          submission,
        });
        submissions.push({ submission, canonicalReferencePath });
      }
      const latestSubmission = submissions.at(-1).submission;
      writeFileSync(join(dir, `artifacts/wave1/${topic.slug}/depth-review.yaml`), `${JSON.stringify({
        version: 'depth-review.v1',
        topic_slug: topic.slug,
        reviewed_work_unit_refs: submissions.map(({ submission }) => submission.record.paths.work_unit_dir),
        depth_dimensions: {
          mechanism: { status: 'covered', refs: [latestSubmission.record.paths.result_ref] },
          trend_or_difficulty: { status: 'covered', refs: [latestSubmission.record.paths.result_ref] },
          limitation_or_dispute: { status: 'covered', refs: [latestSubmission.record.paths.result_ref] },
        },
        profile_checks: {
          counterexample_search: { status: 'covered', refs: [latestSubmission.record.paths.result_ref] },
          cross_verification: { status: 'covered', refs: [latestSubmission.record.paths.result_ref] },
        },
        decision: 'accept', supplementary_queue_item_ids: [], carried_targets: [],
      }, null, 2)}\n`);
      writeFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), `---\n${JSON.stringify({ ...topic, must_answer: [`What does ${topic.title} require?`], depends_on_topic_uids: [] }, null, 2)}\n---\n# ${topic.title}\n\n${renderSeedProjectionAppendix()}`);
      syncReferenceIndex(dir);
      const entries = submissions.map(({ submission, canonicalReferencePath }, ordinal) => ({
        source_identity: { kind: 'submitted_work', work_id: submission.record.work_id },
        entry_id: `${submission.record.work_id}/${ordinal + 1}`,
        evidence_meaning: `Submitted backing for ${topic.title}.`, relationship: 'supports',
        refs: [canonicalReferencePath], status: 'supported', next_hop: 'Read the submitted reference.',
      }));
      const projected = applyCanonicalTopicState({ bundlePath: dir, input: {
        context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topic.topic_uid, wave: 'wave1',
        updates: [
          { slot_id: 'wave1_mechanisms', entries },
          { slot_id: 'wave1_trends', entries },
          { slot_id: 'pending_questions', entries },
        ],
      } });
      assert.ok(['committed', 'unchanged'].includes(projected.verdict), JSON.stringify(projected));
    }
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
    const hasThreshold10 = output.inspect.some((message) => message.includes('reference floor is 5/10'));
    assert.ok(hasThreshold10, `Expected the current 10-reference floor diagnostic, got: ${JSON.stringify(output.inspect)}`);
  });
});
