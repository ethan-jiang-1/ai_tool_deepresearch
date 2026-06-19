// workflow-chain.mjs — Resolve and assess a Markdown node via frontmatter `requires`
// @impl WML-001..WLO-001, FRE-001
// Canonical engine location: DPT_FRAMEWORK/engine/workflow-chain.mjs
//
// ## Role
// A passive engine called by the MD controller. Given a single .md node, the
// engine resolves its frontmatter `requires` dependency chain (DAG), executes
// each node's fenced JS code block in a vm sandbox, threads workflow state, and
// returns the result. The MD controller reads the result and decides what to do
// next — the engine never drives the loop.
//
// ## Quick Start (MD Controller)
//
//   import { createTrace } from './trace.mjs';
//   import { createWorkflowRuntime, createState, assessNode }
//     from './workflow-chain.mjs';
//
//   const runtime = createWorkflowRuntime();
//   const state   = createState();
//   const trace   = createTrace('path/to/_trace.jsonl', { consoleEcho: false });
//
//   const result = assessNode('entry.md', state, runtime, trace);
//   // trace is optional — omit to skip trace writes (receipts still recorded)
//   // → { state, status: 'loaded'|'error', runtime, plan }
//   // MD controller reads result and decides next action.
//
// ## Pipeline
// ```
// createWorkflowRuntime(source?)  → runtime { contentCache, executionLog, receipts, source }
//         │
//         ▼
// assessNode(fileRef, state, runtime)
//         │
//         ├─ resolveDependencyClosure(fileRef, runtime)
//         │     └─ readMarkdownFile(fileRef, runtime) × N  (cache-aware)
//         │           └─ parseFrontmatter(md)  → { requires: string[] }
//         │
//         ├─ executeLoadPlan(plan, state, runtime)
//         │     └─ executeMarkdownFile(fileRef, state, runtime) × N
//         │           └─ vm.Script(code).runInContext({ state, traceEntry, console })
//         │
//         └─ return { state, status, runtime, plan }
// ```
//
// ## Trace
// Stateless — trace is an optional trailing parameter on assessNode() (and the
// framework functions it calls). Callers create a trace via `createTrace(path)`
// from `./trace.mjs` and pass it to assessNode(). If omitted, `emit()` and
// sandbox `traceEntry` silently no-op. No module-level state — every call can
// use its own trace instance.
//
// ## On-disk paths
// Engine resolves files from `NODES_DIR` (env var). Default:
//   join(__dirname, 'nodes-workflow-chain')
// Callers should set NODES_DIR explicitly — the default only works when the
// engine and nodes dir are co-located.
//
// ## Exports
//   Controller API:   createWorkflowRuntime, createState, assessNode
//   Framework API:    readMarkdownFile, resolveDependencyClosure,
//                     executeMarkdownFile, executeLoadPlan
//   Utilities:        nodePath, parseFrontmatter
//   Schemas:          NodeFrontmatter, WorkflowState

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NODES_DIR = process.env.NODES_DIR || join(__dirname, 'nodes-workflow-chain');

// ============================================================
// Internal: emit helpers
// ============================================================

// emit pushes a receipt AND writes trace to disk in one call.
// This is the single point where Engine events become durable trace records.
function emit(runtime, trace, type, detail = {}) {
  const receipt = { type, ...detail };
  runtime.receipts.push(receipt);
  if (trace) trace.traceEntry(type, { source: runtime.source, ...receipt });
}

// ============================================================
// Schemas
// ============================================================

/** @impl WMD-001 */
export const NodeFrontmatter = z.object({
  requires: z.array(z.string().min(1)).default([]),
});

/** @impl WDM-001 */
export const WorkflowState = z.object({
  executionOrder: z.array(z.string()).default([]),
  counters: z.record(z.string(), z.number()).default({}),
  data: z.record(z.string(), z.unknown()).default({}),
});

// ============================================================
// Runtime factory
// ============================================================

/**
 * Create a fresh workflow runtime container.
 *
 * The runtime tracks in-memory content cache, execution log, and receipts.
 * It does NOT hold trace state — trace is passed as a parameter to assessNode().
 *
 * @param {string} [source='engine'] - label injected into every trace record
 * @returns {{ contentCache: Map, executionLog: object[], receipts: object[], source: string }}
 *
 * @impl WML-001, WLO-001
 */
export function createWorkflowRuntime(source = 'engine') {
  return {
    contentCache: new Map(),
    executionLog: [],
    receipts: [],
    source,
  };
}

// ============================================================
// Path & parsing utilities
// ============================================================

/**
 * Resolve a plain filename to an absolute path inside NODES_DIR.
 *
 * Rejects traversal attempts (.., absolute paths, subdirectories).
 *
 * @param {string} fileRef - plain filename, e.g. 'entry.md'
 * @returns {string} absolute path
 * @throws {Error} if fileRef contains path separators, '..', or starts with '/'
 *
 * @impl WDM-001
 */
export function nodePath(fileRef) {
  if (fileRef.includes('..') || fileRef.startsWith('/') || basename(fileRef) !== fileRef) {
    throw new Error(`Invalid fileRef "${fileRef}": must be a plain filename within nodes-workflow-chain/`);
  }
  return join(NODES_DIR, fileRef);
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)---\s*\n/;

/**
 * Extract and validate YAML-ish JSON frontmatter from a Markdown string.
 *
 * Returns `{ requires: [] }` for Markdown without frontmatter.
 *
 * @param {string} md - raw Markdown content
 * @returns {{ requires: string[] }} parsed and validated frontmatter
 * @throws {Error} if frontmatter JSON is malformed or fails NodeFrontmatter schema
 *
 * @impl WMD-001
 */
export function parseFrontmatter(md) {
  const match = md.match(FRONTMATTER_RE);
  if (!match) {
    return { requires: [] };
  }

  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`Malformed JSON frontmatter: ${err.message}`);
  }

  try {
    return NodeFrontmatter.parse(parsed);
  } catch (err) {
    throw new Error(`Invalid frontmatter schema: ${err.message}`);
  }
}

// ============================================================
// Load pipeline
// ============================================================

/**
 * Read and cache a Markdown file, parsing its frontmatter.
 *
 * Cache hits emit 'cache_hit'; first reads emit 'file_read'.
 * Both go to runtime.receipts and trace (if injected).
 *
 * @param {string} fileRef - plain filename within NODES_DIR
 * @param {object} runtime - from createWorkflowRuntime()
 * @returns {{ md: string, frontmatter: { requires: string[] } }}
 * @throws {Error} if file not found or frontmatter invalid
 *
 * @impl WDM-001, WLO-001
 */
export function readMarkdownFile(fileRef, runtime, trace = null) {
  if (runtime.contentCache.has(fileRef)) {
    emit(runtime, trace, 'cache_hit', { fileRef, ts: new Date().toISOString() });
    return runtime.contentCache.get(fileRef);
  }

  const filePath = nodePath(fileRef);
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${fileRef} (resolved to ${filePath})`);
  }

  const md = readFileSync(filePath, 'utf-8');
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(md);
  } catch (err) {
    throw new Error(`${err.message} in ${fileRef}`);
  }

  const entry = { md, frontmatter };
  runtime.contentCache.set(fileRef, entry);

  emit(runtime, trace, 'file_read', { fileRef, ts: new Date().toISOString() });

  return entry;
}

/**
 * Resolve the full dependency closure for a Markdown node.
 *
 * Recursively walks `requires` in frontmatter, topologically ordering
 * dependencies before their dependents. Detects cycles.
 *
 * @param {string} fileRef - node filename
 * @param {object} runtime - from createWorkflowRuntime()
 * @param {object} [trace] - optional trace instance (createTrace); threaded to readMarkdownFile
 * @returns {string[]} topologically ordered plan (deps first, entry last)
 * @throws {Error} on cycle or missing dependency
 *
 * @impl WMD-001
 */
export function resolveDependencyClosure(fileRef, runtime, trace = null) {
  return _resolveDeps(fileRef, runtime, trace, [], new Set(), '<entry>');
}

function _resolveDeps(fileRef, runtime, trace, visiting, visited, requester) {
  if (visiting.includes(fileRef)) {
    const cycleStart = visiting.indexOf(fileRef);
    const cyclePath = [...visiting.slice(cycleStart), fileRef].join(' -> ');
    throw new Error(`Dependency cycle detected: ${cyclePath}`);
  }

  if (visited.has(fileRef)) {
    return [];
  }

  visiting.push(fileRef);

  let entry;
  try {
    entry = readMarkdownFile(fileRef, runtime, trace);
  } catch (err) {
    if (err.message.startsWith('File not found:')) {
      throw new Error(`Missing dependency: ${fileRef} requested by ${requester}`);
    }
    throw err;
  }

  const plan = [];
  for (const dep of entry.frontmatter.requires) {
    plan.push(..._resolveDeps(dep, runtime, trace, visiting, visited, fileRef));
  }

  visiting.pop();
  visited.add(fileRef);
  plan.push(fileRef);

  return plan;
}

// ============================================================
// Execute pipeline
// ============================================================

/**
 * Create a fresh, empty workflow state.
 *
 * The returned state object is validated against WorkflowState and ready
 * to pass into assessNode().
 *
 * @returns {object} default WorkflowState
 *
 * @impl WDM-001
 */
export function createState() {
  return WorkflowState.parse({});
}

const CODE_BLOCK_RE = /```(?:js|javascript)\s*\n([\s\S]*?)```/;

/**
 * Execute the fenced JS code block in a cached Markdown file.
 *
 * The code runs in a vm sandbox with access to:
 *   - `state`   — the current workflow state (mutated in place)
 *   - `traceEntry(event, detail)` — write a trace event
 *   - `console` — silent (playbooks inspect receipts/trace instead)
 *
 * After execution, the state is validated against WorkflowState.
 *
 * @param {string} fileRef - filename (must already be in runtime.contentCache)
 * @param {object} state - current workflow state (parsed WorkflowState)
 * @param {object} runtime - from createWorkflowRuntime()
 * @param {object} [trace] - optional trace instance; threaded to sandbox traceEntry
 * @returns {object} validated WorkflowState after execution
 * @throws {Error} if fileRef not cached, vm execution fails, or state invalid
 *
 * @impl WDM-001, WLO-001
 */
export function executeMarkdownFile(fileRef, state, runtime, trace = null) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry) {
    throw new Error(`executeMarkdownFile: ${fileRef} not in content cache; call readMarkdownFile first`);
  }

  const match = entry.md.match(CODE_BLOCK_RE);
  if (!match) {
    emit(runtime, trace, 'no_code_block', { fileRef, ts: new Date().toISOString() });
    runtime.executionLog.push({ fileRef, event: 'no_code_block' });
    return state;
  }

  const sandboxTraceEntry = (event, detail) => {
    if (trace) trace.traceEntry(event, detail);
  };

  const sandbox = {
    state,
    traceEntry: sandboxTraceEntry,
    console: {
      log: () => {
        // Code blocks are silent; playbooks inspect receipts/trace.
      },
    },
  };

  try {
    new vm.Script(match[1]).runInContext(vm.createContext(sandbox), {
      timeout: 5000,
    });
  } catch (err) {
    throw new Error(`Execution error in ${fileRef}: ${err.message}`);
  }

  const validated = WorkflowState.parse(sandbox.state);
  emit(runtime, trace, 'file_executed', { fileRef, ts: new Date().toISOString() });
  runtime.executionLog.push({ fileRef, event: 'file_executed' });

  return validated;
}

/**
 * Execute a dependency-closure plan sequentially, threading state.
 *
 * Each fileRef in the plan is loaded from cache and executed; state
 * flows from one to the next.
 *
 * @param {string[]} plan - ordered fileRefs (from resolveDependencyClosure)
 * @param {object} state - initial WorkflowState
 * @param {object} runtime - from createWorkflowRuntime()
 * @param {object} [trace] - optional trace instance; threaded to executeMarkdownFile
 * @returns {object} final WorkflowState after all nodes execute
 *
 * @impl WDM-001, WLO-001
 */
export function executeLoadPlan(plan, state, runtime, trace = null) {
  let currentState = state;
  for (const fileRef of plan) {
    currentState = executeMarkdownFile(fileRef, currentState, runtime, trace);
  }
  return currentState;
}

// ============================================================
// Top-level orchestrator
// ============================================================

/**
 * Assess a Markdown node: resolve its dependency chain, execute every node's
 * code block in DAG order, thread workflow state, and return the result.
 *
 * This is the main entry point for MD controllers. A single call:
 *   1. Resolves the full dependency closure (DAG order)
 *   2. Executes every node's code block in order
 *   3. Returns the final state, status, and the plan that ran
 *
 * The engine is **passive** — it assesses the given node and returns. The MD
 * controller reads the result and decides what to do next. The engine does not
 * loop, advance, or drive multi-step Agent Flow.
 *
 * Emits 'load_start', 'dependency_resolved', and either 'load_complete'
 * or 'load_error' to trace and runtime.receipts.
 *
 * @param {string} fileRef - node filename, e.g. 'entry.md'
 * @param {object} state - current WorkflowState (from createState)
 * @param {object} runtime - from createWorkflowRuntime()
 * @param {object} [trace] - optional trace instance (createTrace); threads to all pipeline stages
 * @returns {{ state: object, status: 'loaded'|'error', runtime: object, plan?: string[], error?: string }}
 *
 * @impl WML-001, WDM-001, WMD-001, WLO-001
 */
export function assessNode(fileRef, state, runtime, trace = null) {
  emit(runtime, trace, 'load_start', { entry: fileRef, ts: new Date().toISOString() });

  let plan;
  try {
    plan = resolveDependencyClosure(fileRef, runtime, trace);
  } catch (err) {
    emit(runtime, trace, 'load_error', { entry: fileRef, error: err.message, ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: err.message };
  }

  emit(runtime, trace, 'dependency_resolved', { entry: fileRef, plan, ts: new Date().toISOString() });

  try {
    const nextState = executeLoadPlan(plan, state, runtime, trace);
    emit(runtime, trace, 'load_complete', { entry: fileRef, plan, ts: new Date().toISOString() });
    return { state: nextState, status: 'loaded', runtime, plan };
  } catch (err) {
    emit(runtime, trace, 'load_error', { entry: fileRef, error: err.message, ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: err.message };
  }
}
