// workflow-fsm.test.mjs — FSM Machine unit tests (node-keyed, passed/failed)
// @impl WFS-001, WFS-002, WFS-003
// Canonical test location: tests/engine/workflow-fsm.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-wfsm-tmp');

const {
  loadFSM,
  resolveTransition,
  createMachine,
} = await import('../../DPT_FRAMEWORK/engine/workflow-fsm.mjs');

function setupFSM(name, content) {
  if (!mkdirSync) return; // no-op guard
  try { mkdirSync(TMP, { recursive: true }); } catch {}
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  return p;
}

function cleanup() {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
}

const SIMPLE_FSM = {
  name: 'wf-simple',
  initial: 'phases/phase-entry.md',
  states: {
    'phases/phase-entry.md': { on: { passed: 'phases/phase-audit.md' } },
    'phases/phase-audit.md': { on: { passed: 'phases/phase-final.md' } },
    'phases/phase-final.md': { on: { passed: null } },
  },
};

const RETRY_FSM = {
  name: 'wf-retry',
  initial: 'phases/phase-retry.md',
  states: {
    'phases/phase-retry.md': { on: { passed: 'phases/phase-next.md', failed: 'phases/phase-retry.md' } },
    'phases/phase-next.md':  { on: { passed: null } },
  },
};

const HALT_FSM = {
  name: 'wf-halt',
  initial: 'phases/phase-halt.md',
  states: {
    'phases/phase-halt.md': { on: { passed: null } },
  },
};

// ─── 1. FSM Loading (WFS-001) ────────────────────────────────────────

describe('1. FSM Loading (WFS-001)', () => {

  it('1.1 loads valid FSM with passed/failed outcomes', () => {
    const fsm = loadFSM(setupFSM('simple.fsm.json', SIMPLE_FSM));
    assert.equal(fsm.name, 'wf-simple');
    assert.equal(fsm.initial, 'phases/phase-entry.md');
    assert.ok('phases/phase-entry.md' in fsm.states);
    assert.ok('phases/phase-final.md' in fsm.states);
    cleanup();
  });

  it('1.2 rejects FSM with initial not in states', () => {
    const badFSM = {
      name: 'bad',
      initial: 'phases/nonexistent.md',
      states: { 'phases/real.md': { on: { passed: null } } },
    };
    const tmpPath = setupFSM('_bad.fsm.json', badFSM);
    assert.throws(() => loadFSM(tmpPath), /initial/);
    cleanup();
  });

  it('1.3 rejects empty states', () => {
    const emptyFSM = {
      name: 'empty',
      initial: 'phases/x.md',
      states: {},
    };
    const tmpPath = setupFSM('_empty.fsm.json', emptyFSM);
    assert.throws(() => loadFSM(tmpPath));
    cleanup();
  });

  it('1.4 rejects invalid outcome keys (not passed/failed)', () => {
    const badOutcome = {
      name: 'bad-outcome',
      initial: 'phases/a.md',
      states: {
        'phases/a.md': { on: { success: 'phases/b.md' } },
      },
    };
    const tmpPath = setupFSM('_bad_outcome.fsm.json', badOutcome);
    assert.throws(() => loadFSM(tmpPath), /outcome/);
    cleanup();
  });
});

// ─── 2. Transition Resolution (WFS-002) ──────────────────────────────

describe('2. Transition Resolution (WFS-002)', () => {

  it('2.1 advance: returns next node', () => {
    const result = resolveTransition(SIMPLE_FSM, 'phases/phase-entry.md', 'passed');
    assert.equal(result.found, true);
    assert.equal(result.next, 'phases/phase-audit.md');
  });

  it('2.2 complete: null target', () => {
    const result = resolveTransition(SIMPLE_FSM, 'phases/phase-final.md', 'passed');
    assert.equal(result.found, true);
    assert.equal(result.next, null);
  });

  it('2.3 halt: unknown outcome', () => {
    const result = resolveTransition(SIMPLE_FSM, 'phases/phase-entry.md', 'blocked');
    assert.equal(result.found, false);
    assert.equal(result.next, null);
  });

  it('2.4 halt: unknown node', () => {
    const result = resolveTransition(SIMPLE_FSM, 'phases/nonexistent.md', 'passed');
    assert.equal(result.found, false);
    assert.equal(result.next, null);
  });
});

// ─── 3. Machine — Simple Chain (WFS-003) ─────────────────────────────

describe('3. Machine — Simple Chain (WFS-003)', () => {

  it('3.1 initializes at fsm.initial', () => {
    const m = createMachine(SIMPLE_FSM);
    assert.equal(m.current, 'phases/phase-entry.md');
    assert.equal(m.outcome, 'running');
    assert.equal(m.canAdvance, true);
    assert.equal(m.isComplete, false);
    assert.equal(m.isHalted, false);
    assert.equal(m.iterations, 0);
    assert.equal(m.receipts.length, 0);
  });

  it('3.2 advances through 3-node chain', () => {
    const m = createMachine(SIMPLE_FSM);

    assert.equal(m.advance('passed'), 'running');
    assert.equal(m.current, 'phases/phase-audit.md');

    assert.equal(m.advance('passed'), 'running');
    assert.equal(m.current, 'phases/phase-final.md');

    assert.equal(m.advance('passed'), 'complete');
    assert.equal(m.isComplete, true);
    assert.equal(m.canAdvance, false);
  });

  it('3.3 advance is no-op after completion', () => {
    const m = createMachine(SIMPLE_FSM);
    m.advance('passed');
    m.advance('passed');
    m.advance('passed');
    assert.equal(m.isComplete, true);
    const outcome = m.advance('passed');
    assert.equal(outcome, 'complete');
    assert.equal(m.iterations, 3); // no extra step
  });

  it('3.4 receipts track all transitions', () => {
    const m = createMachine(SIMPLE_FSM);
    m.advance('passed');
    m.advance('passed');
    m.advance('passed');

    const transitions = m.receipts.filter(r => r.type === 'transition');
    assert.equal(transitions.length, 3);
    assert.equal(transitions[0].currentNode, 'phases/phase-entry.md');
    assert.equal(transitions[1].currentNode, 'phases/phase-audit.md');
    assert.equal(transitions[2].currentNode, 'phases/phase-final.md');
    // Receipts use 'outcome' field, not 'status'
    assert.equal(transitions[0].outcome, 'passed');
  });
});

// ─── 4. Machine — Retry (WFS-002) ────────────────────────────────────

describe('4. Machine — Retry (WFS-002)', () => {

  it('4.1 retry self-loop on failed then succeeds', () => {
    const m = createMachine(RETRY_FSM);

    // First: failed → self-loop, stays on retry node
    assert.equal(m.advance('failed'), 'running');
    assert.equal(m.current, 'phases/phase-retry.md');
    assert.equal(m.canAdvance, true);

    // Second: passed → advance to next
    assert.equal(m.advance('passed'), 'running');
    assert.equal(m.current, 'phases/phase-next.md');

    // Third: passed → complete
    assert.equal(m.advance('passed'), 'complete');
    assert.equal(m.isComplete, true);
  });

  it('4.2 transition receipts show failed then passed', () => {
    const m = createMachine(RETRY_FSM);
    m.advance('failed');
    m.advance('passed');
    m.advance('passed');

    const transitions = m.receipts.filter(r => r.type === 'transition');
    assert.equal(transitions.length, 3);
    assert.equal(transitions[0].outcome, 'failed');
    assert.equal(transitions[1].outcome, 'passed');
  });

  it('4.3 lastTransition tracks the most recent result', () => {
    const m = createMachine(RETRY_FSM);
    m.advance('failed');
    assert.equal(m.lastTransition.found, true);
    assert.equal(m.lastTransition.next, 'phases/phase-retry.md');
  });
});

// ─── 5. Machine — Halt (WFS-002) ─────────────────────────────────────

describe('5. Machine — Halt (WFS-002)', () => {

  it('5.1 halts on undefined outcome', () => {
    const m = createMachine(HALT_FSM);
    m.advance('unknown_outcome');
    assert.equal(m.isHalted, true);
    assert.ok(m.haltReason.includes('unknown_outcome') || m.haltReason.includes('No transition'));
  });
});

// ─── 6. Recovery (WFS-003) ───────────────────────────────────────────

describe('6. Recovery (WFS-003)', () => {

  it('6.1 valid path works after halt on a different machine', () => {
    const m1 = createMachine(HALT_FSM);
    m1.advance('unknown_outcome');
    assert.equal(m1.isHalted, true);

    // New machine, new FSM — should work fine
    const m2 = createMachine(SIMPLE_FSM);
    assert.equal(m2.current, 'phases/phase-entry.md');
    m2.advance('passed');
    m2.advance('passed');
    assert.equal(m2.advance('passed'), 'complete');
    assert.equal(m2.isComplete, true);
  });
});

// ─── 7. createMachine factory ────────────────────────────────────────

describe('7. createMachine factory', () => {

  it('7.1 from path string', () => {
    const p = setupFSM('factory.fsm.json', SIMPLE_FSM);
    const m = createMachine(p);
    assert.equal(m.current, 'phases/phase-entry.md');
    assert.equal(m.fsm.name, 'wf-simple');
    cleanup();
  });

  it('7.2 from pre-loaded FSM object', () => {
    const m = createMachine(SIMPLE_FSM);
    assert.equal(m.current, 'phases/phase-entry.md');
  });

  it('7.3 returns outcome string from advance', () => {
    const m1 = createMachine(SIMPLE_FSM);
    m1.advance('passed');
    m1.advance('passed');
    assert.equal(m1.advance('passed'), 'complete');

    const m2 = createMachine(HALT_FSM);
    assert.equal(m2.advance('unknown_outcome'), 'halted');
  });
});
