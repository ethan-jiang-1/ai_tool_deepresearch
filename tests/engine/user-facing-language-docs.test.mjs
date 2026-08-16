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
    const text = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-agent-ux-guidance.md');

    for (const marker of [
      '一个明确推荐',
      '自然语言修正',
      '实质进展',
      '具体 must-answer 建议',
      'canonical field',
      '普通 profile/topic write、Gate、handoff、status sync 与 repair 由 Agent 执行',
    ]) {
      assert.ok(text.includes(marker), `shared-agent-ux-guidance.md missing marker: ${marker}`);
    }
  });

  it('Final phase prefers Chinese only on legal terminal delivery surfaces', () => {
    const text = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md');

    assert.ok(text.includes('After admitted entry and the exact Readiness status sync, first'));
    assert.ok(text.includes('delivery is immediate. After each committed report, show it and invite ordinary'));
    assert.ok(text.includes('After each committed report, show it and invite ordinary'));
    assert.ok(text.includes('Use Chinese for report narrative and delivery/feedback language unless the user'));
    assert.ok(text.includes('asks for another language.'));
    assert.ok(text.includes('Keep canonical paths, commands, field names, enums,'));
    assert.ok(text.includes('citations, and source titles unchanged.'));

    assert.doesNotMatch(text, /md:final_delivery/);
    assert.doesNotMatch(text, /gate:\s*final_delivery/i);

    for (const line of text.split('\n').filter((entry) => entry.includes('final_delivery'))) {
      assert.match(line, /没有|不要|MUST NOT|not/i, `final_delivery mention must be prohibitive: ${line}`);
    }
    for (const line of text.split('\n').filter((entry) => /hidden next|hidden gate|hidden loop|隐式循环/i.test(entry))) {
      assert.match(line, /没有|不要|MUST NOT|not|no/i, `hidden route mention must be prohibitive: ${line}`);
    }
  });

  it('silent guidance rejects language-driven surfacing but answers user-initiated turns without authority', () => {
    const text = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md');

    assert.ok(text.includes('Language preference is not surfacing permission'));
    assert.ok(text.includes('never authorizes status replies, acknowledgements, progress, partial delivery'));
    assert.match(text, /user-initiated message.*current conversation turn/i);
    assert.match(text, /answer it directly/i);
    assert.match(text, /creates no checkpoint, state, permission, route, mutation or reentry authority/i);
    assert.match(text, /approval prompt, harness\/task notification, language preference.*not a user-initiated conversation turn/i);

    assert.doesNotMatch(text, /Agent MAY 以单轮、陈述式状态回复/);
    assert.doesNotMatch(text, /允许的响应/);
    assert.doesNotMatch(text, /单轮状态告知/);
    assert.doesNotMatch(text, /正在执行 Wave1 证据采集/);
    assert.doesNotMatch(text, /user is NOT available/i);
    assert.doesNotMatch(text, /Agent SHALL NOT 因用户消息而.*发送.*回复/);
  });

  it('does not introduce locale fields or language detectors into framework surfaces', () => {
    for (const relPath of [
      'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-agent-ux-guidance.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md',
    ]) {
      const text = read(relPath);
      assert.doesNotMatch(text, /\breport_locale\b|\blocale\b|\blanguage_detector\b|语言检测/);
      assert.doesNotMatch(text, /deterministic delivery failure|非中文.*fail|非中文.*失败/);
    }
  });

  it('keeps wave, gate, and routing instruction bodies out of the language polish scope', () => {
    for (const relPath of [
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-setup.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-seed-topics.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-readiness.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md',
      'DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json',
    ]) {
      const text = read(relPath);
      assert.doesNotMatch(text, /prefer Chinese|prefer-Chinese|用户未指定其他输出语言|language preference/i, `${relPath} should not receive language polish`);
    }
  });
});
