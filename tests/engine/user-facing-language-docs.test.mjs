// Static regression coverage for user-facing language hints without changing authority.
// @impl HIU-004, CDP-004, SWE-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

describe('user-facing language guidance docs', () => {
  it('HITL UX guidance covers dynamic user-visible content and preserves canonical tokens', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-agent-ux-guidance.md');

    for (const marker of [
      'topic rewrite',
      'topic preview',
      'decision-brief summary',
      '证据缺口',
      '建议和确认文案',
      '内部 enum 值、文件路径、字段名、CLI 命令',
      '来源标题',
      'canonical form',
    ]) {
      assert.ok(text.includes(marker), `shared-agent-ux-guidance.md missing marker: ${marker}`);
    }
  });

  it('Final phase prefers Chinese only on legal terminal delivery surfaces', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md');

    assert.ok(text.includes('用户未指定其他输出语言时'));
    assert.ok(text.includes('final report narrative'));
    assert.ok(text.includes('terminal delivery summary'));
    assert.ok(text.includes('citations、source titles、paths、commands、field names、enum values'));
    assert.ok(text.includes('legal Final entry 后的 `final/` 文件存在证明'));

    assert.doesNotMatch(text, /md:final_delivery/);
    assert.doesNotMatch(text, /gate:\s*final_delivery/i);

    for (const line of text.split('\n').filter((entry) => entry.includes('final_delivery'))) {
      assert.match(line, /没有|不要|MUST NOT|not/i, `final_delivery mention must be prohibitive: ${line}`);
    }
    for (const line of text.split('\n').filter((entry) => /hidden next|hidden gate|hidden loop|隐式循环/i.test(entry))) {
      assert.match(line, /没有|不要|MUST NOT|not|no/i, `hidden route mention must be prohibitive: ${line}`);
    }
  });

  it('silent guidance rejects language-driven status replies and stale single-turn allowances', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md');

    assert.ok(text.includes('Language preference is not surfacing permission'));
    assert.ok(text.includes('never authorizes status replies, acknowledgements, progress, partial delivery'));
    assert.ok(text.includes('用户消息、approval prompt、harness notification、prefer-Chinese guidance 都不是 surfacing permission'));
    assert.ok(text.includes('Agent SHALL NOT 因用户消息而停止等待、发送 acknowledgement、发送状态回复'));
    assert.ok(text.includes('不得用 chat acknowledgement 确认'));

    assert.doesNotMatch(text, /Agent MAY 以单轮、陈述式状态回复/);
    assert.doesNotMatch(text, /允许的响应/);
    assert.doesNotMatch(text, /单轮状态告知/);
    assert.doesNotMatch(text, /正在执行 Wave1 证据采集/);
  });

  it('does not introduce locale fields or language detectors into framework surfaces', () => {
    for (const relPath of [
      'DPT_FRAMEWORK/workflows/nodes/shared/shared-agent-ux-guidance.md',
      'DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md',
    ]) {
      const text = read(relPath);
      assert.doesNotMatch(text, /\breport_locale\b|\blocale\b|\blanguage_detector\b|语言检测/);
      assert.doesNotMatch(text, /deterministic delivery failure|非中文.*fail|非中文.*失败/);
    }
  });

  it('keeps wave, gate, and routing instruction bodies out of the language polish scope', () => {
    for (const relPath of [
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-readiness.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md',
      'DPT_FRAMEWORK/workflows/transitions.chain.json',
    ]) {
      const text = read(relPath);
      assert.doesNotMatch(text, /prefer Chinese|prefer-Chinese|用户未指定其他输出语言|language preference/i, `${relPath} should not receive language polish`);
    }
  });
});
