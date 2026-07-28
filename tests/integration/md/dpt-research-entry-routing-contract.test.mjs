// @impl RUE-002, RUE-004, RUE-006
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const ROOT_SURFACES = ['AGENTS.md', 'CLAUDE.md'];
const FRAMEWORK_SURFACES = ['DPT_FRAMEWORK/AGENTS.md', 'DPT_FRAMEWORK/CLAUDE.md'];
const RUN = 'DPT_FRAMEWORK/RUN.md';
const README = 'DPT_FRAMEWORK/README.md';
const COMMANDS = 'DPT_FRAMEWORK/COMMANDS.md';
const START = 'DPT_FRAMEWORK/command_playbook/start-research.md';

function routingBlock(path) {
  const text = read(path);
  const match = text.match(/## Deep Research Routing\n\n([\s\S]*?)(?=\n## |$)/);
  assert.ok(match, `${path} must keep a Deep Research Routing block`);
  return match[1];
}

describe('DPT research entry routing contract', () => {
  it('keeps root entry routing synchronized before request-specific research work', () => {
    const blocks = ROOT_SURFACES.map(routingBlock);
    assert.equal(blocks[0], blocks[1], 'root routing guidance must stay synchronized');

    const block = blocks[0];
    assert.match(block, /explicitly supplied reachable existing bundle/i);
    assert.match(block, /continue-run-bundle\.md/);
    assert.match(block, /otherwise[\s\S]*DPT_FRAMEWORK\/RUN\.md/i);
    assert.match(block, /discovered, bare, or unreachable map does not select a run/i);
    assert.match(block, /`research`, `deep-research`, or an equivalent one-shot shortcut/);
    assert.match(block, /request-specific WebSearch\/WebFetch/);
    assert.match(block, /collect\/synthesize evidence manually/);
    assert.match(block, /later phase instructions authorize subsequent legal research work/);
  });

  it('keeps framework guidance entry-first and bounds the prohibition to pre-entry work', () => {
    const surfaces = FRAMEWORK_SURFACES.map(read);
    assert.equal(
      surfaces[0].match(/\*\*本框架就是项目的 Deep Research 引擎。\*\*[\s\S]*?(?=- \*\*触发按意图)/)?.[0],
      surfaces[1].match(/\*\*本框架就是项目的 Deep Research 引擎。\*\*[\s\S]*?(?=- \*\*触发按意图)/)?.[0],
      'framework entry directives must stay synchronized',
    );

    for (const text of surfaces) {
      assert.match(text, /continue-run-bundle\.md/);
      assert.match(text, /否则先读 `RUN\.md`/);
      assert.match(text, /`research`、`deep-research`/);
      assert.match(text, /直接 WebSearch\/WebFetch/);
      assert.match(text, /HITL1 probe 与后续 phase 已授权的 research/);
      assert.match(text, /不能保证宿主不会预先匹配 skill 或注入工具/);
      assert.match(text, /`start-research\.md` 只是 RUN\.md 后的下游 new-run playbook/);
      assert.doesNotMatch(text, /新研究入口：`command_playbook\/start-research\.md`/);
    }
  });

  it('keeps RUN.md as the new-research entry and start-research downstream', () => {
    const run = read(RUN);
    const readme = read(README);
    const commands = read(COMMANDS);
    const start = read(START);

    assert.match(run, /## 0\. 禁用内置捷径（最高优先）/);
    assert.match(run, /`research`、`deep-research` skill/);
    assert.match(run, /直接 WebSearch\/WebFetch/);
    assert.match(run, /而不是直接搜索、抓取、收集 evidence 或手工综合/);
    assert.match(run, /Section 2[\s\S]*授权 capability probe 和后续研究工作/);
    assert.match(run, /不声称能阻止宿主预先匹配 skill 或注入工具/);

    assert.match(readme, /否则先读 `RUN\.md`/);
    assert.match(readme, /selected entry 读完前/);
    assert.match(readme, /Section 2 随后进入 `command_playbook\/start-research\.md`/);
    assert.match(readme, /不保证宿主不会预先匹配 skill 或注入工具/);

    assert.match(commands, /`RUN\.md` 选定新研究 entry 后的下游 playbook/);
    assert.match(start, /只有在已读 `RUN\.md`、且没有 explicit reachable existing-bundle continuation route 后/);
    assert.doesNotMatch(start, /新研究入口/);
  });
});
