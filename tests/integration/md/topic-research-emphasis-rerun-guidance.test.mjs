// @impl HIU-003, CDP-001, REI-006
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const brief = read('DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl2.md');
const hitl2 = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md');
const rerun = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md');

describe('topic research emphasis rerun guidance', () => {
  it('records a corrected focus only in the existing HITL2 rationale', () => {
    assert.match(brief, /某个 Topic 这次还要额外理解什么/);
    const rationale = hitl2.slice(hitl2.indexOf('- `rationale`:'), hitl2.indexOf('### user_decision 枚举'));
    assert.match(rationale, /用户的重点原话（逐字保留）/);
    assert.match(rationale, /Agent 对本轮额外研究方向的理解（可由用户修正）/);
    assert.match(rationale, /同一 HITL2 loop 允许修正/);
    assert.match(rationale, /不改变 enum、availability evaluator、Gate、route、profile field 或 Topic field/);
    assert.match(rationale, /没有 focus 的 rerun 继续使用原有 rationale form/);
  });

  it('derives only current direction guidance through the existing rerun path', () => {
    assert.match(rerun, /本轮新的或修订的 focus increment/);
    assert.match(rerun, /新的 search dimensions、调整深度、guardrails 和 rationale excerpt/);
    assert.match(rerun, /既有 `## 本轮重跑方向` guidance/);
    assert.match(rerun, /旧 direction、submitted evidence、artifacts、reference paths 与 output history 不得被描述为新 focus work/);
    assert.match(rerun, /operate-topic-state inspect/);
    assert.match(rerun, /set_rerun_direction/);
  });

  it('does not add a rerun route, Gate, checkpoint, or natural-language parser', () => {
    assert.match(hitl2, /check\.next.*phases\/phase-rerun\.md/);
    assert.match(rerun, /stop: no/);
    assert.match(rerun, /不得.*新 HITL|不自行创建新 HITL/);
    assert.match(rerun, /不是 parser、profile\/Topic field、Gate input 或新的 mutation authority/);
    assert.doesNotMatch(`${hitl2}\n${rerun}`, /focus-specific Gate|focus parser|focus_route/);
  });
});
