// workflow-chain.test.mjs — Chain-load Markdown workflow engine tests
// @impl WML-001, WDM-001, WMD-001, WLO-001
// Canonical test location: tests/engine/workflow-chain.test.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// nodesDir passed explicitly to createWorkflowRuntime — no env var needed.
const TEST_NODES_DIR = join(__dirname, '../../experiments_env/prototype-workflow-chain/nodes-workflow-chain');

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
} = await import('../../DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs');

const TMP_DIR = join(__dirname, '.test-tmp');

before(() => {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('runtime initialization (WML-001)', () => {
  it('creates an empty chain-load runtime', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);

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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
    const result = assessNode('cycle-a.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('cycle-a.entry.md'));
    assert.ok(result.error.includes('cycle-b.dep.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
  });

  it('malformed frontmatter returns error and executes no files', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
    const result = assessNode('malformed.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    // YAML parser rejects malformed content; accept either Zod or YAML error message
    assert.ok(result.error.includes('Invalid frontmatter schema') || result.error.includes('Malformed frontmatter'), `Expected error about malformed frontmatter, got: ${result.error}`);
    assert.ok(result.error.includes('malformed.entry.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
  });

  it('schema-invalid frontmatter returns error and executes no files', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
    const result = assessNode('bad-schema.entry.md', createState(), runtime);

    assert.equal(result.status, 'error');
    assert.ok(result.error.includes('Invalid frontmatter schema'));
    assert.ok(result.error.includes('bad-schema.entry.md'));
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_loaded').length, 0);
  });

  it('a later valid load can succeed after an error on the same runtime', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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

  it('gracefully handles non-JSON frontmatter via YAML fallback', () => {
    // { bad json } is not valid JSON, but YAML subset parser handles it gracefully
    // (line has no colon, skipped → empty object → requires defaults to [])
    assert.deepStrictEqual(parseFrontmatter('---\n{ bad json }\n---\n').requires, []);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
    const first = readMarkdownFile('wave.entry.md', runtime);
    const second = readMarkdownFile('wave.entry.md', runtime);

    assert.equal(first, second);
    assert.equal(runtime.receipts.filter((r) => r.type === 'file_read').length, 1);
    assert.equal(runtime.receipts.filter((r) => r.type === 'cache_hit').length, 1);
  });

  it('executeLoadPlan executes an already resolved plan', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
    const plan = resolveDependencyClosure('chain.entry.md', runtime);
    const state = executeLoadPlan(plan, createState(), runtime);

    assert.deepStrictEqual(state.executionOrder, [
      'chain-policy.dep.md',
      'chain-context.dep.md',
      'chain.entry.md',
    ]);
  });

  it('loadMarkdownFile requires prior content cache', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
    assert.throws(
      () => loadMarkdownFile('wave.entry.md', runtime),
      /not in content cache/,
    );
  });
});

describe('loadMarkdownFile returns entry, not executed code', () => {
  it('returns parsed entry ({ md, frontmatter }) without executing code blocks', () => {
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    const runtime = createWorkflowRuntime('test', TEST_NODES_DIR);
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
    assert.throws(() => nodePath('../outside.md', TEST_NODES_DIR), /Invalid fileRef/);
  });

  it('rejects absolute path', () => {
    assert.throws(() => nodePath('/etc/passwd', TEST_NODES_DIR), /Invalid fileRef/);
  });

  it('allows subdirectory paths under nodes dir (WNC-006)', () => {
    assert.ok(nodePath('phases/phase-wave0.md', TEST_NODES_DIR).endsWith('phases/phase-wave0.md'));
    assert.ok(nodePath('shared/shared-profile.md', TEST_NODES_DIR).endsWith('shared/shared-profile.md'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WNC-008: Autonomous contract header injection
// ═══════════════════════════════════════════════════════════════════════════

describe('assessNode contract header injection (WNC-008)', () => {
  const WNC_TMP = join(__dirname, '.test-wnc-tmp');
  const PHASES_DIR = join(WNC_TMP, 'nodes-workflow-chain', 'phases');
  const SHARED_DIR = join(WNC_TMP, 'nodes-workflow-chain', 'shared');

  before(() => {
    mkdirSync(WNC_TMP, { recursive: true });
    mkdirSync(join(WNC_TMP, 'nodes-workflow-chain'), { recursive: true });
    mkdirSync(PHASES_DIR, { recursive: true });
    mkdirSync(SHARED_DIR, { recursive: true });

    // Write manifest with lifecycle phases + shared entries
    const manifest = {
      phases: [
        { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        { key: 'final', node: 'phases/phase-final.md', gate: null },
        { key: 'hitl1', node: 'phases/phase-hitl1.md', gate: 'hitl1-recorded' },
      ],
      shared: ['shared/shared-silent-execution.md'],
    };
    writeFileSync(join(WNC_TMP, 'manifest.json'), JSON.stringify(manifest));

    // Phase files with distinct frontmatter
    writeFileSync(join(PHASES_DIR, 'phase-wave0.md'), [
      '---',
      'node_type: phase',
      'id: phase-wave0',
      'phase: wave0',
      'gate: wave0-complete',
      'stop: "no"',
      'requires:',
      '  - shared/shared-silent-execution',
      '---',
      '',
      '# Phase: Wave0',
      '',
      '## 1. Stage Goal',
      '',
      'Test phase body content.',
    ].join('\n'));

    writeFileSync(join(PHASES_DIR, 'phase-final.md'), [
      '---',
      'node_type: phase',
      'id: phase-final',
      'phase: final',
      'gate: null',
      'stop: "no"',
      'requires:',
      '  - shared/shared-silent-execution',
      '---',
      '',
      '# Phase: Final',
      '',
      '## 1. Stage Goal',
      '',
      'Test final phase body.',
    ].join('\n'));

    writeFileSync(join(PHASES_DIR, 'phase-hitl1.md'), [
      '---',
      'node_type: phase',
      'id: phase-hitl1',
      'phase: hitl1',
      'gate: hitl1-recorded',
      'stop: "yes"',
      'requires: []',
      '---',
      '',
      '# Phase: HITL1',
      '',
      'Human-in-the-loop phase.',
    ].join('\n'));

    // Shared dependencies
    writeFileSync(join(SHARED_DIR, 'shared-subagent-protocol.md'), [
      '---',
      'node_type: shared',
      'id: shared-subagent-protocol',
      'shared_scope: subagent-protocol',
      'authority: protocol',
      'requires: []',
      '---',
      '',
      '# Shared: Sub-agent Protocol',
      '',
      'Test shared content.',
    ].join('\n'));

    writeFileSync(join(SHARED_DIR, 'shared-silent-execution.md'), [
      '---',
      'node_type: shared',
      'id: shared-silent-execution',
      'shared_scope: silent-execution',
      'authority: behavioral-contract',
      'requires: []',
      '---',
      '',
      '# Shared: Silent Execution',
      '',
      'Test shared content.',
    ].join('\n'));

    // Synthetic work-unit task surface — NOT in manifest
    writeFileSync(join(PHASES_DIR, 'synthetic-work-unit-task-stop-no.md'), [
      '---',
      'node_type: shared',
      'id: synthetic-work-unit-task-stop-no',
      'shared_scope: subagent-protocol',
      'role: synthetic-work-unit-role',
      'stop: "no"',
      'execution_contract:',
      '  surface: work-unit-subagent-role',
      '  search_policy: subagent_performs_search',
      '  loaded_by: phase-agent',
      '  delivered_via: work_unit_task_md',
      'requires:',
      '  - shared/shared-subagent-protocol',
      'suggested_context: []',
      '---',
      '',
      '# Synthetic Work-Unit Task Surface',
      '',
      'Synthetic non-manifest work-unit task surface.',
    ].join('\n'));

    // Phase with no stop field
    writeFileSync(join(PHASES_DIR, 'phase-no-stop.md'), [
      '---',
      'node_type: phase',
      'id: phase-no-stop',
      'phase: test',
      'gate: test-gate',
      'requires: []',
      '---',
      '',
      '# Phase: No Stop',
      '',
      'Phase without stop field.',
    ].join('\n'));

    // Add these to manifest for the no-stop test
    manifest.phases.push({ key: 'test', node: 'phases/phase-no-stop.md', gate: 'test-gate' });
    writeFileSync(join(WNC_TMP, 'manifest.json'), JSON.stringify(manifest));
  });

  after(() => {
    if (existsSync(WNC_TMP)) rmSync(WNC_TMP, { recursive: true, force: true });
  });

  it('injects AUTONOMOUS MODE header for ordinary stop:no + gate!=null phase', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('phases/phase-wave0.md', state, runtime);

    assert.equal(result.status, 'loaded');
    const entry = runtime.contentCache.get('phases/phase-wave0.md');
    assert.ok(entry.md.includes('AUTONOMOUS MODE'));
    assert.ok(entry.md.includes('DO NOT INITIATE USER INTERACTION'));
    assert.match(entry.md, /user-initiated message.*direct factual answer/i);
    assert.match(entry.md, /creates no checkpoint, state, permission, route, mutation\/reentry authority/i);
    assert.ok(entry.md.includes('non-terminal `stop: no` phase'));
    assert.match(entry.md, /idle report/);
    assert.match(entry.md, /repair and rerun the same Gate, change strategy, consume a legal handoff, or hold silently/);
    assert.ok(entry.md.includes('Next phase comes ONLY from Gate CLI `check.next`'));
    assert.match(entry.md, /Agent-facing guidance only/);
  });

  it('injects TERMINAL DELIVERY MODE header for final phase (phase:final + stop:no + gate:null)', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('phases/phase-final.md', state, runtime);

    assert.equal(result.status, 'loaded');
    const entry = runtime.contentCache.get('phases/phase-final.md');
    assert.ok(entry.md.includes('TERMINAL DELIVERY MODE'));
    assert.ok(entry.md.includes('DELIVER FINAL ARTIFACTS ONLY'));
  });

  it('does NOT inject header for stop: yes phase', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('phases/phase-hitl1.md', state, runtime);

    assert.equal(result.status, 'loaded');
    const entry = runtime.contentCache.get('phases/phase-hitl1.md');
    assert.ok(!entry.md.includes('AUTONOMOUS MODE'));
    assert.ok(!entry.md.includes('TERMINAL DELIVERY MODE'));
  });

  it('does NOT inject header when stop field is absent', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('phases/phase-no-stop.md', state, runtime);

    assert.equal(result.status, 'loaded');
    const entry = runtime.contentCache.get('phases/phase-no-stop.md');
    assert.ok(!entry.md.includes('AUTONOMOUS MODE'));
    assert.ok(!entry.md.includes('TERMINAL DELIVERY MODE'));
  });

  it('does NOT inject header for work-unit sub-agent task surface even with stop:no frontmatter (tested via non-manifest path)', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('phases/synthetic-work-unit-task-stop-no.md', state, runtime);

    assert.equal(result.status, 'loaded');
    const entry = runtime.contentCache.get('phases/synthetic-work-unit-task-stop-no.md');
    assert.ok(!entry.md.includes('AUTONOMOUS MODE'));
    assert.ok(!entry.md.includes('TERMINAL DELIVERY MODE'));
  });

  it('injects header after frontmatter and before body', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('phases/phase-wave0.md', state, runtime);

    const entry = runtime.contentCache.get('phases/phase-wave0.md');
    const fmEnd = entry.md.indexOf('---\n', entry.md.indexOf('---\n') + 4) + 4;
    const headerStart = entry.md.indexOf('## AUTONOMOUS MODE');
    const bodyStart = entry.md.indexOf('# Phase: Wave0');

    assert.ok(headerStart >= fmEnd, 'Header starts after frontmatter');
    assert.ok(bodyStart > headerStart, 'Body starts after header');
  });

  it('injection is idempotent — second load does not double-inject', () => {
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();

    // First load
    assessNode('phases/phase-wave0.md', state, runtime);
    const entry = runtime.contentCache.get('phases/phase-wave0.md');
    const firstCount = (entry.md.match(/AUTONOMOUS MODE/g) || []).length;

    // Second load on a fresh runtime (re-reads from disk, re-injects)
    const runtime2 = createWorkflowRuntime('test', nodesDir);
    assessNode('phases/phase-wave0.md', createState(), runtime2);
    const entry2 = runtime2.contentCache.get('phases/phase-wave0.md');
    const secondCount = (entry2.md.match(/AUTONOMOUS MODE/g) || []).length;

    assert.equal(firstCount, 1);
    assert.equal(secondCount, 1);
  });

  it('uses manifest membership as lifecycle coverage source of truth — frontmatter alone does not trigger', () => {
    // Create a standalone file not in any manifest
    const standaloneDir = join(WNC_TMP, 'nodes-workflow-chain', 'standalone');
    mkdirSync(standaloneDir, { recursive: true });
    writeFileSync(join(standaloneDir, 'standalone-no-manifest.md'), [
      '---',
      'node_type: phase',
      'phase: custom',
      'gate: custom-gate',
      'stop: "no"',
      'requires: []',
      '---',
      '',
      '# Standalone Phase',
      '',
      'This file is not in any manifest.',
    ].join('\n'));

    // No manifest at this level — runtime.nodesDir/nodes-workflow-chain/../manifest.json
    // We need to ensure the standalone node is not covered by a manifest.
    // Since the parent manifest is at WNC_TMP/manifest.json, and nodesDir is WNC_TMP/nodes-workflow-chain,
    // the manifest is found. But standalone-no-manifest.md is not in it.
    const nodesDir = join(WNC_TMP, 'nodes-workflow-chain');
    const runtime = createWorkflowRuntime('test', nodesDir);
    const state = createState();
    const result = assessNode('standalone/standalone-no-manifest.md', state, runtime);

    assert.equal(result.status, 'loaded');
    const entry = runtime.contentCache.get('standalone/standalone-no-manifest.md');
    assert.ok(!entry.md.includes('AUTONOMOUS MODE'));
    assert.ok(!entry.md.includes('TERMINAL DELIVERY MODE'));
  });
});
