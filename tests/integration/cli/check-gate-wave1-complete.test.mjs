// gate-wave1-complete integration tests (RWG-002, RWG-005, WAI-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_w1_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave1.md'], { encoding: 'utf-8', timeout: 10000 });
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
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
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

  // output declaration ledger (content_dedup + provenance gates read from this)
  writeFileSync(join(dir, 'rb_output_declarations.jsonl'), JSON.stringify({
    declared_at: new Date().toISOString(),
    work_id: 'wave1-deepening-topic-a',
    producer_rule: 'deepening_intake',
    slot_result_ref: '_subagents/wave_01/slot_00/result.json',
    runtime_receipt_ref: '_subagents/wave_01/slot_00/runtime-receipt.jsonl',
    output_files: [
      { path: 'reference/01-topic-a-deepening.md', role: 'reference', source_url: 'https://example.com/news/deepening-topic-a' },
      { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' },
      { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list' },
    ],
    cache_trails: [],
  }) + '\n');

  // Subagent slot artifacts for provenance gate (RPG-002)
  const slotDir = join(dir, '_subagents', 'wave_01', 'slot_00');
  mkdirSync(slotDir, { recursive: true });
  writeFileSync(join(slotDir, '_status.json'), JSON.stringify({ status: 'done', updated: new Date().toISOString() }));
  writeFileSync(join(slotDir, 'result.json'), JSON.stringify({
    slotKey: 'deepening',
    roleAgentKey: 'dpt-evidence-extractor',
    status: 'done',
    summary: 'Test slot result',
    evidenceCount: 1,
    references: [],
    confidence: 0.8,
    notes: [],
    output_files: [
      { path: 'reference/01-topic-a-deepening.md', role: 'reference', source_url: 'https://example.com/news/deepening-topic-a' },
      { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' },
      { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list' },
    ],
    cache_trails: [],
  }));

  return dir;
}

describe('check-gate-wave1-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: evidence-summary with source URL + key findings passes', () => {
    const dir = createBundle(unique('happy'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('2. fails when per-topic evidence-summary is missing', () => {
    const dir = createBundle(unique('nomd'));
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    writeWave1Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('evidence-summary') || m.includes('Missing file')), `Expected missing evidence-summary fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when source URL is missing from evidence-summary', () => {
    const dir = createBundle(unique('nosource'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), NO_SOURCE_URL_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
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
    writeWave1Trace(dir);
    // Write a second reference with placeholder source_url — the first one has a real URL
    writeFileSync(join(dir, 'reference/topic-a-placeholder.md'),
      '# Placeholder\n\n' +
      '- source_url: https://example.com\n' +
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
    assert.ok(output.inspect.some(m => m.includes('not declared')), `Expected orphan fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. rejects YAML frontmatter reference files', () => {
    const dir = createBundle(unique('yamlref'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), VALID_EVIDENCE_SUMMARY);
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), VALID_QUESTION_LIST);
    writeFileSync(join(dir, 'seed_topics/topic-a.md'), VALID_SEED_TOPIC);
    writeWave1Trace(dir);
    writeFileSync(join(dir, 'reference/01-topic-a-deepening.md'),
      '---\nsource_url: https://example.com/news/deepening-topic-a\n---\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML frontmatter')), `Expected YAML format fail: ${JSON.stringify(output.inspect)}`);
  });
});
