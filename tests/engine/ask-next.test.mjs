// ask-next.test.mjs — Unified transition table query regression tests
// @impl TRT-004

import { describe, it, before, after } from 'node:test';
// eslint-disable-next-line no-unused-vars — before/after used in describe blocks
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-asknext-tmp');

const { askNext } = await import('../../DPT_FRAMEWORK/engine/ask-next.mjs');

const CHAIN_DATA = {
  'gate-a': { passed: 'phases/phase-b.md' },
  'gate-b': { passed: 'phases/phase-c.md', failed: 'phases/phase-repair.md' },
  'gate-final': { passed: null },
};

before(() => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'transitions.chain.json'), JSON.stringify(CHAIN_DATA));
});

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ─── .chain.json dispatch ────────────────────────────────────────────────

describe('askNext with .chain.json', () => {
  it('returns next node for known gate and state', () => {
    const next = askNext(join(TMP, 'transitions.chain.json'), 'gate-a', 'passed');
    assert.strictEqual(next, 'phases/phase-b.md');
  });

  it('returns null for terminal gate', () => {
    const next = askNext(join(TMP, 'transitions.chain.json'), 'gate-final', 'passed');
    assert.strictEqual(next, null);
  });

  it('returns null for unknown gate', () => {
    const next = askNext(join(TMP, 'transitions.chain.json'), 'nonexistent', 'passed');
    assert.strictEqual(next, null);
  });

  it('returns null for unknown state', () => {
    const next = askNext(join(TMP, 'transitions.chain.json'), 'gate-a', 'blocked');
    assert.strictEqual(next, null);
  });

  it('returns failed state next when defined', () => {
    const next = askNext(join(TMP, 'transitions.chain.json'), 'gate-b', 'failed');
    assert.strictEqual(next, 'phases/phase-repair.md');
  });
});

// ─── .fsm.json dispatch ──────────────────────────────────────────────────

describe('askNext with .fsm.json', () => {
  before(() => {
    if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
    const fsm = {
      name: 'test-fsm',
      initial: 'node-a.md',
      states: {
        'node-a.md': { on: { success: 'node-b.md' } },
        'node-b.md': { on: { success: 'node-c.md', fail: 'node-repair.md' } },
        'node-c.md': { on: { success: null } },
      },
    };
    writeFileSync(join(TMP, 'transitions.fsm.json'), JSON.stringify(fsm));
  });

  it('returns next node for known node and state', () => {
    const next = askNext(join(TMP, 'transitions.fsm.json'), 'node-a.md', 'success');
    assert.strictEqual(next, 'node-b.md');
  });

  it('returns null for terminal node', () => {
    const next = askNext(join(TMP, 'transitions.fsm.json'), 'node-c.md', 'success');
    assert.strictEqual(next, null);
  });

  it('returns null for unknown node', () => {
    const next = askNext(join(TMP, 'transitions.fsm.json'), 'ghost.md', 'success');
    assert.strictEqual(next, null);
  });

  it('returns null for unknown state', () => {
    const next = askNext(join(TMP, 'transitions.fsm.json'), 'node-a.md', 'blocked');
    assert.strictEqual(next, null);
  });

  it('returns fail path when defined', () => {
    const next = askNext(join(TMP, 'transitions.fsm.json'), 'node-b.md', 'fail');
    assert.strictEqual(next, 'node-repair.md');
  });
});

// ─── File format handling ────────────────────────────────────────────────

describe('askNext format dispatch', () => {
  it('throws on unknown file format', () => {
    assert.throws(
      () => askNext('/tmp/transitions.yaml', 'gate-x', 'passed'),
      /Unknown transition format/
    );
  });

  it('throws on missing file', () => {
    assert.throws(
      () => askNext(join(TMP, 'nonexistent.chain.json'), 'gate-x', 'passed')
    );
  });
});

// ─── Integration: real framework file ────────────────────────────────────

describe('askNext with real transitions.chain.json', () => {
  it('returns correct next for all 8 lifecycle gates', () => {
    const real = join(__dirname, '../../DPT_FRAMEWORK/workflows/transitions.chain.json');
    assert.strictEqual(askNext(real, 'instantiation-complete', 'passed'), 'phases/phase-hitl1.md');
    assert.strictEqual(askNext(real, 'hitl1-recorded', 'passed'), 'phases/phase-setup.md');
    assert.strictEqual(askNext(real, 'setup-ready', 'passed'), 'phases/phase-wave0.md');
    assert.strictEqual(askNext(real, 'wave0-complete', 'passed'), 'phases/phase-wave1.md');
    assert.strictEqual(askNext(real, 'wave1-complete', 'passed'), 'phases/phase-wave2.md');
    assert.strictEqual(askNext(real, 'wave2-complete', 'passed'), 'phases/phase-hitl2.md');
    assert.strictEqual(askNext(real, 'hitl2-recorded', 'passed'), 'phases/phase-readiness.md');
    assert.strictEqual(askNext(real, 'readiness-passed', 'passed'), 'phases/phase-final.md');
  });
});
