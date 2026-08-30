// @impl ACR-001, ACR-002, ACR-003, ACR-004
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROOT_BEHAVIOR_FILES = ['AGENTS.md', 'CLAUDE.md'];
const FRAMEWORK_BEHAVIOR_FILES = ['DEEP_RESEARCH_HARNESS/AGENTS.md', 'DEEP_RESEARCH_HARNESS/CLAUDE.md'];
const ADR_RATIONALES = [
  {
    path: 'docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md',
    markers: [/JavaScript workflow controller/, /LLM Agent and\s+Markdown control surfaces/, /Engine as the deterministic trust root/, /accepted OpenSpec contracts/, /records rationale, not runtime truth/],
  },
  {
    path: 'docs/adr/0002-name-the-reusable-surface-deep-research-harness.md',
    markers: [/canonical semantic name is \*\*Deep Research Harness\*\*/, /\*\*run bundle\*\* remains/, /physical source\s+root/, /ADR 0003/],
  },
  {
    path: 'docs/adr/0003-retire-legacy-harness-source-alias.md',
    markers: [/sole reusable Harness source, import, and\s+command coordinate/, /selected\s+Harness context as unavailable/, /stop\s+before executing a bundle-provided\s+command/],
  },
];

function read(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function section(text, heading, path) {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `${path} must contain ${marker}`);
  const end = text.indexOf('\n## ', start + marker.length);
  return text.slice(start, end === -1 ? undefined : end);
}

function assertOrdered(text, path, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = text.indexOf(marker);
    assert.notEqual(index, -1, `${path} must contain ${marker}`);
    assert.ok(index > previous, `${path} must place ${marker} after ${markers[markers.indexOf(marker) - 1]}`);
    previous = index;
  }
}

function assertNonEntryBoundary(text, path) {
  assert.match(
    text,
    /不是 Deep Research Harness research entry，不选择 run，也不\s*授权 request-specific\s*research/,
    `${path} must keep the project-context read outside Deep Research Harness research entry selection`,
  );
}

describe('agent context routing contract', () => {
  it('keeps root Execution Brief as the first action and routing after it', () => {
    const briefBlocks = ROOT_BEHAVIOR_FILES.map((path) => {
      const text = read(path);
      const brief = section(text, '0. Execution Brief', path);

      assert.doesNotMatch(text, /^## Before Anything Else$/m);
      assertOrdered(brief, path, ['openspec/constitution/project-charter.md', 'CONTEXT.md']);
      assertOrdered(text, path, ['## 0. Execution Brief', 'CONTEXT.md', '## Deep Research Routing']);
      assert.match(brief, /研究\s*\/\s*续跑\s*\/\s*报告/);
      assert.match(brief, /改行为/);
      assert.match(brief, /tasks\.md/);
      assert.match(brief, /CLI `next`/);
      assert.match(brief, /该文件已在上下文/);
      assert.match(brief, /change 已在，或 spec 已打开/);
      assert.match(brief, /执行了那一个下一步/);
      assert.match(text, /docs\/adr\//);
      return brief;
    });

    assert.equal(briefBlocks[0], briefBlocks[1], 'root Execution Brief blocks must stay synchronized');
  });

  it('keeps the root README route pointing at the Execution Brief', () => {
    const path = 'README.md';
    const text = read(path);
    const startHere = section(text, 'Start Here', path);

    assertOrdered(text, path, [
      '## Start Here',
      'AGENTS.md',
      '0. Execution Brief',
      'openspec/constitution/project-charter.md',
      'CONTEXT.md',
      'Start from the repository root',
      '## Directory Map',
    ]);
    assert.match(startHere, /docs\/adr\//);
    assert.match(startHere, /Do not pre-read every root document or recursively scan directories/);
    assert.match(startHere, /不要先 Charter-then-context/);
    assert.match(text, /\| `docs\/adr\/` \|/);
  });

  it('keeps Harness Execution Brief and shared-context coordinates outside research entry', () => {
    const sharedBlocks = FRAMEWORK_BEHAVIOR_FILES.map((path) => {
      const text = read(path);
      const brief = section(text, '0. Execution Brief', path);
      const shared = section(text, '共享项目上下文', path);

      assert.doesNotMatch(text, /## ⚡ 第一优先/);
      assert.match(brief, /研究\s*\/\s*续跑\s*\/\s*报告/);
      assert.match(brief, /改本目录行为/);
      assert.match(brief, /selected entry 已在上下文/);
      assert.match(brief, /根 `AGENTS\.md` Execution Brief 的「改行为」行/);
      assertOrdered(text, path, [
        '## 0. Execution Brief',
        '## 共享项目上下文',
        '../openspec/constitution/project-charter.md',
        '../CONTEXT.md',
        '## Must Read',
      ]);
      assert.match(shared, /全项目唯一的术语对齐 glossary/);
      assert.match(shared, /`README\.md`、`COMMANDS\.md` 和 selected\s+playbook/);
      assert.match(shared, /跑研究不必先读/);
      assertNonEntryBoundary(shared, path);
      assert.match(text, /`README\.md`/);
      assert.match(text, /`COMMANDS\.md`/);
      assert.match(text, /command_playbook\/start-research\.md/);
      assert.match(text, /command_playbook\/continue-run-bundle\.md/);
      return shared;
    });

    assert.equal(sharedBlocks[0], sharedBlocks[1], 'framework shared-project blocks must stay synchronized');
  });

  it('keeps the framework README parent-project block non-entry without a mandatory pre-read', () => {
    const path = 'DEEP_RESEARCH_HARNESS/README.md';
    const text = read(path);
    const preRead = section(text, '共享项目上下文', path);

    assertOrdered(text, path, [
      '## 共享项目上下文',
      '../openspec/constitution/project-charter.md',
      '../CONTEXT.md',
      '> **最快触发**',
      '## 触发规则（最高优先）',
      '## 第一条',
    ]);
    assert.match(preRead, /全项目唯一的术语对齐\s+glossary/);
    assert.match(preRead, /`COMMANDS\.md` 和 selected playbook/);
    assert.match(preRead, /跑研究不必先读/);
    assert.doesNotMatch(preRead, /开始 Deep Research Harness work 前，先读/);
    assertNonEntryBoundary(preRead, path);
  });

  it('keeps a compact root vocabulary orientation with canon links and authority-sensitive distinctions', () => {
    const path = 'CONTEXT.md';
    const text = read(path);

    assert.match(text, /## Terminology Sources and Authority Boundary/);
    assert.match(text, /\[Project Charter\]\(openspec\/constitution\/project-charter\.md\)/);
    assert.match(text, /\[OpenSpec Control Map\]\(openspec\/README\.md\)/);
    assert.match(text, /\[Agentic Execution Model\]\(openspec\/guidance\/models\/agentic-execution-model\.md\)/);
    assert.match(text, /\[ADR 0001\]\(docs\/adr\/0001-keep-agent-flow-markdown-driven-and-engine-gated\.md\)/);
    assert.match(text, /\[ADR 0002\]\(docs\/adr\/0002-name-the-reusable-surface-deep-research-harness\.md\)/);
    assert.match(text, /\[ADR 0003\]\(docs\/adr\/0003-retire-legacy-harness-source-alias\.md\)/);
    assert.match(text, /mandatory vocabulary orientation/);
    assert.match(text, /not\s+a behavior specification, executable contract, Gate verdict, or\s+runtime projection/);
    assert.match(text, /For complete Phase Agent, Sub-agent, Queue\s+demand item, Work unit, and Submit\s+vocabulary/);
    assert.match(text, /Current run bundle root/);
    assert.match(text, /does not itself grant authority,\s+capability, permission, liveness,\s+or evidence/);
    assert.match(text, /does not itself select the next Chain phase/);
    for (const term of ['Deep Research Tool project', 'Deep Research Harness', 'Run bundle', 'Current run bundle root']) {
      assert.match(text, new RegExp(term), `CONTEXT.md must retain the compact ${term} distinction`);
    }
    assert.equal(existsSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/CONTEXT.md')), false, 'framework must not gain a local glossary');
  });

  it('keeps all current ADRs as accepted rationale rather than behavior authority', () => {
    for (const { path, markers } of ADR_RATIONALES) {
      const text = read(path);
      for (const heading of ['Status', 'Context', 'Decision', 'Consequences']) {
        assert.match(text, new RegExp(`^## ${heading}$`, 'm'), `${path} must retain ## ${heading}`);
      }
      assert.match(text, /## Status\s*\n+Accepted/);
      for (const marker of markers) assert.match(text, marker, `${path} must retain its decision boundary`);
    }
  });
});
