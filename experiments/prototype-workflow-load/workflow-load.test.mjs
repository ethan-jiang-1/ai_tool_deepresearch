// workflow-load.test.mjs — 单元测试
// 使用 node:test + node:assert
// @impl WML-001, WDM-001, WMD-001, WLO-001

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import {
  WorkflowManifest,
  SegmentFrontmatter,
  WorkflowState,
  loadWorkflowManifest,
  createWorkflowRuntime,
  segmentPath,
  parseFrontmatter,
  readMarkdownFile,
  resolveDependencyClosure,
  createInitialState,
  executeMarkdownFile,
  executeLoadPlan,
  advanceWorkflow,
} from './workflow-load.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '.test-tmp');

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

before(() => {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.1 Manifest Loading (WML-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.1 Manifest Loading', () => {
  it('loads manifest with ordered steps', () => {
    const manifestPath = join(TMP_DIR, 'valid-manifest.json');
    writeJson(manifestPath, {
      name: 'test-workflow',
      steps: ['wave-entry.md', 'audit.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    assert.equal(manifest.name, 'test-workflow');
    assert.deepStrictEqual(manifest.steps, ['wave-entry.md', 'audit.md']);
  });

  it('rejects manifest with missing steps', () => {
    const manifestPath = join(TMP_DIR, 'no-steps.json');
    writeJson(manifestPath, { name: 'bad' });

    assert.throws(() => loadWorkflowManifest(manifestPath));
  });

  it('rejects manifest with empty steps array', () => {
    const manifestPath = join(TMP_DIR, 'empty-steps.json');
    writeJson(manifestPath, { name: 'bad', steps: [] });

    assert.throws(() => loadWorkflowManifest(manifestPath));
  });

  it('rejects manifest with non-string steps', () => {
    const manifestPath = join(TMP_DIR, 'non-string-steps.json');
    writeJson(manifestPath, { name: 'bad', steps: [1, 2, 3] });

    assert.throws(() => loadWorkflowManifest(manifestPath));
  });

  it('creates runtime with empty content cache', () => {
    const manifestPath = join(TMP_DIR, 'empty-cache-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['wave-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);

    assert.equal(runtime.cursor, 0);
    assert.equal(runtime.contentCache.size, 0);
    assert.deepStrictEqual(runtime.executionLog, []);
    assert.deepStrictEqual(runtime.receipts, []);
  });

  it('cursor points to first step', () => {
    const manifestPath = join(TMP_DIR, 'cursor-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['wave-entry.md', 'audit.md', 'next-wave.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);

    assert.equal(runtime.cursor, 0);
    assert.equal(runtime.manifest.steps[runtime.cursor], 'wave-entry.md');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.2 Step-by-Step Dynamic Load (WDM-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.2 Step-by-Step Dynamic Load', () => {
  it('first advance loads only first step', () => {
    const manifestPath = join(TMP_DIR, 'step-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['wave-entry.md', 'audit.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'advanced');
    assert.equal(runtime.cursor, 1);
    assert.ok(result.state.executionOrder.includes('wave-entry.md'));
    // audit.md should NOT be loaded
    assert.ok(!result.state.executionOrder.includes('audit.md'));
    // content cache should have wave-entry but not audit
    assert.ok(runtime.contentCache.has('wave-entry.md'));
    assert.ok(!runtime.contentCache.has('audit.md'));
  });

  it('second advance loads second step', () => {
    const manifestPath = join(TMP_DIR, 'step2-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['wave-entry.md', 'audit.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    let state = createInitialState();

    // First advance
    const r1 = advanceWorkflow(state, runtime);
    assert.equal(r1.status, 'advanced');
    state = r1.state;

    // Second advance
    const r2 = advanceWorkflow(state, runtime);
    assert.equal(r2.status, 'advanced');
    assert.equal(runtime.cursor, 2);
    assert.ok(r2.state.executionOrder.includes('audit.md'));
    assert.ok(runtime.contentCache.has('audit.md'));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.3 Dependency-First Chain (WMD-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.3 Dependency-First Chain', () => {
  it('executes dependencies before requester', () => {
    const manifestPath = join(TMP_DIR, 'chain-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['chain-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'advanced');

    // Expected order: policy (deepest dep), context, entry
    const order = result.state.executionOrder;
    const policyIdx = order.indexOf('chain-policy.md');
    const contextIdx = order.indexOf('chain-context.md');
    const entryIdx = order.indexOf('chain-entry.md');

    assert.ok(policyIdx >= 0, 'chain-policy.md should be in execution order');
    assert.ok(contextIdx >= 0, 'chain-context.md should be in execution order');
    assert.ok(entryIdx >= 0, 'chain-entry.md should be in execution order');
    assert.ok(policyIdx < contextIdx, 'policy should execute before context');
    assert.ok(contextIdx < entryIdx, 'context should execute before entry');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.4 Diamond Dependency (WMD-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.4 Diamond Dependency', () => {
  it('shared dependency executes only once', () => {
    const manifestPath = join(TMP_DIR, 'diamond-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['diamond-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'advanced');

    // shared should appear exactly once in plan
    const plan = result.plan;
    const sharedCount = plan.filter(f => f === 'diamond-shared.md').length;
    assert.equal(sharedCount, 1, 'shared dependency should appear once in plan');

    // shared should execute exactly once
    const sharedExecs = result.state.executionOrder.filter(f => f === 'diamond-shared.md');
    assert.equal(sharedExecs.length, 1, 'shared dependency should execute once');
    assert.equal(result.state.counters.diamondShared, 1);
  });

  it('plan order is dependency-first', () => {
    const manifestPath = join(TMP_DIR, 'diamond2-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['diamond-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);
    const plan = result.plan;

    // shared must come before a and b
    const sharedIdx = plan.indexOf('diamond-shared.md');
    const aIdx = plan.indexOf('diamond-a.md');
    const bIdx = plan.indexOf('diamond-b.md');
    const entryIdx = plan.indexOf('diamond-entry.md');

    assert.ok(sharedIdx < aIdx, 'shared should be before a');
    assert.ok(sharedIdx < bIdx, 'shared should be before b');
    assert.ok(aIdx < entryIdx, 'a should be before entry');
    assert.ok(bIdx < entryIdx, 'b should be before entry');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.5 Cache Visibility (WDM-001, WLO-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.5 Cache Visibility', () => {
  it('second reference records cache_hit but still executes', () => {
    const manifestPath = join(TMP_DIR, 'cache-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['repeat-step1.md', 'repeat-step2.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    let state = createInitialState();

    // First advance: repeat-step1 requires shared-lib
    const r1 = advanceWorkflow(state, runtime);
    assert.equal(r1.status, 'advanced');
    state = r1.state;

    // Check first advance receipts
    const fileReads1 = runtime.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.md');
    assert.equal(fileReads1.length, 1, 'shared-lib should have file_read in first advance');

    // Second advance: repeat-step2 also requires shared-lib
    const r2 = advanceWorkflow(state, runtime);
    assert.equal(r2.status, 'advanced');
    state = r2.state;

    // Check cache hit in second advance
    const cacheHits = runtime.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.md');
    assert.ok(cacheHits.length >= 1, 'shared-lib should have cache_hit in second advance');

    // Check file_executed in both advances
    const fileExecs = runtime.receipts.filter(r => r.type === 'file_executed' && r.fileRef === 'shared-lib.md');
    assert.equal(fileExecs.length, 2, 'shared-lib should be executed twice total');
    assert.equal(r2.state.counters.sharedLib, 2, 'shared-lib counter should be 2');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.6 Missing Dependency (WMD-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.6 Missing Dependency', () => {
  it('fails with missing file and requester info', () => {
    const manifestPath = join(TMP_DIR, 'missing-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['missing-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error, 'should have error message');
    // missing-entry.md requires nonexistent-file.md
    assert.ok(
      result.error.includes('nonexistent-file.md') || result.error.includes('File not found'),
      `error should mention the missing file, got: ${result.error}`
    );
    assert.equal(runtime.cursor, 0, 'cursor should not advance');
  });

  it('does not execute any file on missing dependency', () => {
    const manifestPath = join(TMP_DIR, 'missing2-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['missing-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'error');
    // No file_executed receipts
    const fileExecs = runtime.receipts.filter(r => r.type === 'file_executed');
    assert.equal(fileExecs.length, 0, 'no files should execute on missing dependency');
    // Execution log should be empty
    assert.equal(runtime.executionLog.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.7 Cycle Dependency (WMD-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.7 Cycle Dependency', () => {
  it('detects cycle and includes path', () => {
    const manifestPath = join(TMP_DIR, 'cycle-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['cycle-a.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('cycle'), `error should mention cycle, got: ${result.error}`);
    assert.ok(result.error.includes('cycle-a.md'), `error should include cycle-a.md, got: ${result.error}`);
    assert.ok(result.error.includes('cycle-b.md'), `error should include cycle-b.md, got: ${result.error}`);
    assert.equal(runtime.cursor, 0, 'cursor should not advance');
  });

  it('does not execute any file on cycle', () => {
    const manifestPath = join(TMP_DIR, 'cycle2-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['cycle-a.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'error');
    const fileExecs = runtime.receipts.filter(r => r.type === 'file_executed');
    assert.equal(fileExecs.length, 0, 'no files should execute on cycle');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.8 Complete (WDM-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.8 Complete', () => {
  it('returns complete after all steps advanced', () => {
    const manifestPath = join(TMP_DIR, 'complete-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['wave-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    let state = createInitialState();

    // Advance past the only step
    const r1 = advanceWorkflow(state, runtime);
    assert.equal(r1.status, 'advanced');
    state = r1.state;

    // Now cursor is at end
    const receiptCount = runtime.receipts.length;
    const r2 = advanceWorkflow(state, runtime);

    assert.equal(r2.status, 'complete');
    // No new receipts added beyond what was already there
    assert.equal(runtime.receipts.length, receiptCount,
      'complete should not add new receipts');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7.9 Observability (WLO-001)
// ═══════════════════════════════════════════════════════════════════════

describe('7.9 Observability', () => {
  it('successful advance produces expected receipts', () => {
    const manifestPath = join(TMP_DIR, 'obs-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['wave-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);
    assert.equal(result.status, 'advanced');

    const receiptTypes = runtime.receipts.map(r => r.type);
    assert.ok(receiptTypes.includes('advance_start'), 'should have advance_start');
    assert.ok(receiptTypes.includes('file_read'), 'should have file_read');
    assert.ok(receiptTypes.includes('dependency_resolved'), 'should have dependency_resolved');
    assert.ok(receiptTypes.includes('file_executed'), 'should have file_executed');
    assert.ok(receiptTypes.includes('advance_complete'), 'should have advance_complete');
  });

  it('load error produces expected receipts', () => {
    const manifestPath = join(TMP_DIR, 'obs-err-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['missing-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);
    assert.equal(result.status, 'error');

    const receiptTypes = runtime.receipts.map(r => r.type);
    assert.ok(receiptTypes.includes('advance_start'), 'should have advance_start');
    assert.ok(receiptTypes.includes('load_error'), 'should have load_error');
  });

  it('malformed JSON frontmatter produces error', () => {
    const manifestPath = join(TMP_DIR, 'obs-malformed-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['malformed-entry.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('Malformed JSON') || result.error.includes('JSON'),
      `error should mention JSON parse failure, got: ${result.error}`);
    assert.equal(runtime.cursor, 0, 'cursor should not advance');
    const fileExecs = runtime.receipts.filter(r => r.type === 'file_executed');
    assert.equal(fileExecs.length, 0, 'no files should execute on malformed frontmatter');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Additional: noop and frontmatter parsing
// ═══════════════════════════════════════════════════════════════════════

describe('Frontmatter Parsing', () => {
  it('parses valid JSON frontmatter', () => {
    const md = '---\n{ "requires": ["a.md"] }\n---\n\n# Title';
    const fm = parseFrontmatter(md);
    assert.deepStrictEqual(fm.requires, ['a.md']);
  });

  it('returns empty requires for no frontmatter', () => {
    const md = '# Just a title\n\nSome content.';
    const fm = parseFrontmatter(md);
    assert.deepStrictEqual(fm.requires, []);
  });

  it('returns empty requires for frontmatter without requires key', () => {
    const md = '---\n{ "other": "value" }\n---\n\n# Title';
    const fm = parseFrontmatter(md);
    assert.deepStrictEqual(fm.requires, []);
  });

  it('throws on malformed JSON', () => {
    const md = '---\n{ bad json!!! }\n---\n\n# Title';
    assert.throws(() => parseFrontmatter(md), /Malformed JSON/);
  });
});

describe('No-Code-Block Execution', () => {
  it('noop file produces no_code_block receipt', () => {
    const manifestPath = join(TMP_DIR, 'noop-manifest.json');
    writeJson(manifestPath, {
      name: 'test',
      steps: ['noop.md'],
    });

    const manifest = loadWorkflowManifest(manifestPath);
    const runtime = createWorkflowRuntime(manifest);
    const state = createInitialState();

    const result = advanceWorkflow(state, runtime);
    assert.equal(result.status, 'advanced');

    const noCodeBlocks = runtime.receipts.filter(r => r.type === 'no_code_block' && r.fileRef === 'noop.md');
    assert.equal(noCodeBlocks.length, 1, 'should have no_code_block receipt');
  });
});

describe('segmentPath', () => {
  it('rejects path traversal', () => {
    assert.throws(() => segmentPath('../outside.md'), /Invalid fileRef/);
  });

  it('rejects absolute path', () => {
    assert.throws(() => segmentPath('/etc/passwd'), /Invalid fileRef/);
  });
});
