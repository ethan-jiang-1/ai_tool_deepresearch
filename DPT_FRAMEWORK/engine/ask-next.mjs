// ask-next.mjs — Detailed node-result transition router
// @impl TRT-004, TRT-005
// Canonical engine location: DPT_FRAMEWORK/engine/ask-next.mjs
//
// ## Role
// Single entry point for detailed transition queries. Dispatches by file suffix:
//   .chain.json → transition-chain.mjs (loadChain + resolveTransition)
//
// Returns a discriminated result that classifies routing into exactly one of:
//   next, terminal, no_transition, invalid_input, config_error
//
// The retired `askNext(path, gate, state)` contract is NOT exposed.
//
// ## Usage
//   import { resolveNodeTransitionDetailed } from './ask-next.mjs';
//   const result = resolveNodeTransitionDetailed(
//     'transitions.chain.json',
//     'phases/phase-wave0.md',
//     'passed',
//     context
//   );
//   // → { kind: 'next', next: 'phases/phase-wave1.md' }

import { loadChain, resolveTransition as resolveChain } from './transition-chain.mjs';

// ─── Constants ────────────────────────────────────────────────────────────

const VALID_OUTCOMES = ['passed', 'failed'];

// ─── Input Validation ─────────────────────────────────────────────────────

/**
 * Canonicalize path separators to forward slashes.
 *
 * @param {string} p
 * @returns {string}
 */
function canonicalizePath(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Validate and normalize a workflow node fileRef.
 *
 * Accepts safe workflow-node-relative Markdown refs such as
 * `phases/phase-wave0.md` or `shared/foo.md`. Rejects absolute paths,
 * traversal/current-dir segments, empty segments, bare filenames, and non-md
 * targets.
 *
 * @param {string} ref
 * @returns {{ ok: true, ref: string } | { ok: false, detail: string }}
 */
function validateNodeRef(ref) {
  if (typeof ref !== 'string') {
    return { ok: false, detail: `node fileRef must be a string, got: ${JSON.stringify(ref)}` };
  }

  const normalized = canonicalizePath(ref);
  if (normalized.trim().length === 0) {
    return { ok: false, detail: 'node fileRef must not be empty' };
  }
  if (normalized !== normalized.trim()) {
    return { ok: false, detail: `node fileRef must not contain leading or trailing whitespace, got: ${JSON.stringify(ref)}` };
  }
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    return { ok: false, detail: `node fileRef must be relative, got: ${JSON.stringify(ref)}` };
  }
  if (!normalized.endsWith('.md')) {
    return { ok: false, detail: `node fileRef must end with .md, got: ${JSON.stringify(ref)}` };
  }
  if (!normalized.includes('/')) {
    return { ok: false, detail: `node fileRef must include a directory segment, got: ${JSON.stringify(ref)}` };
  }

  const segments = normalized.split('/');
  if (segments.some(segment => segment === '')) {
    return { ok: false, detail: `node fileRef must not contain empty path segments, got: ${JSON.stringify(ref)}` };
  }
  if (segments.some(segment => segment === '.' || segment === '..')) {
    return { ok: false, detail: `node fileRef must not contain "." or ".." path segments, got: ${JSON.stringify(ref)}` };
  }

  return { ok: true, ref: normalized };
}

// ─── Result Helpers ───────────────────────────────────────────────────────

function result(kind, next = null, detail = null) {
  const r = { kind, next };
  if (detail) r.detail = detail;
  return r;
}

function routedResult(transition, tableLabel, currentNodeRef, outcome) {
  if (!transition.found) {
    return result('no_transition', null,
      `No transition for "${currentNodeRef}" with outcome "${outcome}" in ${tableLabel} table`);
  }
  if (transition.next === null) {
    return result('terminal', null);
  }

  const nextRef = validateNodeRef(transition.next);
  if (!nextRef.ok) {
    return result('config_error', null,
      `Transition target for "${currentNodeRef}" with outcome "${outcome}" is invalid: ${nextRef.detail}`);
  }

  return result('next', nextRef.ref);
}

// ─── Detailed Router ──────────────────────────────────────────────────────

/**
 * Resolve the next node from a transition table using detailed classification.
 *
 * This is the accepted public router contract. It selects the backend by
 * file suffix, validates inputs, and returns a discriminated result object.
 *
 * `context` is a caller-owned plain object. It MAY carry explicit routing
 * inputs such as manifest/binding data and validator hints. The router only
 * reads documented inputs and does NOT infer routing authority from Markdown
 * prose, process globals, or hidden mutable state.
 *
 * @param {string} transitionsPath — path to transitions.<impl>.json file
 * @param {string} currentNodeRef — canonical node fileRef (e.g. 'phases/phase-wave0.md')
 * @param {string} outcome — public outcome vocabulary: 'passed' or 'failed'
 * @param {object} [context] — caller-owned plain object with optional routing hints
 * @returns {{ kind: string, next: string|null, detail?: string }}
 *
 * @impl TRT-004, TRT-005
 */
export function resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context = {}) {
  // ── Input validation ───────────────────────────────────────────────

  const currentRef = validateNodeRef(currentNodeRef);
  if (!currentRef.ok) {
    return result('invalid_input', null,
      `currentNodeRef must be a safe workflow node fileRef (e.g. 'phases/phase-wave0.md'): ${currentRef.detail}`);
  }

  if (!VALID_OUTCOMES.includes(outcome)) {
    return result('invalid_input', null,
      `outcome must be 'passed' or 'failed', got: ${JSON.stringify(outcome)}`);
  }

  // ── Suffix dispatch ────────────────────────────────────────────────

  const path = canonicalizePath(transitionsPath);

  try {
    if (path.endsWith('.chain.json')) {
      const chain = loadChain(path);
      const r = resolveChain(chain, currentRef.ref, outcome);
      return routedResult(r, 'chain', currentRef.ref, outcome);
    }

    return result('config_error', null,
      `Unknown transition format: ${path} (expected .chain.json)`);
  } catch (err) {
    // Load/parse errors are config errors
    if (err.code === 'ENOENT') {
      return result('config_error', null, `Transition file not found: ${path}`);
    }
    return result('config_error', null, `Transition config error: ${err.message}`);
  }
}
