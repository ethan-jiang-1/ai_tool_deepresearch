// gate-helpers-readers.test.mjs
// Tests for gate-helpers-readers.mjs: Bundle file readers — plan, profile, frontmatter,
// declarations, validation helpers.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateState,
  validateRules,
  zodErrors,
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-readers-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

const CALLER = 'testFn';

// ═══════════════════════════════════════════════════════════════════════════
// validateState
// ═══════════════════════════════════════════════════════════════════════════

describe('validateState', () => {
  it('passes for plain object', () => {
    assert.doesNotThrow(() => validateState({ a: 1 }, CALLER));
  });

  it('throws for null', () => {
    assert.throws(() => validateState(null, CALLER), /state 必须是普通对象/);
  });

  it('throws for array', () => {
    assert.throws(() => validateState([1, 2], CALLER), /state 必须是普通对象/);
  });

  it('throws for string', () => {
    assert.throws(() => validateState('hello', CALLER), /state 必须是普通对象/);
  });

  it('throws for number', () => {
    assert.throws(() => validateState(42, CALLER), /state 必须是普通对象/);
  });

  it('includes caller name in error', () => {
    assert.throws(() => validateState(null, 'myFunc'), /myFunc: state 必须是普通对象/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateRules
// ═══════════════════════════════════════════════════════════════════════════

describe('validateRules', () => {
  it('passes for valid check rules', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', check: s => true, say: 'bad' }], CALLER));
  });

  it('passes for valid schema rules', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', schema: z.object({ x: z.number() }), say: 'bad' }], CALLER));
  });

  it('passes for combined schema + check', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', schema: z.object({}), check: s => true, say: 'ok' }], CALLER));
  });

  it('throws on empty array', () => {
    assert.throws(() => validateRules([], CALLER), /rules 必须是非空数组/);
  });

  it('throws when key is empty string', () => {
    assert.throws(() => validateRules([{ key: '', check: s => true, say: 'bad' }], CALLER), /key.*非空字符串/);
  });

  it('throws when key is missing', () => {
    assert.throws(() => validateRules([{ check: s => true, say: 'bad' }], CALLER), /key.*非空字符串/);
  });

  it('throws when say is missing', () => {
    assert.throws(() => validateRules([{ key: 'k', check: s => true }], CALLER), /say.*必须是字符串/);
  });

  it('throws when neither schema nor check provided', () => {
    assert.throws(() => validateRules([{ key: 'k', say: 'bad' }], CALLER), /必须提供 schema 或 check/);
  });

  it('throws when schema has no safeParse', () => {
    assert.throws(() => validateRules([{ key: 'k', schema: {}, say: 'bad' }], CALLER), /schema 必须是 Zod schema/);
  });

  it('throws when check is not a function', () => {
    assert.throws(() => validateRules([{ key: 'k', check: 'x', say: 'bad' }], CALLER), /check.*必须是函数/);
  });

  it('includes rule index in error for bad key', () => {
    assert.throws(() => validateRules([{ key: 'ok', check: s => true, say: 'ok' }, { key: '', check: s => true, say: 'bad' }], CALLER), /rules\[1\]/);
  });

  it('includes caller name in error', () => {
    assert.throws(() => validateRules([], 'myFn'), /myFn: rules 必须是非空数组/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// zodErrors
// ═══════════════════════════════════════════════════════════════════════════

describe('zodErrors', () => {
  it('maps ZodError to flat diagnostics', () => {
    const parsed = z.object({ ref_count: z.number() }).safeParse({ ref_count: 'bad' });
    const errors = zodErrors(parsed.error);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].field, 'ref_count');
    assert.equal(errors[0].code, 'invalid_type');
    assert.ok(typeof errors[0].message === 'string');
  });

  it('handles nested paths', () => {
    const s = z.object({ nested: z.object({ val: z.number() }) });
    const parsed = s.safeParse({ nested: { val: 'bad' } });
    const errors = zodErrors(parsed.error);
    assert.equal(errors[0].field, 'nested.val');
  });

  it('includes received and expected fields', () => {
    const parsed = z.object({ x: z.number() }).safeParse({ x: 'bad' });
    const errors = zodErrors(parsed.error);
    assert.ok(errors.length >= 1);
    assert.equal(errors[0].code, 'invalid_type');
    assert.equal(typeof errors[0].field, 'string');
    assert.equal(typeof errors[0].message, 'string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// readOutputDeclarations
// ═══════════════════════════════════════════════════════════════════════════

describe('readOutputDeclarations', () => {
  it('returns empty array when ledger file missing', () => {
    const dir = join(__dirname, '.test-gh-nonexistent');
    assert.deepEqual(readOutputDeclarations(dir), []);
  });

  it('reads declaration records from JSONL', () => {
    const dir = join(__dirname, '.test-gh-read-decl');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'ref/a.md', role: 'reference', source_url: 'https://a.com' }], cache_trails: [] }),
      JSON.stringify({ work_id: 'w2', output_files: [{ path: 'ref/b.md', role: 'evidence_summary' }], cache_trails: ['_cache/leaf/'] }),
    ].join('\n') + '\n');
    try {
      const decls = readOutputDeclarations(dir);
      assert.strictEqual(decls.length, 2);
      assert.strictEqual(decls[0].work_id, 'w1');
      assert.strictEqual(decls[1].work_id, 'w2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads submitted work-unit declarations only after Engine submit/index cross-checks pass', () => {
    const dir = tempWorkUnitBundle('gh-reader-submitted-');
    try {
      const { record } = claimAndSubmitWorkUnit(dir);
      const rows = readSubmittedWorkUnitDeclarations(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, record.work_id);
      assert.equal(rows[0].queue_item_id, record.queue_item_id);
      assert.equal(rows[0].result_ref, record.paths.result_ref);
      assert.equal(rows[0].runtime_receipt_ref, record.paths.runtime_receipt_ref);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('does not treat legacy raw declaration rows as submitted work-unit authority', () => {
    const dir = join(__dirname, '.test-gh-legacy-raw');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({
      work_id: 'w1',
      output_files: [{ path: 'reference/a.md', role: 'reference', source_url: 'https://a.com/news/1' }],
      cache_trails: ['_cache/leaf/'],
    })}\n`);
    try {
      assert.deepEqual(readSubmittedWorkUnitDeclarations(dir), []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed when a submitted work-unit ledger hash drifts', () => {
    const dir = tempWorkUnitBundle('gh-reader-drift-');
    try {
      claimAndSubmitWorkUnit(dir);
      const ledgerPath = join(dir, 'rb_output_declarations.jsonl');
      const row = JSON.parse(readFileSync(ledgerPath, 'utf-8').trim());
      row.cache_trails = [];
      writeFileSync(ledgerPath, `${JSON.stringify(row)}\n`);
      assert.throws(
        () => readSubmittedWorkUnitDeclarations(dir),
        /ledger_record_hash mismatch/,
      );
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });
});
