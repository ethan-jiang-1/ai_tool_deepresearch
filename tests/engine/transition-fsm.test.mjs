// transition-fsm.test.mjs — FSM transition engine regression tests
// @impl TRT-003

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
  initial: 'node-a.md',
  states: {
    'node-a.md': { on: { success: 'node-b.md' } },
    'node-b.md': { on: { success: 'node-c.md', fail: 'node-repair.md' } },
    'node-c.md': { on: { success: null } },
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
  it('validates a correct FSM', () => {
    const fsm = FSMDefinition.parse(VALID_FSM);
    assert.strictEqual(fsm.initial, 'node-a.md');
    assert.strictEqual(fsm.states['node-c.md'].on.success, null);
  });

  it('rejects missing initial state', () => {
    assert.throws(() => FSMDefinition.parse({
      name: 'bad', initial: 'nonexistent', states: { 'node-a.md': { on: {} } },
    }));
  });

  it('rejects non-object', () => {
    assert.throws(() => FSMDefinition.parse([]));
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
  it('returns next and found=true for known node and state', () => {
    const r = resolveTransition(VALID_FSM, 'node-a.md', 'success');
    assert.deepStrictEqual(r, { next: 'node-b.md', found: true });
  });

  it('returns next=null found=true for terminal node', () => {
    const r = resolveTransition(VALID_FSM, 'node-c.md', 'success');
    assert.deepStrictEqual(r, { next: null, found: true });
  });

  it('returns found=false for unknown node', () => {
    const r = resolveTransition(VALID_FSM, 'ghost.md', 'success');
    assert.deepStrictEqual(r, { next: null, found: false });
  });

  it('returns found=false for unknown state', () => {
    const r = resolveTransition(VALID_FSM, 'node-a.md', 'blocked');
    assert.deepStrictEqual(r, { next: null, found: false });
  });
});

// ─── createFSM ───────────────────────────────────────────────────────────

describe('createFSM', () => {
  it('creates an FSM tracker from path', () => {
    const p = setupFSMFile('tfsm.fsm.json', VALID_FSM);
    const f = createFSM(p);
    assert.strictEqual(f.current, 'node-a.md');
    assert.strictEqual(f.isComplete, false);
  });

  it('creates an FSM tracker from object', () => {
    const f = createFSM(VALID_FSM);
    const r = f.askNext('success');
    assert.strictEqual(r.next, 'node-b.md');
    assert.strictEqual(r.found, true);
    assert.strictEqual(f.current, 'node-b.md');
    assert.strictEqual(f.receipts.length, 1);
  });

  it('becomes complete when next is null', () => {
    const f = createFSM(VALID_FSM);
    f.askNext('success'); // node-a → node-b
    f.askNext('success'); // node-b → node-c
    assert.strictEqual(f.current, 'node-c.md');
    f.askNext('success'); // node-c → null (terminal)
    assert.strictEqual(f.isComplete, true);
  });

  it('returns found=false for unknown state without changing current', () => {
    const f = createFSM(VALID_FSM);
    const current = f.current;
    f.askNext('unknown_status');
    assert.strictEqual(f.current, current); // unchanged
  });
});
