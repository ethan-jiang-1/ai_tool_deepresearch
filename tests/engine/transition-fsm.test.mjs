// transition-fsm.test.mjs — FSM transition engine regression tests
// @impl WFS-001, WFS-002

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-fsm-tmp');

const {
  FSMDefinition,
  loadFSM,
  resolveTransition,
  createFSM,
} = await import('../../DPT_FRAMEWORK/engine/transition-fsm.mjs');

const VALID_FSM = {
  name: 'test',
  initial: 'phases/phase-a.md',
  states: {
    'phases/phase-a.md': { on: { passed: 'phases/phase-b.md' } },
    'phases/phase-b.md': { on: { passed: 'phases/phase-c.md', failed: 'phases/phase-repair.md' } },
    'phases/phase-c.md': { on: { passed: null } },
  },
};

function setupFSMFile(name, content) {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  return p;
}

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ─── Schema ──────────────────────────────────────────────────────────────

describe('FSMDefinition', () => {
  it('validates a correct FSM with passed/failed outcomes', () => {
    const fsm = FSMDefinition.parse(VALID_FSM);
    assert.strictEqual(fsm.initial, 'phases/phase-a.md');
    assert.strictEqual(fsm.states['phases/phase-c.md'].on.passed, null);
  });

  it('rejects missing initial state', () => {
    assert.throws(() => FSMDefinition.parse({
      name: 'bad', initial: 'nonexistent.md', states: { 'phases/phase-a.md': { on: {} } },
    }));
  });

  it('rejects non-object', () => {
    assert.throws(() => FSMDefinition.parse([]));
  });

  it('rejects outcome keys other than passed/failed', () => {
    assert.throws(() => FSMDefinition.parse({
      name: 'bad',
      initial: 'phases/phase-a.md',
      states: {
        'phases/phase-a.md': { on: { success: 'phases/phase-b.md' } },
      },
    }));
  });
});

// ─── loadFSM ─────────────────────────────────────────────────────────────

describe('loadFSM', () => {
  it('loads and validates a .fsm.json file', () => {
    const p = setupFSMFile('test.fsm.json', VALID_FSM);
    const fsm = loadFSM(p);
    assert.strictEqual(fsm.name, 'test');
  });

  it('throws on missing file', () => {
    assert.throws(() => loadFSM(join(TMP, 'nope.fsm.json')));
  });
});

// ─── resolveTransition ───────────────────────────────────────────────────

describe('resolveTransition', () => {
  it('returns next and found=true for known nodeRef and outcome', () => {
    const r = resolveTransition(VALID_FSM, 'phases/phase-a.md', 'passed');
    assert.deepStrictEqual(r, { next: 'phases/phase-b.md', found: true });
  });

  it('returns next=null found=true for terminal node', () => {
    const r = resolveTransition(VALID_FSM, 'phases/phase-c.md', 'passed');
    assert.deepStrictEqual(r, { next: null, found: true });
  });

  it('returns found=false for unknown nodeRef', () => {
    const r = resolveTransition(VALID_FSM, 'ghost.md', 'passed');
    assert.deepStrictEqual(r, { next: null, found: false });
  });

  it('returns found=false for unknown outcome', () => {
    const r = resolveTransition(VALID_FSM, 'phases/phase-a.md', 'blocked');
    assert.deepStrictEqual(r, { next: null, found: false });
  });
});

// ─── createFSM ───────────────────────────────────────────────────────────

describe('createFSM', () => {
  it('creates an FSM tracker from path', () => {
    const p = setupFSMFile('tfsm.fsm.json', VALID_FSM);
    const f = createFSM(p);
    assert.strictEqual(f.current, 'phases/phase-a.md');
    assert.strictEqual(f.isComplete, false);
  });

  it('creates an FSM tracker from object and advances', () => {
    const f = createFSM(VALID_FSM);
    const r = f.advance('passed');
    assert.strictEqual(r.next, 'phases/phase-b.md');
    assert.strictEqual(r.found, true);
    assert.strictEqual(f.current, 'phases/phase-b.md');
    assert.strictEqual(f.receipts.length, 1);
  });

  it('becomes complete when next is null', () => {
    const f = createFSM(VALID_FSM);
    f.advance('passed'); // phase-a → phase-b
    f.advance('passed'); // phase-b → phase-c
    assert.strictEqual(f.current, 'phases/phase-c.md');
    f.advance('passed'); // phase-c → null (terminal)
    assert.strictEqual(f.isComplete, true);
  });

  it('returns found=false for unknown outcome without changing current', () => {
    const f = createFSM(VALID_FSM);
    const current = f.current;
    const r = f.advance('unknown_status');
    assert.strictEqual(r.found, false);
    assert.strictEqual(f.current, current); // unchanged
  });
});
