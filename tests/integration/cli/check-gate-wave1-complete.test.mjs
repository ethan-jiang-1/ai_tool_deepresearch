// gate-wave1-complete integration tests (RWG-002, RWG-005, WAI-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';
import {
  claimAndSubmitWorkUnit,
} from '../../engine/work-unit-test-helpers.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs');
const INSPECT_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/inspect-wave1-output.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

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

function writeWave1Trace(dir, { completion = true } = {}) {
  const events = witnessedHandoffEvents({
    sourceGate: 'wave0-complete',
    phase: 'wave0',
    sourceNode: 'phases/phase-wave0.md',
    targetNode: 'phases/phase-wave1.md',
  });
  if (completion) events.push({ event: 'wave1_completion', ts: new Date().toISOString() });
  writeTraceEvents(dir, events);
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
id: t1
slug: topic-a
title: Topic A
---

# Topic A

## 本轮新增机制理解
1. AI alignment shows promising results in scalable oversight.

## 本轮新增趋势与难点
- Trend: Increased regulatory attention. 难点: Measuring alignment.

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
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": 1,\n  "topic_registry": [\n    { "id": "t1", "slug": "topic-a", "title": "Topic A" }\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  // Scaffold
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 1
  counterexample_search: false
  cross_verification: false
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
    '- related_topic: topic-a\n\n' +
    '## Key Facts\n- Finding one: Important initial finding.\n- Finding two: Second key insight.\n- Finding three: Third data point.\n- Finding four: Fourth observation.\n- Finding five: Fifth concluding fact.\n\n## Core Content Capture\nThis is a substantive core content capture section that provides meaningful analysis of the topic being researched. It exceeds one hundred characters to satisfy the minimum quality threshold for reference counting.\n' +
    '## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- Term.\n## Risks And Limitations\n- None.\n');
  writeFileSync(join(dir, 'reference', '_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| reference/01-topic-a-deepening.md | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-06-15 |',
  ].join('\n') + '\n');

  return dir;
}

function submitWave1WorkUnit(dir, {
  queueItemId = 'topic-a',
  sourceUrl = 'https://example.com/news/deepening-topic-a',
  isNewVsWave0 = true,
  cacheTrail = `_cache/wave1/primary/${queueItemId}/deepening-topic-a`,
  evidenceRole = 'evidence_summary',
  questionRole = 'question_list',
  includeEvidenceOutput = true,
  includeQuestionOutput = true,
} = {}) {
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
  sourceUrl = 'https://example.com/news/deepening-topic-a',
  isNewVsWave0 = true,
  wave0Urls = ['https://example.com/news/wave0-foundation'],
  decision = 'accept',
  supplementary = [],
  cacheTrail = '_cache/wave1/primary/topic-a/deepening-topic-a',
  reviewedRefs = null,
} = {}) {
  const observed = isNewVsWave0 && !wave0Urls.includes(sourceUrl) ? 1 : 0;
  writeFileSync(join(dir, 'artifacts/wave1/topic-a/depth-review.yaml'), `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug: 'topic-a',
    reviewed_work_unit_refs: reviewedRefs || [submission.record.paths.work_unit_dir],
    wave0_source_urls: wave0Urls,
    source_claims: [{
      url: sourceUrl,
      source_ref: 'reference/01-topic-a-deepening.md',
      acceptance_status: 'accepted',
      is_new_vs_wave0: isNewVsWave0,
      cache_trail_refs: [cacheTrail],
    }],
    new_source_urls: observed > 0 ? [sourceUrl] : [],
    new_source_floor: {
      required: 1,
      observed,
      source: 'ceil(wave1_per_topic_ref_floor * topic_unique_ratio)',
    },
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
  return submission;
}

describe('check-gate-wave1-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

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
  });

  it('1a. aggregates historical Wave1 artifact/reference coverage while checking only the current seed', () => {
    const dir = createBundle(unique('historical-layout'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const planPath = join(dir, 'rb_plan.md');
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace(
      '{ "id": "t1", "slug": "topic-a", "title": "Topic A" }',
      '{ "id": "t1", "slug": "topic-a-new", "title": "Topic A", "previous_layouts": [{ "id": "t1", "slug": "topic-a" }] }',
    ));
    writeFileSync(join(dir, 'seed_topics/topic-a-new.md'), VALID_SEED_TOPIC.replaceAll('topic-a', 'topic-a-new'));
    const output = JSON.parse(runGate(dir).stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));
    assert.equal(output.check.failed_rule_ids.some((id) => id.endsWith(':topic-a-new')), false);
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
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), `# Questions\n\n### topic investigation targets\nTargets.\n\n## QUESTION RECONCILIATION\nReconciled.\n\n#### Emergent Question Protocol\nChecked.\n\n## Exploration/Exploitation Decision\ncontinue\n`);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    const output = JSON.parse(runGate(dir).stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));
  });

  it('1e. fewer Key Facts does not revive the retired quantity blocker', () => {
    const dir = createBundle(unique('degraded'));
    const referencePath = join(dir, 'reference/01-topic-a-deepening.md');
    writeFileSync(referencePath, readFileSync(referencePath, 'utf8').replace(/- Finding five: Fifth concluding fact\.\n/, ''));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);

    const inspectOutput = JSON.parse(runInspect(dir).stdout);
    assert.equal(inspectOutput.check.passed, false);
    assert.equal(Object.hasOwn(inspectOutput, 'routing'), false);
    assert.notEqual(inspectOutput.check.degraded, true);
    assert.equal(inspectOutput.check.failed_rule_ids.some((id) => id.startsWith('key_facts_min_lines')), false);

    const gateOutput = JSON.parse(runGate(dir, { attempt: 3 }).stdout);
    assert.equal(gateOutput.check.passed, true, gateOutput.inspect.join('\n'));
    assert.equal(gateOutput.check.degraded, true);
    assert.deepEqual(gateOutput.check.degraded_rules, ['per_topic_ref_md_count_floor']);
    assert.equal(gateOutput.check.failed_rule_ids.some((id) => id.startsWith('key_facts_min_lines')), false);
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
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), STALE_TOKEN_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
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
      '- related_topic: topic-a\n\n' +
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
      '- related_topic: topic-a\n\n' +
      '## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nContent.\n' +
      '## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- Term.\n## Risks And Limitations\n- None.\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('projection_backing_drift') || m.includes('submitted backing')), `Expected orphan/backing fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. rejects YAML frontmatter reference files', () => {
    const dir = createBundle(unique('yamlref'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    submitAndReviewWave1WorkUnit(dir);
    writeWave1Trace(dir);
    writeFileSync(join(dir, 'reference/01-topic-a-deepening.md'),
      '---\nsource_url: https://example.com/news/deepening-topic-a\n---\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML frontmatter')), `Expected YAML format fail: ${JSON.stringify(output.inspect)}`);
  });

  it('11. fails when depth-review.yaml is missing', () => {
    const dir = createBundle(unique('missingreview'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    const submission = submitWave1WorkUnit(dir);
    assert.equal(submission.submitted.ok, true);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('depth-review.yaml')), `Expected missing depth review fail: ${JSON.stringify(output.inspect)}`);
    assert.equal(output.inspect.some((line) => /source_novelty_floor|source_claim_cache_mapping|profile check/.test(line)), false);
    assert.ok(output.check.masked_rule_ids.some((id) => id.includes('source_novelty_floor')));
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
