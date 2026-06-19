// ask-next.mjs — Unified transition table query
// @impl TRT-004
// Canonical engine location: DPT_FRAMEWORK/engine/ask-next.mjs
//
// ## Role
// Single entry point for transition queries. Dispatches by file suffix:
//   .chain.json → transition-chain.mjs (loadChain + resolveTransition)
//   .fsm.json   → workflow-fsm.mjs    (loadFSM + resolveTransition)
//
// Gate CLI calls askNext(path, gate, state) → gets next_node or null.
// Gate doesn't know or care which format is behind the path.
//
// ## Usage
//   import { askNext } from './ask-next.mjs';
//   const next = askNext('transitions.chain.json', 'instantiation-complete', 'passed');
//   // → 'phases/phase-hitl1.md' | null

import { loadChain, resolveTransition as resolveChain } from './transition-chain.mjs';
import { loadFSM, resolveTransition as resolveFSM } from './transition-fsm.mjs';

/**
 * Query the transition table for the next node.
 *
 * @param {string} path — path to transitions.<impl>.json file
 * @param {string} gate — gate name (e.g. 'instantiation-complete')
 * @param {string} state — status string ('passed', 'failed', etc.)
 * @returns {string|null} next node path, or null if unknown/terminal
 * @throws {Error} if file format is unrecognized
 */
export function askNext(path, gate, state) {
  if (path.endsWith('.chain.json')) {
    const chain = loadChain(path);
    const result = resolveChain(chain, gate, state);
    return result.found ? result.next : null;
  }

  if (path.endsWith('.fsm.json')) {
    const fsm = loadFSM(path);
    const result = resolveFSM(fsm, gate, state);
    // transition-fsm returns { next: string|null, found: boolean }
    return result.found ? result.next : null;
  }

  throw new Error(`Unknown transition format: ${path} (expected .chain.json or .fsm.json)`);
}
