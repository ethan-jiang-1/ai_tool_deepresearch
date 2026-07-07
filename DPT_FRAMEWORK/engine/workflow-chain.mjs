// workflow-chain.mjs — Resolve and load a Markdown node via frontmatter `requires`
// @impl WML-001..WLO-001, FRE-001, DYS-001, WNC-008
// Canonical engine location: DPT_FRAMEWORK/engine/workflow-chain.mjs
//
// ## Role
// A passive engine called by the Agent. Given a single .md node, the engine
// resolves its frontmatter `requires` dependency chain (DAG), loads each node's
// MD content from cache, writes load state (executionOrder, counters), and
// returns the result. MD content is Agent-readable — the Engine does NOT
// execute code blocks. The Agent reads the result and decides what to do next —
// the engine never drives the loop.
//
// ## Quick Start (Agent Controller)
//
//   import { createTrace } from './trace.mjs';
//   import { createWorkflowRuntime, createState, assessNode }
//     from './workflow-chain.mjs';
//
//   const runtime = createWorkflowRuntime();
//   const state   = createState();
//   const trace   = createTrace('path/to/rb_trace.jsonl', { consoleEcho: false });
//
//   const result = assessNode('entry.md', state, runtime, trace);
//   // trace is optional — omit to skip trace writes (receipts still recorded)
//   // → { state, status: 'loaded'|'error', runtime, plan }
//   // Agent reads result and decides next action.
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
//         │     └─ loadMarkdownFile(fileRef, runtime) × N
//         │           └─ confirm cache hit → emit file_loaded → return entry
//         │
//         └─ return { state, status, runtime, plan }
// ```
//
// ## Trace
// Stateless — trace is an optional trailing parameter on assessNode() (and the
// framework functions it calls). Callers create a trace via `createTrace(path)`
// from `./trace.mjs` and pass it to assessNode(). If omitted, `emit()`
// silently no-ops. No module-level state — every call can use its own trace
// instance.
//
// ## On-disk paths
// Engine resolves node files from `runtime.nodesDir`, set at runtime creation.
// Callers pass `nodesDir` to createWorkflowRuntime() explicitly — no env var.
// Default: join(__dirname, 'nodes-workflow-chain')
//
// ## Exports
//   Controller API:   createWorkflowRuntime, createState, assessNode
//   Framework API:    readMarkdownFile, resolveDependencyClosure,
//                     loadMarkdownFile, executeLoadPlan
//   Utilities:        nodePath, parseFrontmatter
//   Schemas:          NodeFrontmatter, WorkflowState

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_NODES_DIR = join(__dirname, 'nodes-workflow-chain');

// ═══════════════════════════════════════════════════════════════════════════
// WNC-008: Autonomous contract header injection
// ═══════════════════════════════════════════════════════════════════════════

const AUTONOMOUS_MODE_HEADER = `## AUTONOMOUS MODE -- YOU SHALL NOT SURFACE TO THE USER

This is a non-terminal \`stop: no\` phase. You are executing autonomously without user interaction.

**Absolute prohibitions:**
- You SHALL NOT ask the user any question
- You SHALL NOT request confirmation or present A/B choices
- You SHALL NOT report execution progress
- You SHALL NOT report idle/no-work state, "nothing left", or "done so far"
- Gate failure is NOT an emergency — read inspect/advice, fix, and rerun

**Required behavior:**
- Complete this node by draining/repairing/degrading as needed, then run the gate
- Gate failure → read inspect/advice → repair → rerun gate with \`--attempt N\`
- Persistent failure → record \`silent_degradation\` via \`log-event.mjs\` → switch strategy
- Next phase comes ONLY from gate CLI \`check.next\`; after gate pass, consume it through \`enter-phase --bundle <path> --node <check.next>\` before source-gate status sync
- This header is a principle guardrail; the phase body's node-specific Stop Behavior still governs queue, quality, and repair details

**Reference:** \`shared/shared-silent-execution.md\` — the full silent execution behavioral contract (loaded via \`requires\`).

---

`;

const TERMINAL_DELIVERY_HEADER = `## TERMINAL DELIVERY MODE -- DELIVER FINAL ARTIFACTS ONLY

This is the terminal \`stop: no\` + \`gate: null\` phase. You are delivering the final research output.

**Allowed:**
- Write \`final/\` artifact(s) from verified bundle state
- Keep terminal status from readiness: \`current_gate: readiness_passed\` / \`next_gate: none\`; Final has no gate and does not advance status

**Absolute prohibitions:**
- You SHALL NOT ask the user any question or request confirmation
- You SHALL NOT present A/B choices or report progress
- You SHALL NOT enter a post-delivery feedback loop
- User feedback goes through HITL2 rerun, not through this phase

---

`;

/**
 * Try to load the workflow manifest and check if a fileRef is a lifecycle phase.
 * Returns null if manifest is unavailable or fileRef is not in the manifest.
 * Returns the manifest phase entry (with gate field) if the fileRef matches.
 *
 * @param {string} fileRef — e.g. 'phases/phase-wave0.md'
 * @param {string} nodesDir — runtime nodesDir
 * @returns {object|null} manifest phase entry or null
 *
 * @impl WNC-008
 */
function tryGetManifestPhase(fileRef, nodesDir) {
  try {
    const manifestPath = join(nodesDir, '..', 'manifest.json');
    if (!existsSync(manifestPath)) return null;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    if (!manifest.phases || !Array.isArray(manifest.phases)) return null;
    return manifest.phases.find(p => p.node === fileRef) || null;
  } catch {
    return null;
  }
}

/**
 * Inject autonomous contract header into the entry node's cached Markdown content.
 * Only called for manifest lifecycle phases (not work-unit sub-agent task surfaces).
 *
 * The header is injected after the frontmatter block and before the phase body
 * so that the Agent sees it as the first readable content. The injection is
 * idempotent — a second call with the same header prefix is a no-op.
 *
 * @param {object} runtime — from createWorkflowRuntime()
 * @param {string} fileRef — the entry node fileRef (e.g. 'phases/phase-wave0.md')
 * @param {string} header — the header string to inject
 *
 * @impl WNC-008
 */
function injectContractHeader(runtime, fileRef, header) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry || !entry.md) return;

  // Idempotency: skip if header already present
  if (entry.md.includes(header.trim().split('\n')[0])) return;

  const fmMatch = entry.md.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  if (fmMatch) {
    // Inject after frontmatter, before body
    entry.md = fmMatch[0] + header + entry.md.slice(fmMatch[0].length);
  } else {
    // No frontmatter — inject at the very beginning
    entry.md = header + entry.md;
  }
}

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
export function createWorkflowRuntime(source = 'engine', nodesDir = DEFAULT_NODES_DIR) {
  return {
    contentCache: new Map(),
    executionLog: [],
    receipts: [],
    source,
    nodesDir,
  };
}

// ============================================================
// Path & parsing utilities
// ============================================================

/**
 * Resolve a file reference to an absolute path inside the configured nodesDir.
 *
 * Rejects traversal attempts (.., absolute paths, subdirectories).
 *
 * @param {string} fileRef - plain filename, e.g. 'entry.md'
 * @returns {string} absolute path
 * @throws {Error} if fileRef contains path separators, '..', or starts with '/'
 *
 * @impl WDM-001
 */
export function nodePath(fileRef, nodesDir) {
  if (fileRef.includes('..') || fileRef.startsWith('/')) {
    throw new Error(`Invalid fileRef "${fileRef}": traversal not allowed`);
  }
  // fileRef can now be 'phases/phase-wave0.md' or 'shared/shared-profile.md'
  return join(nodesDir, fileRef);
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)---\s*\n/;

// Lazy sync load of yaml package via createRequire (ESM-compatible)
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
let _yamlParse = null;
function loadYamlParse() {
  if (!_yamlParse) {
    _yamlParse = _require('yaml').parse;
  }
  return _yamlParse;
}

/**
 * Extract and validate YAML-ish JSON frontmatter from a Markdown string.
 *
 * Returns `{ requires: [] }` for Markdown without frontmatter.
 * ALL frontmatter keys are preserved in the returned object — the
 * NodeFrontmatter schema is used for validation only, and additional
 * keys pass through for downstream consumers (diagnostics, consistency
 * validation, etc.).
 *
 * @param {string} md - raw Markdown content
 * @returns {object} full parsed frontmatter (all keys preserved)
 * @throws {Error} if frontmatter JSON is malformed or fails NodeFrontmatter schema
 *
 * @impl WMD-001, DYS-001
 */
export function parseFrontmatter(md) {
  const match = md.match(FRONTMATTER_RE);
  if (!match) {
    return { requires: [] };
  }

  const raw = match[1];

  // Try JSON first (backward compatible)
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: use the yaml package (YAML 1.2 is a superset of JSON)
    // Use process-level lazy load to avoid top-level await issues
    try {
      parsed = loadYamlParse()(raw);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Frontmatter parsed to non-object');
      }
    } catch (err) {
      throw new Error(`Malformed frontmatter (not valid JSON or YAML): ${err.message}`);
    }
  }

  // Validate required fields via schema
  try {
    NodeFrontmatter.parse(parsed);
  } catch (err) {
    throw new Error(`Invalid frontmatter schema: ${err.message}`);
  }

  // Preserve ALL keys (DYS-001)
  return { requires: parsed.requires || [], ...parsed };
}

/**
 * Parse a YAML subset: key: value per line, block sequences (- item), inline
 * arrays as [a, b], quoted strings. Enough for our node frontmatter.
 * Throws on unsupported syntax.
 * @param {string} text
 * @returns {object}
 */
function parseYAMLSubset(text) {
  const result = {};
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // Block sequence item (continuation of previous key's array)
    if (trimmed.startsWith('- ')) {
      i++;
      continue; // handled by parent key
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (!key) { i++; continue; }

    if (rawValue === '' || rawValue === 'null') {
      // Check for block sequence on following lines
      const seqItems = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed.startsWith('- ')) {
          const item = nextTrimmed.slice(2).trim();
          // Strip surrounding quotes
          if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
            seqItems.push(item.slice(1, -1));
          } else {
            seqItems.push(item);
          }
          j++;
        } else if (!nextTrimmed || nextTrimmed.startsWith('#')) {
          j++; // skip blank/comment lines between items
        } else {
          break; // next key or non-sequence line
        }
      }
      if (seqItems.length > 0) {
        result[key] = seqItems;
        i = j;
        continue;
      }
      result[key] = null;
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      // Inline array: [a, b, c]
      const inner = rawValue.slice(1, -1);
      if (inner.trim() === '') {
        result[key] = [];
      } else {
        result[key] = inner.split(',').map(s => {
          const v = s.trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            return v.slice(1, -1);
          }
          return v;
        });
      }
    } else if ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
               (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
      result[key] = rawValue.slice(1, -1);
    } else {
      // Plain value — try to parse as boolean / number, otherwise string
      const lower = rawValue.toLowerCase();
      if (lower === 'true') result[key] = true;
      else if (lower === 'false') result[key] = false;
      else if (lower === 'yes') result[key] = 'yes'; // keep as string — fight YAML 1.1 bool
      else if (lower === 'no') result[key] = 'no';
      else if (!isNaN(rawValue) && rawValue !== '') result[key] = Number(rawValue);
      else result[key] = rawValue;
    }

    i++;
  }

  return result;
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
 * Cache entries are `{ fileRef, md, frontmatter }` — the full
 * frontmatter object is preserved for downstream consumers.
 *
 * @param {string} fileRef - file reference within runtime.nodesDir
 * @param {object} runtime - from createWorkflowRuntime()
 * @returns {{ fileRef: string, md: string, frontmatter: object }}
 * @throws {Error} if file not found or frontmatter invalid
 *
 * @impl WDM-001, WLO-001, DYS-001
 */
export function readMarkdownFile(fileRef, runtime, trace = null, logger = null) {
  // Auto-append .md if no extension (requires field uses bare IDs)
  const resolvedRef = fileRef.endsWith('.md') ? fileRef : `${fileRef}.md`;

  if (runtime.contentCache.has(resolvedRef)) {
    if (logger) logger.debug(`cache hit: ${resolvedRef}`);
    emit(runtime, trace, 'cache_hit', { fileRef: resolvedRef, ts: new Date().toISOString() });
    return runtime.contentCache.get(resolvedRef);
  }

  if (logger) logger.debug(`reading: ${resolvedRef}`);
  const filePath = nodePath(resolvedRef, runtime.nodesDir);
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${resolvedRef} (resolved to ${filePath})`);
  }

  const md = readFileSync(filePath, 'utf-8');
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(md);
  } catch (err) {
    throw new Error(`${err.message} in ${resolvedRef}`);
  }

  const entry = { fileRef: resolvedRef, md, frontmatter };
  runtime.contentCache.set(resolvedRef, entry);

  emit(runtime, trace, 'file_read', { fileRef: resolvedRef, ts: new Date().toISOString() });

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
export function resolveDependencyClosure(fileRef, runtime, trace = null, logger = null) {
  const ref = fileRef.endsWith('.md') ? fileRef : `${fileRef}.md`;
  const plan = _resolveDeps(ref, runtime, trace, logger, [], new Set(), '<entry>');
  if (logger) logger.info(`resolved ${plan.length} dependencies for ${ref}`, { plan });
  return plan;
}

function _resolveDeps(fileRef, runtime, trace, logger, visiting, visited, requester) {
  // Normalize: auto-append .md if bare ID (requires field convention)
  const ref = fileRef.endsWith('.md') ? fileRef : `${fileRef}.md`;

  if (visiting.includes(ref)) {
    const cycleStart = visiting.indexOf(ref);
    const cyclePath = [...visiting.slice(cycleStart), ref].join(' -> ');
    throw new Error(`Dependency cycle detected: ${cyclePath}`);
  }

  if (visited.has(ref)) {
    return [];
  }

  visiting.push(ref);

  let entry;
  try {
    entry = readMarkdownFile(ref, runtime, trace, logger);
  } catch (err) {
    if (err.message.startsWith('File not found:')) {
      throw new Error(`Missing dependency: ${ref} requested by ${requester}`);
    }
    throw err;
  }

  const plan = [];
  for (const dep of entry.frontmatter.requires) {
    plan.push(..._resolveDeps(dep, runtime, trace, logger, visiting, visited, ref));
  }

  visiting.pop();
  visited.add(ref);
  plan.push(ref);

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

/**
 * Load a cached Markdown file and return its parsed content.
 *
 * MD content is Agent-readable — the Engine does NOT execute any code blocks.
 * This function verifies the fileRef is in contentCache and returns the entry
 * ({ md, frontmatter }) for the Agent to read and decide on actions.
 *
 * Emits 'file_loaded' to trace and runtime.executionLog.
 *
 * @param {string} fileRef - filename (must already be in runtime.contentCache)
 * @param {object} runtime - from createWorkflowRuntime()
 * @param {object} [trace] - optional trace instance
 * @returns {{ md: string, frontmatter: { requires: string[] } }} the cached entry
 * @throws {Error} if fileRef not cached
 *
 * @impl WDM-001, WLO-001
 */
export function loadMarkdownFile(fileRef, runtime, trace = null, logger = null) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry) {
    throw new Error(`loadMarkdownFile: ${fileRef} not in content cache; call readMarkdownFile first`);
  }

  if (logger) logger.debug(`loaded: ${fileRef}`);
  emit(runtime, trace, 'file_loaded', { fileRef, ts: new Date().toISOString() });
  runtime.executionLog.push({ fileRef, event: 'file_loaded' });

  return entry;
}

/**
 * Execute a dependency-closure plan sequentially, writing load state.
 *
 * Each fileRef in the plan is loaded from cache via loadMarkdownFile.
 * The Engine writes `state.executionOrder` (push fileRef) and
 * `state.counters[fileRef]` (increment per-fileRef count) on each
 * successful load. MD content is returned for the Agent to read — the
 * Engine does NOT execute any code blocks.
 *
 * @param {string[]} plan - ordered fileRefs (from resolveDependencyClosure)
 * @param {object} state - initial WorkflowState (mutated in place)
 * @param {object} runtime - from createWorkflowRuntime()
 * @param {object} [trace] - optional trace instance; threaded to loadMarkdownFile
 * @returns {object} final WorkflowState after all nodes loaded
 *
 * @impl WDM-001, WLO-001
 */
export function executeLoadPlan(plan, state, runtime, trace = null, logger = null) {
  if (logger) logger.info(`executing load plan: ${plan.length} nodes`, { plan });
  for (const fileRef of plan) {
    loadMarkdownFile(fileRef, runtime, trace, logger);
    state.executionOrder.push(fileRef);
    state.counters[fileRef] = (state.counters[fileRef] || 0) + 1;
  }
  return state;
}

// ============================================================
// Top-level orchestrator
// ============================================================

/**
 * Assess a Markdown node: resolve its dependency chain, load every node's
 * MD content in DAG order, write load state, and return the result.
 *
 * This is the main entry point for Phase Agents loading the Markdown control surface. A single call:
 *   1. Resolves the full dependency closure (DAG order)
 *   2. Loads every node's MD content in order (no code execution)
 *   3. Returns the final state, status, and the plan that ran
 *
 * The engine is **passive** — it assesses the given node and returns. The Agent
 * reads the returned MD content and decides what to do next. The engine does not
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
export function assessNode(fileRef, state, runtime, trace = null, logger = null) {
  if (fileRef == null) {
    if (logger) logger.error('assessNode: null or undefined fileRef');
    if (trace) emit(runtime, trace, 'load_error', { entry: '(null)', error: 'null or undefined fileRef', ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: 'null or undefined fileRef' };
  }
  const ref = fileRef.endsWith('.md') ? fileRef : `${fileRef}.md`;
  if (logger) logger.info(`assessing entry: ${ref}`);
  emit(runtime, trace, 'load_start', { entry: ref, ts: new Date().toISOString() });

  let plan;
  try {
    plan = resolveDependencyClosure(ref, runtime, trace, logger);
  } catch (err) {
    if (logger) logger.error(`load failed: ${ref}`, { error: err.message });
    emit(runtime, trace, 'load_error', { entry: ref, error: err.message, ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: err.message };
  }

  emit(runtime, trace, 'dependency_resolved', { entry: ref, plan, ts: new Date().toISOString() });

  try {
    const nextState = executeLoadPlan(plan, state, runtime, trace, logger);

    // WNC-008: Inject autonomous contract header into manifest lifecycle stop:no phases
    // Only triggered for entries listed in manifest.phases[].node — not for
    // work-unit sub-agent task surfaces or test/runtime fixtures.
    const manifestPhase = tryGetManifestPhase(ref, runtime.nodesDir);
    if (manifestPhase) {
      const entryCached = runtime.contentCache.get(ref);
      if (entryCached && entryCached.frontmatter) {
        const { phase, stop, gate } = entryCached.frontmatter;

        if (phase === 'final' && stop === 'no' && (gate === null || gate === undefined)) {
          // Final terminal delivery: inject TERMINAL DELIVERY MODE
          injectContractHeader(runtime, ref, TERMINAL_DELIVERY_HEADER);
          if (logger) logger.debug(`injected TERMINAL DELIVERY MODE header into ${ref}`);
        } else if (stop === 'no' && gate != null) {
          // Non-terminal stop:no phase: inject AUTONOMOUS MODE
          injectContractHeader(runtime, ref, AUTONOMOUS_MODE_HEADER);
          if (logger) logger.debug(`injected AUTONOMOUS MODE header into ${ref}`);
        }
        // stop: yes or no stop field → no injection
      }
    }

    if (logger) logger.info(`load complete: ${ref}`, { plan: plan.length, order: state.executionOrder });
    emit(runtime, trace, 'load_complete', { entry: ref, plan, ts: new Date().toISOString() });
    return { state: nextState, status: 'loaded', runtime, plan };
  } catch (err) {
    if (logger) logger.error(`load failed: ${ref}`, { error: err.message });
    emit(runtime, trace, 'load_error', { entry: ref, error: err.message, ts: new Date().toISOString() });
    return { state, status: 'error', runtime, error: err.message };
  }
}
