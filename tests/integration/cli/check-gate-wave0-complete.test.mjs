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

/** Set up happy-path wave0 artifacts. */
function setupHappyPath(dir) {
  mkdirSync(join(dir, 'reference', 'topic-a'), { recursive: true });
  mkdirSync(join(dir, 'reference', 'topic-b'), { recursive: true });
  writeFileSync(join(dir, 'reference/index.md'), '# Reference Index\n\n- topic-a: 1 ref\n- topic-b: 1 ref\n');
  writeFileSync(join(dir, 'reference/topic-a/source.yaml'), VALID_REF);
  writeFileSync(join(dir, 'reference/topic-b/source.yaml'), VALID_REF_B);
  // trace event
  writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave0_completion', ts: new Date().toISOString() }) + '\n');
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

  it('2. fails when reference/index.md is missing', () => {
    const dir = createBundle(unique('noindex'));
    setupHappyPath(dir);
    rmSync(join(dir, 'reference/index.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('reference/index.md')), `Expected missing index fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when per-topic source.yaml is missing', () => {
    const dir = createBundle(unique('nosource'));
    setupHappyPath(dir);
    rmSync(join(dir, 'reference/topic-a/source.yaml'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('topic-a')), `Expected missing topic-a fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails on schema violation (empty url)', () => {
    const dir = createBundle(unique('schema'));
    setupHappyPath(dir);
    writeFileSync(join(dir, 'reference/topic-a/source.yaml'), SCHEMA_INVALID_REF);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Schema') || m.includes('schema') || m.includes('url')), `Expected schema fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when count_floor is below threshold (empty YAML array)', () => {
    const dir = createBundle(unique('floor'));
    setupHappyPath(dir);
    writeFileSync(join(dir, 'reference/topic-a/source.yaml'), '[]');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Count floor') || m.includes('count')), `Expected count floor fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when count_floor passes but schema_valid fails (AND interaction)', () => {
    const dir = createBundle(unique('and'));
    setupHappyPath(dir);
    // Mix: one valid entry + one invalid entry (empty url) = count_floor passes (2 entries) but schema_valid fails
    writeFileSync(join(dir, 'reference/topic-a/source.yaml'), `- url: "https://example.com/ok"
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
});
