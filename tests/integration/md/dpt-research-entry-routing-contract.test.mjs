// @impl RUE-001, RUE-002, RUE-004, RUE-006
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const ROOT_SURFACES = ['AGENTS.md', 'CLAUDE.md'];
const FRAMEWORK_SURFACES = ['DEEP_RESEARCH_HARNESS/AGENTS.md', 'DEEP_RESEARCH_HARNESS/CLAUDE.md'];
const RUN = 'DEEP_RESEARCH_HARNESS/RUN.md';
const README = 'DEEP_RESEARCH_HARNESS/README.md';
const COMMANDS = 'DEEP_RESEARCH_HARNESS/COMMANDS.md';
const START = 'DEEP_RESEARCH_HARNESS/command_playbook/start-research.md';

function routingBlock(path) {
  const text = read(path);
  const match = text.match(/## Deep Research Routing\n\n([\s\S]*?)(?=\n## |$)/);
  assert.ok(match, `${path} must keep a Deep Research Routing block`);
  return match[1];
}

describe('Deep Research Harness research entry routing contract', () => {
  it('keeps root entry routing synchronized before request-specific research work', () => {
    const blocks = ROOT_SURFACES.map(routingBlock);
    assert.equal(blocks[0], blocks[1], 'root routing guidance must stay synchronized');

    const block = blocks[0];
    assert.match(block, /explicitly supplied reachable existing bundle candidate/i);
    assert.match(block, /same-root `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md` preflight/i);
    assert.match(block, /continue-run-bundle\.md/);
    assert.match(block, /unsupported_current_entry_contract/);
    assert.match(block, /With no supplied existing candidate[\s\S]*DEEP_RESEARCH_HARNESS\/RUN\.md/i);
    assert.match(block, /discovered, bare, or unreachable file does not select a run/i);
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
      assert.match(text, /同根 `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md`/);
      assert.match(text, /unsupported_current_entry_contract/);
      assert.match(text, /preflight 失败，不等于「没有 explicit candidate」/);
      assert.match(text, /禁止因此 fallback 读 `RUN\.md`/);
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
    const title = '# RUN.md — DEEP_RESEARCH_HARNESS 入口';
    const section0 = '## 0. 禁用内置捷径（最高优先）';
    const trigger = '>**这个文件在对话中即触发**';
    const titleIndex = run.indexOf(title);
    const section0Index = run.indexOf(section0);
    const triggerIndex = run.indexOf(trigger);

    assert.equal(titleIndex, 0, 'RUN.md must begin with its title');
    assert.equal(section0Index, title.length + 2, 'Section 0 must immediately follow the title');
    assert.doesNotMatch(run, /^> \*\*DEEP_RESEARCH_HARNESS v\d+\.\d+\*\*$/m);
    assert.ok(section0Index < triggerIndex, 'Section 0 must precede trigger context');
    assert.doesNotMatch(run, /^## Current Release:/m);
    assert.match(run, /`research`、`deep-research` skill/);
    assert.match(run, /直接 WebSearch\/WebFetch/);
    assert.match(run, /而不是直接搜索、抓取、收集 evidence 或手工综合/);
    assert.match(run, /Section 2[\s\S]*授权 capability probe 和后续研究工作/);
    assert.match(run, /不声称能阻止宿主预先匹配 skill 或注入工具/);

    assert.match(readme, /没有 explicit existing candidate 才读 `RUN\.md`/);
    assert.match(readme, /unsupported_current_entry_contract/);
    assert.match(readme, /selected entry 读完前/);
    assert.match(readme, /Section 2 随后进入 `command_playbook\/start-research\.md`/);
    assert.match(readme, /不保证宿主不会预先匹配 skill 或注入工具/);

    assert.match(commands, /`RUN\.md` 选定新研究 entry 后的下游 playbook/);
    assert.match(start, /同根 `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md`/);
    assert.match(start, /unsupported_current_entry_contract/);
    assert.doesNotMatch(start, /新研究入口/);
  });
});
