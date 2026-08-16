// doc-governance-drift-locks.test.mjs
// Locks the doc/governance repair surfaces of change
// repair-doc-and-governance-drift-and-machine-gaps (F-01, F-02, F-04~F-08, F-17):
// every repaired canonical phrasing must exist and every retired phrasing must
// be absent from the active surfaces.
// @impl TRT-002, RET-008, RUE-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const HARNESS = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

describe('doc-governance drift locks', () => {
  it('F-01: workflows README states the sparse-chain contract and drops the passed-only claim', () => {
    const text = read('DEEP_RESEARCH_HARNESS/workflows/README.md');
    assert.ok(!text.includes('Chain 只编码 `passed` 分支'), 'stale passed-only sentence still present');
    assert.ok(
      text.includes('Chain 是故意稀疏的静态映射表：编码 `passed` 与已声明的 `rerun` 分支'),
      'new sparse-chain sentence missing',
    );
  });

  it('F-01: transitions.chain.json only encodes passed/rerun states', () => {
    const chain = JSON.parse(read('DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json'));
    const states = new Set();
    for (const node of Object.values(chain)) {
      for (const state of Object.keys(node)) states.add(state);
    }
    assert.deepEqual([...states].sort(), ['passed', 'rerun']);
  });

  it('F-02: RUN.md recovery annotation drops the CLI-verb spelling claim', () => {
    const text = read('DEEP_RESEARCH_HARNESS/RUN.md');
    assert.ok(!text.includes('CLI-verb spelling'), 'stale CLI-verb spelling phrase still present');
    assert.ok(
      text.includes('work-unit 面 closed enum，部分值即 CLI 动词拼写'),
      'corrected annotation missing',
    );
  });

  it('F-04: RUN.md and harness README carry the anti-fallback clause', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    const readme = read('DEEP_RESEARCH_HARNESS/README.md');
    const clause = 'preflight 失败不等于「没有 explicit candidate」——禁止因此 fallback 读 `RUN.md`、新建或另选 bundle；只有用户从一开始就没有提供任何 existing candidate 时才读 `RUN.md`';
    assert.ok(run.includes(clause), 'RUN.md anti-fallback clause missing');
    assert.ok(readme.includes(clause), 'harness README anti-fallback clause missing');
  });

  it('F-05: orphan playbook plan-hostfile-sections.md is retired', () => {
    assert.ok(
      !existsSync(join(HARNESS, 'command_playbook', 'plan-hostfile-sections.md')),
      'playbook still exists',
    );
  });

  it('F-06: persist-artifact.md shows two concrete persist-final-report forms', () => {
    const text = read('DEEP_RESEARCH_HARNESS/command_playbook/persist-artifact.md');
    assert.ok(text.includes('--expect-absent'), 'expect-absent form missing');
    assert.ok(text.includes('--expect-sha256 <current-target-sha256>'), 'expect-sha256 form missing');
    assert.ok(!text.includes('(--expect-absent | --expect-sha256'), '(A | B) notation still present');
  });

  it('F-07: COMMANDS.md verb list includes timeout-preflight and CLI header drops the stale sentence', () => {
    const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
    assert.ok(/`timeout`\/`timeout-preflight`\/`abandon`/.test(commands), 'timeout-preflight missing from verb list');
    const cli = read('DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
    assert.ok(!cli.includes('later apply sections'), 'stale header sentence still present');
  });

  it('F-08: root README carries the global language convention and the hard-rule sync line', () => {
    const text = read('README.md');
    assert.ok(
      text.includes('语言约定（全仓库控制面）：精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文，同一控制面内不混用两套主语言'),
      'language-convention bullet missing',
    );
    assert.ok(text.includes('No TypeScript. Absolutely no Python.'), 'hard-rule sync line missing');
    const post = read('DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md');
    assert.ok(!post.includes('`--at` 接受 gate enum'), 'Chinese residue in post-final-recovery.md');
    assert.ok(post.includes('`--at` accepts a gate enum'), 'English sentence missing');
  });

  it('F-17: capability catalog declares accepted-vs-historical scope', () => {
    const text = read('openspec/specs/README.md');
    assert.ok(
      text.includes('本 catalog 列出的 capability 行即当前 **accepted** capabilities'),
      'catalog scope statement missing',
    );
    assert.ok(text.includes('openspec/changes/archive/'), 'archive pointer missing from statement');
  });
});
