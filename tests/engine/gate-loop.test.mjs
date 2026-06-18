// gate-loop.test.mjs — @impl FRE-001
// Tests for checkGate. Consumer defines all domain knowledge.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { checkGate } from '../../DPT_FRAMEWORK/engine/gate-loop.mjs';

// Consumer-defined domain knowledge (lives in MD, not engine)

const StateSchema = z.object({
  ref_count: z.number(),
  ref_floor: z.number(),
  topicReadiness: z.enum(['ready', 'not_ready', 'blocked']),
});

const CHECK_RULES = [
  { key: 'low_refs', check: s => s.ref_count < s.ref_floor, say: 'ref_count 不足（当前 ${s.ref_count}，需要 >= ${s.ref_floor}）' },
];

const PRIORITY_RULES = [
  { key: 'blocked',         check: s => s.topicReadiness === 'blocked',         say: 'topic 被阻塞' },
  { key: 'topic_not_ready', check: s => s.topicReadiness !== 'ready',           say: 'topic 未就绪' },
  { key: 'low_refs',        check: s => s.ref_count < s.ref_floor,              say: 'ref_count 不足' },
];

// Mixed rules: schema + check combined
const MIXED_RULES = [
  { key: 'bad_state', schema: StateSchema,                              say: 'state 结构不合法' },
  { key: 'blocked',   check:  s => s.topicReadiness === 'blocked',      say: 'topic 被阻塞' },
  { key: 'low_refs',  check:  s => s.ref_count < s.ref_floor,           say: 'ref_count 不足' },
];

describe('checkGate — check rules', () => {
  it('passes when no rule fires', () => {
    const r = checkGate({ ref_count: 5, ref_floor: 5 }, CHECK_RULES);
    assert.equal(r.passed, true);
    assert.equal(r.next, undefined);
  });

  it('returns next when passed and next provided', () => {
    const r = checkGate({ ref_count: 5, ref_floor: 5 }, CHECK_RULES, 'wave0');
    assert.equal(r.passed, true);
    assert.equal(r.next, 'wave0');
  });

  it('returns rule say when condition fires', () => {
    const r = checkGate({ ref_count: 2, ref_floor: 5 }, CHECK_RULES);
    assert.equal(r.passed, false);
    assert.ok(r.say.includes('ref_count 不足'));
  });

  it('respects rule order — first match wins', () => {
    const r = checkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' }, PRIORITY_RULES);
    assert.equal(r.passed, false);
    assert.ok(r.say.includes('阻塞'));
  });

  it('throws on empty rules', () => {
    assert.throws(() => checkGate({ any: 'thing' }, []), /rules 必须是非空数组/);
  });
});

describe('checkGate — parameter validation', () => {
  it('throws when state is null', () => {
    assert.throws(() => checkGate(null, CHECK_RULES), /state 必须是普通对象/);
  });

  it('throws when state is an array', () => {
    assert.throws(() => checkGate([1, 2, 3], CHECK_RULES), /state 必须是普通对象/);
  });

  it('throws when rule has no key', () => {
    assert.throws(() => checkGate({ x: 1 }, [{ say: 'bad' }]), /key.*必须是非空字符串/);
  });

  it('throws when rule has no say', () => {
    assert.throws(() => checkGate({ x: 1 }, [{ key: 'k', check: s => true }]), /say.*必须是字符串/);
  });

  it('throws when rule has neither schema nor check', () => {
    assert.throws(() => checkGate({ x: 1 }, [{ key: 'k', say: 'bad' }]), /必须提供 schema 或 check/);
  });

  it('throws when rule.schema has no safeParse', () => {
    assert.throws(() => checkGate({ x: 1 }, [{ key: 'k', schema: {}, say: 'bad' }]), /schema 必须是 Zod schema/);
  });

  it('throws when rule.check is not a function', () => {
    assert.throws(() => checkGate({ x: 1 }, [{ key: 'k', check: 'notfn', say: 'bad' }]), /check.*必须是函数/);
  });

  it('throws when next is not a string', () => {
    assert.throws(() => checkGate({ x: 1 }, CHECK_RULES, 123), /next 必须是字符串/);
  });
});

describe('checkGate — schema rules', () => {
  it('fires when Zod schema validation fails (wrong type)', () => {
    const r = checkGate(
      { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' },
      MIXED_RULES
    );
    assert.equal(r.passed, false);
    assert.equal(r.say, 'state 结构不合法');
    assert.ok(r.errors);
    assert.equal(r.errors[0].field, 'ref_count');
    assert.equal(r.errors[0].code, 'invalid_type');
  });

  it('fires when Zod schema validation fails (missing field)', () => {
    const r = checkGate(
      { ref_count: 5, ref_floor: 5 },
      MIXED_RULES
    );
    assert.equal(r.passed, false);
    assert.ok(r.errors.some(e => e.field === 'topicReadiness'));
  });

  it('schema runs before check (combined rule)', () => {
    // This rule has both schema and check. Schema runs first.
    const rules = [
      { key: 'bad_or_low', schema: z.object({ ref_count: z.number() }), check: s => s.ref_count < 5, say: '字段错误或数值过低' },
    ];
    // Schema passes, check fires
    const r = checkGate({ ref_count: 2 }, rules);
    assert.equal(r.passed, false);
    assert.equal(r.say, '字段错误或数值过低');
    assert.equal(r.errors, undefined); // schema passed, so no errors
  });

  it('schema blocks check when schema fails', () => {
    const rules = [
      { key: 'bad_or_low', schema: z.object({ ref_count: z.number() }), check: s => s.ref_count < 5, say: '字段错误或数值过低' },
    ];
    const r = checkGate({ ref_count: 'bad' }, rules);
    assert.equal(r.passed, false);
    assert.ok(r.errors); // schema failed — errors present, check never ran
  });

  it('schema passes → falls through to next rule check', () => {
    const r = checkGate(
      { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
      MIXED_RULES
    );
    // first rule has schema — passes (state is valid)
    // second rule check — topic is ready, doesn't fire
    // third rule check — ref_count < ref_floor → fires
    assert.equal(r.passed, false);
    assert.equal(r.say, 'ref_count 不足');
    assert.equal(r.errors, undefined);
  });

  it('errors have no fix field — MD interprets', () => {
    const r = checkGate({ ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' }, MIXED_RULES);
    assert.equal(r.errors[0].fix, undefined);
    assert.equal(typeof r.errors[0].message, 'string');
    assert.equal(typeof r.errors[0].code, 'string');
    assert.equal(typeof r.errors[0].field, 'string');
  });
});
