// gate-helpers.test.mjs
// Tests for shared validation helpers used by checkGate and forkGate.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { validateState, validateRules, zodErrors } from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

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
