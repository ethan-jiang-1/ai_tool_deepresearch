// @impl WNC-001, PRP-002, PRP-005, HIU-002
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const PHASE_PATH = new URL('../../../DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md', import.meta.url);
const BRIEF_PATH = new URL('../../../DPT_FRAMEWORK/workflows/nodes/brief/hitl1.md', import.meta.url);
const markdown = readFileSync(PHASE_PATH, 'utf-8');
const brief = readFileSync(BRIEF_PATH, 'utf-8');
const frontmatter = parseYaml(markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');

describe('phase-hitl1 research-access contract', () => {
  it('declares stop yes and capability_probe_only', () => {
    assert.equal(frontmatter.stop, 'yes');
    assert.equal(frontmatter.execution_contract?.surface, 'phase-agent');
    assert.equal(frontmatter.execution_contract?.search_policy, 'capability_probe_only');
  });

  it('places status synchronization before canonical apply and the probe after the returned style handoff', () => {
    const decisionSection = markdown.slice(
      markdown.indexOf('### 3b. HITL1'),
      markdown.indexOf('### 3b.1 Optional User Research Controls Snapshot'),
    );
    const statusIndex = decisionSection.indexOf('advance-status.mjs');
    const applyIndex = decisionSection.indexOf('operate-topic-state apply');
    const styleIndex = markdown.indexOf('### 3c. Research Style Projection Handoff');
    const probeIndex = markdown.indexOf('### 3d. Research Access Probe');
    assert.ok(statusIndex >= 0 && applyIndex > statusIndex);
    assert.ok(styleIndex >= 0 && probeIndex > styleIndex);
    assert.match(markdown, /style_projection\.status: refresh_required/);
    assert.match(markdown, /style_projection\.command/);
  });

  it('keeps one bounded three-candidate serial probe', () => {
    assert.match(markdown, /至多一次 neutral capability-only search/);
    assert.match(markdown, /returned order.*最多前三个.*eligible.*HTTP\(S\)|返回顺序.*最多前三个.*实际 HTTP\(S\)/i);
    assert.match(markdown, /candidate 2.*只.*candidate 1.*不能返回|第二.*候选.*只有.*第一.*不能返回/i);
    assert.match(markdown, /candidate 3.*只.*candidate 2.*不能返回|第三.*候选.*只有.*第二.*不能返回/i);
    assert.match(markdown, /至多一次 native fetch/);
    assert.match(markdown, /native.*真实 page content.*不得.*curl/);
  });

  it('exposes one exact standalone same-URL curl fallback', () => {
    const command = "curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'";
    assert.ok(markdown.includes(command), 'missing exact bounded curl fallback');
    assert.match(markdown, /同一 URL/);
    assert.match(markdown, /single-quoted|单引号/);
    assert.match(markdown, /prefix assignment|pipe|redirection|command substitution|shell chaining|前缀赋值|管道|重定向|命令替换|命令串联/);
    assert.match(markdown, /raw single quote|ASCII whitespace\/control|URL credentials|原始单引号|ASCII 空白\/控制字符|URL 凭据/);
    assert.match(markdown, /localhost.*loopback.*private.*link-local|localhost.*回环.*私有.*链路本地/);
  });

  it('keeps fallback permission and observation ownership explicit', () => {
    assert.match(markdown, /native.*failure.*(?:does not|不).*authoriz|native.*失败.*不.*授权/i);
    assert.match(markdown, /independently configured host shell\/network permission|独立配置.*host shell\/network permission/);
    assert.match(markdown, /(?:must not|不得).*ask the user to run `curl`|不得.*用户.*运行 `curl`/i);
    assert.match(markdown, /fallback.*fetch_surface: curl|curl.*fetch_surface: curl/i);
    assert.match(markdown, /fetch_surface.*optional.*(?:Gate|gate).*not.*enforce|fetch_surface.*可选.*Gate.*不.*强制/i);
  });

  it('exposes exact available and unavailable payload branches', () => {
    for (const token of [
      'research_access.status',
      'research_access/{probed_at,result_url,fetch_outcome}',
      'fetch_outcome: success',
      'research_access/{probed_at,fetch_outcome,reason}',
      'failed | blocked | not_attempted',
    ]) {
      assert.ok(markdown.includes(token), `missing HITL1 payload token: ${token}`);
    }
    assert.match(markdown, /search_surface.*fetch_surface.*audit label/);
    assert.match(markdown, /eligible_candidate_count/);
    assert.match(markdown, /final_candidate_ordinal/);
    assert.match(markdown, /not_attempted.*no legal|no legal.*not_attempted/i);
    assert.match(markdown, /native.*(?:failed|blocked).*fallback|fallback.*native.*(?:failed|blocked)/i);
  });

  it('keeps unavailable repair on the same probe and gate', () => {
    assert.match(markdown, /保留已记录的 `research_profile`、`root_must_answer_set`、style params 和 `hitl1\.status: recorded`/);
    assert.match(markdown, /重跑本节同一 bounded probe 和同一 gate/);
    assert.match(markdown, /不得进入 Setup/);
  });

  it('makes the bounded capability probe a legible non-decision contract', () => {
    const probe = markdown.slice(
      markdown.indexOf('### 3d. Research Access Probe'),
      markdown.indexOf('## 4. Expected Artifacts'),
    );
    const gatePass = markdown.slice(
      markdown.indexOf('## 6. On Gate Pass'),
      markdown.indexOf('## 7. On Gate Fail'),
    );
    const notice = '在进入静默研究前，我会做一次快速的中性能力检查，确认搜索和网页抓取是否可用。这不是当前研究内容，也不需要你作出新的决定。';
    const available = '研究访问能力已确认。我会先完成现有 HITL1 检查；通过后将进入静默自主执行。';
    const unavailable = '当前环境尚不能完成搜索和网页抓取能力检查。已记录的 HITL1 选择仍然有效；这不是新的研究决定。';

    for (const message of [notice, available, unavailable]) {
      assert.ok(brief.includes(message), `missing exact capability message: ${message}`);
    }

    const noticeIndex = probe.indexOf('能力检查沟通 > 探测前提示');
    const queryIndex = probe.indexOf('site:wikipedia.org "Internet protocol suite"');
    const resultIndex = probe.indexOf('写入 final `research_access` observation 后、运行 `hitl1-recorded` Gate 前');
    assert.ok(noticeIndex >= 0 && queryIndex > noticeIndex, 'notice must precede the fixed search query');
    assert.ok(resultIndex > queryIndex, 'direct result instruction must follow the bounded probe');
    assert.match(probe, /`status: available` 输出「能力检查沟通 > 访问可用」/);
    assert.match(probe, /`status: unavailable` 输出「能力检查沟通 > 访问不可用」/);
    assert.match(probe, /不是 Gate verdict/);
    assert.match(probe, /`available` 不得提前发送「出口语」/);
    assert.match(gatePass, /仅在 `hitl1-recorded` Gate 通过后/);
    assert.match(gatePass, /「访问可用」结果不是出口语/);
    assert.match(probe, /不得要求用户重复 HITL1 choices/);
    assert.match(brief, /不得承诺隐藏、替代、重述为成功[\s\S]*selected-host-native/);
    assert.match(probe, /不得承诺隐藏、替代、重述为成功[\s\S]*selected-host-native/);
  });

  it('forbids fake capability and evidence leakage', () => {
    for (const token of [
      'mock/fixed URL',
      'reference/',
      '_cache/',
      'artifacts/',
      'work-unit output/result/receipt',
      'rb_work_unit_ledger.jsonl',
      'rb_output_declarations.jsonl',
      'Wave coverage/count floor',
    ]) {
      assert.ok(markdown.includes(token), `missing research-access boundary: ${token}`);
    }
  });
});
