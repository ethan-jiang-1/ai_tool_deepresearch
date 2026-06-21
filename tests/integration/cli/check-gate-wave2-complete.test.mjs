// gate-wave2-complete integration tests (RWG-003, RWG-006, RWG-008)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `w2_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave2.md'], { encoding: 'utf-8', timeout: 10000 });
}

/** Create a bundle with wave2-ready status and pre-existing wave1 artifacts. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'wave2_complete';
  status.next_gate = 'hitl2_complete';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Create reference target files (Wave0 artifacts)
  mkdirSync(join(dir, 'reference', 'topic-a'), { recursive: true });
  writeFileSync(join(dir, 'reference/topic-a/source.yaml'), `- url: "https://example.com/ref"
  title: "Test Reference"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
`);

  // Create Wave1 skeleton target files
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave1/topic-a/skeleton.md'), '# Topic A Skeleton\n\ncapability: foundation-placeholder\n');

  // Create wave2 directory
  mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });

  return dir;
}

const SYNTHESIS_WITH_VALID_LINKS = `# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

Based on the [Topic A skeleton](../wave1/topic-a/skeleton.md), the key open question is how to measure alignment.

The [reference metadata](../../reference/topic-a/source.yaml) provides background on AI safety approaches.
`;

const SYNTHESIS_NO_LINKS = `# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

Based on the Topic A skeleton, the key open question is how to measure alignment. No explicit links here.
`;

const SYNTHESIS_DEAD_LINKS = `# Cross-Topic Synthesis

See [nonexistent file](../wave1/topic-a/nope.md) and also [another dead link](../wave1/topic-b/missing.md) for more information.
`;

const SYNTHESIS_MIXED_LINKS = `# Cross-Topic Synthesis

One valid: [Topic A skeleton](../wave1/topic-a/skeleton.md)
One dead: [missing file](../wave1/topic-a/nope.md)
`;

describe('check-gate-wave2-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: synthesis with valid Markdown links passes', () => {
    const dir = createBundle(unique('happy'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('2. fails when synthesis.md is missing', () => {
    const dir = createBundle(unique('nofile'));
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('synthesis.md')), `Expected missing file fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when synthesis is empty', () => {
    const dir = createBundle(unique('empty'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), '---\n---\n');
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('field_non_empty')), `Expected empty fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when synthesis has no Markdown links', () => {
    const dir = createBundle(unique('nolinks'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_NO_LINKS);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Markdown links') || m.includes('No Markdown')), `Expected no links fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when all link targets are missing', () => {
    const dir = createBundle(unique('dead'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_DEAD_LINKS);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('0 valid') || m.includes('No valid') || m.includes('valid artifact')), `Expected all dead links fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. passes when at least one link target is valid (mixed valid/dead links)', () => {
    const dir = createBundle(unique('mixed'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_MIXED_LINKS);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass with mixed links (1 valid, 1 dead), got: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.advice.some(m => m.includes('dead link') || m.includes('nope')), `Expected advice listing dead link: ${JSON.stringify(output.advice)}`);
  });

  it('7. fails on status drift', () => {
    const dir = createBundle(unique('drift'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave2_completion', ts: new Date().toISOString() }) + '\n');
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'wave1_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });
});
