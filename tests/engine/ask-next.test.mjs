// ask-next.test.mjs — Detailed node-result transition router regression tests
// @impl TRT-004, TRT-005

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-asknext-tmp');

const { resolveNodeTransitionDetailed } = await import('../../DPT_FRAMEWORK/engine/ask-next.mjs');

const CHAIN_DATA = {
  'phases/phase-instantiation.md': { passed: 'phases/phase-hitl1.md' },
  'phases/phase-wave0.md':        { passed: 'phases/phase-wave1.md', failed: 'phases/phase-repair.md' },
  'phases/phase-final.md':        { passed: null },
};

const CHAIN_DATA_BACKSLASH_NEXT = {
  'phases/phase-wave0.md': { passed: 'phases\\phase-wave1.md' },
};

const CHAIN_DATA_INVALID_NEXT = {
  'phases/phase-wave0.md': { passed: '../bad.md' },
};

before(() => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'transitions.chain.json'), JSON.stringify(CHAIN_DATA));
  writeFileSync(join(TMP, 'transitions.backslash-next.chain.json'), JSON.stringify(CHAIN_DATA_BACKSLASH_NEXT));
  writeFileSync(join(TMP, 'transitions.invalid-next.chain.json'), JSON.stringify(CHAIN_DATA_INVALID_NEXT));
});

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ─── Detailed result classification (both backends) ─────────────────────

describe('resolveNodeTransitionDetailed — next result', () => {
  it('chain: returns kind=next with next node', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phases/phase-instantiation.md', 'passed');
    assert.strictEqual(r.kind, 'next');
    assert.strictEqual(r.next, 'phases/phase-hitl1.md');
  });

  it('chain: normalizes backslashes in currentNodeRef', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phases\\phase-wave0.md', 'passed');
    assert.strictEqual(r.kind, 'next');
    assert.strictEqual(r.next, 'phases/phase-wave1.md');
  });

  it('chain: normalizes backslashes in transition targets', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.backslash-next.chain.json'), 'phases/phase-wave0.md', 'passed');
    assert.strictEqual(r.kind, 'next');
    assert.strictEqual(r.next, 'phases/phase-wave1.md');
  });

});

describe('resolveNodeTransitionDetailed — terminal result', () => {
  it('chain: returns kind=terminal when next is null', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phases/phase-final.md', 'passed');
    assert.strictEqual(r.kind, 'terminal');
    assert.strictEqual(r.next, null);
  });

});

describe('resolveNodeTransitionDetailed — no_transition result', () => {
  it('chain: returns kind=no_transition for unknown node', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phases/phase-unknown.md', 'passed');
    assert.strictEqual(r.kind, 'no_transition');
    assert.strictEqual(r.next, null);
  });

  it('chain: returns kind=invalid_input for unknown outcome (not passed/failed)', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phases/phase-wave0.md', 'blocked');
    assert.strictEqual(r.kind, 'invalid_input');
    assert.strictEqual(r.next, null);
  });

});

describe('resolveNodeTransitionDetailed — invalid_input result', () => {
  it('rejects empty currentNodeRef', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), '', 'passed');
    assert.strictEqual(r.kind, 'invalid_input');
  });

  it('rejects gate-key as currentNodeRef', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'wave0-complete', 'passed');
    assert.strictEqual(r.kind, 'invalid_input');
  });

  it('rejects bare filename without directory', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phase-wave0.md', 'passed');
    assert.strictEqual(r.kind, 'invalid_input');
  });

  for (const ref of ['../escape.md', 'phases/../x.md', 'phases/./x.md', '/abs.md', 'C:\\abs.md', 'phases//x.md', 'phases/x.txt']) {
    it(`rejects unsafe currentNodeRef ${JSON.stringify(ref)}`, () => {
      const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), ref, 'passed');
      assert.strictEqual(r.kind, 'invalid_input');
      assert.strictEqual(r.next, null);
    });
  }

  it('rejects invalid outcome', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.chain.json'), 'phases/phase-wave0.md', 'success');
    assert.strictEqual(r.kind, 'invalid_input');
  });
});

describe('resolveNodeTransitionDetailed — config_error result', () => {
  it('returns config_error for unsupported suffix', () => {
    const r = resolveNodeTransitionDetailed('/tmp/transitions.yaml', 'phases/phase-wave0.md', 'passed');
    assert.strictEqual(r.kind, 'config_error');
  });

  it('returns config_error for missing file', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'nonexistent.chain.json'), 'phases/phase-wave0.md', 'passed');
    assert.strictEqual(r.kind, 'config_error');
  });

  it('returns config_error for invalid transition table next target', () => {
    const r = resolveNodeTransitionDetailed(join(TMP, 'transitions.invalid-next.chain.json'), 'phases/phase-wave0.md', 'passed');
    assert.strictEqual(r.kind, 'config_error');
    assert.strictEqual(r.next, null);
  });
});

// ─── Retired contracts ───────────────────────────────────────────────────

describe('Retired askNext API', () => {
  it('askNext is not exported', async () => {
    const mod = await import('../../DPT_FRAMEWORK/engine/ask-next.mjs');
    assert.strictEqual(typeof mod.askNext, 'undefined', 'askNext should not be exported');
  });
});

// ─── Integration: real framework chain file ──────────────────────────────

describe('resolveNodeTransitionDetailed with real transitions.chain.json', () => {
  it('resolves all 9 lifecycle transitions', () => {
    const real = join(__dirname, '../../DPT_FRAMEWORK/workflows/transitions.chain.json');

    const r1 = resolveNodeTransitionDetailed(real, 'phases/phase-instantiation.md', 'passed');
    assert.strictEqual(r1.kind, 'next');
    assert.strictEqual(r1.next, 'phases/phase-hitl1.md');

    const r2 = resolveNodeTransitionDetailed(real, 'phases/phase-hitl1.md', 'passed');
    assert.strictEqual(r2.kind, 'next');
    assert.strictEqual(r2.next, 'phases/phase-setup.md');

    const r3 = resolveNodeTransitionDetailed(real, 'phases/phase-setup.md', 'passed');
    assert.strictEqual(r3.kind, 'next');
    assert.strictEqual(r3.next, 'phases/phase-seed-topics.md');

    const r3b = resolveNodeTransitionDetailed(real, 'phases/phase-seed-topics.md', 'passed');
    assert.strictEqual(r3b.kind, 'next');
    assert.strictEqual(r3b.next, 'phases/phase-wave0.md');

    const r4 = resolveNodeTransitionDetailed(real, 'phases/phase-wave0.md', 'passed');
    assert.strictEqual(r4.kind, 'next');
    assert.strictEqual(r4.next, 'phases/phase-wave1.md');

    const r5 = resolveNodeTransitionDetailed(real, 'phases/phase-wave1.md', 'passed');
    assert.strictEqual(r5.kind, 'next');
    assert.strictEqual(r5.next, 'phases/phase-wave2.md');

    const r6 = resolveNodeTransitionDetailed(real, 'phases/phase-wave2.md', 'passed');
    assert.strictEqual(r6.kind, 'next');
    assert.strictEqual(r6.next, 'phases/phase-hitl2.md');

    const r7 = resolveNodeTransitionDetailed(real, 'phases/phase-hitl2.md', 'passed');
    assert.strictEqual(r7.kind, 'next');
    assert.strictEqual(r7.next, 'phases/phase-readiness.md');

    const r8 = resolveNodeTransitionDetailed(real, 'phases/phase-readiness.md', 'passed');
    assert.strictEqual(r8.kind, 'next');
    assert.strictEqual(r8.next, 'phases/phase-final.md');
  });
});
