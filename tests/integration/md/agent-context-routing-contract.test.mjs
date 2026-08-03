// @impl ACR-001, ACR-002, ACR-003, ACR-004
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROOT_BEHAVIOR_FILES = ['AGENTS.md', 'CLAUDE.md'];
const FRAMEWORK_BEHAVIOR_FILES = ['DPT_FRAMEWORK/AGENTS.md', 'DPT_FRAMEWORK/CLAUDE.md'];

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
    /不是 DPT research entry，不选择 run，也不\s*授权 request-specific\s*research/,
    `${path} must keep the project-context read outside DPT research entry selection`,
  );
}

describe('agent context routing contract', () => {
  it('keeps root behavior entries synchronized and ordered before research routing', () => {
    const preReadBlocks = ROOT_BEHAVIOR_FILES.map((path) => {
      const text = read(path);
      const preRead = section(text, 'Before Anything Else', path);

      assertOrdered(preRead, path, ['guidelines/project-charter.md', 'CONTEXT.md']);
      assertOrdered(text, path, ['## Before Anything Else', 'CONTEXT.md', '## Deep Research Routing']);
      assert.match(preRead, /normal instruction-discovery\s+behavior/);
      assert.match(preRead, /task-specific authoritative sources/);
      assert.match(text, /docs\/adr\//);
      return preRead;
    });

    assert.equal(preReadBlocks[0], preReadBlocks[1], 'root pre-read blocks must stay synchronized');
  });

  it('keeps the root README route before scoped directory selection', () => {
    const path = 'README.md';
    const text = read(path);
    const startHere = section(text, 'Start Here', path);

    assertOrdered(text, path, [
      '## Start Here',
      'guidelines/project-charter.md',
      'CONTEXT.md',
      'Start from the repository root',
      '## Directory Map',
    ]);
    assert.match(startHere, /docs\/adr\//);
    assert.match(startHere, /Do not pre-read every root document or recursively scan directories/);
    assert.match(text, /\| `docs\/adr\/` \|/);
  });

  it('keeps framework behavior entries synchronized and outside DPT entry selection', () => {
    const preReadBlocks = FRAMEWORK_BEHAVIOR_FILES.map((path) => {
      const text = read(path);
      const preRead = section(text, '共享项目上下文', path);
      const afterPreRead = text.slice(text.indexOf('## ⚡ 第一优先'));

      assertOrdered(text, path, [
        '## 共享项目上下文',
        '../guidelines/project-charter.md',
        '../CONTEXT.md',
        '## ⚡ 第一优先',
        '## Must Read',
      ]);
      assert.match(preRead, /全项目唯一的术语对齐 glossary/);
      assert.match(preRead, /`README\.md`、`COMMANDS\.md` 和 selected\s+playbook/);
      assertNonEntryBoundary(preRead, path);
      assert.match(afterPreRead, /`README\.md`/);
      assert.match(afterPreRead, /`COMMANDS\.md`/);
      assert.match(afterPreRead, /command_playbook\/start-research\.md/);
      assert.match(afterPreRead, /command_playbook\/continue-run-bundle\.md/);
      return preRead;
    });

    assert.equal(preReadBlocks[0], preReadBlocks[1], 'framework shared-project blocks must stay synchronized');
  });

  it('places the framework README pre-read before every trigger surface', () => {
    const path = 'DPT_FRAMEWORK/README.md';
    const text = read(path);
    const preRead = section(text, '共享项目上下文', path);

    assertOrdered(text, path, [
      '## 共享项目上下文',
      '../guidelines/project-charter.md',
      '../CONTEXT.md',
      '> **最快触发**',
      '## 触发规则（最高优先）',
      '## 第一条',
    ]);
    assert.match(preRead, /全项目唯一的术语对齐\s+glossary/);
    assert.match(preRead, /`COMMANDS\.md` 和 selected playbook/);
    assertNonEntryBoundary(preRead, path);
  });

  it('keeps one root glossary with canon links and authority-sensitive distinctions', () => {
    const path = 'CONTEXT.md';
    const text = read(path);

    assert.match(text, /## Terminology Sources and Authority Boundary/);
    assert.match(text, /\[Project Charter\]\(guidelines\/project-charter\.md\)/);
    assert.match(text, /\[Guidelines Index\]\(guidelines\/README\.md\)/);
    assert.match(text, /\[Agentic Execution Model\]\(guidelines\/agentic-execution-model\.md\)/);
    assert.match(text, /\[ADR 0001\]\(docs\/adr\/0001-keep-agent-flow-markdown-driven-and-engine-gated\.md\)/);
    assert.match(text, /vocabulary-alignment surface/);
    assert.match(text, /not a behavior specification, executable contract, Gate verdict, or\s+runtime projection/);
    assert.match(text, /complete Phase Agent, Sub-agent, Queue\s+demand item, Work unit, and Submit vocabulary/);
    assert.match(text, /production research run or disposable\s+experiment/);
    assert.match(text, /does not itself select the next Chain phase/);
    assert.match(text, /Chain uses accepted\s+transition authority to select the next phase/);
    assert.match(text, /does not by itself grant authority,\s+capability, permission, liveness, or evidence/);
    assert.equal(existsSync(join(REPO_ROOT, 'DPT_FRAMEWORK/CONTEXT.md')), false, 'framework must not gain a local glossary');
  });

  it('keeps ADR 0001 as an accepted rationale rather than behavior authority', () => {
    const path = 'docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md';
    const text = read(path);

    for (const heading of ['Status', 'Context', 'Decision', 'Consequences']) {
      assert.match(text, new RegExp(`^## ${heading}$`, 'm'), `${path} must retain ## ${heading}`);
    }
    assert.match(text, /## Status\s*\n+Accepted/);
    assert.match(text, /JavaScript workflow controller/);
    assert.match(text, /LLM Agent and\s+Markdown control surfaces/);
    assert.match(text, /Engine as the deterministic trust root/);
    assert.match(text, /accepted OpenSpec contracts/);
    assert.match(text, /records rationale, not runtime truth/);
  });
});
