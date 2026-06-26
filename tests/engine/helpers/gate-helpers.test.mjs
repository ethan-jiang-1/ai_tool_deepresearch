// gate-helpers.test.mjs
// Tests for shared validation helpers used by checkGate and forkGate.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateState, validateRules, zodErrors, writeGateAttempt } from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

const CALLER = 'testFn';

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
// writeGateAttempt — GSK-005, TRW-003
// ═══════════════════════════════════════════════════════════════════════════

function setupBundle(bundleName) {
  const bundleDir = join(TMP, `dpt_rb_${bundleName}`);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ bundle: bundleName }));
  return bundleDir;
}

function makeGateResult(passed, gate = 'test-gate') {
  return {
    check: { passed, gate, currentNodeRef: 'phases/phase-test.md', next: passed ? 'phases/phase-next.md' : null },
    routing: { kind: passed ? 'next' : 'retry', next: passed ? 'phases/phase-next.md' : null },
    inspect: passed ? [] : ['rule 1 failed'],
    advice: passed ? [] : ['fix rule 1'],
  };
}

describe('writeGateAttempt (GSK-005, TRW-003)', () => {
  it('writes gate_attempt to rb_trace.jsonl with bundle field', () => {
    const b = setupBundle('test-gate-trace');
    const result = makeGateResult(true);
    writeGateAttempt(b, result);

    const tracePath = join(b, 'rb_trace.jsonl');
    assert.ok(existsSync(tracePath));
    const content = readFileSync(tracePath, 'utf-8');
    const entry = JSON.parse(content.trim().split('\n')[0]);
    assert.strictEqual(entry.event, 'gate_attempt');
    assert.strictEqual(entry.gate, 'test-gate');
    assert.strictEqual(entry.passed, true);
    assert.strictEqual(entry.bundle, 'test-gate-trace');
  });

  it('writes gate_attempt to _logs/run.log with unified envelope and bundle', () => {
    const b = setupBundle('test-gate-log');
    const result = makeGateResult(false);
    writeGateAttempt(b, result);

    const logPath = join(b, '_logs', 'run.log');
    assert.ok(existsSync(logPath));
    const content = readFileSync(logPath, 'utf-8');
    assert.match(content, /^\[.+\] WARN gate_attempt bundle=test-gate-log/);
    assert.ok(content.includes('"gate":"test-gate"'));
  });

  it('PASS gate writes INFO level log', () => {
    const b = setupBundle('test-gate-pass');
    writeGateAttempt(b, makeGateResult(true));
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /INFO gate_attempt/);
  });

  it('FAIL gate writes WARN level log', () => {
    const b = setupBundle('test-gate-fail');
    writeGateAttempt(b, makeGateResult(false));
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /WARN gate_attempt/);
  });

  it('never throws when bundle dir does not exist', () => {
    assert.doesNotThrow(() => writeGateAttempt('/nonexistent/path', makeGateResult(true)));
  });

  it('bundle matches rb_status.json value', () => {
    const b = setupBundle('test-gate-match');
    writeGateAttempt(b, makeGateResult(true));

    const traceContent = readFileSync(join(b, 'rb_trace.jsonl'), 'utf-8');
    const traceEntry = JSON.parse(traceContent.trim().split('\n')[0]);
    assert.strictEqual(traceEntry.bundle, 'test-gate-match');

    const logContent = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.ok(logContent.includes('bundle=test-gate-match'));
  });
});
