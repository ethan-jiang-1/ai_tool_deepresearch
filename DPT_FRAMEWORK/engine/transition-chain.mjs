// transition-chain.mjs — Chain transition engine
// @impl TRT-003
// Canonical engine location: DPT_FRAMEWORK/engine/transition-chain.mjs
//
// ## Role
// A deterministic transition resolver for the chain format
// (transitions.chain.json). Provides the same interface as workflow-fsm.mjs
// so ask-next.mjs can dispatch to either without shape differences.
//
// ## Exports
//   ChainDefinition, loadChain, resolveTransition, createChain

import { readFileSync } from 'node:fs';
import { z } from 'zod';

// ─── Chain Schema ───────────────────────────────────────────────────────

/** @impl TRT-003 */
export const ChainDefinition = z.record(
  z.string().min(1),
  z.record(z.string().min(1), z.string().nullable())
);

// ─── Chain Loading ──────────────────────────────────────────────────────

/**
 * Read and validate a .chain.json file.
 *
 * @param {string} path — absolute path to .chain.json file
 * @returns {object} validated chain definition
 * @throws {Error} if file unreadable, JSON invalid, or schema mismatch
 */
export function loadChain(path) {
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw);
  return ChainDefinition.parse(parsed);
}

// ─── Transition Resolution ─────────────────────────────────────────────

/**
 * Consult the chain table to determine the next node.
 *
 * Pure function — no side effects, no state mutations.
 *
 * @param {object} chain — validated chain definition
 * @param {string} gate — gate name (e.g. 'instantiation-complete')
 * @param {string} state — status string ('passed', 'failed', etc.)
 * @returns {{ next: string|null, found: boolean }}
 */
export function resolveTransition(chain, gate, state) {
  const node = chain[gate];
  if (!node) {
    return { next: null, found: false };
  }
  const next = node[state];
  if (next === undefined) {
    return { next: null, found: false };
  }
  return { next, found: true };
}

// ─── Chain State Tracker ────────────────────────────────────────────────

/**
 * Chain — a stateful transition tracker. Mirrors Machine from workflow-fsm.mjs.
 *
 * Usage:
 *   const c = createChain('transitions.chain.json', trace);
 *   c.current;          // current gate name
 *   c.advance('passed'); // feed status → update current, write trace
 *   c.isComplete;       // true when next is null
 *
 * @impl TRT-003
 */
export class Chain {
  /**
   * @param {object} chain — validated chain definition
   * @param {object} [trace] — optional trace instance
   */
  constructor(chain, trace = null) {
    this._chain = chain;
    this._current = null;
    this._next = null;
    this._outcome = 'running';
    this._receipts = [];
    this._iterations = 0;
    this._trace = trace;
  }

  get chain() { return this._chain; }
  get current() { return this._current; }
  get next() { return this._next; }
  get outcome() { return this._outcome; }
  get receipts() { return this._receipts; }
  get iterations() { return this._iterations; }
  get isComplete() { return this._outcome === 'complete'; }

  /**
   * Feed a gate+status and advance to next node.
   * @param {string} gate — gate name
   * @param {string} state — status string
   * @returns {{ next: string|null, found: boolean }}
   */
  askNext(gate, state) {
    const result = resolveTransition(this._chain, gate, state);
    this._current = gate;
    this._next = result.next;
    this._iterations++;

    const receipt = {
      type: 'transition',
      gate,
      state,
      ...result,
      ts: new Date().toISOString(),
    };
    this._receipts.push(receipt);
    if (this._trace) {
      this._trace.traceEntry('transition', { source: 'chain', ...receipt });
    }

    if (result.next === null) {
      this._outcome = 'complete';
    }

    return result;
  }
}

/**
 * Factory: create a Chain tracker from a .chain.json path or definition object.
 *
 * @param {string|object} pathOrDef — .chain.json path, or pre-loaded chain object
 * @param {object} [trace] — optional trace instance
 * @returns {Chain}
 */
export function createChain(pathOrDef, trace = null) {
  const chain = typeof pathOrDef === 'string'
    ? loadChain(pathOrDef)
    : pathOrDef;
  return new Chain(chain, trace);
}
