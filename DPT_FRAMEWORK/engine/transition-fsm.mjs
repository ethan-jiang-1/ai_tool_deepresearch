// transition-fsm.mjs — Node-keyed FSM transition resolver (pure engine)
// @impl TRT-003, WFS-001, WFS-002
// Canonical engine location: DPT_FRAMEWORK/engine/transition-fsm.mjs
//
// ## Role
// Pure FSM transition resolution — no state, no side effects.
// Provides loadFSM(), resolveTransition(), and a low-level FSM tracker (createFSM).
// workflow-fsm.mjs imports from here for pure resolution, owns Machine/createMachine.
//
// ## Exports
//   FSMDefinition, loadFSM, resolveTransition, createFSM

import { readFileSync } from 'node:fs';
import { z } from 'zod';

// ─── FSM Schema ──────────────────────────────────────────────────────────

const VALID_OUTCOMES = ['passed', 'failed'];

/** @impl WFS-001 */
export const FSMDefinition = z.object({
  name: z.string(),
  initial: z.string().min(1),
  states: z.record(z.string().min(1), z.object({
    on: z.record(z.string().min(1), z.string().nullable()),
  })),
}).refine(
  (fsm) => fsm.initial in fsm.states,
  { message: 'FSM initial state must exist in states map' }
).refine(
  (fsm) => Object.keys(fsm.states).length > 0,
  { message: 'FSM states map must not be empty' }
).refine(
  (fsm) => {
    for (const stateKey of Object.keys(fsm.states)) {
      const outcomeKeys = Object.keys(fsm.states[stateKey].on);
      for (const k of outcomeKeys) {
        if (!VALID_OUTCOMES.includes(k)) {
          return false;
        }
      }
    }
    return true;
  },
  { message: 'FSM outcome keys must be "passed" or "failed"' }
);

// ─── FSM Loading ─────────────────────────────────────────────────────────

/**
 * Read and validate a .fsm.json file.
 *
 * Only reads and validates the FSM definition file. Does NOT read any
 * MD files referenced as node names in the states map.
 *
 * @param {string} path — absolute path to .fsm.json file
 * @returns {object} validated FSM definition
 * @throws {Error} if validation fails
 *
 * @impl WFS-001
 */
export function loadFSM(path) {
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw);
  return FSMDefinition.parse(parsed);
}

// ─── Transition Resolution ───────────────────────────────────────────────

/**
 * Consult the FSM to determine the next node.
 *
 * Pure function — no side effects.
 *
 * @param {object} fsm — validated FSM definition
 * @param {string} currentNodeRef — current node file reference (FSM state key)
 * @param {string} outcome — public outcome vocabulary: 'passed' or 'failed'
 * @returns {{ next: string|null, found: boolean }}
 *
 * @impl WFS-002
 */
export function resolveTransition(fsm, currentNodeRef, outcome) {
  const stateDef = fsm.states[currentNodeRef];
  if (!stateDef) {
    return { next: null, found: false };
  }

  const target = stateDef.on[outcome];
  if (target === undefined) {
    return { next: null, found: false };
  }

  return { next: target, found: true };
}

// ─── FSM Tracker ─────────────────────────────────────────────────────────

/**
 * FSM — a low-level stateful transition tracker.
 *
 * Provides a minimal tracker over a validated FSM definition. For the
 * higher-level Machine class with halt/completion semantics, see
 * workflow-fsm.mjs.
 *
 * @impl WFS-002
 */
export class FSM {
  constructor(fsm, trace = null) {
    this._fsm = fsm;
    this._current = fsm.initial;
    this._next = null;
    this._outcome = 'running';
    this._receipts = [];
    this._iterations = 0;
    this._trace = trace;
  }

  get fsm() { return this._fsm; }
  get current() { return this._current; }
  get next() { return this._next; }
  get outcome() { return this._outcome; }
  get receipts() { return this._receipts; }
  get iterations() { return this._iterations; }
  get canAdvance() { return this._outcome === 'running'; }
  get isComplete() { return this._outcome === 'complete'; }

  /**
   * Feed an outcome and advance to the next node.
   *
   * @param {string} outcome — public outcome: 'passed' or 'failed'
   * @returns {{ next: string|null, found: boolean }}
   */
  advance(outcome) {
    const result = resolveTransition(this._fsm, this._current, outcome);
    this._next = result.next;
    this._iterations++;

    const receipt = {
      type: 'transition',
      currentNode: this._current,
      outcome,
      ...result,
      ts: new Date().toISOString(),
    };
    this._receipts.push(receipt);
    if (this._trace) {
      this._trace.traceEntry('transition', { source: 'fsm', ...receipt });
    }

    if (result.next === null) {
      this._outcome = result.found ? 'complete' : 'halted';
    } else {
      this._current = result.next;
    }

    return result;
  }
}

/**
 * Factory: create an FSM tracker from a .fsm.json path or definition object.
 *
 * @param {string|object} pathOrDef — .fsm.json path, or pre-loaded FSM object
 * @param {object} [trace] — optional trace instance
 * @returns {FSM}
 *
 * @impl WFS-002
 */
export function createFSM(pathOrDef, trace = null) {
  const fsm = typeof pathOrDef === 'string'
    ? loadFSM(pathOrDef)
    : pathOrDef;
  return new FSM(fsm, trace);
}
