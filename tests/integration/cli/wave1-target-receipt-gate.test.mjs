// Integration tests for Wave1 carried-target receipt projection, trace integrity,
// legacy compatibility, and strict persistence failure (GSK-012, TRW-006, RWG-020).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';
import { cloneBundleTemplate } from '../../e2e/helpers/deterministic-chain-harness.mjs';
import { applyCanonicalTopicState, renderSeedProjectionAppendix } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import {
  claimAndSubmitWorkUnit,
  referenceContent,
} from '../../engine/work-unit-test-helpers.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const ARTIFACT_PERSISTENCE = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs');
const SYNC_REFERENCE_INDEX = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }

// One template instantiation per file; each test clones it byte-for-byte.
let templateDir = null;
before(() => {
  const r = spawnSync('node', [NEW_BUNDLE, 'w1rx-template', '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  templateDir = r.stdout.trim();
});

after(() => {
  if (templateDir) rmSync(templateDir, { recursive: true, force: true });
});
function unique(prefix) { return `rt_w1rx_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath, { attempt, node = 'phases/phase-wave1.md' } = {}) {
  const args = [GATE_CLI, '--bundle', bundlePath, '--current-node', node];
  if (attempt !== undefined) args.push('--attempt', String(attempt));
  return spawnSync('node', args, { encoding: 'utf-8', timeout: 10000 });
}

function writeWave1Trace(dir) {
  const events = witnessedHandoffEvents({
    sourceGate: 'wave0-complete',
    phase: 'wave0',
    sourceNode: 'phases/phase-wave0.md',
    targetNode: 'phases/phase-wave1.md',
  });
  events.push({ event: 'wave1_completion', ts: new Date().toISOString() });
  writeTraceEvents(dir, events);
}

const VALID_EVIDENCE_SUMMARY = `# Evidence Summary: Topic A

## Source URLs
- [Example Source](https://fixture.news-research.com/news/deepening-topic-a) — retrieved 2026-01-15

## Key Findings
1. **机制理解**: AI alignment research shows promising results in scalable oversight.

## Open Questions
1. [开放] How to measure alignment in practice?
`;

const VALID_QUESTION_LIST = `# Question List - Topic: Topic A

produced_at_ref_count: 1
last_updated: 2026-01-15

## Topic Investigation Targets

| target_id | target_question | origin | status | backing_refs | next_action |
| --- | --- | --- | --- | --- | --- |
| topic-a-T01 | How to measure alignment? | seed | 开放 | https://fixture.news-research.com/news/deepening-topic-a | 移交 wave2 |

## Question Reconciliation

- [部分进展] How to measure alignment?: Evidence provides scalable oversight results.

## Emergent Question Protocol

- new_concept: checked; none; trigger_refs=none
- contradiction: checked; none; trigger_refs=none
- missing_information_gap: checked; none; trigger_refs=none
- noise_pattern: checked; none; trigger_refs=none
- result: no_new_questions_after_protocol

## Exploration / Exploitation Decision

- decision: continue
- trigger_refs: https://fixture.news-research.com/news/deepening-topic-a
- unresolved_questions: topic-a-T01
- queue_consequence: 移交 wave2 cross-topic synthesis
- next_action: wave2
- last_updated_ref_count: 1
`;

const VALID_SEED_TOPIC = `---
topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
id: "01"
slug: topic-a
title: Topic A
must_answer:
  - How should Topic A be investigated?
scope_role: primary
depends_on_topic_uids: []
---

# Topic A

${renderSeedProjectionAppendix()}
`;

const SECOND_TOPIC = `---
topic_uid: tp_223e4567-e89b-12d3-a456-426614174001
id: "02"
slug: topic-b
title: Topic B
must_answer:
  - What cross-domain evidence is needed?
scope_role: supporting
depends_on_topic_uids: []
---

# Topic B

${renderSeedProjectionAppendix()}
`;

/** Create a bundle with one or more canonical topics. */
function createBundle(name, { extraTopics = [] } = {}) {
  const dir = track(cloneBundleTemplate(templateDir, name, { targetDir: BUNDLES_DIR }));

  setStatusWindow(dir, 'wave0_complete', 'wave1_complete');
  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = 'phases/phase-wave1.md';
  writeFileSync(statusPath, JSON.stringify(status));
  writeTraceEvents(dir, witnessedHandoffEvents({
    sourceGate: 'wave0-complete',
    phase: 'wave0',
    sourceNode: 'phases/phase-wave0.md',
    targetNode: 'phases/phase-wave1.md',
  }));

  const topics = [{
    topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
    id: '01',
    slug: 'topic-a',
    title: 'Topic A',
    must_answer: ['How should Topic A be investigated?'],
    scope_role: 'primary',
    depends_on_topic_uids: [],
    previous_layouts: [],
  }, ...extraTopics];

  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n${JSON.stringify({
    plan_basename: name,
    derived_topic_count: topics.length,
    topic_registry_version: '2',
    topic_registry: topics,
  }, null, 2)}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  // Scaffold topic-a
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 1
  counterexample_search: false
  cross_verification: false
human_decision_checkpoints:
  hitl2:
    rerun_count: 0
`);

  writeFileSync(join(dir, 'reference', '01-topic-a-deepening.md'),
    '# Topic A Deepening Reference\n\n' +
    '- source_url: https://fixture.news-research.com/news/deepening-topic-a\n' +
    '- acceptance_status: accepted\n' +
    '- source_type: secondary\n' +
    '- tier: Tier 2\n' +
    '- evidence_role: deepening_reference\n' +
    '- trust_level: practitioner\n' +
    '- why_it_matters: Deepening evidence.\n' +
    '- accessed_at: 2026-06-15\n' +
    '- related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n\n' +
    '## Key Facts\n- Finding one: Important initial finding.\n- Finding two: Second key insight.\n- Finding three: Third data point.\n- Finding four: Fourth observation.\n- Finding five: Fifth concluding fact.\n\n## Core Content Capture\nThis is a substantive core content capture section that provides meaningful analysis of the topic being researched. It exceeds one hundred characters to satisfy the minimum quality threshold for reference counting.\n' +
    '## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- Term.\n## Risks And Limitations\n- None.\n');
  writeFileSync(join(dir, 'reference', '_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| reference/01-topic-a-deepening.md | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-06-15 |',
  ].join('\n') + '\n');

  // Scaffold extra topics
  for (const topic of extraTopics) {
    mkdirSync(join(dir, 'artifacts', 'wave1', topic.slug), { recursive: true });
    mkdirSync(join(dir, 'artifacts', 'wave0', topic.slug), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave0', topic.slug, 'source.yaml'), `- url: https://fixture.news-research.com/news/${topic.slug}-wave0\n  title: Wave0 foundation\n  retrieved_date: 2026-07-14\n  topic_tag: ${topic.slug}\n`);
    writeFileSync(join(dir, 'reference', `${topic.id}-${topic.slug}-deepening.md`),
      `# ${topic.title} Deepening Reference\n\n` +
      `- source_url: https://fixture.news-research.com/news/${topic.slug}-deepening\n` +
      '- acceptance_status: accepted\n' +
      '- source_type: secondary\n' +
      '- tier: Tier 2\n' +
      '- evidence_role: deepening_reference\n' +
      '- trust_level: practitioner\n' +
      `- why_it_matters: Deepening evidence for ${topic.slug}.\n` +
      '- accessed_at: 2026-06-15\n' +
      `- related_topic_uid: ${topic.topic_uid}\n\n` +
      '## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nThis is substantive core content capture that provides meaningful analysis exceeding one hundred characters to satisfy the minimum quality threshold for reference counting.\n' +
      '## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- Term.\n## Risks And Limitations\n- None.\n');
    const idxLines = readFileSync(join(dir, 'reference', '_INDEX.md'), 'utf8').trim().split('\n');
    idxLines.push(`| reference/${topic.id}-${topic.slug}-deepening.md | secondary | practitioner | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-06-15 |`);
    writeFileSync(join(dir, 'reference', '_INDEX.md'), idxLines.join('\n') + '\n');
  }

  return dir;
}

function submitAndReviewWorkUnit(dir, { slug = 'topic-a', topicUid = 'tp_123e4567-e89b-12d3-a456-426614174000', sourceUrl = 'https://fixture.news-research.com/news/deepening-topic-a', cacheTrail = '_cache/wave1/primary/topic-a/deepening-topic-a', queueItemId = 'topic-a', id = '01' } = {}) {
  const submission = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: topicUid, topic_slug: slug, wave: 1 },
      lineage: { topic_uid: topicUid, topic_slug: slug, phase: 'wave1' },
    },
    outputs: [
      { path: `reference/${id}-${slug}-deepening.md`, role: 'reference', source_url: sourceUrl, source_slug: `${slug}-deepening` },
      { path: `artifacts/wave1/${slug}/evidence-summary.md`, role: 'evidence_summary' },
      { path: `artifacts/wave1/${slug}/question-list.md`, role: 'question_list' },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        source_ref: `artifacts/wave1/${slug}/evidence-summary.md`,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  writeFileSync(join(dir, 'artifacts/wave1', slug, 'depth-review.yaml'), `${JSON.stringify({
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
  materializeSubmittedWave1Projection(dir, { submission, slug, topicUid, sourceUrl, cacheTrail, id });
  return submission;
}

function materializeSubmittedWave1Projection(dir, {
  submission,
  slug,
  topicUid,
  sourceUrl,
  cacheTrail,
  id,
}) {
  const referencePath = `reference/${id}-${slug}-deepening.md`;
  const sourceRef = `artifacts/wave1/${slug}/evidence-summary.md`;
  const canonical = canonicalWave1ReferencePath({ topicSlug: slug, sourceUrl });
  assert.equal(canonical.ok, true, JSON.stringify(canonical));
  const stagingPath = join(dir, '_tmp', `${submission.record.work_id}.wave1-reference.md`);
  mkdirSync(join(dir, '_tmp'), { recursive: true });
  writeFileSync(stagingPath, `${referenceContent({
    source_url: sourceUrl,
    related_topic_uid: topicUid,
  })}\n## Submitted Backing\n- source_ref: ${sourceRef}\n- cache_trail_ref: ${cacheTrail}\n- result_ref: ${submission.record.paths.result_ref}\n- work_unit_ref: ${submission.record.paths.work_unit_dir}\n`);
  const persisted = spawnSync('node', [
    ARTIFACT_PERSISTENCE,
    'persist', '--bundle', dir, '--source', stagingPath, '--target', canonical.path,
    '--expect-absent',
  ], { encoding: 'utf-8', timeout: 10000 });
  assert.equal(persisted.status, 0, persisted.stderr || persisted.stdout);
  assert.equal(JSON.parse(persisted.stdout).verdict, 'committed', persisted.stdout);
  const indexed = spawnSync('node', [SYNC_REFERENCE_INDEX, '--bundle', dir], { encoding: 'utf-8', timeout: 10000 });
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
      context: 'wave_projection',
      action: 'apply_seed_projection',
      topic_uid: topicUid,
      wave: 'wave1',
      updates: [
        { slot_id: 'wave1_mechanisms', entries: [entry(1, 'Submitted Wave1 evidence explains the target mechanism.')] },
        { slot_id: 'wave1_trends', entries: [entry(2, 'Submitted Wave1 evidence records the target limitation.')] },
        { slot_id: 'pending_questions', entries: [entry(3, 'Submitted Wave1 evidence preserves the target question.')] },
      ],
    },
  });
  assert.ok(['committed', 'unchanged'].includes(projected.verdict), JSON.stringify(projected));
}

function traceEvents(bundlePath) {
  const raw = readFileSync(join(bundlePath, 'rb_trace.jsonl'), 'utf8').trim();
  return raw ? raw.split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
}

describe('Wave1 carried-target receipt integration', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('projects an empty carried-target receipt into the routed Wave1 gate_attempt trace entry', () => {
    const dir = createBundle(unique('empty-rx'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);
    writeWave1Trace(dir);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));
    assert.equal(output.check.next, 'phases/phase-wave2.md');

    const events = traceEvents(dir);
    const attempt = events.find((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    assert.ok(attempt, 'Expected a gate_attempt for wave1-complete');
    assert.ok(attempt.carried_target_receipt, 'Expected carried_target_receipt in trace');
    assert.equal(attempt.carried_target_receipt.contract_version, 'wave1-carried-targets/v1');
    assert.match(attempt.carried_target_receipt.receipt_sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(attempt.carried_target_receipt.targets, []);
  });

  it('projects a non-empty receipt with multiple canonical topics and targets', () => {
    const extraTopic = {
      topic_uid: 'tp_223e4567-e89b-12d3-a456-426614174001',
      id: '02',
      slug: 'topic-b',
      title: 'Topic B',
      must_answer: ['What cross-domain evidence is needed?'],
      scope_role: 'supporting',
      depends_on_topic_uids: [],
      previous_layouts: [],
    };
    const dir = createBundle(unique('multi-rx'), { extraTopics: [extraTopic] });

    // Topic A
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);

    // Topic B
    mkdirSync(join(dir, 'seed_topics'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave1/topic-b/evidence-summary.md'), `# Evidence Summary: Topic B

## Source URLs
- [Source B](https://fixture.news-research.com/news/topic-b-deepening) — retrieved 2026-01-15

## Key Findings
1. **机制理解**: Cross-domain evidence shows complementary patterns.

## Open Questions
1. [开放] What patterns emerge across domains?
`);
    writeFileSync(join(dir, 'artifacts/wave1/topic-b/question-list.md'), `# Question List: Topic B

produced_at_ref_count: 0
last_updated: 2026-01-15

## Topic Investigation Targets
Targets for cross-domain search.

## Question Reconciliation
Partial progress.

## Emergent Question Protocol
Checked; none.

## Exploration / Exploitation Decision
Continue.
`);
    writeFileSync(join(dir, 'seed_topics/topic-b.md'), SECOND_TOPIC);
    writeFileSync(join(dir, 'artifacts/wave0/topic-b/source.yaml'), `- url: https://fixture.news-research.com/news/topic-b-wave0\n  title: Wave0 B\n  retrieved_date: 2026-07-14\n  topic_tag: topic-b\n`);
    submitAndReviewWorkUnit(dir, {
      slug: 'topic-b',
      topicUid: 'tp_223e4567-e89b-12d3-a456-426614174001',
      sourceUrl: 'https://fixture.news-research.com/news/topic-b-deepening',
      cacheTrail: '_cache/wave1/primary/topic-b/deepening-topic-b',
      queueItemId: 'topic-b',
      id: '02',
    });

    // Inject carried targets into depth reviews
    const depthA = JSON.parse(readFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
    depthA.carried_targets = [
      { target_id: 'align.measure', target_text: 'How to measure alignment in practice?' },
      { target_id: 'align.scale', target_text: 'What are the scaling properties of oversight methods?' },
    ];
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), `${JSON.stringify(depthA, null, 2)}\n`);

    const depthB = JSON.parse(readFileSync(join(dir, 'artifacts/wave1/topic-b/depth-review.yaml'), 'utf8'));
    depthB.carried_targets = [{ target_id: 'cross.pattern', target_text: 'What patterns emerge across domains?' }];
    writeFileSync(join(dir, 'artifacts/wave1/topic-b/depth-review.yaml'), `${JSON.stringify(depthB, null, 2)}\n`);

    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));

    const events = traceEvents(dir);
    const attempt = events.find((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    const receipt = attempt.carried_target_receipt;
    assert.equal(receipt.contract_version, 'wave1-carried-targets/v1');
    assert.equal(receipt.targets.length, 3);

    // Targets are sorted by (topic_uid, target_id)
    const pairs = receipt.targets.map((t) => `${t.topic_uid}/${t.target_id}`);
    assert.deepEqual(pairs, [
      'tp_123e4567-e89b-12d3-a456-426614174000/align.measure',
      'tp_123e4567-e89b-12d3-a456-426614174000/align.scale',
      'tp_223e4567-e89b-12d3-a456-426614174001/cross.pattern',
    ]);

    // Each target has valid hashes
    for (const target of receipt.targets) {
      assert.match(target.intent_sha256, /^[0-9a-f]{64}$/);
      assert.match(target.target_revision, /^[0-9a-f]{64}$/);
      assert.match(target.topic_uid, /^tp_/);
      assert.match(target.target_id, /^[A-Za-z0-9]/);
    }
    assert.match(receipt.receipt_sha256, /^[0-9a-f]{64}$/);
  });

  it('rejects ambiguous depth-review resolution and fails the gate without a partial receipt', () => {
    const current = {
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      id: '01',
      slug: 'topic-a',
      title: 'Topic A',
      must_answer: ['How should Topic A be investigated?'],
      scope_role: 'primary',
      depends_on_topic_uids: [],
      previous_layouts: [{ id: '02', slug: 'old-topic-a' }],
    };
    const dir = createBundle(unique('ambiguous-rx'));
    // Override plan with ambiguous layout
    const planPath = join(dir, 'rb_plan.md');
    const body = readFileSync(planPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
    const fm = {
      plan_basename: 'ambiguous-rx',
      derived_topic_count: 1,
      topic_registry_version: '2',
      topic_registry: [current],
    };
    writeFileSync(planPath, `---\n${JSON.stringify(fm, null, 2)}\n---\n${body}`);

    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);

    // Write a second depth review under the old slug → ambiguity
    mkdirSync(join(dir, 'artifacts/wave1/old-topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave1/old-topic-a/depth-review.yaml'), `${JSON.stringify({
      version: 'depth-review.v1',
      topic_slug: 'old-topic-a',
      reviewed_work_unit_refs: [],
      depth_dimensions: {},
      profile_checks: {},
      decision: 'accept',
      supplementary_queue_item_ids: [],
      carried_targets: [],
    }, null, 2)}\n`);

    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, 'Expected ambiguity to fail the gate');
    // Must reference the ambiguity in hints
    const declarationHints = output.hints.filter((hint) => hint.rule_id === 'per_topic_depth_review_contract');
    assert.ok(declarationHints.some((hint) => /ambiguous|More than one/.test(hint.missing_fact)),
      `Expected ambiguous layout diagnostic, got: ${JSON.stringify(declarationHints)}`);
    // No partial receipt in trace for a failed gate
    const events = traceEvents(dir);
    const gateAttempts = events.filter((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    // The failed gate should NOT have carried_target_receipt
    const lastAttempt = gateAttempts[gateAttempts.length - 1];
    assert.equal(Object.hasOwn(lastAttempt, 'carried_target_receipt'), false,
      'Failed gate must not project a partial receipt');
  });

  it('does not leak generic diagnostic or extraCheck fields into the receipt trace entry', () => {
    const dir = createBundle(unique('no-leak'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);

    const depth = JSON.parse(readFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
    depth.carried_targets = [{ target_id: 'check.leak', target_text: 'Verify no extra metadata leaks into trace.' }];
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), `${JSON.stringify(depth, null, 2)}\n`);

    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));

    const events = traceEvents(dir);
    const attempt = events.find((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    assert.ok(attempt.carried_target_receipt);

    // No extra metadata beyond contract_version + receipt_sha256 + targets
    const receiptKeys = Object.keys(attempt.carried_target_receipt).sort();
    assert.deepEqual(receiptKeys, ['contract_version', 'receipt_sha256', 'targets']);
    for (const target of attempt.carried_target_receipt.targets) {
      assert.deepEqual(Object.keys(target).sort(), ['intent_sha256', 'target_id', 'target_revision', 'topic_uid']);
    }
  });

  it('rejects a null receipt on a successful routed Wave1 gate attempt at the writeGateAttempt level', async () => {
    // GSK-012: writeGateAttempt validates receipt before persisting; a null receipt
    // on a routed Wave1 pass throws, and the CLI wrapper converts that into a
    // failed envelope without emitting the original passed result.
    const { writeGateAttempt } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs');
    const dir = createBundle(unique('strict-fail'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);
    writeWave1Trace(dir);

    const passedResult = {
      check: {
        passed: true,
        gate: 'wave1-complete',
        currentNodeRef: 'phases/phase-wave1.md',
        next: 'phases/phase-wave2.md',
        attempt_count: 1,
      },
      routing: { kind: 'next', next: 'phases/phase-wave2.md' },
      inspect: [],
      advice: [],
      hints: [],
      findings: [],
    };

    // Passing a null receipt on a routed Wave1 pass must throw
    assert.throws(
      () => writeGateAttempt(dir, passedResult, { strictTrace: true, carriedTargetReceipt: null }),
      /valid carriedTargetReceipt|successful routed Wave1/,
      'writeGateAttempt must reject null receipt on routed Wave1 pass',
    );

    // Passing an invalid receipt (wrong contract_version) must also throw
    assert.throws(
      () => writeGateAttempt(dir, passedResult, { strictTrace: true, carriedTargetReceipt: { contract_version: 'wrong/v1', receipt_sha256: '0'.repeat(64), targets: [] } }),
      /valid carriedTargetReceipt/,
      'writeGateAttempt must reject receipt with wrong contract_version',
    );
  });

  it('preserves legacy behavior when the handoff has no carried-target receipt at all', async () => {
    const dir = createBundle(unique('legacy-rx'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);
    writeWave1Trace(dir);

    // Run the gate normally → receipt is projected
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));

    // Now manually strip the receipt from the trace to simulate legacy pre-v0.42 bundles
    const events = traceEvents(dir);
    const attemptIdx = events.findIndex((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    assert.ok(attemptIdx >= 0, 'Expected a wave1-complete gate_attempt in trace');
    const attempt = events[attemptIdx];
    delete attempt.carried_target_receipt;
    // Add load_complete with correct handoff_source_attempt_index
    events.push({
      ts: new Date().toISOString(),
      event: 'load_complete',
      entry: 'phases/phase-wave2.md',
      handoff_source_gate: attempt.gate,
      handoff_source_node: attempt.currentNodeRef,
      handoff_target_node: attempt.next,
      handoff_source_attempt_index: attemptIdx,
    });
    writeFileSync(join(dir, 'rb_trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');

    const { selectWave1CarriedTargetReceiptForWave2 } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs');
    const selected = selectWave1CarriedTargetReceiptForWave2(dir);
    assert.equal(selected.kind, 'legacy', `Expected legacy kind, got ${selected.kind}${selected.findings.length ? ': ' + selected.findings.map(f => f.detail).join('; ') : ''}`);
    assert.deepEqual(selected.findings, []);
  });

  it('detects an invalid receipt (contract_version present but receipt malformed) as authority-integrity root cause', async () => {
    const dir = createBundle(unique('invalid-rx'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);
    writeWave1Trace(dir);

    // Pass gate normally → receipt projected
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));

    // Corrupt the receipt: keep contract_version but break receipt_sha256
    const events = traceEvents(dir);
    const attemptIdx = events.findIndex((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    assert.ok(attemptIdx >= 0);
    const attempt = events[attemptIdx];
    assert.ok(attempt?.carried_target_receipt);
    attempt.carried_target_receipt.receipt_sha256 = '0'.repeat(64); // valid length but wrong value
    // Add load_complete so Wave2 selector can find the handoff
    events.push({
      ts: new Date().toISOString(),
      event: 'load_complete',
      entry: 'phases/phase-wave2.md',
      handoff_source_gate: attempt.gate,
      handoff_source_node: attempt.currentNodeRef,
      handoff_target_node: attempt.next,
      handoff_source_attempt_index: attemptIdx,
    });
    writeFileSync(join(dir, 'rb_trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');

    const { selectWave1CarriedTargetReceiptForWave2 } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs');
    const selected = selectWave1CarriedTargetReceiptForWave2(dir);
    assert.equal(selected.kind, 'invalid', `Expected invalid kind, got ${selected.kind}${selected.findings.length ? ': ' + selected.findings.map(f => f.detail).join('; ') : ''}`);
    assert.ok(selected.findings.length > 0);
    assert.match(selected.findings[0].detail, /missing or malformed/);
    assert.equal(selected.findings[0].blocking_basis, 'authority_integrity');
  });

  it('detects intent drift between receipt and current canonical registry', async () => {
    const dir = createBundle(unique('intent-drift'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);

    const depth = JSON.parse(readFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), 'utf8'));
    depth.carried_targets = [{ target_id: 'drift.test', target_text: 'Will the intent drift?' }];
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), `${JSON.stringify(depth, null, 2)}\n`);

    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));

    // Now change the canonical topic title (intent drift) after receipt was written
    const planPath = join(dir, 'rb_plan.md');
    const body = readFileSync(planPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
    const newFm = {
      plan_basename: 'intent-drift',
      derived_topic_count: 1,
      topic_registry_version: '2',
      topic_registry: [{
        topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
        id: '01',
        slug: 'topic-a',
        title: 'Topic A — Completely Changed Intent',
        must_answer: ['An entirely different question?'],
        scope_role: 'supporting',  // changed from primary
        depends_on_topic_uids: [],
        previous_layouts: [],
      }],
    };
    writeFileSync(planPath, `---\n${JSON.stringify(newFm, null, 2)}\n---\n${body}`);

    // Add load_complete after the original receipt
    const events = traceEvents(dir);
    const attemptIdx = events.findIndex((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    assert.ok(attemptIdx >= 0);
    const attempt = events[attemptIdx];
    events.push({
      ts: new Date().toISOString(),
      event: 'load_complete',
      entry: 'phases/phase-wave2.md',
      handoff_source_gate: attempt.gate,
      handoff_source_node: attempt.currentNodeRef,
      handoff_target_node: attempt.next,
      handoff_source_attempt_index: attemptIdx,
    });
    writeFileSync(join(dir, 'rb_trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');

    const { selectWave1CarriedTargetReceiptForWave2 } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs');
    const selected = selectWave1CarriedTargetReceiptForWave2(dir);
    assert.equal(selected.kind, 'intent_drift', `Expected intent_drift kind, got ${selected.kind}${selected.findings.length ? ': ' + selected.findings.map(f => f.detail).join('; ') : ''}`);
    assert.ok(selected.findings.length > 0);
    assert.match(selected.findings[0].detail, /current_intent_mismatch|current canonical intent/);
    assert.equal(selected.findings[0].blocking_basis, 'authority_integrity');
  });

  it('returns unavailable when no legal Wave1→Wave2 handoff exists', async () => {
    const dir = createBundle(unique('no-handoff'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWorkUnit(dir);

    // Write only wave1_completion, no gate_attempt handoff with next/currentNodeRef
    writeTraceEvents(dir, [{ event: 'wave1_completion', ts: new Date().toISOString() }]);

    const { selectWave1CarriedTargetReceiptForWave2 } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs');
    const selected = selectWave1CarriedTargetReceiptForWave2(dir);
    assert.equal(selected.kind, 'unavailable');
    assert.deepEqual(selected.findings, []);
  });
});
