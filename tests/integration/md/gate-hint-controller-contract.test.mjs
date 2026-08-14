// @impl CHI-001, CHI-003, GSK-002, GSK-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PHASES = [
  'phase-instantiation.md',
  'phase-hitl1.md',
  'phase-setup.md',
  'phase-seed-topics.md',
];
const HITL1 = 'phase-hitl1.md';

function readPhase(name) {
  return readFileSync(new URL(`../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/${name}`, import.meta.url), 'utf8');
}

function gateFailSection(markdown) {
  const match = markdown.match(/## 7\. On Gate Fail\n([\s\S]*?)\n## 8\. Stop Behavior/);
  assert.ok(match, 'phase must expose a bounded On Gate Fail section');
  return match[1];
}

describe('formal Gate hint consumption in early-phase Controllers', () => {
  for (const phase of PHASES) {
    it(`${phase} consumes structured hints before compatibility prose`, () => {
      const section = gateFailSection(readPhase(phase));
      const hintIndex = section.indexOf('`hints[]`');
      const inspectIndex = section.indexOf('`inspect[]`');

      assert.ok(hintIndex >= 0, 'missing top-level hints[] consumption');
      assert.ok(inspectIndex > hintIndex, 'hints[] must be read before inspect[] compatibility prose');
      assert.match(section, /`inspect\[\]`\s*\/\s*`advice\[\]`[^\n]+不是 action authority/);
      assert.match(section, /`repair_kind: agent_action`[\s\S]*?由 Agent/);
      assert.match(section, /`repair_kind: engine_operation`[\s\S]*?由 Agent/);
      assert.match(section, /`repair_kind: user_decision`[\s\S]*?只/);
      assert.match(section, /`repair_kind: missing_contract`/);
      assert.match(section, /Hint 不创造 permission/);
      assert.match(section, /Agent MUST 运行[^\n]+exact `rerun`/);
      assert.match(section, /不得从 `inspect\[\]`\/`advice\[\]`[^\n]+blocking repair/);
      assert.match(section, /不得直接编辑|不得直接改/);
      if (phase === HITL1) {
        assert.doesNotMatch(section, /`repair_kind: external_action`/);
      } else {
        assert.match(section, /`repair_kind: external_action`/);
      }
    });
  }

  it('HITL1 pauses only for a genuinely missing user decision', () => {
    const markdown = readPhase('phase-hitl1.md');
    assert.match(markdown, /仅当当前 `user_decision` hint 指出尚未取得的结构化 HITL1 回答时/);
    assert.match(markdown, /Gate 只剩 `agent_action` 或 `engine_operation`，Agent 必须自行执行/);
    assert.match(markdown, /不得要求用户运行普通命令/);
  });

  it('setup and seed-topics do not repair deterministic authority from legacy prose tables', () => {
    const setup = gateFailSection(readPhase('phase-setup.md'));
    const seedTopics = gateFailSection(readPhase('phase-seed-topics.md'));

    assert.doesNotMatch(setup, /将 `current_gate`\/`next_gate` 恢复/);
    assert.match(setup, /不得直接改 `rb_status\.json`/);
    assert.doesNotMatch(seedTopics, /尝试从 `rb_plan\.md` frontmatter 重建 topic_registry/);
    assert.match(seedTopics, /canonical registry 为空且没有已记录 Topic intent/);
  });

  it('instantiation name recovery remains subordinate to the structured hint', () => {
    const section = gateFailSection(readPhase('phase-instantiation.md'));
    assert.match(section, /仅当 structured hint\/instantiate CLI 的直接 invocation fact/);
    assert.match(section, /不得用本表覆盖不同的 `repair_kind` 或 `write_to`/);
  });
});
