// harness-entry-doc-consistency.test.mjs
// Locks the C1 harness-entry-doc-consistency canonical sentences and the
// removal of stale contradictory wording across harness Agent-facing docs.
// @impl RUE-002 (carve-out), RUE-004 (paired files), pre-research-phase-content
// (collision), WNC-010 (bootstrap exception).
// Static cross-file deterministic facts; no network, no Agent execution.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const H = (rel) => join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', rel);

function read(rel) {
  return readFileSync(H(rel), 'utf8');
}

const run = read('RUN.md');
const readme = read('README.md');
const instantiation = read('workflows/nodes/phases/phase-instantiation.md');
const hitl1 = read('workflows/nodes/phases/phase-hitl1.md');
const startResearch = read('command_playbook/start-research.md');
const harnessAgents = read('AGENTS.md');
const harnessClaude = read('CLAUDE.md');

describe('RUN.md §0 selected-entry vs proactive-context-reading distinction', () => {
  it('contains the carve-out sentence and keeps the proceed rule', () => {
    assert.ok(
      run.includes('本次阅读不构成 entry 选择，不授权开始 Section 2 的研究 flow'),
      'RUN.md §0 must contain the proactive-reading carve-out',
    );
    assert.ok(
      run.includes('读到本文件时不要再问用户是否改用内置捷径'),
      'RUN.md §1 proceed sentence must remain unchanged',
    );
  });
});

describe('Harness README trigger rules', () => {
  it('carries the non-research reading carve-out and keeps the intent trigger', () => {
    assert.ok(readme.includes('不触发本 Harness、不选择 run'), 'README trigger carve-out missing');
    assert.ok(readme.includes('用户有研究意图 → 触发本 Harness'), 'README intent trigger sentence must remain');
  });
});

describe('Harness README bundle-name collision wording', () => {
  it('uses the hex6 contract and drops the stale contradictory sentences', () => {
    assert.ok(readme.includes('CLI 报错退出且绝不覆盖'), 'collision CLI-error sentence missing');
    assert.ok(
      readme.includes('按 pre-research-phase-content 契约派生带 `-<hex6>` 后缀的 collision-safe 名称重试'),
      'collision hex6 retry sentence missing',
    );
    assert.ok(!readme.includes('必须报错停止'), 'stale 「必须报错停止」 sentence must be removed');
    assert.ok(
      !readme.includes('collision suffix 是 workflow-foundation target'),
      'stale workflow-foundation collision sentence must be removed',
    );
  });
});

describe('Harness README current executable surface', () => {
  it('uses directory-as-truth pointer and current cli/gates status', () => {
    assert.ok(readme.includes('完整清单以 `cli/` 目录为准'), 'cli/ directory pointer missing');
    assert.ok(
      !readme.includes('CLI，包括 `instantiate-run-bundle.mjs`'),
      'stale closed four-tool list must be removed',
    );
    assert.ok(
      readme.includes('`cli/gates/`：当前每个 gate 一个外部 CLI wrapper'),
      'cli/gates current-status line missing from current surface section',
    );
    assert.ok(
      !readme.includes('one gate per external CLI wrapper。Gate 命令必须显式接收'),
      'stale foundation-section cli/gates line must be removed',
    );
  });
});

describe('Phase §6 bootstrap exception labeling (WNC-010)', () => {
  it('labels the instantiation/HITL1 exception without adding enter-phase', () => {
    for (const [name, text] of [['phase-instantiation', instantiation], ['phase-hitl1', hitl1]]) {
      assert.ok(
        text.includes('兼容例外（WNC-010）：instantiation/HITL1 为 bootstrap status shape 例外'),
        `${name} §6 must carry the WNC-010 bootstrap exception label`,
      );
      assert.ok(
        !text.includes('enter-phase.mjs'),
        `${name} must not gain an enter-phase instruction (WNC-010 SHALL NOT be silently rewritten)`,
      );
    }
  });
});

describe('start-research playbook alignment', () => {
  it('aligns collision wording and notes the bootstrap exception', () => {
    assert.ok(
      startResearch.includes('派生带 `-<hex6>` 后缀的 collision-safe 名称重试'),
      'start-research collision wording must match the hex6 contract',
    );
    assert.ok(
      startResearch.includes('bootstrap 兼容例外，已在其 §6 标注'),
      'start-research instruction-sheet sentence must note the bootstrap exception',
    );
  });
});

describe('Harness AGENTS/CLAUDE entry bullet disambiguation', () => {
  it('states preflight failure is not "no explicit candidate" in both files', () => {
    const sent = '这是 preflight 失败，不等于「没有 explicit candidate」';
    for (const [name, text] of [['AGENTS.md', harnessAgents], ['CLAUDE.md', harnessClaude]]) {
      assert.ok(text.includes(sent), `${name} must carry the disambiguation sentence`);
      assert.ok(
        text.includes('禁止因此 fallback 读 `RUN.md`'),
        `${name} must forbid RUN.md fallback after preflight failure`,
      );
    }
  });
});
