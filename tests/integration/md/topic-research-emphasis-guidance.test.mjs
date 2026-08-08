// @impl HIU-002, URC-001, PRP-012, PRP-014
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const brief = read('DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md');
const phase = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md');

describe('topic research emphasis HITL1 guidance', () => {
  it('defines a semantic minimum Topic map without a numeric target or upper cap', () => {
    assert.match(brief, /最小独立 Topic map/);
    assert.match(brief, /一个话题也可以成立/);
    assert.match(brief, /没有预设上限/);
    assert.match(phase, /preview 至少有一个 proposed Topic、没有预设上限/);
    assert.match(phase, /一个 Topic 足够时不得为凑数拆分/);
    assert.match(phase, /研究线程分组/);
    assert.doesNotMatch(`${brief}\n${phase}`, /3-5/);
  });

  it('keeps focus optional, correctable, and inside the existing literal controls snapshot', () => {
    const controls = phase.slice(phase.indexOf('### 3b.1 Optional User Research Controls Snapshot'), phase.indexOf('### 3c. Research Style Projection Handoff'));
    assert.match(brief, /某个话题额外多研究什么/);
    assert.match(controls, /optional `research focus brief`/);
    assert.match(controls, /用户的重点原话（逐字保留）/);
    assert.match(controls, /Agent 对本轮额外研究方向的理解（可由用户修正）/);
    assert.match(controls, /先在当前 HITL1 loop.*允许用户修正/s);
    assert.match(controls, /render-supplied-controls --input/);
    assert.match(controls, /不创建空 focus record/);
  });

  it('retains existing Engine and lifecycle authority boundaries', () => {
    const controls = phase.slice(phase.indexOf('### 3b.1 Optional User Research Controls Snapshot'), phase.indexOf('### 3c. Research Style Projection Handoff'));
    for (const forbiddenAuthority of ['profile、Topic field、Gate', 'renderer、Engine、Gate', 'schema override']) {
      assert.ok(controls.includes(forbiddenAuthority), `missing boundary: ${forbiddenAuthority}`);
    }
    assert.match(controls, /先运行纯 renderer[\s\S]*随后才创建 retained topic-state input/);
    assert.match(controls, /topic-state apply\/recover 后继续读取已 durable 的 host-file snapshot/);
  });
});
