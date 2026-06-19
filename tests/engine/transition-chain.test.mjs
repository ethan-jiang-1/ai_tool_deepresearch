// transition-chain.test.mjs — Chain transition engine regression tests
// @impl TRT-003

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-chain-tmp');

const {
  ChainDefinition,
  loadChain,
  resolveTransition,
  createChain,
} = await import('../../DPT_FRAMEWORK/engine/transition-chain.mjs');

const VALID_CHAIN = {
  'gate-a': { passed: 'phases/phase-b.md' },
  'gate-b': { passed: 'phases/phase-c.md', failed: 'phases/phase-repair.md' },
  'gate-final': { passed: null },
};

// Setup / teardown
function setupChainFile(name, content) {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  return p;
}

function cleanup() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
}

// ─── Schema ──────────────────────────────────────────────────────────────

describe('ChainDefinition', () => {
  it('validates a correct chain', () => {
    const result = ChainDefinition.parse(VALID_CHAIN);
    assert.deepStrictEqual(result['gate-a'].passed, 'phases/phase-b.md');
    assert.strictEqual(result['gate-final'].passed, null);
  });

  it('rejects non-object', () => {
    assert.throws(() => ChainDefinition.parse([]));
  });
});

// ─── loadChain ───────────────────────────────────────────────────────────

describe('loadChain', () => {
  it('loads and validates a .chain.json file', () => {
    const p = setupChainFile('test.chain.json', VALID_CHAIN);
    const chain = loadChain(p);
    assert.strictEqual(chain['gate-a'].passed, 'phases/phase-b.md');
    cleanup();
  });

  it('throws on missing file', () => {
    assert.throws(() => loadChain(join(TMP, 'nonexistent.chain.json')));
  });

  it('throws on invalid JSON', () => {
    const p = setupChainFile('bad.chain.json', '{not json}');
    assert.throws(() => loadChain(p));
    cleanup();
  });
});

// ─── resolveTransition ───────────────────────────────────────────────────

describe('resolveTransition', () => {
  it('returns next and found=true for known gate and state', () => {
    const r = resolveTransition(VALID_CHAIN, 'gate-a', 'passed');
    assert.deepStrictEqual(r, { next: 'phases/phase-b.md', found: true });
  });

  it('returns next=null for terminal gate', () => {
    const r = resolveTransition(VALID_CHAIN, 'gate-final', 'passed');
    assert.deepStrictEqual(r, { next: null, found: true });
  });

  it('returns found=false for unknown gate', () => {
    const r = resolveTransition(VALID_CHAIN, 'nonexistent', 'passed');
    assert.deepStrictEqual(r, { next: null, found: false });
  });

  it('returns found=false for unknown state', () => {
    const r = resolveTransition(VALID_CHAIN, 'gate-a', 'blocked');
    assert.deepStrictEqual(r, { next: null, found: false });
  });

  it('returns failed state when defined', () => {
    const r = resolveTransition(VALID_CHAIN, 'gate-b', 'failed');
    assert.deepStrictEqual(r, { next: 'phases/phase-repair.md', found: true });
  });
});

// ─── createChain ─────────────────────────────────────────────────────────

describe('createChain', () => {
  it('creates a Chain from path', () => {
    const p = setupChainFile('tc.chain.json', VALID_CHAIN);
    const c = createChain(p);
    assert.strictEqual(c.current, null);
    assert.strictEqual(c.isComplete, false);
    cleanup();
  });

  it('creates a Chain from definition object', () => {
    const c = createChain(VALID_CHAIN);
    const r = c.askNext('gate-a', 'passed');
    assert.strictEqual(r.next, 'phases/phase-b.md');
    assert.strictEqual(r.found, true);
    assert.strictEqual(c.current, 'gate-a');
    assert.strictEqual(c.isComplete, false);
    assert.strictEqual(c.receipts.length, 1);
  });

  it('becomes complete when next is null', () => {
    const c = createChain(VALID_CHAIN);
    c.askNext('gate-a', 'passed');
    assert.strictEqual(c.isComplete, false);
    c.askNext('gate-final', 'passed');
    assert.strictEqual(c.isComplete, true);
    assert.strictEqual(c.receipts.length, 2);
  });
});
