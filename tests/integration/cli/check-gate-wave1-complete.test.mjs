// gate-wave1-complete integration tests (RWG-002, RWG-005, WAI-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';
import {
  claimAndSubmitWorkUnit,
  availableActorDecision,
  referenceContent,
} from '../../engine/work-unit-test-helpers.mjs';
import {
  claimWorkUnits,
  loadWorkUnitIndex,
  submitWorkUnit,
  supersedeWorkUnitAttempt,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
import { collectEligibleWorkUnitProjection } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs';
import { tryLoadGateDefinition } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { evaluateWave1Contract } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs';
import { canonicalWave1ReferencePath } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs');
const INSPECT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

const PARITY_HISTORICAL_TOPIC = Object.freeze({
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174010', id: '01', slug: 'historical-topic', title: 'Historical Topic',
  must_answer: ['What historical evidence is already covered?'], scope_role: 'supporting', depends_on_topic_uids: [], previous_layouts: [],
});
const PARITY_TARGET_TOPIC = Object.freeze({
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174011', id: '02', slug: 'added-topic', title: 'Added Topic',
  must_answer: ['What new evidence does the added Topic require?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [],
});

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_w1_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath, { attempt } = {}) {
  const args = [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave1.md'];
  if (attempt !== undefined) args.push('--attempt', String(attempt));
  return spawnSync('node', args, { encoding: 'utf-8', timeout: 10000 });
}

function runInspect(bundlePath) {
  return spawnSync('node', [INSPECT_CLI, '--bundle', bundlePath], { encoding: 'utf-8', timeout: 10000 });
}

async function evaluateDirect(input) {
  const { evaluateDirectOutputTarget } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs');
  return evaluateDirectOutputTarget(input);
}

function directContext(finding) {
  return finding?.checkpoint_context?.direct_root || null;
}

function writeWave1Trace(dir, { completion = true, materialize = true } = {}) {
  const events = witnessedHandoffEvents({
    sourceGate: 'wave0-complete',
    phase: 'wave0',
    sourceNode: 'phases/phase-wave0.md',
    targetNode: 'phases/phase-wave1.md',
  });
  if (completion) events.push({ event: 'wave1_completion', ts: new Date().toISOString() });
  writeTraceEvents(dir, events);
  if (materialize) materializeWave1Projections(dir);
}

function renderCanonicalSeed(topic) {
  const binding = {
    topic_uid: topic.topic_uid,
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    must_answer: topic.must_answer,
    scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
  };
  return `---\n${JSON.stringify(binding, null, 2)}\n---\n# ${topic.title}\n\n${renderSeedProjectionAppendix()}\n`;
}

function ensureCanonicalSeeds(dir) {
  const topicRegistryFact = buildCanonicalTopicRegistryFact(dir);
  for (const topic of topicRegistryFact.topic_registry) {
    writeFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), renderCanonicalSeed(topic));
  }
}

function projectionReferenceForTopic(dir, topic) {
  const acceptedSlugs = [topic.slug, ...(topic.previous_layouts || []).map((layout) => layout.slug)];
  const candidates = acceptedSlugs.flatMap((slug) => [
    `reference/${slug}-deepening.md`,
    `reference/01-${slug}-deepening.md`,
  ]);
  const ref = candidates.find((candidate) => existsSync(join(dir, candidate)));
  if (ref) return ref;
  const canonical = readdirSync(join(dir, 'reference'))
    .filter((name) => name.startsWith(`${topic.slug}-`) && name.endsWith('.md'))
    .sort()[0];
  if (canonical) return `reference/${canonical}`;
  assert.fail(`Wave1 fixture needs a concrete reference for ${topic.slug}`);
}

function materializeWave1Projections(dir) {
  const topicRegistryFact = buildCanonicalTopicRegistryFact(dir);
  const eligible = collectEligibleWorkUnitProjection(dir, {
    phase: 'wave1',
    topicRegistryFact,
  });
  assert.equal(eligible.passed, true, JSON.stringify(eligible.root_findings));

  for (const topic of topicRegistryFact.topic_registry) {
    const rows = eligible.rows.filter((row) => row.topic_uid === topic.topic_uid);
    if (rows.length === 0) continue;
    writeFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), renderCanonicalSeed(topic));
    const ref = projectionReferenceForTopic(dir, topic);
    const entries = rows.map((row, index) => ({
      source_identity: { kind: 'submitted_work', work_id: row.work_id },
      entry_id: `${row.work_id}/${index + 1}`,
      evidence_meaning: `Submitted Wave1 authority supplies ${topic.title} navigation.`,
      relationship: 'supports',
      refs: [ref],
      status: 'supported',
      next_hop: 'Read the concrete reference before Wave2 synthesis.',
    }));
    const updates = [
      'wave1_mechanisms',
      'wave1_trends',
      'pending_questions',
    ].map((slot_id) => ({ slot_id, entries }));
    const result = applyCanonicalTopicState({
      bundlePath: dir,
      input: {
        context: 'wave_projection',
        action: 'apply_seed_projection',
        topic_uid: topic.topic_uid,
        wave: 'wave1',
        updates,
      },
    });
    assert.ok(['committed', 'unchanged'].includes(result.verdict), JSON.stringify(result));
  }
}

const VALID_EVIDENCE_SUMMARY = `# Evidence Summary: Topic A

## Source URLs
- [Example Source](https://example.com/news/deepening-topic-a) — retrieved 2026-01-15

## Key Findings
1. **机制理解**: AI alignment research shows promising results in scalable oversight.

## Open Questions
1. [开放] How to measure alignment in practice?
`;

const NO_SOURCE_URL_SUMMARY = `# Evidence Summary: Topic A

## Source URLs
(no real sources found)

## Key Findings
1. **机制理解**: Some findings without proper source links.

## Open Questions
1. [开放] Question?
`;

const EMPTY_FINDINGS_SUMMARY = `# Evidence Summary: Topic A

## Source URLs
- [Example](https://example.com/some-page) — retrieved 2026-01-15

## Key Findings

## Open Questions
1. [开放] Question?
`;

function canonicalRichReference(sourceUrl, backing = '') {
  return [
    '---',
    `source_url: "${sourceUrl}"`,
    'acceptance_status: accepted',
    'source_type: secondary',
    'tier: "Tier 2"',
    'evidence_role: deepening_reference',
    'trust_level: practitioner',
    'why_it_matters: "Deepening evidence."',
    'accessed_at: "2026-06-15"',
    'related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000',
    '---',
    '',
    '# Topic A Deepening Reference',
    '',
    '## Key Facts',
    '- Finding one: Important initial finding.',
    '- Finding two: Second key insight.',
    '- Finding three: Third data point.',
    '',
    '## Core Content Capture',
    `This is a substantive core content capture section with submitted-backing context. ${backing}`,
    '',
    '## Relevance To This Research',
    'Relevant.',
    '',
    '## Quotable Terms / Concepts',
    '- Term.',
    '',
    '## Risks And Limitations',
    '- None.',
  ].join('\n');
}

const VALID_QUESTION_LIST = `# Question List - Topic: Topic A

produced_at_ref_count: 1
last_updated: 2026-01-15

## Topic Investigation Targets

| target_id | target_question | origin | status | backing_refs | next_action |
| --- | --- | --- | --- | --- | --- |
| topic-a-T01 | How to measure alignment? | seed | 开放 | https://example.com/news/deepening-topic-a | 移交 wave2 |

## Question Reconciliation

- [部分进展] How to measure alignment?: Evidence provides scalable oversight results but measurement methodology still incomplete.

## Emergent Question Protocol

- new_concept: checked; none; trigger_refs=none
- contradiction: checked; none; trigger_refs=none
- missing_information_gap: checked; none; trigger_refs=none
- noise_pattern: checked; none; trigger_refs=none
- result: no_new_questions_after_protocol

## Exploration / Exploitation Decision

- decision: continue
- trigger_refs: https://example.com/news/deepening-topic-a
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

## 本轮新增机制理解
- evidence_meaning: AI alignment shows promising results in scalable oversight.
  relationship: supports
  refs: reference/01-topic-a-deepening.md
  status: accepted
  next_hop: wave2

## 本轮新增趋势与难点
- evidence_meaning: Increased regulatory attention and measurement difficulty.
  relationship: supports
  refs: reference/01-topic-a-deepening.md
  status: accepted
  next_hop: wave2

## 待验证问题
1. [部分解答] How to measure alignment?
`;

const STALE_TOKEN_SEED_TOPIC = `---
id: t1
slug: topic-a
title: Topic A
---

# Topic A

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
`;

/** Create a bundle with topic_registry and wave1-ready status. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  setStatusWindow(dir, 'wave0_complete', 'wave1_complete');

  // topic_registry
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": 1,\n  "topic_registry_version": "2",\n  "topic_registry": [\n    {\n      "topic_uid": "tp_123e4567-e89b-12d3-a456-426614174000",\n      "id": "01",\n      "slug": "topic-a",\n      "title": "Topic A",\n      "must_answer": ["How should Topic A be investigated?"],\n      "scope_role": "primary",\n      "depends_on_topic_uids": [],\n      "previous_layouts": []\n    }\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = 'phases/phase-wave1.md';
  writeFileSync(statusPath, JSON.stringify(status));

  // Scaffold
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

  // Reference: flat format with topic-prefixed files (required by count_floor)
  writeFileSync(join(dir, 'reference', '01-topic-a-deepening.md'),
    '# Topic A Deepening Reference\n\n' +
    '- source_url: https://example.com/news/deepening-topic-a\n' +
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

  return dir;
}

function writeCanonicalTopicPlan(dir, topicUid, {
  slug = 'topic-a',
  previousLayouts = [{ id: '02', slug: '02_old-topic-a' }],
} = {}) {
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const body = existing.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const frontmatter = {
    plan_basename: 'canonical-wave1-test',
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [{
      topic_uid: topicUid,
      id: '01',
      slug,
      title: 'Topic A',
      must_answer: ['How to measure alignment?'],
      scope_role: 'primary',
      depends_on_topic_uids: [],
      previous_layouts: previousLayouts,
    }],
  };
  writeFileSync(planPath, `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body}`);
}

function submitWave1WorkUnit(dir, {
  queueItemId = 'topic-a',
  sourceUrl = 'https://example.com/news/deepening-topic-a',
  isNewVsWave0 = true,
  cacheTrail = `_cache/wave1/primary/${queueItemId}/deepening-topic-a`,
  assignmentMode = 'primary',
  referenceFloorDeficit = undefined,
  preserveQueue = false,
  evidenceRole = 'evidence_summary',
  questionRole = 'question_list',
  includeEvidenceOutput = true,
  includeQuestionOutput = true,
} = {}) {
  ensureCanonicalSeeds(dir);
  const outputs = [
    {
      path: 'reference/01-topic-a-deepening.md',
      role: 'reference',
      source_url: sourceUrl,
      source_slug: 'deepening-topic-a',
    },
  ];
  if (includeEvidenceOutput) {
    outputs.push({
      path: 'artifacts/wave1/topic-a/evidence-summary.md',
      role: evidenceRole,
    });
  }
  if (includeQuestionOutput) {
    outputs.push({
      path: 'artifacts/wave1/topic-a/question-list.md',
      role: questionRole,
    });
  }

  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    legacyAssignment: assignmentMode === 'primary',
    queueItemOverrides: {
      payload: {
        assignment_mode: assignmentMode,
        ...(referenceFloorDeficit === undefined ? {} : { reference_floor_deficit: referenceFloorDeficit }),
      },
    },
    preserveQueue,
    outputs,
    cacheTrails: [{
      path: cacheTrail,
      url: sourceUrl,
    }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        source_ref: 'reference/01-topic-a-deepening.md',
        acceptance_status: 'accepted',
        is_new_vs_wave0: isNewVsWave0,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
}

function writeDepthReview(dir, {
  submission,
  topic = 'topic-a',
  wave0Urls = ['https://example.com/news/wave0-foundation'],
  decision = 'accept',
  supplementary = [],
  reviewedRefs = null,
} = {}) {
  const wave0Dir = join(dir, 'artifacts/wave0', topic);
  mkdirSync(wave0Dir, { recursive: true });
  writeFileSync(join(wave0Dir, 'source.yaml'), wave0Urls.map((url) => [
    `- url: ${url}`,
    '  title: Wave0 source',
    '  retrieved_date: 2026-07-14',
    `  topic_tag: ${topic}`,
  ].join('\n')).join('\n'));
  mkdirSync(join(dir, 'artifacts', 'wave1', topic), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave1', topic, 'depth-review.yaml'), `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug: topic,
    reviewed_work_unit_refs: reviewedRefs || [submission.record.paths.work_unit_dir],
    depth_dimensions: {
      mechanism: { status: 'covered', refs: [submission.record.paths.result_ref] },
      trend_or_difficulty: { status: 'covered', refs: [submission.record.paths.result_ref] },
      limitation_or_dispute: { status: 'covered', refs: [submission.record.paths.result_ref] },
    },
    profile_checks: {
      counterexample_search: { status: 'not_required', refs: [] },
      cross_verification: { status: 'not_required', refs: [] },
    },
    decision,
    supplementary_queue_item_ids: supplementary,
    carried_targets: [],
  }, null, 2)}\n`);
}

function submitAndReviewWave1WorkUnit(dir, options = {}) {
  const submission = submitWave1WorkUnit(dir, options);
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  writeDepthReview(dir, {
    submission,
    ...options,
    cacheTrail: options.cacheTrail || `_cache/wave1/primary/${options.queueItemId || 'topic-a'}/deepening-topic-a`,
  });
  materializeCanonicalFixtureProjection(dir, submission, {
    sourceUrl: options.sourceUrl || 'https://example.com/news/deepening-topic-a',
    cacheTrail: options.cacheTrail || `_cache/wave1/primary/${options.queueItemId || 'topic-a'}/deepening-topic-a`,
  });
  return submission;
}

function materializeCanonicalFixtureProjection(dir, submission, { sourceUrl, cacheTrail }) {
  const locator = canonicalWave1ReferencePath({ topicSlug: 'topic-a', sourceUrl });
  assert.equal(locator.ok, true);
  const submittedRef = 'reference/01-topic-a-deepening.md';
  const content = readFileSync(join(dir, submittedRef), 'utf8');
  writeFileSync(join(dir, locator.path), `${content}\n\n## Submitted Backing\n- ${submittedRef}\n- ${cacheTrail}\n- ${submission.record.work_id}\n`);
  const indexPath = join(dir, 'reference/_INDEX.md');
  const row = `| ${locator.path} | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-06-15 |`;
  const index = readFileSync(indexPath, 'utf8');
  if (!index.includes(`| ${locator.path} |`)) writeFileSync(indexPath, `${index}${row}\n`);
  return locator.path;
}

function submitSupersessionSuccessor(dir, predecessor) {
  claimWorkUnits(dir, { phase: 'wave1', count: 1, ...availableActorDecision('wave1_topic_deepening') });
  const successor = Object.values(loadWorkUnitIndex(dir).work_units)
    .find((record) => record.status === 'claimed' && record.work_id !== predecessor.record.work_id);
  assert.ok(successor, 'supersession successor should be claimed');
  const predecessorResult = JSON.parse(readFileSync(predecessor.resultPath, 'utf8'));
  const result = {
    ...predecessorResult,
    work_id: successor.work_id,
    queue_item_id: successor.queue_item_id,
    receipt_nonce: successor.receipt_nonce,
    actor_contract_version: successor.actor_contract_version,
    execution_actor_class: successor.actor_execution.execution_actor_class,
  };
  const resultPath = join(dir, '_tmp', `${successor.work_id}.result.json`);
  mkdirSync(join(dir, '_tmp'), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(dir, successor.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: successor.work_id,
    queue_item_id: successor.queue_item_id,
    kind: successor.kind,
    receipt_nonce: successor.receipt_nonce,
    actor_contract_version: successor.actor_contract_version,
    execution_actor_class: successor.actor_execution.execution_actor_class,
    ts: '2026-08-09T00:00:00.000Z',
  })}\n`);
  const submitted = submitWorkUnit(dir, { work_id: successor.work_id, resultPath });
  assert.equal(submitted.ok, true, submitted.inspect?.join('\n'));
  return { record: successor, resultPath };
}

function prepareSupersededWave1GateBundle() {
  const dir = createBundle(unique('superseded-predecessor'));
  writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
  writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
  writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
  const predecessor = submitAndReviewWave1WorkUnit(dir);
  const submittedResultPath = join(dir, predecessor.record.paths.result_ref);
  const submittedResult = JSON.parse(readFileSync(submittedResultPath, 'utf8'));
  submittedResult.summary = 'drifted after formal submit';
  writeFileSync(submittedResultPath, `${JSON.stringify(submittedResult, null, 2)}\n`);

  const superseded = supersedeWorkUnitAttempt(dir, {
    work_id: predecessor.record.work_id,
    reason: 'correct submitted output drift through a successor attempt',
  });
  assert.equal(superseded.ok, true, superseded.missing_fact);
  const successor = submitSupersessionSuccessor(dir, predecessor);
  writeDepthReview(dir, { submission: successor });
  materializeCanonicalFixtureProjection(dir, successor, {
    sourceUrl: 'https://example.com/news/deepening-topic-a',
    cacheTrail: '_cache/wave1/primary/topic-a/deepening-topic-a',
  });
  writeWave1Trace(dir);
  return { dir, predecessor };
}

function writeParityPlan(dir, name, topics) {
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: name,
    derived_topic_count: topics.length,
    topic_registry_version: '2',
    topic_registry: topics,
  }, null, 2)}\n---\n# Wave1 parity plan\n`);
}

function writeParityReferenceIndex(dir, topics) {
  writeFileSync(join(dir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...topics.flatMap((topic) => {
      const sourceUrl = `https://docs.example.org/${topic.slug}/wave1-source`;
      const canonical = canonicalWave1ReferencePath({ topicSlug: topic.slug, sourceUrl });
      return [
        `| reference/${topic.slug}-deepening.md | primary | expert | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-07-14 |`,
        `| ${canonical.path} | primary | expert | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-07-14 |`,
      ];
    }),
    '',
  ].join('\n'));
}

function createParityBundle(name, topics, { rerunCount = 0 } = {}) {
  const result = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const dir = track(result.stdout.trim());
  setStatusWindow(dir, 'wave0_complete', 'wave1_complete');
  writeParityPlan(dir, name, topics);
  writeFileSync(join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 1
  counterexample_search: false
  cross_verification: false
human_decision_checkpoints:
  hitl2:
    rerun_count: ${rerunCount}
`);
  writeParityReferenceIndex(dir, topics);
  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = 'phases/phase-wave1.md';
  writeFileSync(statusPath, JSON.stringify(status));
  return dir;
}

function parityEvidenceSummary(topic, sourceUrl) {
  return `# Evidence Summary: ${topic.title}

## Source URLs
- [Primary Source](${sourceUrl}) - retrieved 2026-07-14

## Key Findings
1. **Mechanism**: Submitted evidence establishes a concrete mechanism for ${topic.title}.

## Open Questions
1. [Open] What remains to be verified?
`;
}

function parityQuestionList(topic, sourceUrl) {
  return `# Question List: ${topic.title}

## Topic Investigation Targets
Target the canonical must-answer question with ${sourceUrl}.

## Question Reconciliation
The submitted evidence provides partial progress.

## Emergent Question Protocol
Checked; no unsupported new question.

## Exploration / Exploitation Decision
Continue to Wave2 synthesis.
`;
}

function paritySeed(topic) {
  return `---
topic_uid: ${topic.topic_uid}
id: "${topic.id}"
slug: ${topic.slug}
title: ${topic.title}
---
# ${topic.title}

## 本轮新增机制理解
- evidence_meaning: Submitted mechanism evidence
  relationship: supports
  refs: reference/${topic.slug}-deepening.md
  status: accepted
  next_hop: wave2

## 本轮新增趋势与难点
- evidence_meaning: Submitted trend evidence
  relationship: supports
  refs: reference/${topic.slug}-deepening.md
  status: accepted
  next_hop: wave2

## 待验证问题
- [部分解答] ${topic.must_answer[0]}
`;
}

function submitParityTopic(dir, topic, { preserveQueue = false } = {}) {
  const sourceUrl = `https://docs.example.org/${topic.slug}/wave1-source`;
  const referencePath = `reference/${topic.slug}-deepening.md`;
  const evidencePath = `artifacts/wave1/${topic.slug}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topic.slug}/question-list.md`;
  const cacheTrail = `_cache/wave1/primary/${topic.slug}/deepening`;
  mkdirSync(join(dir, 'artifacts/wave1', topic.slug), { recursive: true });
  mkdirSync(join(dir, 'artifacts/wave0', topic.slug), { recursive: true });
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, referencePath), `${referenceContent({
    source_url: sourceUrl,
    related_topic_uid: topic.topic_uid,
    evidence_role: 'deepening_reference',
    accessed_at: '2026-07-14',
  })}\n`);
  writeFileSync(join(dir, evidencePath), parityEvidenceSummary(topic, sourceUrl));
  writeFileSync(join(dir, questionPath), parityQuestionList(topic, sourceUrl));
  writeFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), renderCanonicalSeed(topic));
  writeFileSync(join(dir, 'artifacts/wave0', topic.slug, 'source.yaml'), `- url: https://docs.example.org/${topic.slug}/wave0-source
  title: Wave0 foundation
  retrieved_date: 2026-07-14
  topic_tag: ${topic.slug}
`);

  const submission = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: `wave1-${topic.slug}`,
    preserveQueue,
    queueItemOverrides: {
      payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, wave: 1 },
      lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave1' },
    },
    outputs: [
      { path: referencePath, role: 'reference', source_url: sourceUrl, source_slug: `${topic.slug}-deepening` },
      { path: evidencePath, role: 'evidence_summary' },
      { path: questionPath, role: 'question_list' },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        source_ref: referencePath,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  const canonical = canonicalWave1ReferencePath({ topicSlug: topic.slug, sourceUrl });
  const original = readFileSync(join(dir, referencePath), 'utf8');
  writeFileSync(join(dir, canonical.path), `${original}\n\n## Submitted Backing\n- ${referencePath}\n- ${cacheTrail}\n- ${submission.record.work_id}\n`);
  const depth = {
    version: 'depth-review.v1',
    topic_slug: topic.slug,
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
  };
  writeFileSync(join(dir, 'artifacts/wave1', topic.slug, 'depth-review.yaml'), `${JSON.stringify(depth, null, 2)}\n`);
  return { submission, depth };
}

function wave1ParityProjection(entry) {
  const manifest = JSON.parse(readFileSync(join(entry.dir, entry.target.submission.record.paths.manifest_ref), 'utf8'));
  return {
    kind: manifest.kind,
    actor_contract_version: manifest.actor_contract_version,
    actor_class: manifest.actor_execution.execution_actor_class,
    delegated_role: manifest.actor_execution.delegated_role_key,
    prior_roles: manifest.output_contract.source_claims.prior_submitted_output_roles,
    output_roles: manifest.output_contract.output_files.allowed_roles,
    cache_policy: manifest.cache_policy,
    depth_fields: Object.keys(entry.target.depth).sort(),
    depth_dimension_fields: Object.keys(entry.target.depth.depth_dimensions).sort(),
    has_copied_ledger_truth: ['source_claims', 'accepted_source_urls', 'cache_trail_refs', 'new_source_urls', 'new_source_floor'].some((field) => Object.hasOwn(entry.target.depth, field)),
    template_required: readFileSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md'), 'utf8').includes('templates/seed-topic-template'),
    gate: {
      passed: entry.gate.check.passed,
      failed_rule_ids: entry.gate.check.failed_rule_ids,
      masked_rule_ids: entry.gate.check.masked_rule_ids,
    },
  };
}

describe('check-gate-wave1-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('projects the same candidate-exact materialization hint through inspect and formal Gate', () => {
    const dir = createBundle(unique('direct-closeout-hint'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir, { materialize: false });

    const canonical = canonicalWave1ReferencePath({
      topicSlug: 'topic-a',
      sourceUrl: 'https://example.com/news/deepening-topic-a',
    });
    assert.equal(canonical.ok, true);
    rmSync(join(dir, canonical.path));

    const outputs = [
      JSON.parse(runInspect(dir).stdout),
      JSON.parse(runGate(dir).stdout),
    ];
    const hints = outputs.map((output) => output.hints.find((hint) => (
      hint.rule_id === 'per_topic_ref_md_count_floor'
      && hint.repair_kind === 'agent_action'
    )));

    for (const hint of hints) {
      assert.ok(hint, JSON.stringify(outputs));
      assert.match(hint.write_to, new RegExp(canonical.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(hint.write_to, new RegExp(submission.record.work_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(hint.write_to, /source_refs=\[/);
      assert.match(hint.write_to, /cache_trail_refs=\[/);
    }
    assert.equal(hints[0].write_to, hints[1].write_to);
  });

  it('keeps the floor outcome while making omitted supplementary review sync the primary inspect and Gate repair', () => {
    const dir = createBundle(unique('supplementary-review-sync'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const primary = submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const supplementary = submitWave1WorkUnit(dir, {
      queueItemId: 'topic-a-supplementary',
      sourceUrl: 'https://example.com/news/deepening-topic-a-supplementary',
      cacheTrail: '_cache/wave1/primary/topic-a-supplementary/deepening-topic-a',
      assignmentMode: 'supplementary',
      referenceFloorDeficit: 1,
      preserveQueue: true,
    });
    assert.equal(supplementary.submitted.ok, true, JSON.stringify(supplementary.submitted));
    writeDepthReview(dir, { submission: primary });
    materializeCanonicalFixtureProjection(dir, primary, {
      sourceUrl: 'https://example.com/news/deepening-topic-a',
      cacheTrail: '_cache/wave1/primary/topic-a/deepening-topic-a',
    });
    const profilePath = join(dir, 'rb_profile.yaml');
    writeFileSync(profilePath, readFileSync(profilePath, 'utf8').replace('wave1_per_topic_ref_floor: 1', 'wave1_per_topic_ref_floor: 2'));

    const outputs = [
      JSON.parse(runInspect(dir).stdout),
      JSON.parse(runGate(dir).stdout),
    ];
    const hints = outputs.map((output) => output.hints.find((hint) => (
      hint.rule_id === 'per_topic_ref_md_count_floor'
      && /Current canonical reference floor/.test(hint.missing_fact)
    )));

    for (const hint of hints) {
      assert.ok(hint, JSON.stringify(outputs));
      assert.match(hint.write_to, /artifacts\/wave1\/topic-a\/depth-review\.yaml#reviewed_work_unit_refs/);
      assert.match(hint.missing_fact, /add them to the depth review/i);
      assert.match(hint.missing_fact, new RegExp(supplementary.record.work_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.doesNotMatch(hint.write_to, /enqueue/i);
      assert.doesNotMatch(hint.missing_fact, /enqueue/i);
    }
    assert.equal(hints[0].write_to, hints[1].write_to);
  });

  it('1. happy path: evidence-summary with source URL + key findings passes', () => {
    const dir = createBundle(unique('happy'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.deepEqual(output.check.failed_rule_ids, []);
    assert.deepEqual(output.check.masked_rule_ids, []);
    const attempts = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const attempt = attempts.find((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
    assert.equal(attempt.carried_target_receipt.contract_version, 'wave1-carried-targets/v1');
    assert.deepEqual(attempt.carried_target_receipt.targets, []);
  });

  it('1h. treats an exact hash-valid superseded predecessor as historical rather than delegated bypass', () => {
    const historicalFixture = prepareSupersededWave1GateBundle();

    const historical = JSON.parse(runGate(historicalFixture.dir).stdout);
    assert.equal(historical.check.passed, true, historical.inspect.join('\n'));
    assert.equal(historical.check.failed_rule_ids.includes('wave1_delegated_bypass_suspected'), false);

    const rawOnlyFixture = prepareSupersededWave1GateBundle();
    const ledgerPath = join(rawOnlyFixture.dir, 'rb_output_declarations.jsonl');
    const rows = readFileSync(ledgerPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    rows.push({
      declared_at: '2026-08-09T00:00:00.000Z',
      wave: 1,
      output_files: [{ path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' }],
    });
    writeFileSync(ledgerPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);

    const rawOnly = JSON.parse(runGate(rawOnlyFixture.dir).stdout);
    assert.equal(rawOnly.check.passed, false);
    assert.equal(rawOnly.check.failed_rule_ids.includes('wave1_delegated_bypass_suspected'), true);
  });

  it('1j. rejects a malformed carried target declaration at the existing depth-review coordinate', () => {
    const dir = createBundle(unique('bad-carried-target'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const depthPath = join(dir, 'artifacts/wave1/topic-a/depth-review.yaml');
    const depth = JSON.parse(readFileSync(depthPath, 'utf8'));
    depth.carried_targets = [{ target_id: 'bad id', target_text: '' }];
    writeFileSync(depthPath, `${JSON.stringify(depth, null, 2)}\n`);

    const output = JSON.parse(runGate(dir).stdout);
    assert.equal(output.check.passed, false);
    const hint = output.hints.find((entry) => entry.rule_id === 'per_topic_depth_review_contract');
    assert.ok(hint, JSON.stringify(output.hints));
    assert.match(hint.write_to, /depth-review\.yaml/);
  });

  it('1i. masks Wave1 declaration-dependent symptoms behind one recoverable parent', () => {
    const dir = createBundle(unique('declaration-gap'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    rmSync(join(dir, 'rb_output_declarations.jsonl'));

    for (const result of [runInspect(dir), runGate(dir)]) {
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const output = JSON.parse(result.stdout);
      assert.equal(output.check.failed_rule_ids.includes('wave1_work_unit_submission_presence'), true);
      const hint = output.hints.find((entry) => entry.rule_id === 'wave1_work_unit_submission_presence');
      assert.ok(hint);
      assert.equal(hint.repair_kind, 'engine_operation');
      assert.match(hint.missing_fact, new RegExp(submission.record.work_id));
      assert.match(hint.write_to, /operate-work-unit\.mjs recover-declaration/);
      assert.doesNotMatch(hint.write_to, /rb_output_declarations\.jsonl/);
      for (const dependent of [
        'cache_coverage',
        'wave1_work_unit_ledger_exists',
        'wave1_work_unit_output_coverage',
        'wave1_delegated_bypass_suspected',
      ]) {
        assert.equal(output.check.failed_rule_ids.includes(dependent), false);
      }
    }
  });

  it('1h. keeps bounded fresh/rerun-added Wave1 contract and Gate parity', () => {
    const freshDir = createParityBundle(unique('parity-fresh'), [PARITY_TARGET_TOPIC]);
    const freshTarget = submitParityTopic(freshDir, PARITY_TARGET_TOPIC);
    writeWave1Trace(freshDir);
    const freshGate = JSON.parse(runGate(freshDir).stdout);
    assert.equal(freshGate.check.passed, true, freshGate.inspect.join('\n'));

    const rerunDir = createParityBundle(unique('parity-rerun'), [PARITY_HISTORICAL_TOPIC], { rerunCount: 1 });
    submitParityTopic(rerunDir, PARITY_HISTORICAL_TOPIC);
    writeParityPlan(rerunDir, 'parity-rerun', [PARITY_HISTORICAL_TOPIC, PARITY_TARGET_TOPIC]);
    writeParityReferenceIndex(rerunDir, [PARITY_HISTORICAL_TOPIC, PARITY_TARGET_TOPIC]);
    const rerunTarget = submitParityTopic(rerunDir, PARITY_TARGET_TOPIC, { preserveQueue: true });
    writeWave1Trace(rerunDir);
    const rerunGate = JSON.parse(runGate(rerunDir).stdout);
    assert.equal(rerunGate.check.passed, true, rerunGate.inspect.join('\n'));

    assert.deepEqual(
      wave1ParityProjection({ dir: rerunDir, target: rerunTarget, gate: rerunGate }),
      wave1ParityProjection({ dir: freshDir, target: freshTarget, gate: freshGate }),
    );
  });

  it('1a. keeps a historical Wave1 binding as the direct current-topic root before count-floor evaluation', () => {
    const dir = createBundle(unique('historical-layout'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    writeCanonicalTopicPlan(dir, 'tp_123e4567-e89b-12d3-a456-426614174000', {
      slug: 'topic-a-new',
      previousLayouts: [{ id: '01', slug: 'topic-a' }],
    });
    writeFileSync(join(dir, 'seed_topics/topic-a-new.md'), VALID_SEED_TOPIC.replace('slug: topic-a', 'slug: topic-a-new'));
    materializeWave1Projections(dir);
    const output = JSON.parse(runGate(dir).stdout);
    const inspected = JSON.parse(runInspect(dir).stdout);
    assert.equal(output.check.passed, false);
    assert.equal(output.check.failed_rule_ids.includes('per_topic_depth_review_contract'), true, JSON.stringify(output, null, 2));
    assert.equal(output.check.failed_rule_ids.some((id) => id.startsWith('per_topic_ref_md_count_floor')), false);
    assert.equal(output.check.masked_rule_ids.includes('per_topic_ref_md_count_floor:topic-a-new'), true);
    assert.ok(output.inspect.some((line) => /wave1_reference_topic_invalid/.test(line)), output.inspect.join('\n'));
    const gateHint = output.hints.find((hint) => hint.rule_id === 'per_topic_depth_review_contract');
    const inspectHint = inspected.hints.find((hint) => hint.rule_id === 'per_topic_depth_review_contract');
    assert.ok(gateHint && inspectHint);
    assert.deepEqual({ ...gateHint, rerun: null }, { ...inspectHint, rerun: null });
  });

  it('1d. tolerates equivalent headings, bare URLs, paragraph findings, and numbered Key Facts', () => {
    const dir = createBundle(unique('tolerant'));
    const referencePath = join(dir, 'reference/01-topic-a-deepening.md');
    writeFileSync(referencePath, readFileSync(referencePath, 'utf8')
      .replace(/- Finding one:/, '1. Finding one:')
      .replace(/- Finding two:/, '2) Finding two:')
      .replace(/- Finding three:/, '* Finding three:')
      .replace(/- Finding four:/, '+ Finding four:')
      .replace(/- Finding five:/, '5. Finding five:'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), `# Evidence Summary\n\n## Source URLs\nhttps://example.com/news/deepening-topic-a\n\n### key findings\nA substantive finding expressed as a paragraph.\n`);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), `# Questions\n\n## Exploration/Exploitation Decision\ncontinue\n\n#### Emergent Question Protocol\nChecked.\n\n### topic investigation targets\nTargets.\n\n## QUESTION RECONCILIATION\nReconciled.\n`);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    for (const output of [
      JSON.parse(runInspect(dir).stdout),
      JSON.parse(runGate(dir).stdout),
    ]) {
      assert.equal(output.check.passed, true, output.inspect.join('\n'));
      assert.equal(output.check.failed_rule_ids.some((id) => id.startsWith('question_list_has_four_sections')), false);
    }
  });

  it('1g. accepts UID-only reference metadata through the canonical topic resolver', () => {
    const dir = createBundle(unique('uid-reference'));
    const topicUid = 'tp_123e4567-e89b-12d3-a456-426614174000';
    writeCanonicalTopicPlan(dir, topicUid);
    const referencePath = join(dir, 'reference/01-topic-a-deepening.md');
    writeFileSync(referencePath, readFileSync(referencePath, 'utf8').replace(
      '- related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000',
      `- related_topic_uid: ${topicUid}`,
    ));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);

    const gateOutput = JSON.parse(runGate(dir).stdout);
    assert.equal(gateOutput.check.passed, true, gateOutput.inspect.join('\n'));
    assert.equal(gateOutput.check.failed_rule_ids.some((id) => id.startsWith('reference_format')), false);

    const inspectOutput = JSON.parse(runInspect(dir).stdout);
    assert.equal(inspectOutput.check.failed_rule_ids.some((id) => id.startsWith('reference_format')), false);
  });

  it('1g. reports one retired-key root for a dual binding without downstream floor noise', () => {
    const dir = createBundle(unique('retired-dual-binding'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);

    const referencePath = join(dir, 'reference/01-topic-a-deepening.md');
    const historicalBytes = readFileSync(referencePath, 'utf8').replace(
      '- related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000',
      '- related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n- related_topic: topic-a',
    );
    writeFileSync(referencePath, historicalBytes);

    for (const output of [
      JSON.parse(runGate(dir).stdout),
      JSON.parse(runInspect(dir).stdout),
    ]) {
      assert.equal(output.check.passed, false);
      assert.deepEqual(output.check.failed_rule_ids, ['reference_format'], JSON.stringify(output));
      assert.equal(output.inspect.filter((line) => (
        line.includes('reference_topic_binding_legacy_unsupported')
      )).length, 1);
      assert.equal(output.check.failed_rule_ids.some((id) => (
        /per_topic_ref_md_count_floor|reference_index_coverage|ledger_coverage/.test(id)
      )), false);
      const hint = output.hints.find((candidate) => candidate.rule_id === 'reference_format');
      assert.ok(hint, JSON.stringify(output.hints));
      assert.match(hint.missing_fact, /#metadata\.related_topic/);
      assert.equal(hint.write_to, 'Current UID-bound reference materialization path');
      assert.equal(output.advice.filter((advice) => /without rewriting/i.test(advice)).length, 1);
    }
    assert.equal(readFileSync(referencePath, 'utf8'), historicalBytes);
  });

  it('1j. routes raw document markup through the existing Gate and side-effect-free inspect repair', () => {
    const dir = createBundle(unique('raw-document-markup'));
    const referencePath = join(dir, 'reference/01-topic-a-deepening.md');
    const contaminated = readFileSync(referencePath, 'utf8').replace(
      'This is a substantive core content capture section that provides meaningful analysis of the topic being researched. It exceeds one hundred characters to satisfy the minimum quality threshold for reference counting.',
      '<html><body>Copied raw document payload.</body></html>',
    );
    writeFileSync(referencePath, contaminated);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);

    const traceBeforeInspect = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8');
    const inspectOutput = JSON.parse(runInspect(dir).stdout);
    assert.equal(inspectOutput.check.passed, false);
    assert.equal(readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8'), traceBeforeInspect);
    assert.equal(readFileSync(referencePath, 'utf8'), contaminated);

    const gateOutput = JSON.parse(runGate(dir).stdout);
    assert.equal(gateOutput.check.passed, false);
    assert.equal(readFileSync(referencePath, 'utf8'), contaminated);

    const formatRepair = (output) => {
      const hint = output.hints.find((candidate) => candidate.rule_id === 'reference_format');
      assert.ok(hint, JSON.stringify(output.hints));
      return {
        rule_id: hint.rule_id,
        repair_kind: hint.repair_kind,
        write_to: hint.write_to,
      };
    };
    const expectedRepair = {
      rule_id: 'reference_format',
      repair_kind: 'agent_action',
      write_to: `${referencePath}#section:Core Content Capture`,
    };
    assert.deepEqual(formatRepair(inspectOutput), expectedRepair);
    assert.deepEqual(formatRepair(gateOutput), expectedRepair);
  });

  it('1e. fewer Key Facts does not affect numeric count or revive the retired quantity blocker', () => {
    const dir = createBundle(unique('degraded'));
    const referencePath = join(dir, 'reference/01-topic-a-deepening.md');
    writeFileSync(referencePath, readFileSync(referencePath, 'utf8').replace(/- Finding five: Fifth concluding fact\.\n/, ''));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);

    const inspectOutput = JSON.parse(runInspect(dir).stdout);
    assert.equal(Object.hasOwn(inspectOutput, 'routing'), false);
    assert.notEqual(inspectOutput.check.degraded, true);
    assert.equal(inspectOutput.check.failed_rule_ids.some((id) => id.startsWith('key_facts_min_lines')), false);
    assert.equal(inspectOutput.check.failed_rule_ids.some((id) => id.startsWith('per_topic_ref_md_count_floor')), false);

    const gateOutput = JSON.parse(runGate(dir, { attempt: 3 }).stdout);
    assert.equal(gateOutput.check.passed, true, gateOutput.inspect.join('\n'));
    assert.notEqual(gateOutput.check.degraded, true);
    assert.deepEqual(gateOutput.check.degraded_rules ?? [], []);
    assert.equal(gateOutput.check.failed_rule_ids.some((id) => id.startsWith('per_topic_ref_md_count_floor')), false);
    assert.equal(gateOutput.check.failed_rule_ids.some((id) => id.startsWith('key_facts_min_lines')), false);
  });

  it('1f. an empty required question-list semantic section remains blocking once', () => {
    const dir = createBundle(unique('missing-question-section'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST.replace(
      /## Question Reconciliation\n\n[\s\S]*?(?=\n## Emergent Question Protocol)/,
      '## Question Reconciliation\n\n',
    ));
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);

    const outputs = [
      JSON.parse(runInspect(dir).stdout),
      JSON.parse(runGate(dir).stdout),
    ];
    const hints = outputs.map((output) => {
      assert.equal(output.check.passed, false);
      assert.equal(output.check.failed_rule_ids.some((id) => id.startsWith('question_list_has_four_sections')), true);
      assert.equal(output.hints.filter((hint) => hint.rule_id === 'question_list_has_four_sections').length, 1);
      const hint = output.hints.find((entry) => entry.rule_id === 'question_list_has_four_sections');
      assert.match(hint.missing_fact, /question reconciliation/i);
      return hint;
    });
    assert.deepEqual({ ...hints[0], rerun: null }, { ...hints[1], rerun: null });
  });

  it('1a. passes when Wave1 required outputs were submitted as other and normalized before ledger coverage', () => {
    const dir = createBundle(unique('otherrole'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir, {
      evidenceRole: 'other',
      questionRole: 'other',
    });
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected normalized required role pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('1b. fails when a required artifact exists but canonical submitted coverage is missing', () => {
    const dir = createBundle(unique('missingcoverage'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitWave1WorkUnit(dir, { includeQuestionOutput: false });
    assert.equal(submission.submitted.ok, true);
    writeDepthReview(dir, { submission });
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected missing canonical submitted coverage failure, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some((line) => /artifacts\/wave1\/topic-a\/question-list\.md/.test(line) && /submitted work-unit coverage/i.test(line)),
      `Expected missing question_list coverage diagnostic, got: ${JSON.stringify(output.inspect)}`);
  });

  it('1c. passes and reports canonicalization when depth-review reviewed refs have harmless trailing slash', () => {
    const dir = createBundle(unique('slashref'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitWave1WorkUnit(dir);
    assert.equal(submission.submitted.ok, true);
    writeDepthReview(dir, {
      submission,
      reviewedRefs: [`${submission.record.paths.work_unit_dir}/`],
    });
    materializeCanonicalFixtureProjection(dir, submission, {
      sourceUrl: 'https://example.com/news/deepening-topic-a',
      cacheTrail: '_cache/wave1/primary/topic-a/deepening-topic-a',
    });
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected trailing slash canonicalization pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some((line) => /canonicalized.*reviewed_work_unit_refs/i.test(line)),
      `Expected canonicalization diagnostic, got: ${JSON.stringify(output.inspect)}`);
  });

  it('2. fails when per-topic evidence-summary is missing', () => {
    const dir = createBundle(unique('nomd'));
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('evidence-summary') || m.includes('Missing file')), `Expected missing evidence-summary fail: ${JSON.stringify(output.inspect)}`);
    const inspectOutput = JSON.parse(runInspect(dir).stdout);
    const sharedGateIds = output.check.failed_rule_ids.filter((id) => id !== 'trace_event_wave1_completion').sort();
    assert.deepEqual(inspectOutput.check.failed_rule_ids.filter((id) => sharedGateIds.includes(id)).sort(), sharedGateIds);
    const gateHint = output.hints.find((hint) => hint.rule_id === 'per_topic_evidence_summary_exists');
    const inspectHint = inspectOutput.hints.find((hint) => hint.rule_id === 'per_topic_evidence_summary_exists');
    assert.deepEqual({ ...inspectHint, rerun: null }, { ...gateHint, rerun: null });
    assert.match(gateHint.rerun, /check-gate-wave1-complete\.mjs/);
    assert.match(inspectHint.rerun, /inspect-wave1-output\.mjs/);
  });

  it('2b. emits delegated bypass diagnostics once per formal invocation', () => {
    const dir = createBundle(unique('bypass-once'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    writeWave1Trace(dir);
    runGate(dir);
    const traceEvents = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    assert.equal(traceEvents.filter((event) => event.event === 'delegated_bypass_suspected').length, 1);
    const runLog = readFileSync(join(dir, '_logs/run.log'), 'utf8');
    assert.equal(runLog.split('\n').filter((line) => /\] WARN delegated_bypass_suspected\b/.test(line)).length, 1);
  });

  it('3. fails when source URL is missing from evidence-summary', () => {
    const dir = createBundle(unique('nosource'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), NO_SOURCE_URL_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('source URL') || m.includes('pattern')), `Expected missing source URL fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when key findings section is empty', () => {
    const dir = createBundle(unique('emptyfind'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), EMPTY_FINDINGS_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Key Findings') || m.includes('finding')), `Expected empty findings fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when backfill tokens are stale in seed_topics', () => {
    const dir = createBundle(unique('staletok'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir, { materialize: false });
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('BACKFILL') || m.includes('Stale')), `Expected stale backfill token fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails on status drift', () => {
    const dir = createBundle(unique('drift'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'wave2_complete'; // wrong before wave1 itself passes
    writeFileSync(statusPath, JSON.stringify(status));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('7. fails when trace event (wave1_completion) is missing from rb_trace.jsonl', () => {
    const dir = createBundle(unique('notrace'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir, { completion: false });
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('trace') || m.includes('Trace event') || m.includes('wave1_completion')), `Expected trace event fail: ${JSON.stringify(output.inspect)}`);
  });

  it('8. rejects reference files with placeholder source_url (example.com)', () => {
    const dir = createBundle(unique('placehold'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    // Write a second reference with placeholder source_url — the first one has a real URL
    writeFileSync(join(dir, 'reference/topic-a-placeholder.md'),
      '# Placeholder\n\n' +
      '- source_url: "https://example.com"\n' +
      '- acceptance_status: accepted\n' +
      '- source_type: secondary\n' +
      '- tier: Tier 3\n' +
      '- evidence_role: deepening_reference\n' +
      '- trust_level: caution\n' +
      '- why_it_matters: Supplementary reference\n' +
      '- accessed_at: 2026-06-27\n' +
      '- related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n\n' +
      '## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nSee primary reference.\n' +
      '## Relevance To This Research\nSupports topic analysis.\n## Quotable Terms / Concepts\n- None.\n## Risks And Limitations\n- Supplementary source.\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected placeholder rejection, got pass. Inspect: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some(m => m.includes('placeholder') || m.includes('example.com')),
      `Expected inspect to mention placeholder/example.com, got: ${JSON.stringify(output.inspect)}`);
  });

  it('9. rejects orphan reference files not declared in ledger', () => {
    const dir = createBundle(unique('orphan'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    writeFileSync(join(dir, 'reference/topic-a-orphan.md'),
      '# Orphan\n\n' +
      '- source_url: https://example.com/news/orphan\n' +
      '- acceptance_status: accepted\n' +
      '- source_type: secondary\n' +
      '- tier: Tier 2\n' +
      '- evidence_role: deepening_reference\n' +
      '- trust_level: practitioner\n' +
      '- why_it_matters: Orphan test\n' +
      '- accessed_at: 2026-06-27\n' +
      '- related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n\n' +
      '## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nContent.\n' +
      '## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- Term.\n## Risks And Limitations\n- None.\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('projection_backing_drift') || m.includes('submitted backing')), `Expected orphan/backing fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. accepts canonical YAML rich references without return-map fields', () => {
    const dir = createBundle(unique('yamlref'));
    const sourceUrl = 'https://example.com/news/deepening-topic-a';
    const cacheTrail = '_cache/wave1/primary/topic-a/deepening-topic-a';
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitAndReviewWave1WorkUnit(dir, { sourceUrl, cacheTrail });
    const canonical = canonicalWave1ReferencePath({ topicSlug: 'topic-a', sourceUrl });
    const backing = `Submitted backing: reference/01-topic-a-deepening.md, ${cacheTrail}, and _work_units/wave1/${submission.record.work_id}/.`;
    writeFileSync(join(dir, 'reference/01-topic-a-deepening.md'), canonicalRichReference(sourceUrl, backing));
    writeFileSync(join(dir, canonical.path), canonicalRichReference(sourceUrl, backing));
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected canonical YAML reference to pass: ${JSON.stringify(output.inspect)}`);
    assert.equal(output.inspect.some((message) => /return_map_/.test(message)), false, JSON.stringify(output.inspect));
  });

  it('11. fails when depth-review.yaml is missing', () => {
    const dir = createBundle(unique('missingreview'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitWave1WorkUnit(dir);
    assert.equal(submission.submitted.ok, true);
    writeWave1Trace(dir);
    const gateResult = runGate(dir);
    const gateOutput = JSON.parse(gateResult.stdout);
    const inspectResult = runInspect(dir);
    const inspectOutput = JSON.parse(inspectResult.stdout);
    for (const output of [gateOutput, inspectOutput]) {
      assert.equal(output.check.passed, false);
      assert.ok(output.check.failed_rule_ids.includes('per_topic_depth_review_contract'));
      assert.ok(output.inspect.some((line) => line.includes('depth-review.yaml')), `Expected missing depth review fail: ${JSON.stringify(output.inspect)}`);
      assert.equal(output.inspect.some((line) => /source_novelty_floor|source_claim_cache_mapping|profile check/.test(line)), false);
      assert.ok(output.check.masked_rule_ids.some((id) => id.includes('source_novelty_floor')));
      assert.equal(output.hints.some((hint) => /source_novelty_floor|source_claim_cache_mapping/.test(hint.rule_id)), false);
    }
    assert.deepEqual(
      inspectOutput.check.failed_rule_ids.filter((id) => gateOutput.check.failed_rule_ids.includes(id)).sort(),
      gateOutput.check.failed_rule_ids.filter((id) => inspectOutput.check.failed_rule_ids.includes(id)).sort(),
    );
  });

  it('11a. gives inspect and Gate one current-topic submitted-backing root without fabrication advice', () => {
    const dir = createParityBundle(unique('wrong-topic-depth-backing'), [PARITY_HISTORICAL_TOPIC, PARITY_TARGET_TOPIC]);
    const otherTopic = submitParityTopic(dir, PARITY_TARGET_TOPIC);
    writeDepthReview(dir, {
      topic: PARITY_HISTORICAL_TOPIC.slug,
      submission: otherTopic.submission,
    });
    writeWave1Trace(dir, { materialize: false });

    const gate = JSON.parse(runGate(dir).stdout);
    const inspect = JSON.parse(runInspect(dir).stdout);
    const rootHints = [gate, inspect].map((output) => output.hints.filter((hint) => (
      hint.rule_id === 'per_topic_depth_review_contract'
      && /manifest_topic_binding_invalid/.test(hint.missing_fact)
    )));
    assert.equal(rootHints[0].length, 1, JSON.stringify(gate.inspect));
    assert.equal(rootHints[1].length, 1, JSON.stringify(inspect.inspect));

    const [gateRoot] = rootHints[0];
    const [inspectRoot] = rootHints[1];
    assert.equal(gateRoot.repair_kind, 'missing_contract');
    assert.match(gateRoot.write_to, /current-topic backing\/replacement owner boundary/i);
    assert.deepEqual(
      {
        rule_id: gateRoot.rule_id,
        repair_kind: gateRoot.repair_kind,
        missing_fact: gateRoot.missing_fact,
        write_to: gateRoot.write_to,
      },
      {
        rule_id: inspectRoot.rule_id,
        repair_kind: inspectRoot.repair_kind,
        missing_fact: inspectRoot.missing_fact,
        write_to: inspectRoot.write_to,
      },
    );
    assert.notEqual(gateRoot.rerun, inspectRoot.rerun);
    for (const output of [gate, inspect]) {
      assert.equal(output.check.failed_rule_ids.some((id) => id.startsWith('per_topic_ref_md_count_floor:historical-topic')), false);
      assert.equal(output.check.masked_rule_ids.includes('per_topic_ref_md_count_floor:historical-topic'), true);
      assert.equal(output.inspect.some((line) => /source_claim_cache_mapping|source_novelty_floor|new_source_floor_comparison/.test(line)), false);
      assert.equal(output.advice.some((line) => /replace reviewed_work_unit_refs/i.test(line)), false);
      assert.equal(output.advice.some((line) => /claim\/submit/i.test(line)), false);
      assert.ok(output.advice.some((line) => /do not invent reviewed_work_unit_refs/i.test(line)));
    }
  });

  it('12. fails when depth review has too few exact-new source URLs', () => {
    const dir = createBundle(unique('shallow'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir, {
      sourceUrl: 'https://example.com/news/deepening-topic-a',
      isNewVsWave0: false,
      wave0Urls: ['https://example.com/news/deepening-topic-a'],
      decision: 'supplement_required',
      supplementary: ['wave1-deepen-topic-a-v2'],
    });
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('source_novelty_floor') || m.includes('supplement_required')),
      `Expected shallow depth-review failure: ${JSON.stringify(output.inspect)}`);
  });

  it('13. fails when accepted source claims lose cache content coverage', () => {
    const dir = createBundle(unique('cachethin'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeFileSync(join(dir, '_cache/wave1/primary/topic-a/deepening-topic-a/page.md'), '# Page\n');
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('source_claim_cache_mapping') || m.includes('placeholder-only')),
      `Expected cache mapping failure: ${JSON.stringify(output.inspect)}`);
  });

  it('14. passes after supplementary Wave1 repair is submitted and reviewed', () => {
    const dir = createBundle(unique('supplement'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir, {
      queueItemId: 'wave1-deepen-topic-a-v2',
      supplementary: ['wave1-deepen-topic-a-v2'],
    });
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected supplementary repair pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });
});
describe('RWG-018 Wave1 direct adapter parity', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('0a. projects the same direct roots for Key Findings and question sections', async () => {
    const cases = [
      {
        target: 'artifacts/wave1/topic-a/evidence-summary.md',
        content: EMPTY_FINDINGS_SUMMARY,
        contractId: 'wave1.evidence-summary.v1',
        ruleId: 'key_findings_non_empty',
      },
      {
        target: 'artifacts/wave1/topic-a/question-list.md',
        content: '## Topic Investigation Targets\n\nOne target.\n',
        contractId: 'wave1.question-list.v1',
        ruleId: 'question_list_has_four_sections',
      },
    ];
    for (const testCase of cases) {
      const dir = createBundle(unique(`direct-${testCase.ruleId}`));
      writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
      writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
      writeFileSync(join(dir, testCase.target), testCase.content);
      const direct = await evaluateDirect({
        bundleDir: dir,
        target: testCase.target,
        contractId: testCase.contractId,
      });
      assert.equal(direct.passed, false, testCase.ruleId);
      assert.equal(direct.roots.length, 1, testCase.ruleId);
      const { definition } = tryLoadGateDefinition('wave1-complete', null);
      const wave = evaluateWave1Contract(dir, definition);
      const finding = wave.findings.find((entry) => (
        entry.rule_id === testCase.ruleId && entry.surface === testCase.target
      ));
      assert.deepEqual(directContext(finding), direct.roots[0], testCase.ruleId);
      assert.equal(wave.findings.filter((entry) => entry.surface === testCase.target && directContext(entry)).length, 1);
    }
  });

  it('0b. keeps URL, provenance, depth, return-map, and phase facts Wave-only', async () => {
    const dir = createBundle(unique('direct-wave-only'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), NO_SOURCE_URL_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    const direct = await evaluateDirect({
      bundleDir: dir,
      target: 'artifacts/wave1/topic-a/evidence-summary.md',
      contractId: 'wave1.evidence-summary.v1',
    });
    assert.equal(direct.passed, true);
    assert.equal(JSON.stringify(direct).match(/source_url|provenance|depth|return.map|phase|ledger/gi), null);

    const { definition } = tryLoadGateDefinition('wave1-complete', null);
    const wave = evaluateWave1Contract(dir, definition);
    assert.ok(wave.failed_rule_ids.includes('source_url_present'));
    assert.equal(wave.failed_rule_ids.includes('key_findings_non_empty'), false);
  });

  it('0c. evaluates a parsed semantic descriptor without reusing a target-only default result', () => {
    const dir = createBundle(unique('descriptor-cache'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), '## Descriptor-Owned Section\n\nPresent.\n');
    const { definition } = tryLoadGateDefinition('wave1-complete', null);
    const descriptorDefinition = {
      ...definition,
      rules: definition.rules.map((rule) => rule.id === 'question_list_has_four_sections'
        ? {
            ...rule,
            id: 'descriptor_owned_sections',
            check: 'semantic_sections',
            required_sections: ['Descriptor-Owned Section'],
          }
        : rule),
    };

    const passing = evaluateWave1Contract(dir, descriptorDefinition);
    assert.equal(passing.failed_rule_ids.includes('descriptor_owned_sections'), false);

    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), '## Different Section\n\nPresent.\n');
    const failing = evaluateWave1Contract(dir, descriptorDefinition);
    assert.equal(failing.failed_rule_ids.includes('descriptor_owned_sections'), true);
    const finding = failing.findings.find((entry) => entry.rule_id === 'descriptor_owned_sections');
    assert.match(finding.missing_fact, /descriptor-owned section/i);
  });
});
