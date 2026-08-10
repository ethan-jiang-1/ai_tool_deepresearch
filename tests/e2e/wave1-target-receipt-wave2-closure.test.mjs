// Deterministic e2e: Wave1 carried-target receipt → Wave2 finding binding closure.
// Covers valid/empty/missing/stale binding, intent-drift short-circuit, layout-only
// reuse, and same-origin-only non-coverage (RWG-020, WTS-011, CTS-008).
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  readTraceEvents,
  writeGateAttempt,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { evaluateWave1Contract } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs';
import { tryLoadGateDefinition } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs';
import { checkWave2FindingIndexContract } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs';
import { buildCanonicalTopicRegistryFact } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import {
  claimAndSubmitWorkUnit,
  referenceContent,
} from '../engine/work-unit-test-helpers.mjs';

const REPO_ROOT = process.cwd();
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `e2e_w1w2_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function traceEvents(bundlePath) {
  const raw = readFileSync(join(bundlePath, 'rb_trace.jsonl'), 'utf8').trim();
  return raw ? raw.split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
}

function appendTrace(bundlePath, event) {
  writeFileSync(join(bundlePath, 'rb_trace.jsonl'),
    readFileSync(join(bundlePath, 'rb_trace.jsonl'), 'utf8') + JSON.stringify(event) + '\n');
}

function createBundle(name, topics) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Status window
  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  writeFileSync(statusPath, JSON.stringify(status));

  // Plan with topic registry
  const planPath = join(dir, 'rb_plan.md');
  writeFileSync(planPath, `---\n${JSON.stringify({
    plan_basename: name,
    derived_topic_count: topics.length,
    topic_registry_version: '2',
    topic_registry: topics,
  }, null, 2)}\n---\n# Plan\n`);

  // Profile
  writeFileSync(join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 1
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 1
human_decision_checkpoints:
  hitl2:
    rerun_count: 0
`);

  return dir;
}

function scaffoldTopic(dir, topic, { sourceUrl }) {
  const {
    topic_uid: uid,
    id,
    slug,
    title,
    must_answer,
    scope_role,
    depends_on_topic_uids,
  } = topic;
  const seedFrontmatter = {
    topic_uid: uid,
    id,
    slug,
    title,
    must_answer,
    scope_role,
    depends_on_topic_uids,
  };

  mkdirSync(join(dir, 'artifacts', 'wave1', slug), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave0', slug), { recursive: true });
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });

  writeFileSync(join(dir, 'artifacts', 'wave1', slug, 'evidence-summary.md'), `# Evidence Summary: ${title}

## Source URLs
- [Source](${sourceUrl}) — retrieved 2026-01-15

## Key Findings
1. **机制理解**: Evidence for ${title}.

## Open Questions
1. [开放] ${title} question?
`);

  writeFileSync(join(dir, 'artifacts', 'wave1', slug, 'question-list.md'), `# Question List: ${title}

produced_at_ref_count: 0
last_updated: 2026-01-15

## Topic Investigation Targets
Targets.

## Question Reconciliation
Progress.

## Emergent Question Protocol
Checked; none.

## Exploration / Exploitation Decision
Continue.
`);

  writeFileSync(join(dir, 'artifacts', 'wave0', slug, 'source.yaml'), `- url: ${sourceUrl}-wave0\n  title: Wave0 ${slug}\n  retrieved_date: 2026-07-14\n  topic_tag: ${slug}\n`);

  writeFileSync(join(dir, 'seed_topics', `${slug}.md`), `---
${Object.entries(seedFrontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}
---

# ${title}

${renderSeedProjectionAppendix()}
`);

  // Reference
  const refPath = join(dir, 'reference', `${id}-${slug}-deepening.md`);
  writeFileSync(refPath, referenceContent({
    source_url: sourceUrl,
    related_topic_uid: uid,
    accessed_at: '2026-07-14',
    evidence_role: 'deepening_reference',
  }).replace(/^- related_topic: undefined\n/m, `- related_topic_uid: ${uid}\n`) + '\n');

  // Reference index
  const indexPath = join(dir, 'reference', '_INDEX.md');
  const existingIdx = readFileSync(indexPath, 'utf8').trim();
  writeFileSync(indexPath, existingIdx + `\n| reference/${id}-${slug}-deepening.md | secondary | practitioner | Tier 2 | ${slug} | wave1_topic | accepted | 2026-07-14 |\n`);
}

function submitAndReview(dir, { slug, topicUid, sourceUrl, queueItemId, id = '01' }) {
  const sourceRef = `reference/${id}-${slug}-deepening.md`;
  const cacheTrail = `_cache/wave1/primary/${slug}/deepening`;
  const submission = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    legacyAssignment: true,
    queueItemOverrides: {
      payload: { topic_uid: topicUid, topic_slug: slug, wave: 1 },
      lineage: { topic_uid: topicUid, topic_slug: slug, phase: 'wave1' },
    },
    outputs: [
      { path: sourceRef, role: 'reference', source_url: sourceUrl, source_slug: `${slug}-deepening` },
      { path: `artifacts/wave1/${slug}/evidence-summary.md`, role: 'evidence_summary' },
      { path: `artifacts/wave1/${slug}/question-list.md`, role: 'question_list' },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        source_ref: sourceRef,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));

  writeFileSync(join(dir, 'artifacts', 'wave1', slug, 'depth-review.yaml'), `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug: slug,
    reviewed_work_unit_refs: [submission.record.paths.work_unit_dir],
    depth_dimensions: {
      mechanism: { status: 'covered', refs: [submission.record.paths.result_ref] },
      trend_or_difficulty: { status: 'covered', refs: [submission.record.paths.result_ref] },
      limitation_or_dispute: { status: 'covered', refs: [submission.record.paths.result_ref] },
    },
    profile_checks: {
      counterexample_search: { status: 'not_required', refs: [] },
      cross_verification: { status: 'not_required', refs: [] },
    },
    decision: 'accept',
    supplementary_queue_item_ids: [],
    carried_targets: [],
  }, null, 2)}\n`);
  return { submission, sourceRef, cacheTrail, sourceUrl };
}

function setCarriedTargets(dir, slug, targets) {
  const path = join(dir, 'artifacts', 'wave1', slug, 'depth-review.yaml');
  const depth = JSON.parse(readFileSync(path, 'utf8'));
  depth.carried_targets = targets;
  writeFileSync(path, `${JSON.stringify(depth, null, 2)}\n`);
}

function writeWave0Handoff(dir) {
  const ts = new Date().toISOString();
  const events = [
    { ts, event: 'gate_attempt', gate: 'wave0-complete', phase: 'wave0', passed: true, currentNodeRef: 'phases/phase-wave0.md', next: 'phases/phase-wave1.md' },
    { ts, event: 'load_complete', entry: 'phases/phase-wave1.md', handoff_source_gate: 'wave0-complete', handoff_source_node: 'phases/phase-wave0.md', handoff_target_node: 'phases/phase-wave1.md', handoff_source_attempt_index: 0 },
    { ts, event: 'wave1_completion' },
  ];
  writeFileSync(join(dir, 'rb_trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  status.current_node = 'phases/phase-wave1.md';
  status.current_gate = 'wave0_complete';
  status.next_gate = 'wave1_complete';
  writeFileSync(statusPath, JSON.stringify(status));
}

function materializeWave1Projection(dir, topic, { submission, sourceRef, cacheTrail, sourceUrl }) {
  const canonical = canonicalWave1ReferencePath({ topicSlug: topic.slug, sourceUrl });
  assert.equal(canonical.ok, true, JSON.stringify(canonical));
  const stagingPath = join(dir, '_tmp', `${topic.slug}-wave1-projection.md`);
  const reference = `${referenceContent({
    source_url: sourceUrl,
    related_topic: topic.slug,
    accessed_at: '2026-07-14',
    evidence_role: 'deepening_reference',
  })}\n## Submitted Backing\n- source_ref: ${sourceRef}\n- cache_trail_ref: ${cacheTrail}\n- result_ref: ${submission.record.paths.result_ref}\n- work_unit_ref: ${submission.record.paths.work_unit_dir}\n`;
  mkdirSync(join(dir, '_tmp'), { recursive: true });
  writeFileSync(stagingPath, reference);
  const persisted = spawnSync('node', [
    'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs',
    'persist', '--bundle', dir, '--source', stagingPath, '--target', canonical.path,
    '--expect-absent',
  ], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000 });
  assert.equal(persisted.status, 0, persisted.stderr || persisted.stdout);
  assert.equal(JSON.parse(persisted.stdout).verdict, 'committed', persisted.stdout);
  const indexed = spawnSync('node', [
    'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs', '--bundle', dir,
  ], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000 });
  assert.equal(indexed.status, 0, indexed.stderr || indexed.stdout);
  assert.ok(['committed', 'unchanged'].includes(JSON.parse(indexed.stdout).verdict), indexed.stdout);

  const entry = (ordinal, evidenceMeaning) => ({
    source_identity: { kind: 'submitted_work', work_id: submission.record.work_id },
    entry_id: `${submission.record.work_id}/${ordinal}`,
    evidence_meaning: evidenceMeaning,
    relationship: 'supports',
    refs: [canonical.path],
    status: 'supported',
    next_hop: 'Read the submitted Wave1 reference before Wave2 synthesis.',
  });
  const projected = applyCanonicalTopicState({
    bundlePath: dir,
    input: {
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topic.topic_uid, wave: 'wave1',
      updates: [
        { slot_id: 'wave1_mechanisms', entries: [entry(1, 'Submitted Wave1 evidence explains the target mechanism.')] },
        { slot_id: 'wave1_trends', entries: [entry(2, 'Submitted Wave1 evidence records the target limitation.')] },
        { slot_id: 'pending_questions', entries: [entry(3, 'Submitted Wave1 evidence preserves the target question.')] },
      ],
    },
  });
  assert.equal(projected.verdict, 'committed', JSON.stringify(projected));
}

function wave1PassAndProject(dir, topic, submitted) {
  materializeWave1Projection(dir, topic, submitted);
  const { definition, error } = tryLoadGateDefinition('wave1-complete', 'phases/phase-wave1.md');
  if (error) throw new Error(`Cannot load wave1 definition: ${JSON.stringify(error)}`);
  const topicRegistryFact = buildCanonicalTopicRegistryFact(dir);
  const evaluation = evaluateWave1Contract(dir, definition, { topicRegistryFact });
  const passed = evaluation.passed && evaluation.failed_rule_ids.length === 0;
  const result = {
    check: {
      passed,
      gate: 'wave1-complete',
      currentNodeRef: 'phases/phase-wave1.md',
      next: passed ? 'phases/phase-wave2.md' : null,
      failed_rule_ids: evaluation.failed_rule_ids,
      masked_rule_ids: evaluation.masked_rule_ids,
    },
    routing: { kind: passed ? 'next' : 'failed', next: passed ? 'phases/phase-wave2.md' : null },
    inspect: evaluation.inspect || [],
    advice: evaluation.advice || [],
    hints: [],
    findings: evaluation.findings || [],
  };
  const receipt = evaluation.carried_target_receipt;
  writeGateAttempt(dir, result, {
    strictTrace: passed && result.check.next != null,
    ...(passed && result.check.next != null && receipt ? { carriedTargetReceipt: receipt } : {}),
  });
  if (passed) {
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    status.current_gate = 'wave1_complete';
    status.next_gate = 'wave2_complete';
    writeFileSync(statusPath, JSON.stringify(status));
  }
  return { passed, receipt, result };
}

function writeLoadComplete(dir) {
  const events = traceEvents(dir);
  const attemptIdx = events.findIndex((e) => e.event === 'gate_attempt' && e.gate === 'wave1-complete' && e.passed === true);
  assert.ok(attemptIdx >= 0, 'Expected a passed wave1-complete gate_attempt');
  const attempt = events[attemptIdx];
  appendTrace(dir, {
    ts: new Date().toISOString(),
    event: 'load_complete',
    entry: 'phases/phase-wave2.md',
    handoff_source_gate: attempt.gate,
    handoff_source_node: attempt.currentNodeRef,
    handoff_target_node: attempt.next,
    handoff_source_attempt_index: attemptIdx,
  });
}

function minimalFindingIndex(dir, findings, extra = {}) {
  mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
  writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), `${JSON.stringify({
    version: 'finding-index.v1',
    source_layer: 'wave2',
    ledger: { submitted_work_unit_refs: [], submitted_receipts: [] },
    synthesis: { eligible_finding_count: 0, cross_topic_assertions: [] },
    scan: { topics_scanned: [], pair_count: 0, pair_entries: [] },
    synthesis_eligibility: {
      pure_synthesis_eligible: false,
      scan_matrix_present: true,
      scan_topic_pair_coverage: { pairs: [] },
      unresolved_search_required_count: 0,
      targeted_search_required_count: 0,
      targeted_search_submitted_count: 0,
      explicit_deferral_count: 0,
      profile_params_read: true,
      ineligibility_reasons: [],
    },
    findings,
    ...extra,
  }, null, 2)}\n`);
}

function makeFinding(overrides = {}) {
  return {
    id: 'W2F-001',
    type: 'wave1_legacy_question',
    priority: 'p1',
    status: 'open',
    decision: 'use_existing_evidence',
    affected_topics: ['topic-a'],
    origin_refs: ['reference/01-topic-a-deepening.md'],
    trigger_refs: ['reference/01-topic-a-deepening.md'],
    search_required: false,
    subagent_receipt_refs: [],
    appears_in_synthesis: true,
    hitl2_handoff: false,
    confidence: 'medium',
    independent_backing_refs: ['reference/01-topic-a-deepening.md'],
    gap_status: 'no_gap',
    ...overrides,
  };
}

describe('Wave1→Wave2 carried-target receipt closure', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('passes closure when all receipt targets have valid finding bindings', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('valid'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence for X?' }]);

    writeWave0Handoff(dir);
    const { passed, receipt } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    assert.ok(receipt);
    assert.equal(receipt.targets.length, 1);
    writeLoadComplete(dir);

    minimalFindingIndex(dir, [
      makeFinding({
        id: 'W2F-001',
        decision: 'use_existing_evidence',
        gap_status: 'no_gap',
        wave1_target_bindings: [{
          receipt_sha256: receipt.receipt_sha256,
          topic_uid: receipt.targets[0].topic_uid,
          intent_sha256: receipt.targets[0].intent_sha256,
          target_id: receipt.targets[0].target_id,
          target_revision: receipt.targets[0].target_revision,
        }],
      }),
    ]);

    const contract = checkWave2FindingIndexContract(dir);
    const carriedIssues = (contract.inspect || []).filter((line) => /wave1_target_bindings/.test(line));
    assert.equal(carriedIssues.length, 0, `Expected no binding issues, got: ${carriedIssues.join('; ')}`);
  });

  it('passes with empty receipt (no carried targets declared)', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('empty'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', []);

    writeWave0Handoff(dir);
    const { passed, receipt } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    assert.deepEqual(receipt.targets, []);
    writeLoadComplete(dir);

    minimalFindingIndex(dir, [makeFinding()]);

    const contract = checkWave2FindingIndexContract(dir);
    const carriedIssues = (contract.inspect || []).filter((line) => /wave1_target_bindings/.test(line));
    assert.equal(carriedIssues.length, 0, `Expected no binding issues with empty receipt, got: ${carriedIssues.join('; ')}`);
  });

  it('reports uncovered targets when no finding binds them', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('uncovered'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence for X?' }]);

    writeWave0Handoff(dir);
    const { passed, receipt } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    writeLoadComplete(dir);

    // Finding has no wave1_target_bindings → target uncovered
    minimalFindingIndex(dir, [makeFinding()]);

    const contract = checkWave2FindingIndexContract(dir);
    const hasUncovered = (contract.inspect || []).some((line) => line.includes('Selected Wave1 receipt targets lack'));
    assert.ok(hasUncovered, `Expected uncovered-target diagnostic, got: ${(contract.inspect || []).join('; ')}`);
  });

  it('rejects stale bindings (wrong receipt_sha256)', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('stale'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence for X?' }]);

    writeWave0Handoff(dir);
    const { passed, receipt } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    writeLoadComplete(dir);

    minimalFindingIndex(dir, [
      makeFinding({
        decision: 'use_existing_evidence',
        gap_status: 'no_gap',
        wave1_target_bindings: [{
          receipt_sha256: 'f'.repeat(64), // wrong receipt
          topic_uid: receipt.targets[0].topic_uid,
          intent_sha256: receipt.targets[0].intent_sha256,
          target_id: receipt.targets[0].target_id,
          target_revision: receipt.targets[0].target_revision,
        }],
      }),
    ]);

    const contract = checkWave2FindingIndexContract(dir);
    const hasStale = (contract.inspect || []).some((line) => line.includes('binding does not equal'));
    assert.ok(hasStale, `Expected stale binding issue, got: ${(contract.inspect || []).join('; ')}`);
  });

  it('does not count same-topic origin_refs as target coverage', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('origin-only'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence for X?' }]);

    writeWave0Handoff(dir);
    const { passed } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    writeLoadComplete(dir);

    // Finding references topic-a via origin_refs but has no wave1_target_bindings
    minimalFindingIndex(dir, [
      makeFinding({
        origin_refs: ['reference/01-topic-a-deepening.md'],
      }),
    ]);

    const contract = checkWave2FindingIndexContract(dir);
    const hasUncovered = (contract.inspect || []).some((line) => line.includes('Selected Wave1 receipt targets lack'));
    assert.ok(hasUncovered, `Expected uncovered target (origin_refs alone not sufficient), got: ${(contract.inspect || []).join('; ')}`);
  });

  it('short-circuits on intent drift before coverage check', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('drift-e2e'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence for X?' }]);

    writeWave0Handoff(dir);
    const { passed } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    writeLoadComplete(dir);

    // Now change the canonical intent (title change = intent drift)
    const planPath = join(dir, 'rb_plan.md');
    writeFileSync(planPath, `---\n${JSON.stringify({
      plan_basename: 'drift-e2e',
      derived_topic_count: 1,
      topic_registry_version: '2',
      topic_registry: [{
        ...topicA,
        title: 'Completely Changed Title',
        must_answer: ['Different question entirely?'],
        scope_role: 'supporting',
      }],
    }, null, 2)}\n---\n# Plan\n`);

    minimalFindingIndex(dir, [
      makeFinding({
        decision: 'use_existing_evidence',
        gap_status: 'no_gap',
        wave1_target_bindings: [{ receipt_sha256: 'a'.repeat(64), topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', intent_sha256: 'b'.repeat(64), target_id: 'q1', target_revision: 'c'.repeat(64) }],
      }),
    ]);

    const contract = checkWave2FindingIndexContract(dir);
    // Intent drift should be detected BEFORE any coverage check
    const driftIssue = (contract.inspect || []).find((line) => /current_intent_mismatch|current canonical intent/i.test(line));
    assert.ok(driftIssue, `Expected intent drift short-circuit, got: ${(contract.inspect || []).join('; ')}`);
  });

  it('handles layout-only reuse (previous_layouts slug) via unit-tested selector path', () => {
    // Layout-only reuse is exercised by the wave-carried-target-receipts unit tests.
    // This e2e test verifies the finding-index path still works with a valid receipt.
    const topicA = { topic_uid: 'tp_123e4567-e89b-4bbb-a456-426614174001', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('layout-reuse'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4bbb-a456-426614174001', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence?' }]);

    writeWave0Handoff(dir);
    const { passed, receipt } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    assert.ok(receipt);
    writeLoadComplete(dir);

    minimalFindingIndex(dir, [
      makeFinding({
        id: 'W2F-001',
        decision: 'use_existing_evidence',
        gap_status: 'no_gap',
        wave1_target_bindings: [{ receipt_sha256: receipt.receipt_sha256, topic_uid: receipt.targets[0].topic_uid, intent_sha256: receipt.targets[0].intent_sha256, target_id: receipt.targets[0].target_id, target_revision: receipt.targets[0].target_revision }],
      }),
    ]);

    const contract = checkWave2FindingIndexContract(dir);
    const carriedIssues = (contract.inspect || []).filter((line) => /wave1_target_bindings/.test(line));
    assert.equal(carriedIssues.length, 0, `Expected no binding issues, got: ${carriedIssues.join('; ')}`);
  });

  it('requires at least one binding to have a legal decision and gap_status route for coverage', () => {
    const topicA = { topic_uid: 'tp_123e4567-e89b-4aaa-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['Q?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] };
    const dir = createBundle(unique('no-route'), [topicA]);
    scaffoldTopic(dir, topicA, { sourceUrl: 'https://example.com/topic-a' });
    const submitted = submitAndReview(dir, { slug: 'topic-a', topicUid: 'tp_123e4567-e89b-4aaa-a456-426614174000', sourceUrl: 'https://example.com/topic-a', queueItemId: 'topic-a' });
    setCarriedTargets(dir, 'topic-a', [{ target_id: 'q1', target_text: 'What is the evidence for X?' }]);

    writeWave0Handoff(dir);
    const { passed, receipt } = wave1PassAndProject(dir, topicA, submitted);
    assert.equal(passed, true);
    writeLoadComplete(dir);

    // Binding has correct receipt fields but finding has invalid decision → not counted as covered
    minimalFindingIndex(dir, [
      makeFinding({
        id: 'W2F-001',
        decision: 'invalid_decision', // not in W2_DECISIONS
        gap_status: 'invalid_status', // not in W2_GAP_STATUS
        wave1_target_bindings: [{
          receipt_sha256: receipt.receipt_sha256,
          topic_uid: receipt.targets[0].topic_uid,
          intent_sha256: receipt.targets[0].intent_sha256,
          target_id: receipt.targets[0].target_id,
          target_revision: receipt.targets[0].target_revision,
        }],
      }),
    ]);

    const contract = checkWave2FindingIndexContract(dir);
    const hasUncovered = (contract.inspect || []).some((line) => line.includes('Selected Wave1 receipt targets lack'));
    assert.ok(hasUncovered, `Expected uncovered target (invalid decision/gap_status not a legal route), got: ${(contract.inspect || []).join('; ')}`);
  });
});
