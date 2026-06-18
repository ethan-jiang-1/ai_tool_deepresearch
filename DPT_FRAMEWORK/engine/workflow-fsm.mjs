// workflow-fsm.mjs — FSM transition engine
// @impl WFS-001, WFS-002, WFS-003, FRE-001, FRE-002
// Canonical engine location: DPT_FRAMEWORK/engine/workflow-fsm.mjs
//
// ## Role
// A deterministic FSM transition resolver. Given a validated .fsm.json,
// the engine tracks the current node and resolves transitions when the
// MD controller feeds it a status. The engine does NOT read node files,
// run code blocks, or resolve dependencies — those are MD controller /
// coding agent responsibilities.
//
// The engine does exactly two things:
//   1. resolveTransition(fsm, node, status) — pure function, consults FSM table
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
//
//   // MD controller runs wave.entry.md, node calls transition('success'):
//   m.advance('success');
//   m.current;     // 'wave-audit.entry.md'
//
//   m.advance('success');
//   m.current;     // 'wave-final.entry.md'
//
//   m.advance('success');
//   m.isComplete;  // true
//   m.receipts;    // audit trail of all transitions
//
// ## Exports
//   FSMDefinition, loadFSM, resolveTransition,
//   Machine, createMachine

import { readFileSync } from 'node:fs';
import { z } from 'zod';

// ─── FSM Schema ───────────────────────────────────────────────────────

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

// ─── FSM Loading ──────────────────────────────────────────────────────

/**
 * Read and validate a .fsm.json file.
 *
 * Does NOT read any MD files referenced in states.
 *
 * @param {string} fsmPath - absolute path to .fsm.json file
 * @returns {object} validated FSM definition
 * @throws {Error} if file unreadable, JSON invalid, or schema mismatch
 *
 * @impl WFS-001
 */
export function loadFSM(fsmPath) {
  const raw = readFileSync(fsmPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return FSMDefinition.parse(parsed);
}

// ─── Transition Resolution ────────────────────────────────────────────

/**
 * Consult the FSM definition to determine the next action.
 *
 * Pure function — no side effects, no state mutations.
 *
 * Given a currentNode and the status reported by the MD controller after
 * running that node, returns one of:
 *   - { action: 'advance', next: string }  — move to next node
 *   - { action: 'complete' }               — terminal (null target)
 *   - { action: 'halt', reason: string }    — no matching transition
 *
 * @param {object} fsm - validated FSM definition
 * @param {string} currentNode - node name (FSM state key)
 * @param {string} status - status string from transition() call
 * @returns {{ action: 'advance'|'complete'|'halt', next?: string, reason?: string }}
 *
 * @impl WFS-002
 */
export function resolveTransition(fsm, currentNode, status) {
  const stateDef = fsm.states[currentNode];
  if (!stateDef) {
    return {
      action: 'halt',
      reason: `Node "${currentNode}" not found in FSM states`,
    };
  }

  const target = stateDef.on[status];
  if (target === undefined) {
    return {
      action: 'halt',
      reason: `No transition defined for node "${currentNode}" with status "${status}". Available: ${Object.keys(stateDef.on).join(', ')}`,
    };
  }

  if (target === null) {
    return { action: 'complete' };
  }

  return { action: 'advance', next: target };
}

// ─── Machine ──────────────────────────────────────────────────────────

/**
 * Machine — a stateful FSM tracker.
 *
 * Usage:
 *   const m = createMachine('wf-simple.fsm.json', trace);
 *   m.current;          // current node name
 *   m.canAdvance;       // not yet at a terminal
 *   m.advance(status);  // feed transition status → update current
 *   m.isComplete;       // reached a terminal null target
 *   m.isHalted;         // no matching transition found
 *   m.receipts;         // full audit trail of transitions
 *
 * The MD controller runs each node. When the node reports a transition
 * status, the controller feeds it to advance(). The engine consults the
 * FSM table and updates its internal state accordingly.
 *
 * @impl WFS-003
 */
export class Machine {
  /**
   * @param {object} fsm - validated FSM definition
   * @param {object} [trace] - optional trace instance (createTrace)
   */
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

  // ─── Properties ──────────────────────────────────────────────────

  /** Current FSM definition */
  get fsm() { return this._fsm; }
  /** Current node name (FSM state) */
  get current() { return this._current; }
  /** 'running' | 'complete' | 'halted' */
  get outcome() { return this._outcome; }
  /** Halt reason, valid only when outcome === 'halted' */
  get haltReason() { return this._haltReason; }
  /** Transition receipt audit trail */
  get receipts() { return this._receipts; }
  /** Number of transitions resolved so far */
  get iterations() { return this._iterations; }
  /** Last resolveTransition result */
  get lastTransition() { return this._lastTransition; }

  /** Can the machine still advance? */
  get canAdvance() { return this._outcome === 'running'; }
  /** Has the workflow completed successfully? */
  get isComplete() { return this._outcome === 'complete'; }
  /** Has the workflow halted with an error? */
  get isHalted() { return this._outcome === 'halted'; }

  // ─── advance ─────────────────────────────────────────────────────

  /**
   * Feed a transition status and advance the machine.
   *
   * The MD controller runs the current node, reads its transition status,
   * and feeds it here. The engine consults the FSM table and updates its
   * internal state accordingly.
   *
   * @param {string} status - status reported by the current node
   * @returns {'complete'|'halted'|'running'} outcome after this step
   */
  advance(status) {
    if (!this.canAdvance) return this._outcome;

    const currentNode = this._current;
    this._iterations++;

    const result = resolveTransition(this._fsm, currentNode, status);
    this._lastTransition = result;

    // Emit receipt + trace
    const receipt = {
      type: 'transition',
      currentNode,
      status,
      ...result,
      ts: new Date().toISOString(),
    };
    this._receipts.push(receipt);
    if (this._trace) {
      this._trace.traceEntry('transition', { source: 'wfsm', ...receipt });
    }

    if (result.action === 'complete') {
      this._outcome = 'complete';
    } else if (result.action === 'halt') {
      this._outcome = 'halted';
      this._haltReason = result.reason;
    } else {
      this._current = result.next;
    }

    return this._outcome;
  }
}

/**
 * Factory: create a Machine from a .fsm.json path or definition object.
 *
 * @param {string|object} fsmPathOrDef - .fsm.json path, or pre-loaded FSM object
 * @param {object} [trace] - optional trace instance (createTrace)
 * @returns {Machine}
 */
export function createMachine(fsmPathOrDef, trace = null) {
  const fsm = typeof fsmPathOrDef === 'string'
    ? loadFSM(fsmPathOrDef)
    : fsmPathOrDef;
  return new Machine(fsm, trace);
}
