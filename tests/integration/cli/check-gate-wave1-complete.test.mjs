// gate-wave1-complete integration tests (RWG-002, RWG-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `w1_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave1.md'], { encoding: 'utf-8', timeout: 10000 });
}

const VALID_SKELETON = `---
slug: topic-a
title: Topic A Skeleton
capability: foundation-placeholder
---

# Topic A: Foundation Skeleton

## Known Premises
- AI safety is an active research area.

## Key Dimensions
- Technical alignment
- Policy governance

## Open Questions
- How to measure alignment?
`;

const FALSE_CLAIM_SKELETON = `---
slug: topic-a
title: Topic A
capability: foundation-placeholder
---

# Topic A

full subagent coverage completed. All topics have been fully researched.
`;

const NO_MARKER_SKELETON = `---
slug: topic-a
title: Topic A
---

# Topic A

Some content without the required placeholder marker.
`;

/** Create a bundle with topic_registry and wave1-ready status. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  // Status to wave1
  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'wave1_complete';
  status.next_gate = 'wave2_complete';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // topic_registry
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": 1,\n  "topic_registry": [\n    { "id": "t1", "slug": "topic-a", "title": "Topic A" }\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  // Scaffold
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });

  return dir;
}

describe('check-gate-wave1-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: skeleton with placeholder marker passes', () => {
    const dir = createBundle(unique('happy'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/skeleton.md'), VALID_SKELETON);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave1_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('2. fails when per-topic skeleton is missing', () => {
    const dir = createBundle(unique('noskel'));
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave1_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('skeleton') || m.includes('Missing file')), `Expected missing skeleton fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when placeholder marker is missing', () => {
    const dir = createBundle(unique('nomarker'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/skeleton.md'), NO_MARKER_SKELETON);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave1_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('foundation-placeholder') || m.includes('pattern')), `Expected missing marker fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when false completion claim is present', () => {
    const dir = createBundle(unique('falseclaim'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/skeleton.md'), FALSE_CLAIM_SKELETON);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave1_completion', ts: new Date().toISOString() }) + '\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('full subagent') || m.includes('Forbidden pattern')), `Expected false claim fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails on status drift', () => {
    const dir = createBundle(unique('drift'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/skeleton.md'), VALID_SKELETON);
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({ event: 'wave1_completion', ts: new Date().toISOString() }) + '\n');
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.current_gate = 'wave0_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('current_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when wave1-completion trace event is missing', () => {
    const dir = createBundle(unique('notrace'));
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/skeleton.md'), VALID_SKELETON);
    // No trace event file
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('wave1_completion')), `Expected missing trace fail: ${JSON.stringify(output.inspect)}`);
  });
});
