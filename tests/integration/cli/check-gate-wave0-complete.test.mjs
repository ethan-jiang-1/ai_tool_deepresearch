// gate-wave0-complete integration tests (RWG-001, RWG-004)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_w0_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave0.md'], { encoding: 'utf-8', timeout: 10000 });
}

/** Create a bundle with topic_registry and setup. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Setup status to wave0-ready
  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'wave0_complete';
  status.next_gate = 'wave1_complete';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Write topic_registry into rb_plan.md frontmatter
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": 2,\n  "topic_registry": [\n    { "id": "t1", "slug": "topic-a", "title": "Topic A" },\n    { "id": "t2", "slug": "topic-b", "title": "Topic B" }\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  return dir;
}

/** Write a valid ReferenceMetadata array YAML for a topic. */
const VALID_REF = `- url: "https://example.com/article-1"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
  notes: "Good overview"
`;
const VALID_REF_B = `- url: "https://example.com/article-2"
  title: "AI Alignment Basics"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-b"
`;
const SCHEMA_INVALID_REF = `- url: ""
  title: "Missing URL"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
`;

/** Set up happy-path wave0 artifacts (post-redesign: flat reference + artifacts/wave0). */
function setupHappyPath(dir) {
  // Flat reference directory
  writeFileSync(join(dir, 'reference/_INDEX.md'),
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    '| 00-shared-ai-safety.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
  writeFileSync(join(dir, 'reference/README.md'), '# Reference Evidence\nFlat reference directory.\n');
  writeFileSync(join(dir, 'reference/00-shared-ai-safety.md'),
    '- source_url: https://example.com/research/ai-safety\n- acceptance_status: accepted\n' +
    '- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n- trust_level: practitioner\n' +
    '- why_it_matters: Foundational overview of AI safety research.\n- accessed_at: 2026-06-15\n- related_topic: all\n' +
    '\n## Key Facts\n- Fact 1: AI safety research focuses on alignment and robustness.\n- Fact 2: Major labs have dedicated safety teams.\n- Fact 3: Adversarial attacks remain a key concern.\n- Fact 4: Regulatory frameworks are emerging globally.\n- Fact 5: Open-source models present unique challenges.\n' +
    '\n## Core Content Capture\nComprehensive overview of the AI safety landscape covering alignment research, robustness against adversarial attacks, and the emerging regulatory frameworks that are shaping the field globally.\n' +
    '\n## Relevance To This Research\nFoundational context for understanding AI governance landscape.\n' +
    '\n## Quotable Terms / Concepts\n- AI alignment\n- Adversarial robustness\n' +
    '\n## Risks And Limitations\n- Field is rapidly evolving; conclusions may date quickly.\n');

  // Thin YAML in artifacts/wave0/ per topic
  mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-a'), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-b'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), VALID_REF);
  writeFileSync(join(dir, 'artifacts/wave0/topic-b/source.yaml'), VALID_REF_B);

  // trace event
  writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave0_completion', ts: new Date().toISOString() }) + '\n');
  // output declaration ledger (content_dedup gate reads from this)
  writeFileSync(join(dir, 'rb_output_declarations.jsonl'), JSON.stringify({
    declared_at: new Date().toISOString(),
    work_id: 'wave0-source-topic-a',
    producer_rule: 'source_intake_fan_in',
    slot_result_ref: '_subagents/wave_01/slot_00/result.json',
    runtime_receipt_ref: '_subagents/wave_01/slot_00/runtime-receipt.jsonl',
    output_files: [
      { path: 'reference/00-shared-ai-safety.md', role: 'reference', source_url: 'https://example.com/research/ai-safety' },
    ],
    cache_trails: [],
  }) + '\n');
}

describe('check-gate-wave0-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: all rules pass', () => {
    const dir = createBundle(unique('happy'));
    setupHappyPath(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('2. fails when reference/_INDEX.md is missing', () => {
    const dir = createBundle(unique('noindex'));
    setupHappyPath(dir);
    rmSync(join(dir, 'reference/_INDEX.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('reference/_INDEX.md')), `Expected missing index fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when per-topic source.yaml is missing', () => {
    const dir = createBundle(unique('nosource'));
    setupHappyPath(dir);
    rmSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('topic-a')), `Expected missing topic-a fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails on schema violation (empty url)', () => {
    const dir = createBundle(unique('schema'));
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), SCHEMA_INVALID_REF);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Schema') || m.includes('schema') || m.includes('url')), `Expected schema fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when count_floor is below threshold (empty YAML array)', () => {
    const dir = createBundle(unique('floor'));
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), '[]');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Count floor') || m.includes('count')), `Expected count floor fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when count_floor passes but schema_valid fails (AND interaction)', () => {
    const dir = createBundle(unique('and'));
    setupHappyPath(dir);
    // Mix: one valid entry + one invalid entry (empty url) = count_floor passes (2 entries) but schema_valid fails
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), `- url: "https://example.com/ok"
  title: "OK"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
- url: ""
  title: "Bad"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
`);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected fail (count_floor pass but schema_valid fail): ${JSON.stringify(output.inspect)}`);
    const hasCountFloorPass = output.inspect.every(m => !m.includes('Count floor') && !m.includes('count_floor'));
    const hasSchemaFail = output.inspect.some(m => m.includes('Schema') || m.includes('schema') || m.includes('url'));
    assert.ok(hasSchemaFail, `Expected schema_valid fail in AND scenario: ${JSON.stringify(output.inspect)}`);
  });

  it('7. fails when topic_registry is empty', () => {
    const dir = createBundle(unique('emptyreg'));
    setupHappyPath(dir);
    // Empty the registry
    const planPath = join(dir, 'rb_plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const updated = content.replace(/"topic_registry": \[[\s\S]*?\]/, '"topic_registry": []');
    writeFileSync(planPath, updated);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected fail with empty registry: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some(m => m.includes('topic_registry') || m.includes('registry')), `Expected empty registry fail: ${JSON.stringify(output.inspect)}`);
  });

  it('8. fails on status drift (wrong next_gate)', () => {
    const dir = createBundle(unique('drift'));
    setupHappyPath(dir);
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'hitl2_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('8. rejects shared reference files with placeholder source_url (example.com)', () => {
    const dir = createBundle(unique('phshared'));
    mkdirSync(join(dir, 'artifacts/wave0/topic-a'), { recursive: true });
    mkdirSync(join(dir, 'artifacts/wave0/topic-b'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'),
      '- url: "https://arxiv.org/abs/2305.18654"\n  title: "Real reference"\n  retrieved_date: "2026-01-15"\n  topic_tag: "topic-a"\n');
    writeFileSync(join(dir, 'artifacts/wave0/topic-b/source.yaml'),
      '- url: "https://example.org/paper"\n  title: "Another real"\n  retrieved_date: "2026-01-15"\n  topic_tag: "topic-b"\n');
    writeFileSync(join(dir, 'reference/00-shared-placeholder-test.md'),
      '---\nsource_url: "https://example.com"\nacceptance_status: accepted\n' +
      'source_type: supplementary\ntier: tier_3\nevidence_role: supporting\n' +
      'trust_level: medium\nwhy_it_matters: "Count floor fulfillment"\n' +
      'accessed_at: "2026-06-27"\nrelated_topic: "shared"\n---\n' +
      '## Key Facts\n- Generic placeholder\n## Core Content Capture\nNo real content.\n' +
      '## Relevance To This Research\nMinimal.\n## Quotable Terms / Concepts\n- None.\n## Risks And Limitations\n- Placeholder.\n');
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave0_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected placeholder rejection, got pass. Inspect: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some(m => m.includes('placeholder') || m.includes('example.com')),
      `Expected inspect to mention placeholder/example.com, got: ${JSON.stringify(output.inspect)}`);
  });
});
