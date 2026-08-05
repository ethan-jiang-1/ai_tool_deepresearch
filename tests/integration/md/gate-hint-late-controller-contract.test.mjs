// @impl CHI-001, CHI-003, GSK-002, GSK-004, RWG-018

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PHASES = [
  'phase-wave0.md',
  'phase-wave1.md',
  'phase-wave2.md',
  'phase-hitl2.md',
  'phase-readiness.md',
  'phase-rerun.md',
];

function readPhase(name) {
  return readFileSync(new URL(`../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/${name}`, import.meta.url), 'utf8');
}

function gateFailSection(markdown) {
  const match = markdown.match(/## 7\. On Gate Fail\n([\s\S]*?)\n## 8\. Stop Behavior/);
  assert.ok(match, 'phase must expose a bounded On Gate Fail section');
  return match[1];
}

describe('formal Gate hint consumption in Wave and late-phase Controllers', () => {
  for (const phase of PHASES) {
    it(`${phase} consumes root-first hints without creating authority`, () => {
      const section = gateFailSection(readPhase(phase));
      const hintIndex = section.indexOf('`hints[]`');
      const inspectIndex = section.indexOf('`inspect[]`');

      assert.ok(hintIndex >= 0, 'missing top-level hints[] consumption');
      assert.ok(inspectIndex > hintIndex, 'hints[] must be read before inspect[] compatibility prose');
      assert.match(section, /`inspect\[\]` \/ `advice\[\]`[^\n]+不是 action authority/);
      assert.match(section, /不得从 ?[^\n]+补猜 repair kind/);
      assert.match(section, /`repair_kind: agent_action`[\s\S]*?由 Agent/);
      assert.match(section, /`repair_kind: engine_operation`[\s\S]*?由 Agent/);
      assert.match(section, /`repair_kind: user_decision`/);
      assert.match(section, /`repair_kind: external_action`/);
      assert.match(section, /`repair_kind: missing_contract`/);
      assert.match(section, /不得要求用户运行普通命令/);
      assert.match(section, /不得直接编辑/);
      assert.match(section, /Hint 不创造 permission、controller[^\n]+lifecycle/);
      assert.match(section, /Agent MUST 运行 hint 的 exact `rerun`/);
      assert.match(section, /不得从 `inspect\[\]`\/`advice\[\]` 猜 blocking repair/);
    });
  }

  it('autonomous phases expose user boundaries without inventing HITL or routes', () => {
    for (const phase of ['phase-wave0.md', 'phase-wave1.md', 'phase-wave2.md', 'phase-readiness.md', 'phase-rerun.md']) {
      const section = gateFailSection(readPhase(phase));
      assert.match(section, /`stop: no`/);
      assert.match(section, /(?:不得由 hint|本 phase 不自行)\s*(?:创造|创建)新 HITL/);
      assert.match(section, /保持当前 checkpoint failed/);
    }
  });

  it('Wave domain repair remains subordinate to the structured root', () => {
    for (const phase of ['phase-wave0.md', 'phase-wave1.md', 'phase-wave2.md']) {
      const section = gateFailSection(readPhase(phase));
      assert.match(section, /仅当 structured hint 的 `missing_fact` \/ `write_to` 明确识别/);
    }
  });

  it('HITL2 waits only for a genuinely missing decision and resumes Agent execution', () => {
    const markdown = readPhase('phase-hitl2.md');
    assert.match(markdown, /仅当当前 `user_decision` hint 指出尚未取得的真实 HITL2 decision 时/);
    assert.match(markdown, /Gate 只剩 `agent_action` 或 `engine_operation`，Agent 必须自行执行/);
    assert.match(markdown, /不得再次把用户变成 pipeline co-runner/);
  });

  it('readiness and rerun never repair status or routing through prose shortcuts', () => {
    const readiness = gateFailSection(readPhase('phase-readiness.md'));
    const rerun = gateFailSection(readPhase('phase-rerun.md'));

    assert.doesNotMatch(readiness, /移除或修复.*rb_trace\.jsonl/);
    assert.doesNotMatch(readiness, /恢复 `current_gate/);
    assert.match(readiness, /hint 本身不得授权回跳 earlier phase/);
    assert.doesNotMatch(rerun, /建议接受当前结果.*phase-final/);
    assert.doesNotMatch(rerun, /silent_unpassable/);
    assert.match(rerun, /不把该 root 静默改写成 final pass/);
  });
});
