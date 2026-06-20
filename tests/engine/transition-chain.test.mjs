// transition-chain.test.mjs — Chain transition engine regression tests
// @impl TRT-001, TRT-002, TRT-003

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
} = await import('../../DPT_FRAMEWORK/engine/transition-chain.mjs');

const VALID_CHAIN = {
  'phases/phase-instantiation.md': { passed: 'phases/phase-hitl1.md' },
  'phases/phase-hitl1.md':        { passed: 'phases/phase-setup.md' },
  'phases/phase-wave0.md':        { passed: 'phases/phase-wave1.md', failed: 'phases/phase-repair.md' },
  'phases/phase-final.md':        { passed: null },
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
  it('validates a correct chain with node fileRef keys', () => {
    const result = ChainDefinition.parse(VALID_CHAIN);
    assert.deepStrictEqual(result['phases/phase-instantiation.md'].passed, 'phases/phase-hitl1.md');
    assert.strictEqual(result['phases/phase-final.md'].passed, null);
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
    assert.strictEqual(chain['phases/phase-instantiation.md'].passed, 'phases/phase-hitl1.md');
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
  it('returns next and found=true for known currentNodeRef and outcome', () => {
    const r = resolveTransition(VALID_CHAIN, 'phases/phase-instantiation.md', 'passed');
    assert.deepStrictEqual(r, { next: 'phases/phase-hitl1.md', found: true });
  });

  it('returns next=null found=true for terminal node', () => {
    const r = resolveTransition(VALID_CHAIN, 'phases/phase-final.md', 'passed');
    assert.deepStrictEqual(r, { next: null, found: true });
  });

  it('returns found=false for unknown currentNodeRef', () => {
    const r = resolveTransition(VALID_CHAIN, 'phases/phase-nonexistent.md', 'passed');
    assert.deepStrictEqual(r, { next: null, found: false });
  });

  it('returns found=false for unknown outcome', () => {
    const r = resolveTransition(VALID_CHAIN, 'phases/phase-instantiation.md', 'blocked');
    assert.deepStrictEqual(r, { next: null, found: false });
  });

  it('returns failed outcome when defined', () => {
    const r = resolveTransition(VALID_CHAIN, 'phases/phase-wave0.md', 'failed');
    assert.deepStrictEqual(r, { next: 'phases/phase-repair.md', found: true });
  });
});
