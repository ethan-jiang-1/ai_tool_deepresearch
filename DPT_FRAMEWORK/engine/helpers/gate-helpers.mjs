// gate-helpers.mjs — Shared gate CLI utilities and validation helpers
// @impl GSK-001, GSK-002, GSK-004
// Canonical engine location: DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs
//
// ## Role
// Shared helpers for gate CLI wrappers and gate-loop/gate-fork engines.
// Provides:
//   - parseGateCliArgs()          — parse --bundle, --current-node, --transitions
//   - loadGateDefinition()        — load gate definition JSON
//   - loadManifest()              — load workflow manifest
//   - validateNodeGateBinding()   — check current-node ↔ gate binding
//   - resolveRouting()            — call detailed router
//   - buildGateResult()           — construct standard { check, routing, inspect, advice }
//   - emitGateResult()            — write JSON to stdout and exit with correct code
//   - validateState()             — throw if state is not a plain object
//   - validateRules()             — throw if any rule is invalid
//   - zodErrors()                 — map ZodError issues to plain diagnostics

import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNodeTransitionDetailed } from '../ask-next.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// Gate CLI Shared Utilities
// ═══════════════════════════════════════════════════════════════════════════

// ─── CLI Argument Parsing ──────────────────────────────────────────────────

/**
 * Parse standard gate CLI arguments.
 *
 * @returns {{ bundle: string, currentNode: string, transitions: string }}
 */
export function parseGateCliArgs() {
  const { values } = parseArgs({
    options: {
      bundle: { type: 'string' },
      'current-node': { type: 'string' },
      transitions: { type: 'string' },
    },
  });

  if (!values.bundle) {
    console.error('Error: --bundle <path> is required');
    process.exit(2);
  }

  if (!values['current-node']) {
    console.error('Error: --current-node <fileRef> is required');
    process.exit(2);
  }

  const transitionsPath = values.transitions
    || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

  return {
    bundle: values.bundle,
    currentNode: values['current-node'],
    transitions: transitionsPath,
  };
}

// ─── Gate Definition Loading ───────────────────────────────────────────────

/**
 * Load a gate definition JSON file.
 *
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @returns {{ gate: string, rules: Array }}
 */
export function loadGateDefinition(gateKey) {
  const defPath = join(__dirname, '..', '..', 'schema', 'gate_definitions', `gate-${gateKey}.definition.json`);
  const raw = readFileSync(defPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Load the workflow manifest.
 *
 * @returns {{ phases: Array, shared: Array }}
 */
export function loadManifest() {
  const manifestPath = join(__dirname, '..', '..', 'workflows', 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

// ─── Binding Validation ────────────────────────────────────────────────────

/**
 * Validate that the current-node fileRef is bound to the expected gate
 * according to the workflow manifest.
 *
 * Returns null on success, or an error message string on mismatch.
 *
 * @param {string} currentNodeRef — e.g. 'phases/phase-wave0.md'
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @returns {string|null} error message or null if valid
 *
 * @impl GSK-004
 */
export function validateNodeGateBinding(currentNodeRef, gateKey) {
  const manifest = loadManifest();
  const phase = manifest.phases.find(p => p.node === currentNodeRef);

  if (!phase) {
    return `current-node "${currentNodeRef}" not found in manifest phases`;
  }

  if (phase.gate !== gateKey) {
    return `Gate binding mismatch: current-node "${currentNodeRef}" expects gate "${phase.gate}" but CLI is for gate "${gateKey}"`;
  }

  return null;
}

// ─── Routing Integration ───────────────────────────────────────────────────

/**
 * Call the detailed router and return the routing result.
 *
 * @param {string} transitionsPath
 * @param {string} currentNodeRef
 * @param {string} outcome — 'passed' or 'failed'
 * @param {object} [context] — caller-owned routing context
 * @returns {{ kind: string, next: string|null, detail?: string }}
 */
export function resolveRouting(transitionsPath, currentNodeRef, outcome, context = {}) {
  return resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context);
}

// ─── Result Construction ───────────────────────────────────────────────────

/**
 * Build the standard gate result object.
 *
 * @param {object} opts
 * @param {boolean} opts.passed — whether the gate check passed
 * @param {string} opts.gate — gate key
 * @param {string} opts.currentNodeRef — canonical node fileRef
 * @param {object} opts.routing — detailed router result
 * @param {string[]} [opts.inspect] — diagnostic messages
 * @param {string[]} [opts.advice] — guidance messages
 * @param {object} [opts.extraCheck] — extra fields to merge into check
 * @returns {{ check: object, routing: object, inspect: string[], advice: string[] }}
 *
 * @impl GSK-002
 */
export function buildGateResult({ passed, gate, currentNodeRef, routing, inspect = [], advice = [], extraCheck = {} }) {
  const checkNext = routing.kind === 'next' ? routing.next : null;

  return {
    check: {
      passed,
      gate,
      currentNodeRef,
      next: checkNext,
      ...extraCheck,
    },
    routing,
    inspect,
    advice,
  };
}

// ─── Output and Exit ───────────────────────────────────────────────────────

/**
 * Emit the gate result as JSON to stdout and exit with the correct code.
 *
 * Exit code rules (GSK-002):
 *   passed=true  → exit(0)
 *   passed=false → exit(1)
 *   routing.kind is no_transition | invalid_input | config_error → exit(2)
 *
 * @param {object} result — from buildGateResult()
 *
 * @impl GSK-002
 */
export function emitGateResult(result) {
  console.log(JSON.stringify(result, null, 2));

  const routingErrorKinds = ['no_transition', 'invalid_input', 'config_error'];
  if (routingErrorKinds.includes(result.routing.kind)) {
    process.exit(2);
  }

  process.exit(result.check.passed ? 0 : 1);
}

// ─── Trace Reading ─────────────────────────────────────────────────────────

/**
 * Read trace events from rb_trace.jsonl, optionally filtered by event name.
 * Wave and seed-topics gate CLIs are the first to read rb_trace.jsonl
 * (pre-research gates only wrote to it). This shared reader avoids
 * duplicating JSONL parsing across 4 CLIs (3 wave + 1 seed-topics).
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {string|null} eventName — if provided, only return events matching this name
 * @returns {object[]}
 */
export function readTraceEvents(bundlePath, eventName = null) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  const raw = readFileSync(tracePath, 'utf-8').trim();
  if (!raw) return [];
  const events = raw.split('\n').map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  if (eventName) return events.filter(e => e.event === eventName);
  return events;
}

// ═══════════════════════════════════════════════════════════════════════════
// Gate Engine Validation Helpers (gate-loop / gate-fork)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Throw if state is not a plain object.
 */
export function validateState(state, caller) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error(`${caller}: state 必须是普通对象 (plain dict)，不能是 null 或数组`);
  }
}

/**
 * Throw if any rule is invalid.
 * Each rule must have: key (string), say (string), and at least one of
 * schema (with safeParse) or check (function).
 */
export function validateRules(rules, caller) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error(`${caller}: rules 必须是非空数组`);
  }
  rules.forEach((r, i) => {
    if (typeof r.key !== 'string' || r.key.length === 0) {
      throw new Error(`${caller}: rules[${i}].key 必须是非空字符串`);
    }
    if (typeof r.say !== 'string') {
      throw new Error(`${caller}: rules[${i}].say 必须是字符串`);
    }
    if (!r.schema && !r.check) {
      throw new Error(`${caller}: rules[${i}] (key="${r.key}") 必须提供 schema 或 check`);
    }
    if (r.schema && typeof r.schema.safeParse !== 'function') {
      throw new Error(`${caller}: rules[${i}].schema 必须是 Zod schema（需有 safeParse 方法）`);
    }
    if (r.check && typeof r.check !== 'function') {
      throw new Error(`${caller}: rules[${i}].check 必须是函数`);
    }
  });
}

/**
 * Map ZodError issues to plain diagnostics array.
 */
export function zodErrors(error) {
  return error.issues.map(i => ({
    field:    i.path.join('.'),
    code:     i.code,
    message:  i.message,
    received: i.received,
    expected: i.expected,
  }));
}
