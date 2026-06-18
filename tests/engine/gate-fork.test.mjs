// gate-fork.test.mjs — @impl FRE-001
// Tests for forkGate. Consumer defines all domain knowledge.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { forkGate } from '../../DPT_FRAMEWORK/engine/gate-fork.mjs';

// Consumer-defined domain knowledge (lives in MD, not engine)

const StateSchema = z.object({
  ref_count: z.number(),
  ref_floor: z.number(),
  topicReadiness: z.enum(['ready', 'not_ready', 'blocked']),
});

const RULES = [
  { key: 'blocked',         check: s => s.topicReadiness === 'blocked',         say: 'topic 被阻塞' },
  { key: 'topic_not_ready', check: s => s.topicReadiness !== 'ready',           say: 'topic 未就绪' },
  { key: 'low_refs',        check: s => s.ref_count < s.ref_floor,              say: 'ref_count 不足' },
];

const BRANCHES = {
  'blocked':         { say: '上报给用户' },
  'topic_not_ready': { say: '准备 topic' },
  'low_refs':        { say: '补充参考' },
};

// Mixed rules with schema
const MIXED_RULES = [
  { key: 'bad_state', schema: StateSchema,                              say: 'state 结构不合法' },
  { key: 'blocked',   check:  s => s.topicReadiness === 'blocked',      say: 'topic 被阻塞' },
  { key: 'low_refs',  check:  s => s.ref_count < s.ref_floor,           say: 'ref_count 不足' },
];

describe('forkGate — check rules + branches', () => {
  it('returns no branch when all rules pass', () => {
    const r = forkGate({ ref_count: 5, ref_floor: 5, topicReadiness: 'ready' }, RULES, BRANCHES);
    assert.equal(r.branch, undefined);
    assert.equal(r.rule, undefined);
    assert.equal(r.say, '门禁通过，但没有分叉。');
  });

  it('returns branch say when rule fires and branch exists', () => {
    const r = forkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'ready' }, RULES, BRANCHES);
    assert.equal(r.branch, 'low_refs');
    assert.equal(r.say, '补充参考');
  });

  it('returns highest-priority branch', () => {
    const r = forkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' }, RULES, BRANCHES);
    assert.equal(r.branch, 'blocked');
    assert.equal(r.say, '上报给用户');
  });

  it('returns rule say when rule fires but no branch', () => {
    const partial = { 'blocked': { say: '上报' } };
    const r = forkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'ready' }, RULES, partial);
    assert.equal(r.rule, 'low_refs');
    assert.equal(r.branch, undefined);
    assert.ok(r.say.includes('ref_count'));
  });
});

describe('forkGate — schema rules', () => {
  it('returns rule with errors when schema fails', () => {
    const r = forkGate(
      { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' },
      MIXED_RULES, BRANCHES
    );
    assert.equal(r.rule, 'bad_state');
    assert.equal(r.say, 'state 结构不合法');
    assert.ok(r.errors);
    assert.equal(r.errors[0].field, 'ref_count');
    assert.equal(r.errors[0].code, 'invalid_type');
  });

  it('schema passes → falls through to check rule → branch', () => {
    const r = forkGate(
      { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
      MIXED_RULES, BRANCHES
    );
    assert.equal(r.branch, 'low_refs');
    assert.equal(r.say, '补充参考');
    assert.equal(r.errors, undefined);
  });
});

describe('forkGate — branch.when predicate', () => {
  it('returns branch when `when` predicate is true', () => {
    const b = {
      'low_refs': { when: s => s.ref_count < s.ref_floor, say: '补充参考' },
    };
    const r = forkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'ready' }, RULES, b);
    assert.equal(r.branch, 'low_refs');
    assert.equal(r.say, '补充参考');
  });

  it('falls through to repair when `when` predicate is false', () => {
    const b = {
      'low_refs': { when: s => s.ref_count < 0, say: '补充参考' },
    };
    const r = forkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'ready' }, RULES, b);
    assert.equal(r.rule, 'low_refs');
    assert.equal(r.branch, undefined);
    assert.ok(r.say.includes('ref_count'));
  });

  it('branch without `when` works as before', () => {
    const b = { 'low_refs': { say: '补充参考' } };
    const r = forkGate({ ref_count: 2, ref_floor: 5, topicReadiness: 'ready' }, RULES, b);
    assert.equal(r.branch, 'low_refs');
    assert.equal(r.say, '补充参考');
  });
});

describe('forkGate — parameter validation', () => {
  it('throws when state is null', () => {
    assert.throws(() => forkGate(null, RULES, BRANCHES), /state 必须是普通对象/);
  });

  it('throws when state is an array', () => {
    assert.throws(() => forkGate([], RULES, BRANCHES), /state 必须是普通对象/);
  });

  it('throws on empty rules', () => {
    assert.throws(() => forkGate({ x: 1 }, [], BRANCHES), /rules 必须是非空数组/);
  });

  it('throws when rule has no key', () => {
    assert.throws(() => forkGate({ x: 1 }, [{ say: 'bad' }], BRANCHES), /key.*必须是非空字符串/);
  });

  it('throws when rule has no say', () => {
    assert.throws(() => forkGate({ x: 1 }, [{ key: 'k', check: s => true }], BRANCHES), /say.*必须是字符串/);
  });

  it('throws when rule has neither schema nor check', () => {
    assert.throws(() => forkGate({ x: 1 }, [{ key: 'k', say: 'bad' }], BRANCHES), /必须提供 schema 或 check/);
  });

  it('throws when rule.check is not a function', () => {
    assert.throws(() => forkGate({ x: 1 }, [{ key: 'k', check: 'x', say: 'bad' }], BRANCHES), /check.*必须是函数/);
  });

  it('throws when branches is null', () => {
    assert.throws(() => forkGate({ x: 1 }, RULES, null), /branches 必须是普通对象/);
  });

  it('throws when branch.say is not a string', () => {
    assert.throws(() => forkGate({ x: 1 }, RULES, { k: {} }), /say.*必须是字符串/);
  });

  it('throws when branch.when is not a function', () => {
    assert.throws(() => forkGate({ x: 1 }, RULES, { k: { say: 'x', when: 'bad' } }), /when.*必须是函数/);
  });
});
