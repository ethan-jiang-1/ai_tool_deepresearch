// workflow-fsm.test.mjs — FSM transition engine unit tests
// @impl WFS-001, WFS-002, WFS-003
// Canonical test location: tests/engine/workflow-fsm.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, unlinkSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  loadFSM,
  resolveTransition,
  createMachine,
} = await import('../../DPT_FRAMEWORK/engine/workflow-fsm.mjs');

const NOD = join(__dirname, '../../experiments/prototype-workflow-fsm/nodes-workflow-fsm');

// ─── 1. FSM Loading (WFS-001) ────────────────────────────────────────

describe('1. FSM Loading (WFS-001)', () => {

  it('1.1 loads valid FSM', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    assert.equal(fsm.name, 'wf-simple');
    assert.equal(fsm.initial, 'wave.entry.md');
    assert.ok('wave.entry.md' in fsm.states);
    assert.ok('wave-final.entry.md' in fsm.states);
  });

  it('1.2 rejects FSM with initial not in states', () => {
    const badFSM = {
      name: 'bad',
      initial: 'nonexistent.md',
      states: { 'real.md': { on: { success: null } } },
    };
    const tmpPath = join(NOD, '_test_bad.fsm.json');
    writeFileSync(tmpPath, JSON.stringify(badFSM));
    assert.throws(() => loadFSM(tmpPath), /initial/);
    unlinkSync(tmpPath);
  });

  it('1.3 rejects empty states', () => {
    const emptyFSM = {
      name: 'empty',
      initial: 'x.md',
      states: {},
    };
    const tmpPath = join(NOD, '_test_empty.fsm.json');
    writeFileSync(tmpPath, JSON.stringify(emptyFSM));
    assert.throws(() => loadFSM(tmpPath));
    unlinkSync(tmpPath);
  });
});

// ─── 2. Transition Resolution (WFS-002) ──────────────────────────────

describe('2. Transition Resolution (WFS-002)', () => {

  const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));

  it('2.1 advance: returns next node', () => {
    const result = resolveTransition(fsm, 'wave.entry.md', 'success');
    assert.equal(result.action, 'advance');
    assert.equal(result.next, 'wave-audit.entry.md');
  });

  it('2.2 complete: null target', () => {
    const result = resolveTransition(fsm, 'wave-final.entry.md', 'success');
    assert.equal(result.action, 'complete');
  });

  it('2.3 halt: unknown status', () => {
    const result = resolveTransition(fsm, 'wave.entry.md', 'unknown_status');
    assert.equal(result.action, 'halt');
    assert.ok(result.reason.includes('unknown_status') || result.reason.includes('No transition'));
  });

  it('2.4 halt: unknown node', () => {
    const result = resolveTransition(fsm, 'nonexistent.md', 'success');
    assert.equal(result.action, 'halt');
    assert.ok(result.reason.includes('nonexistent.md'));
  });
});

// ─── 3. Machine — Simple Chain (WFS-003) ─────────────────────────────

describe('3. Machine — Simple Chain (WFS-003)', () => {

  it('3.1 initializes at fsm.initial', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    assert.equal(m.current, 'wave.entry.md');
    assert.equal(m.outcome, 'running');
    assert.equal(m.canAdvance, true);
    assert.equal(m.isComplete, false);
    assert.equal(m.isHalted, false);
    assert.equal(m.iterations, 0);
    assert.equal(m.receipts.length, 0);
  });

  it('3.2 advances through 3-node chain', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));

    assert.equal(m.advance('success'), 'running');
    assert.equal(m.current, 'wave-audit.entry.md');

    assert.equal(m.advance('success'), 'running');
    assert.equal(m.current, 'wave-final.entry.md');

    assert.equal(m.advance('success'), 'complete');
    assert.equal(m.isComplete, true);
    assert.equal(m.canAdvance, false);
  });

  it('3.3 advance is no-op after completion', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    m.advance('success');
    m.advance('success');
    m.advance('success');
    assert.equal(m.isComplete, true);
    const outcome = m.advance('success');
    assert.equal(outcome, 'complete');
    assert.equal(m.iterations, 3); // no extra step
  });

  it('3.4 receipts track all transitions', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    m.advance('success');
    m.advance('success');
    m.advance('success');

    const transitions = m.receipts.filter(r => r.type === 'transition');
    assert.equal(transitions.length, 3);
    assert.equal(transitions[0].currentNode, 'wave.entry.md');
    assert.equal(transitions[1].currentNode, 'wave-audit.entry.md');
    assert.equal(transitions[2].currentNode, 'wave-final.entry.md');
  });
});

// ─── 4. Machine — Retry (WFS-002) ────────────────────────────────────

describe('4. Machine — Retry (WFS-002)', () => {

  it('4.1 retry self-loop on error then succeeds', () => {
    const m = createMachine(join(NOD, 'wf-retry.fsm.json'));

    // First: error → self-loop, stays on retry-node
    assert.equal(m.advance('error'), 'running');
    assert.equal(m.current, 'retry-node.entry.md');
    assert.equal(m.canAdvance, true);

    // Second: success → advance to retry-next
    assert.equal(m.advance('success'), 'running');
    assert.equal(m.current, 'retry-next.entry.md');

    // Third: success → complete
    assert.equal(m.advance('success'), 'complete');
    assert.equal(m.isComplete, true);
  });

  it('4.2 transition receipts show error then success', () => {
    const m = createMachine(join(NOD, 'wf-retry.fsm.json'));
    m.advance('error');
    m.advance('success');
    m.advance('success');

    const transitions = m.receipts.filter(r => r.type === 'transition');
    assert.equal(transitions.length, 3);
    assert.equal(transitions[0].status, 'error');
    assert.equal(transitions[1].status, 'success');
  });

  it('4.3 lastTransition tracks the most recent result', () => {
    const m = createMachine(join(NOD, 'wf-retry.fsm.json'));
    m.advance('error');
    assert.equal(m.lastTransition.action, 'advance');
    assert.equal(m.lastTransition.next, 'retry-node.entry.md');
  });
});

// ─── 5. Machine — Halt (WFS-002) ─────────────────────────────────────

describe('5. Machine — Halt (WFS-002)', () => {

  it('5.1 halts on undefined status', () => {
    const m = createMachine(join(NOD, 'wf-halt.fsm.json'));
    m.advance('undefined_status');
    assert.equal(m.isHalted, true);
    assert.ok(m.haltReason.includes('undefined_status') || m.haltReason.includes('No transition'));
  });
});

// ─── 6. Recovery (WFS-003) ───────────────────────────────────────────

describe('6. Recovery (WFS-003)', () => {

  it('6.1 valid path works after halt', () => {
    const m1 = createMachine(join(NOD, 'wf-halt.fsm.json'));
    m1.advance('undefined_status');
    assert.equal(m1.isHalted, true);

    // New machine, new FSM — should work fine
    const m2 = createMachine(join(NOD, 'wf-valid.fsm.json'));
    assert.equal(m2.current, 'wave.entry.md');
    m2.advance('success');
    assert.equal(m2.isComplete, true);
  });
});

// ─── 7. createMachine factory ────────────────────────────────────────

describe('7. createMachine factory', () => {

  it('7.1 from path string', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    assert.equal(m.current, 'wave.entry.md');
    assert.equal(m.fsm.name, 'wf-simple');
  });

  it('7.2 from pre-loaded FSM object', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    const m = createMachine(fsm);
    assert.equal(m.current, 'wave.entry.md');
  });

  it('7.3 returns outcome string from advance', () => {
    const m1 = createMachine(join(NOD, 'wf-simple.fsm.json'));
    m1.advance('success');
    m1.advance('success');
    assert.equal(m1.advance('success'), 'complete');

    const m2 = createMachine(join(NOD, 'wf-halt.fsm.json'));
    assert.equal(m2.advance('undefined_status'), 'halted');
  });
});
