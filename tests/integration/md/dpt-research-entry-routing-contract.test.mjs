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

const POINTER_TRIAD = [
  /continue-run-bundle\.md/,
  /Entry Selection \(canonical\)/,
  /unsupported_current_entry_contract/,
];

const PROCEDURE_RESTATE = [
  /same-root `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md` preflight/i,
  /With no supplied existing candidate/i,
  /discovered, bare, or unreachable file does not select a run/i,
  /preflight 失败[，,]?不等于「没有 explicit candidate」/,
  /禁止因此 fallback 读 `RUN\.md`/,
  /先检查同根 `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md`/,
  /先验证同根 `BUNDLE_ENTRY\.md`/,
  /只有完整 pair/,
  /只有用户从一开始就没有提供任何 existing candidate/,
  /扫描发现、只提文件名或不可达/,
];

function markdownSection(text, heading, path) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`## ${escaped}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\n## |$)`));
  assert.ok(match, `${path} must keep ## ${heading}`);
  return match[1];
}

function assertPointerBlock(block, label) {
  for (const re of POINTER_TRIAD) {
    assert.match(block, re, `${label} must name ${re}`);
  }
  for (const re of PROCEDURE_RESTATE) {
    assert.doesNotMatch(block, re, `${label} must not restate ${re}`);
  }
}

function routingBlock(path) {
  return markdownSection(read(path), 'Deep Research Routing', path);
}

function harnessResearchPointer(path) {
  const brief = markdownSection(read(path), '0. Execution Brief', path);
  const row = brief.match(/\| 研究 \/ 续跑 \/ 报告 \|[^|\n]+\|/);
  const pointerPara = brief.match(/入口选择的完整规则只有一处 canonical 表述：[^\n]+/);
  assert.ok(row, `${path} must keep the research Brief row`);
  assert.ok(pointerPara, `${path} must keep the canonical-pointer sentence`);
  return `${row[0]}\n${pointerPara[0]}`;
}

function readmeSelectionBlock(text) {
  const trigger = markdownSection(text, '触发规则（最高优先）', README);
  const match = trigger.match(/\*\*本 Harness 就是项目的 Deep Research Harness。\*\*[^\n]+/);
  assert.ok(match, `${README} must keep the selection-pointer paragraph`);
  return match[0];
}

function runEntrySelectionBlock(text) {
  return markdownSection(text, '1. Entry Selection Is Already Done', RUN);
}

function startExistingBundleBlock(text) {
  const match = text.match(/此 playbook 不处理 existing bundle：[^\n]+/);
  assert.ok(match, `${START} must keep the existing-bundle pointer sentence`);
  return match[0];
}

describe('Deep Research Harness research entry routing contract', () => {
  it('keeps root Routing as a pointer and forbids procedure restatement', () => {
    const blocks = ROOT_SURFACES.map(routingBlock);
    assert.equal(blocks[0], blocks[1], 'root routing guidance must stay synchronized');
    assertPointerBlock(blocks[0], 'root Deep Research Routing');
  });

  it('keeps framework guidance entry-first without a second selection tree', () => {
    const surfaces = FRAMEWORK_SURFACES.map(read);
    assert.equal(surfaces[0], surfaces[1], 'framework behavior files must stay synchronized');

    for (const path of FRAMEWORK_SURFACES) {
      assertPointerBlock(harnessResearchPointer(path), `${path} research pointer`);
      const text = read(path);
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

    assertPointerBlock(runEntrySelectionBlock(run), 'RUN.md Entry Selection pointer');
    assertPointerBlock(readmeSelectionBlock(readme), 'README trigger-rule selection paragraph');
    assert.match(readme, /用户有研究意图 → 触发本 Harness/);
    assert.match(readme, /不触发本 Harness、不选择 run/);
    assert.match(readme, /selected entry 读完前/);
    assert.match(readme, /Section 2 随后进入 `command_playbook\/start-research\.md`/);
    assert.match(readme, /不保证宿主不会预先匹配 skill 或注入工具/);

    assert.match(commands, /`RUN\.md` 选定新研究 entry 后的下游 playbook/);
    assertPointerBlock(startExistingBundleBlock(start), 'start-research existing-bundle pointer');
    assert.doesNotMatch(start, /新研究入口/);
  });
});
