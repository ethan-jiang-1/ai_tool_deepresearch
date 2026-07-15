// @impl RTI-007
// Direction resolver unit tests: 5 states + crash recovery semantics

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRerunDirection } from '../../../DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs';

describe('resolveRerunDirection', () => {
  it('matching when direction.rerun_count == profile', () => {
    const content = '## 本轮重跑方向\n- **rerun_count**: 2\n- **action**: supplement\n';
    const result = resolveRerunDirection(content, 2);
    assert.equal(result.state, 'matching');
    assert.equal(result.rerun_count, 2);
  });

  it('stale when direction.rerun_count < profile', () => {
    const content = '## 本轮重跑方向\n- **rerun_count**: 1\n- **action**: add\n';
    const result = resolveRerunDirection(content, 3);
    assert.equal(result.state, 'stale');
    assert.equal(result.rerun_count, 1);
  });

  it('future when direction.rerun_count > profile (crash window)', () => {
    const content = '## 本轮重跑方向\n- **rerun_count**: 3\n- **action**: supplement\n';
    const result = resolveRerunDirection(content, 2);
    assert.equal(result.state, 'future');
    assert.equal(result.rerun_count, 3);
  });

  it('legacy_unbound when no rerun_count field', () => {
    const content = '## 本轮重跑方向\n- **action**: supplement\n- **new_search_dimensions**: "cost"\n';
    const result = resolveRerunDirection(content, 2);
    assert.equal(result.state, 'legacy_unbound');
    assert.equal(result.rerun_count, null);
  });

  it('legacy_unbound when no direction section', () => {
    const content = '# Some Topic\n\n## 主题定位\nSome text\n';
    const result = resolveRerunDirection(content, 2);
    assert.equal(result.state, 'legacy_unbound');
    assert.equal(result.rerun_count, null);
  });

  it('invalid when rerun_count unparseable', () => {
    const content = '## 本轮重跑方向\n- **rerun_count**: abc\n- **action**: add\n';
    const result = resolveRerunDirection(content, 2);
    assert.equal(result.state, 'invalid');
  });

  it('target computation: profile=1 -> target=2', () => {
    // The target is computed by the phase-rerun Agent, not the resolver.
    // Verify the resolver correctly identifies a direction written with target=2
    // as matching when profile reaches 2, and stale when profile is 1.
    const content = '## 本轮重跑方向\n- **rerun_count**: 2\n';
    assert.equal(resolveRerunDirection(content, 2).state, 'matching');
    assert.equal(resolveRerunDirection(content, 1).state, 'future');
  });

  it('crash recovery: direction=2, profile=1 -> future (crash window)', () => {
    const content = '## 本轮重跑方向\n- **rerun_count**: 2\n- **action**: supplement\n';
    const result = resolveRerunDirection(content, 1);
    assert.equal(result.state, 'future');
  });
});
