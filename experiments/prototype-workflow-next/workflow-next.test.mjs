// workflow-next.test.mjs - Single-entry Markdown closure loader tests
// @impl WML-001, WDM-001, WMD-001, WLO-001

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NodeFrontmatter,
  WorkflowState,
  createWorkflowRuntime,
  nodePath,
  parseFrontmatter,
  readMarkdownFile,
  resolveDependencyClosure,
  createInitialState,
  executeMarkdownFile,
  executeLoadPlan,
  loadNextMarkdown,
} from './workflow-next.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '.test-tmp');

before(() => {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('runtime initialization (WML-001)', () => {
  it('creates an empty single-entry loader runtime', () => {
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
    const state = createInitialState();

    assert.equal(runtime.contentCache.size, 0);

    const result = loadNextMarkdown('wave-entry.md', state, runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, ['wave-entry.md']);
    assert.ok(result.state.executionOrder.includes('wave-entry.md'));
    assert.equal(result.state.counters.wave, 1);
    assert.ok(runtime.contentCache.has('wave-entry.md'));
    assert.equal(runtime.contentCache.has('audit.md'), false);
  });

  it('can load multiple chosen entries without cursor semantics', () => {
    const runtime = createWorkflowRuntime();
    let state = createInitialState();

    const first = loadNextMarkdown('wave-entry.md', state, runtime);
    assert.equal(first.status, 'loaded');
    state = first.state;

    const second = loadNextMarkdown('audit.md', state, runtime);
    assert.equal(second.status, 'loaded');

    assert.deepStrictEqual(second.state.executionOrder, ['wave-entry.md', 'audit.md']);
    assert.equal('cursor' in runtime, false);
  });
});

describe('dependency closure (WMD-001)', () => {
  it('executes chain dependencies before the entry', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('chain-entry.md', createInitialState(), runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, ['chain-policy.md', 'chain-context.md', 'chain-entry.md']);
    assert.deepStrictEqual(result.state.executionOrder, [
      'chain-policy.md',
      'chain-context.md',
      'chain-entry.md',
    ]);
  });

  it('deduplicates diamond dependencies once per load graph', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('diamond-entry.md', createInitialState(), runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, [
      'diamond-shared.md',
      'diamond-a.md',
      'diamond-b.md',
      'diamond-entry.md',
    ]);
    assert.equal(result.plan.filter((f) => f === 'diamond-shared.md').length, 1);
    assert.equal(result.state.counters.diamondShared, 1);
  });

  it('preserves requires declaration order for same-level dependencies', () => {
    const runtime = createWorkflowRuntime();
    const plan = resolveDependencyClosure('diamond-entry.md', runtime);

    const aIdx = plan.indexOf('diamond-a.md');
    const bIdx = plan.indexOf('diamond-b.md');
    const entryIdx = plan.indexOf('diamond-entry.md');

    assert.ok(aIdx < bIdx, 'diamond-a follows declaration order before diamond-b');
    assert.ok(bIdx < entryIdx, 'both branches execute before entry');
  });
});

describe('content cache vs execution (WDM-001, WLO-001)', () => {
  it('cache hits reused content but does not cache execution', () => {
    const runtime = createWorkflowRuntime();
    let state = createInitialState();

    const first = loadNextMarkdown('repeat-step1.md', state, runtime);
    assert.equal(first.status, 'loaded');
    state = first.state;

    const firstReads = runtime.receipts.filter(
      (r) => r.type === 'file_read' && r.fileRef === 'shared-lib.md',
    );
    assert.equal(firstReads.length, 1);

    const second = loadNextMarkdown('repeat-step2.md', state, runtime);
    assert.equal(second.status, 'loaded');

    const cacheHits = runtime.receipts.filter(
      (r) => r.type === 'cache_hit' && r.fileRef === 'shared-lib.md',
    );
    const executions = runtime.receipts.filter(
      (r) => r.type === 'file_executed' && r.fileRef === 'shared-lib.md',
    );

    assert.ok(cacheHits.length >= 1);
    assert.equal(executions.length, 2);
    assert.equal(second.state.counters.sharedLib, 2);
  });
});

describe('error handling (WMD-001, WLO-001)', () => {
  it('missing dependency returns error and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const state = createInitialState();
    const result = loadNextMarkdown('missing-entry.md', state, runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('nonexistent-file.md'));
    assert.ok(result.error.includes('missing-entry.md'));
    assert.deepStrictEqual(result.state, state);
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_executed').length, 0);
    assert.equal(runtime.executionLog.length, 0);
  });

  it('cycle dependency returns error with cycle path and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('cycle-a.md', createInitialState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('cycle-a.md'));
    assert.ok(result.error.includes('cycle-b.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_executed').length, 0);
  });

  it('malformed frontmatter returns error and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('malformed-entry.md', createInitialState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('Malformed JSON'));
    assert.ok(result.error.includes('malformed-entry.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_executed').length, 0);
  });

  it('schema-invalid frontmatter returns error and executes no files', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('bad-schema-entry.md', createInitialState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('Invalid frontmatter schema'));
    assert.ok(result.error.includes('bad-schema-entry.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_executed').length, 0);
  });

  it('a later valid load can succeed after an error on the same runtime', () => {
    const runtime = createWorkflowRuntime();
    const failed = loadNextMarkdown('missing-entry.md', createInitialState(), runtime);
    assert.equal(failed.status, 'error');

    const recovered = loadNextMarkdown('wave-entry.md', createInitialState(), runtime);
    assert.equal(recovered.status, 'loaded');
    assert.deepStrictEqual(recovered.plan, ['wave-entry.md']);
    assert.equal(recovered.state.counters.wave, 1);
  });
});

describe('observability receipts (WLO-001)', () => {
  it('successful load records major loader phases', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('wave-entry.md', createInitialState(), runtime);

    assert.equal(result.status, 'loaded');
    const receiptTypes = runtime.receipts.map((r) => r.type);
    assert.ok(receiptTypes.includes('load_start'));
    assert.ok(receiptTypes.includes('file_read'));
    assert.ok(receiptTypes.includes('dependency_resolved'));
    assert.ok(receiptTypes.includes('file_executed'));
    assert.ok(receiptTypes.includes('load_complete'));
  });

  it('failed load records load_error', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('missing-entry.md', createInitialState(), runtime);

    assert.equal(result.status, 'error');
    const loadErrors = runtime.receipts.filter((r) => r.type === 'load_error');
    assert.equal(loadErrors.length, 1);
    assert.equal(loadErrors[0].entry, 'missing-entry.md');
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

describe('no-code-block execution', () => {
  it('produces no_code_block receipt and still completes load', () => {
    const runtime = createWorkflowRuntime();
    const result = loadNextMarkdown('noop.md', createInitialState(), runtime);

    assert.equal(result.status, 'loaded');
    assert.deepStrictEqual(result.plan, ['noop.md']);
    const receipts = runtime.receipts.filter(
      (r) => r.type === 'no_code_block' && r.fileRef === 'noop.md',
    );
    assert.equal(receipts.length, 1);
  });
});

describe('low-level execution helpers', () => {
  it('readMarkdownFile caches parsed Markdown content', () => {
    const runtime = createWorkflowRuntime();
    const first = readMarkdownFile('wave-entry.md', runtime);
    const second = readMarkdownFile('wave-entry.md', runtime);

    assert.equal(first, second);
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_read').length, 1);
    assert.equal(runtime.receipts.filter((r) => r.type === 'cache_hit').length, 1);
  });

  it('executeLoadPlan executes an already resolved plan', () => {
    const runtime = createWorkflowRuntime();
    const plan = resolveDependencyClosure('chain-entry.md', runtime);
    const state = executeLoadPlan(plan, createInitialState(), runtime);

    assert.deepStrictEqual(state.executionOrder, [
      'chain-policy.md',
      'chain-context.md',
      'chain-entry.md',
    ]);
  });

  it('executeMarkdownFile requires prior content cache', () => {
    const runtime = createWorkflowRuntime();
    assert.throws(
      () => executeMarkdownFile('wave-entry.md', createInitialState(), runtime),
      /not in content cache/,
    );
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
