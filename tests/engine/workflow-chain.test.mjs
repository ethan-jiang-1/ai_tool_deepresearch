// workflow-chain.test.mjs — Chain-load Markdown workflow engine tests
// @impl WML-001, WDM-001, WMD-001, WLO-001
// Canonical test location: tests/engine/workflow-chain.test.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// NODES_DIR must be set before the engine module loads — it's evaluated at import time.
process.env.NODES_DIR = join(__dirname, '../../experiments/prototype-workflow-chain/nodes-workflow-chain');

const {
  NodeFrontmatter,
  WorkflowState,
  createWorkflowRuntime,
  nodePath,
  parseFrontmatter,
  readMarkdownFile,
  resolveDependencyClosure,
  createState,
  loadMarkdownFile,
  executeLoadPlan,
  assessNode,
} = await import('../../DPT_FRAMEWORK/engine/workflow-chain.mjs');

const TMP_DIR = join(__dirname, '.test-tmp');

before(() => {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('runtime initialization (WML-001)', () => {
  it('creates an empty chain-load runtime', () => {
    const runtime = createWorkflowRuntime();

    assert.ok(runtime.contentCache instanceof Map);
    assert.equal(runtime.contentCache.size, 0);
    assert.deepStrictEqual(runtime.executionLog, []);
    assert.deepStrictEqual(runtime.receipts, []);
    assert.equal('manifest' in runtime, false);
    assert.equal('cursor' in runtime, false);
  });
});

describe('single-entry dynamic load (WDM-001)', () => {
  it('loads and executes a self-contained entry only when requested', () => {
    const runtime = createWorkflowRuntime();
    const state = createState();

    assert.equal(runtime.contentCache.size, 0);

    const result = assessNode('wave.entry.md', state, runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, ['wave.entry.md']);
    assert.ok(result.state.executionOrder.includes('wave.entry.md'));
    assert.equal(result.state.counters['wave.entry.md'], 1);
    assert.ok(runtime.contentCache.has('wave.entry.md'));
    assert.equal(runtime.contentCache.has('audit.md'), false);
  });

  it('can load multiple chosen entries without cursor semantics', () => {
    const runtime = createWorkflowRuntime();
    let state = createState();

    const first = assessNode('wave.entry.md', state, runtime);
    assert.equal(first.status, 'loaded');
    state = first.state;

    const second = assessNode('audit.md', state, runtime);
    assert.equal(second.status, 'loaded');

    assert.deepStrictEqual(second.state.executionOrder, ['wave.entry.md', 'audit.md']);
    assert.equal('cursor' in runtime, false);
  });
});

describe('dependency closure (WMD-001)', () => {
  it('executes chain dependencies before the entry', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('chain.entry.md', createState(), runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, ['chain-policy.dep.md', 'chain-context.dep.md', 'chain.entry.md']);
    assert.deepStrictEqual(result.state.executionOrder, [
      'chain-policy.dep.md',
      'chain-context.dep.md',
      'chain.entry.md',
    ]);
  });

  it('deduplicates diamond dependencies once per load graph', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('diamond.entry.md', createState(), runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, [
      'diamond-shared.dep.md',
      'diamond-a.dep.md',
      'diamond-b.dep.md',
      'diamond.entry.md',
    ]);
    assert.equal(result.plan.filter((f) => f === 'diamond-shared.dep.md').length, 1);
    assert.equal(result.state.counters['diamond-shared.dep.md'], 1);
  });

  it('preserves requires declaration order for same-level dependencies', () => {
    const runtime = createWorkflowRuntime();
    const plan = resolveDependencyClosure('diamond.entry.md', runtime);

    const aIdx = plan.indexOf('diamond-a.dep.md');
    const bIdx = plan.indexOf('diamond-b.dep.md');
    const entryIdx = plan.indexOf('diamond.entry.md');

    assert.ok(aIdx < bIdx, 'diamond-a follows declaration order before diamond-b');
    assert.ok(bIdx < entryIdx, 'both branches execute before entry');
  });
});

describe('content cache vs execution (WDM-001, WLO-001)', () => {
  it('cache hits reused content but does not cache execution', () => {
    const runtime = createWorkflowRuntime();
    let state = createState();

    const first = assessNode('repeat-1.entry.md', state, runtime);
    assert.equal(first.status, 'loaded');
    state = first.state;

    const firstReads = runtime.receipts.filter(
      (r) => r.type === 'file_read' && r.fileRef === 'shared-lib.dep.md',
    );
    assert.equal(firstReads.length, 1);

    const second = assessNode('repeat-2.entry.md', state, runtime);
    assert.equal(second.status, 'loaded');

    const cacheHits = runtime.receipts.filter(
      (r) => r.type === 'cache_hit' && r.fileRef === 'shared-lib.dep.md',
    );
    const executions = runtime.receipts.filter(
      (r) => r.type === 'file_loaded' && r.fileRef === 'shared-lib.dep.md',
    );

    assert.ok(cacheHits.length >= 1);
    assert.equal(executions.length, 2);
    assert.equal(second.state.counters['shared-lib.dep.md'], 2);
  });
});

describe('error handling (WMD-001, WLO-001)', () => {
  it('missing dependency returns error and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const state = createState();
    const result = assessNode('missing.entry.md', state, runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('nonexistent-file.md'));
    assert.ok(result.error.includes('missing.entry.md'));
    assert.deepStrictEqual(result.state, state);
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
    assert.equal(runtime.executionLog.length, 0);
  });

  it('cycle dependency returns error with cycle path and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('cycle-a.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('cycle-a.entry.md'));
    assert.ok(result.error.includes('cycle-b.dep.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
  });

  it('malformed frontmatter returns error and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('malformed.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('Malformed JSON'));
    assert.ok(result.error.includes('malformed.entry.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
  });

  it('schema-invalid frontmatter returns error and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('bad-schema.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('Invalid frontmatter schema'));
    assert.ok(result.error.includes('bad-schema.entry.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
  });

  it('a later valid load can succeed after an error on the same runtime', () => {
    const runtime = createWorkflowRuntime();
    const failed = assessNode('missing.entry.md', createState(), runtime);
    assert.equal(failed.status, 'error');

    const recovered = assessNode('wave.entry.md', createState(), runtime);
    assert.equal(recovered.status, 'loaded');
    assert.deepStrictEqual(recovered.plan, ['wave.entry.md']);
    assert.equal(recovered.state.counters['wave.entry.md'], 1);
  });
});

describe('observability receipts (WLO-001)', () => {
  it('successful load records major loader phases', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('wave.entry.md', createState(), runtime);

    assert.equal(result.status, 'loaded');
    const receiptTypes = runtime.receipts.map((r) => r.type);
    assert.ok(receiptTypes.includes('load_start'));
    assert.ok(receiptTypes.includes('file_read'));
    assert.ok(receiptTypes.includes('dependency_resolved'));
    assert.ok(receiptTypes.includes('file_loaded'));
    assert.ok(receiptTypes.includes('load_complete'));
  });

  it('failed load records load_error', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('missing.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    const loadErrors = runtime.receipts.filter((r) => r.type === 'load_error');
    assert.equal(loadErrors.length, 1);
    assert.equal(loadErrors[0].entry, 'missing.entry.md');
  });
});

describe('frontmatter parsing', () => {
  it('parses valid JSON frontmatter', () => {
    const md = '---\n{ "requires": ["a.md"] }\n---\n\n# Title';
    assert.deepStrictEqual(parseFrontmatter(md).requires, ['a.md']);
  });

  it('returns empty requires for no frontmatter', () => {
    assert.deepStrictEqual(parseFrontmatter('# Title').requires, []);
  });

  it('returns empty requires for frontmatter without requires', () => {
    const md = '---\n{ "other": "value" }\n---\n\n# Title';
    assert.deepStrictEqual(parseFrontmatter(md).requires, []);
  });

  it('throws on malformed JSON', () => {
    assert.throws(() => parseFrontmatter('---\n{ bad json }\n---\n'), /Malformed JSON/);
  });

  it('throws on valid JSON with wrong schema (requires not array)', () => {
    const md = '---\n{ "requires": "not-an-array" }\n---\n\n# Title';
    assert.throws(() => parseFrontmatter(md), /Invalid frontmatter schema/);
  });

  it('throws on valid JSON with empty requires string', () => {
    const md = '---\n{ "requires": [""] }\n---\n\n# Title';
    assert.throws(() => parseFrontmatter(md), /Invalid frontmatter schema/);
  });

  it('exports schemas used by implementation checks', () => {
    assert.deepStrictEqual(NodeFrontmatter.parse({}).requires, []);
    assert.deepStrictEqual(WorkflowState.parse({}).executionOrder, []);
  });
});

describe('MD without code block loads normally', () => {
  it('loads an MD node with no code block — this is the expected case', () => {
    const runtime = createWorkflowRuntime();
    const result = assessNode('noop.entry.md', createState(), runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, ['noop.entry.md']);
    // No code block is normal — Engine emits file_loaded, not no_code_block
    const loadedReceipts = runtime.receipts.filter(
      (r) => r.type === 'file_loaded' && r.fileRef === 'noop.entry.md',
    );
    assert.equal(loadedReceipts.length, 1);
    // executionOrder and counters are written by the Engine on load
    assert.ok(result.state.executionOrder.includes('noop.entry.md'));
    assert.equal(result.state.counters['noop.entry.md'], 1);
  });
});

describe('low-level execution helpers', () => {
  it('readMarkdownFile caches parsed Markdown content', () => {
    const runtime = createWorkflowRuntime();
    const first = readMarkdownFile('wave.entry.md', runtime);
    const second = readMarkdownFile('wave.entry.md', runtime);

    assert.equal(first, second);
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_read').length, 1);
    assert.equal(runtime.receipts.filter((r) => r.type === 'cache_hit').length, 1);
  });

  it('executeLoadPlan executes an already resolved plan', () => {
    const runtime = createWorkflowRuntime();
    const plan = resolveDependencyClosure('chain.entry.md', runtime);
    const state = executeLoadPlan(plan, createState(), runtime);

    assert.deepStrictEqual(state.executionOrder, [
      'chain-policy.dep.md',
      'chain-context.dep.md',
      'chain.entry.md',
    ]);
  });

  it('loadMarkdownFile requires prior content cache', () => {
    const runtime = createWorkflowRuntime();
    assert.throws(
      () => loadMarkdownFile('wave.entry.md', runtime),
      /not in content cache/,
    );
  });
});

describe('loadMarkdownFile returns entry, not executed code', () => {
  it('returns parsed entry ({ md, frontmatter }) without executing code blocks', () => {
    const runtime = createWorkflowRuntime();
    // Set up cache by reading a file first
    const entry = readMarkdownFile('wave.entry.md', runtime);
    const result = loadMarkdownFile('wave.entry.md', runtime);

    // Returns the entry itself (md + frontmatter), not state
    assert.equal(result, entry);
    assert.ok(typeof result.md === 'string');
    assert.ok(result.md.length > 0);
    assert.ok(Array.isArray(result.frontmatter.requires));
    // Emits file_loaded, not file_executed or no_code_block
    const loadedEvts = runtime.receipts.filter((r) => r.type === 'file_loaded');
    assert.equal(loadedEvts.length, 1);
    const executedEvts = runtime.receipts.filter((r) => r.type === 'file_executed');
    assert.equal(executedEvts.length, 0);
  });
});

describe('executeLoadPlan writes state.executionOrder and state.counters', () => {
  it('Engine writes executionOrder and counters per loaded fileRef', () => {
    const runtime = createWorkflowRuntime();
    const plan = resolveDependencyClosure('chain.entry.md', runtime);
    const state = executeLoadPlan(plan, createState(), runtime);

    // executionOrder mirrors plan order (Engine-driven, not VM-driven)
    assert.deepStrictEqual(state.executionOrder, [
      'chain-policy.dep.md',
      'chain-context.dep.md',
      'chain.entry.md',
    ]);
    // counters use fileRef as key (Engine-driven)
    assert.equal(state.counters['chain-policy.dep.md'], 1);
    assert.equal(state.counters['chain-context.dep.md'], 1);
    assert.equal(state.counters['chain.entry.md'], 1);
  });

  it('increments counters when same fileRef loaded multiple times', () => {
    const runtime = createWorkflowRuntime();
    // Load shared-lib twice via two different entry points
    readMarkdownFile('repeat-1.entry.md', runtime);
    readMarkdownFile('repeat-2.entry.md', runtime);
    readMarkdownFile('shared-lib.dep.md', runtime);

    const plan1 = resolveDependencyClosure('repeat-1.entry.md', runtime);
    let state = executeLoadPlan(plan1, createState(), runtime);
    assert.equal(state.counters['shared-lib.dep.md'], 1);

    const plan2 = resolveDependencyClosure('repeat-2.entry.md', runtime);
    state = executeLoadPlan(plan2, state, runtime);
    assert.equal(state.counters['shared-lib.dep.md'], 2);
  });
});

describe('nodePath', () => {
  it('rejects path traversal', () => {
    assert.throws(() => nodePath('../outside.md'), /Invalid fileRef/);
  });

  it('rejects absolute path', () => {
    assert.throws(() => nodePath('/etc/passwd'), /Invalid fileRef/);
  });

  it('rejects nested relative paths', () => {
    assert.throws(() => nodePath('nested/file.md'), /Invalid fileRef/);
  });
});
