// @impl RTI-007
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRerunDirection } from '../../../DPT_FRAMEWORK/engine/helpers/rerun-direction.mjs';

const complete = ({ count = 2, action = 'supplement', extra = '' } = {}) => `## 本轮重跑方向\n- rerun_count: ${count}\n- action: ${action}\n- new_search_dimensions: cost and failure modes\n- adjusted_depth: compare operating models\n- search_guardrails: retain primary sources\n- rationale_excerpt: user requested the additional comparison\n${extra}`;

describe('rerun direction evaluator', () => {
  it('normalizes one complete matching canonical direction without judging its guidance', () => {
    const result = evaluateRerunDirection(complete(), 2);
    assert.equal(result.state, 'matching');
    assert.equal(result.fields.action, 'supplement');
    assert.deepEqual(result.structural_roots, []);
    assert.equal(result.fields.new_search_dimensions, 'cost and failure modes');
  });

  it('distinguishes stale, future, legacy-unbound, and invalid direction states', () => {
    assert.equal(evaluateRerunDirection(complete({ count: 1, action: 'add' }), 2).state, 'stale');
    assert.equal(evaluateRerunDirection(complete({ count: 3 }), 2).state, 'future');
    assert.equal(evaluateRerunDirection('# Topic\n\n## 本轮重跑方向\n- action: add\n', 2).state, 'legacy_unbound');
    assert.equal(evaluateRerunDirection('## 本轮重跑方向\n- rerun_count: nope\n', 2).state, 'invalid');
  });

  it('accepts heading suffixes, optional bullets, and balanced bold labels', () => {
    const content = `## 本轮重跑方向（补充）\n**rerun_count**: 2\n* **action**: supplement\n**new_search_dimensions**: cost\n**adjusted_depth**: deeper\n**search_guardrails**: primary only\n**rationale_excerpt**: user asked\n`;
    const result = evaluateRerunDirection(content, 2);
    assert.equal(result.state, 'matching');
    assert.deepEqual(result.structural_roots, []);
  });

  it('stops at the next level-two heading so later projection cards are not rerun fields', () => {
    const content = `${complete()}\n## Wave0：本主题的新增来源证据\n\n> **回填卡（只读操作约束，不是 Projection Entry）**\n> - 写入者：Wave0 Phase Agent\n\n- **entry_id**: wu-w0-b001-source-i0001/1\n  - **evidence_meaning**: Later projection entry\n`;
    const result = evaluateRerunDirection(content, 2);
    assert.equal(result.state, 'matching');
    assert.equal(result.fields.entry_id, undefined);
    assert.deepEqual(result.extensions, {});
  });

  it('preserves non-conflicting extensions while rejecting current/future ambiguity and missing fields', () => {
    const extended = evaluateRerunDirection(complete({ extra: '- target_dimension: procurement\n' }), 2);
    assert.equal(extended.extensions.target_dimension, 'procurement');
    assert.deepEqual(extended.structural_roots, []);

    const duplicate = evaluateRerunDirection(`${complete()}\n${complete()}`, 2);
    assert.equal(duplicate.state, 'invalid');
    assert.ok(duplicate.structural_roots.some((root) => root.kind === 'duplicate_section'));

    const missing = evaluateRerunDirection(complete().replace('- adjusted_depth: compare operating models\n', ''), 2);
    assert.equal(missing.state, 'matching');
    assert.ok(missing.structural_roots.some((root) => root.field === 'adjusted_depth'));
  });

  it('fails closed on duplicate labels, invalid action/count, and empty current/future canonical values', () => {
    const duplicateField = evaluateRerunDirection(`${complete()}- action: add\n`, 2);
    assert.ok(duplicateField.structural_roots.some((root) => root.kind === 'duplicate_field' && root.field === 'action'));

    const badAction = evaluateRerunDirection(complete({ action: 'rewrite' }), 2);
    assert.ok(badAction.structural_roots.some((root) => root.field === 'action'));

    const futureJump = evaluateRerunDirection(complete({ count: 4 }), 2);
    assert.equal(futureJump.state, 'future');
    assert.ok(futureJump.structural_roots.some((root) => root.field === 'rerun_count'));

    const empty = evaluateRerunDirection(complete().replace('cost and failure modes', ''), 2);
    assert.ok(empty.structural_roots.some((root) => root.field === 'new_search_dimensions'));
  });
});
