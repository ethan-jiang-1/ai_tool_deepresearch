// workflow-next.mjs - Single-entry Markdown closure loader prototype
// @impl WML-001, WDM-001, WMD-001, WLO-001
//
// Core model:
//   - Upstream chooses exactly one next Markdown fileRef.
//   - Engine loads that entry just in time.
//   - Entry frontmatter may declare `requires`; Engine resolves the full closure.
//   - Dependencies execute before the entry, once per load graph.
//   - Markdown content is cached; execution is not cached.
//   - runtime.receipts exposes each load/read/cache/resolve/execute/error phase.
//   - Engine auto-writes trace to disk via traceEntry(). Caller must call
//     setTraceFile() first; if not set, traceEntry silently no-ops.

import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { z } from 'zod';
import { traceEntry } from './trace.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NODES_DIR = process.env.NODES_DIR || join(__dirname, 'nodes-workflow-next');

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

/** @impl WML-001, WLO-001 */
export function createWorkflowRuntime(source = 'engine') {
  return {
    contentCache: new Map(),
    executionLog: [],
    receipts: [],
    source,
  };
}

// emit pushes a receipt AND writes trace to disk in one call.
// This is the single point where Engine events become durable trace records.
function emit(runtime, type, detail = {}) {
  const receipt = { type, ...detail };
  runtime.receipts.push(receipt);
  traceEntry(type, { source: runtime.source, ...receipt });
}

/** @impl WDM-001 */
export function nodePath(fileRef) {
  if (fileRef.includes('..') || fileRef.startsWith('/') || basename(fileRef) !== fileRef) {
    throw new Error(`Invalid fileRef "${fileRef}": must be a plain filename within nodes-workflow-next/`);
  }
  return join(NODES_DIR, fileRef);
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)---\s*\n/;

/** @impl WMD-001 */
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

/** @impl WDM-001, WLO-001 */
export function readMarkdownFile(fileRef, runtime) {
  if (runtime.contentCache.has(fileRef)) {
    emit(runtime, 'cache_hit', { fileRef, ts: new Date().toISOString() });
    return runtime.contentCache.get(fileRef);
  }

  const path = nodePath(fileRef);
  if (!existsSync(path)) {
    throw new Error(`File not found: ${fileRef} (resolved to ${path})`);
  }

  const md = readFileSync(path, 'utf-8');
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(md);
  } catch (err) {
    throw new Error(`${err.message} in ${fileRef}`);
  }

  const entry = { md, frontmatter };
  runtime.contentCache.set(fileRef, entry);

  emit(runtime, 'file_read', { fileRef, ts: new Date().toISOString() });

  return entry;
}

/** @impl WMD-001 */
export function resolveDependencyClosure(
  fileRef,
  runtime,
  visiting = [],
  visited = new Set(),
  requester = '<entry>',
) {
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
    entry = readMarkdownFile(fileRef, runtime);
  } catch (err) {
    if (err.message.startsWith('File not found:')) {
      throw new Error(`Missing dependency: ${fileRef} requested by ${requester}`);
    }
    throw err;
  }

  const plan = [];
  for (const dep of entry.frontmatter.requires) {
    plan.push(...resolveDependencyClosure(dep, runtime, visiting, visited, fileRef));
  }

  visiting.pop();
  visited.add(fileRef);
  plan.push(fileRef);

  return plan;
}

/** @impl WDM-001 */
export function createInitialState() {
  return WorkflowState.parse({});
}

const CODE_BLOCK_RE = /```(?:js|javascript)\s*\n([\s\S]*?)```/;

/** @impl WDM-001, WLO-001 */
export function executeMarkdownFile(fileRef, state, runtime) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry) {
    throw new Error(`executeMarkdownFile: ${fileRef} not in content cache; call readMarkdownFile first`);
  }

  const match = entry.md.match(CODE_BLOCK_RE);
  if (!match) {
    emit(runtime, 'no_code_block', { fileRef, ts: new Date().toISOString() });
    runtime.executionLog.push({ fileRef, event: 'no_code_block' });
    return state;
  }

  const sandbox = {
    state,
    traceEntry,    // node can write its own trace
    console: {
      log: () => {
        // Prototype code blocks are silent; playbooks inspect receipts/trace.
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
  emit(runtime, 'file_executed', { fileRef, ts: new Date().toISOString() });
  runtime.executionLog.push({ fileRef, event: 'file_executed' });

  return validated;
}

/** @impl WDM-001, WLO-001 */
export function executeLoadPlan(plan, state, runtime) {
  let currentState = state;
  for (const fileRef of plan) {
    currentState = executeMarkdownFile(fileRef, currentState, runtime);
  }
  return currentState;
}

/** @impl WML-001, WDM-001, WMD-001, WLO-001 */
export function loadNextMarkdown(fileRef, state, runtime) {
  emit(runtime, 'load_start', { entry: fileRef, ts: new Date().toISOString() });

  let plan;
  try {
    plan = resolveDependencyClosure(fileRef, runtime);
  } catch (err) {
    emit(runtime, 'load_error', { entry: fileRef, error: err.message, ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: err.message };
  }

  emit(runtime, 'dependency_resolved', { entry: fileRef, plan, ts: new Date().toISOString() });

  try {
    const nextState = executeLoadPlan(plan, state, runtime);
    emit(runtime, 'load_complete', { entry: fileRef, plan, ts: new Date().toISOString() });
    return { state: nextState, status: 'loaded', runtime, plan };
  } catch (err) {
    emit(runtime, 'load_error', { entry: fileRef, error: err.message, ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: err.message };
  }
}
