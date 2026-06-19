// transition-fsm.mjs — FSM transition resolver (pure engine)
// @impl TRT-003
// Canonical engine location: DPT_FRAMEWORK/engine/transition-fsm.mjs
//
// ## Role
// Pure FSM transition resolution — no state, no side effects.
// Mirrors transition-chain.mjs: both provide loadX(), resolveTransition(),
// and createX() for the unified ask-next.mjs dispatch.
//
// workflow-fsm.mjs imports from here for pure resolution, adds Machine tracking.
//
// ## Exports (mirror transition-chain.mjs)
//   FSMDefinition, loadFSM, resolveTransition, createFSM

import { readFileSync } from 'node:fs';
import { z } from 'zod';

// ─── FSM Schema ──────────────────────────────────────────────────────────

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
);

// ─── FSM Loading ─────────────────────────────────────────────────────────

/**
 * Read and validate a .fsm.json file.
 * @param {string} path — absolute path to .fsm.json file
 * @returns {object} validated FSM definition
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
 * @param {string} node — current node name (FSM state key)
 * @param {string} state — status string
 * @returns {{ next: string|null, found: boolean }}
 */
export function resolveTransition(fsm, node, state) {
  const stateDef = fsm.states[node];
  if (!stateDef) {
    return { next: null, found: false };
  }

  const target = stateDef.on[state];
  if (target === undefined) {
    return { next: null, found: false };
  }

  return { next: target, found: true };
}

// ─── FSM Tracker ─────────────────────────────────────────────────────────

/**
 * FSM — a stateful transition tracker. Mirrors Chain from transition-chain.mjs.
 *
 * @impl TRT-003
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
   * Feed a status and advance to the next node.
   * @param {string} state — status string
   * @returns {{ next: string|null, found: boolean }}
   */
  askNext(state) {
    const result = resolveTransition(this._fsm, this._current, state);
    this._next = result.next;
    this._iterations++;

    const receipt = {
      type: 'transition',
      currentNode: this._current,
      state,
      ...result,
      ts: new Date().toISOString(),
    };
    this._receipts.push(receipt);
    if (this._trace) {
      this._trace.traceEntry('transition', { source: 'fsm', ...receipt });
    }

    if (result.next === null || !result.found) {
      this._outcome = result.found ? 'complete' : 'halted';
    } else {
      this._current = result.next;
    }

    return result;
  }
}

/**
 * Factory: create an FSM tracker from a .fsm.json path or definition object.
 * @param {string|object} pathOrDef — .fsm.json path, or pre-loaded FSM object
 * @param {object} [trace] — optional trace instance
 * @returns {FSM}
 */
export function createFSM(pathOrDef, trace = null) {
  const fsm = typeof pathOrDef === 'string'
    ? loadFSM(pathOrDef)
    : pathOrDef;
  return new FSM(fsm, trace);
}
