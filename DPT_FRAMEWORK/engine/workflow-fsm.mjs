// workflow-fsm.mjs — FSM transition engine (Machine tracker)
// @impl WFS-001, WFS-002, WFS-003, FRE-001, FRE-002
// Canonical engine location: DPT_FRAMEWORK/engine/workflow-fsm.mjs
//
// ## Role
// A deterministic FSM machine tracker. Pure transition resolution is imported
// from transition-fsm.mjs — this module owns the stateful Machine class only.
//
// The engine does exactly two things:
//   1. resolveTransition(fsm, node, status) — pure function (re-exported)
//   2. Machine.advance(status) — update current node based on transition result
//
// ## Quick Start (MD Controller)
//
//   import { createTrace } from './trace.mjs';
//   import { createMachine } from './workflow-fsm.mjs';
//
//   const trace = createTrace('path/to/_trace.jsonl', { consoleEcho: false });
//   const m = createMachine('path/to/wf-simple.fsm.json', trace);
//
//   m.current;     // 'wave.entry.md'
//   m.canAdvance;  // true
//   m.advance('success');
//   m.current;     // 'wave-audit.entry.md'
//   m.isComplete;  // true
//   m.receipts;    // audit trail of all transitions
//
// ## Exports
//   FSMDefinition, loadFSM, resolveTransition,  (re-exported from transition-fsm)
//   Machine, createMachine                         (owned here)

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  FSMDefinition,
  loadFSM,
  resolveTransition,
} from './transition-fsm.mjs';

// Re-export pure functions for backward compatibility
export { FSMDefinition, loadFSM, resolveTransition };

// ─── Machine ──────────────────────────────────────────────────────────

/**
 * Machine — a stateful FSM tracker.
 *
 * The MD controller runs each node. When the node reports a transition
 * status, the controller feeds it to advance(). The engine consults the
 * FSM table and updates its internal state accordingly.
 *
 * @impl WFS-003
 */
export class Machine {
  constructor(fsm, trace = null) {
    this._fsm = fsm;
    this._current = fsm.initial;
    this._outcome = 'running';
    this._haltReason = null;
    this._receipts = [];
    this._iterations = 0;
    this._lastTransition = null;
    this._trace = trace;
  }

  get fsm() { return this._fsm; }
  get current() { return this._current; }
  get outcome() { return this._outcome; }
  get haltReason() { return this._haltReason; }
  get receipts() { return this._receipts; }
  get iterations() { return this._iterations; }
  get lastTransition() { return this._lastTransition; }
  get canAdvance() { return this._outcome === 'running'; }
  get isComplete() { return this._outcome === 'complete'; }
  get isHalted() { return this._outcome === 'halted'; }

  /**
   * Feed a transition status and advance the machine.
   */
  advance(status) {
    if (!this.canAdvance) return this._outcome;

    const currentNode = this._current;
    this._iterations++;

    const result = resolveTransition(this._fsm, currentNode, status);
    this._lastTransition = result;

    const receipt = {
      type: 'transition',
      currentNode,
      status,
      next: result.next,
      found: result.found,
      ts: new Date().toISOString(),
    };
    this._receipts.push(receipt);
    if (this._trace) {
      this._trace.traceEntry('transition', { source: 'wfsm', ...receipt });
    }

    if (!result.found) {
      this._outcome = 'halted';
      this._haltReason = `No transition for "${currentNode}" with status "${status}"`;
    } else if (result.next === null) {
      this._outcome = 'complete';
    } else {
      this._current = result.next;
    }

    return this._outcome;
  }
}

/**
 * Factory: create a Machine from a .fsm.json path or definition object.
 */
export function createMachine(fsmPathOrDef, trace = null) {
  const fsm = typeof fsmPathOrDef === 'string'
    ? loadFSM(fsmPathOrDef)
    : fsmPathOrDef;
  return new Machine(fsm, trace);
}
