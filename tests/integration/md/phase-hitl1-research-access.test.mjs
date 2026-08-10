// @impl WNC-001, PRP-002, PRP-005, REA-002, HIU-002
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const PHASE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md', import.meta.url);
const GUIDE_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md', import.meta.url);
const BRIEF_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md', import.meta.url);
const ADAPTER_PATH = new URL('../../../DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md', import.meta.url);

const phase = readFileSync(PHASE_PATH, 'utf-8');
const guide = readFileSync(GUIDE_PATH, 'utf-8');
const brief = readFileSync(BRIEF_PATH, 'utf-8');
const adapter = readFileSync(ADAPTER_PATH, 'utf-8');
const phaseFrontmatter = parseYaml(phase.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const guideFrontmatter = parseYaml(guide.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const probe = phase.slice(
  phase.indexOf('### 3d. Research Access Probe'),
  phase.indexOf('## 4. Expected Artifacts'),
);
const gatePass = phase.slice(
  phase.indexOf('## 6. On Gate Pass'),
  phase.indexOf('## 7. On Gate Fail'),
);

describe('phase-hitl1 isolated research-access probe contract', () => {
  it('keeps HITL1 as the same phase and explicitly requires the isolated guide', () => {
    assert.equal(phaseFrontmatter.stop, 'yes');
    assert.equal(phaseFrontmatter.execution_contract?.surface, 'phase-agent');
    assert.equal(phaseFrontmatter.execution_contract?.search_policy, 'capability_probe_only');
    assert.ok(phaseFrontmatter.requires.includes('shared/shared-hitl1-capability-probe'));
    assert.equal(guideFrontmatter.execution_contract?.surface, 'isolated-probe-agent');
    assert.equal(guideFrontmatter.execution_contract?.search_policy, 'capability_probe_only');
  });

  it('keeps status synchronization and style handoff before the isolated probe', () => {
    const decision = phase.slice(
      phase.indexOf('### 3b. HITL1'),
      phase.indexOf('### 3b.1 Optional User Research Controls Snapshot'),
    );
    const statusIndex = decision.indexOf('advance-status.mjs');
    const applyIndex = decision.indexOf('operate-topic-state apply');
    const styleIndex = phase.indexOf('### 3c. Research Style Projection Handoff');
    const probeIndex = phase.indexOf('### 3d. Research Access Probe');

    assert.ok(statusIndex >= 0 && applyIndex > statusIndex);
    assert.ok(styleIndex >= 0 && probeIndex > styleIndex);
    assert.match(phase, /style_projection\.status: refresh_required/);
    assert.match(phase, /style_projection\.command/);
  });

  it('makes the Phase render, spawn once, relay, write, and rerun the unchanged Gate', () => {
    assert.match(probe, /`brief\/hitl1\.md`.*「能力检查沟通 > 探测前提示」/);
    assert.equal((probe.match(/\bSpawn\b/g) || []).length, 1);
    assert.match(probe, /完整指令生成 prompt/);
    assert.match(probe, /prompt 不得包含 bundle path.*profile\/status\/Gate 指令.*work-unit 身份.*文件写入义务/);
    assert.match(probe, /Phase Agent SHALL NOT 直接调用 native search 或 fetch/);
    assert.doesNotMatch(probe, /\bWebSearch\b|\bWebFetch\b/);
    assert.match(probe, /`rb_profile\.yaml#\/research_access` 的唯一 writer/);
    assert.match(probe, /valid return 原样写入/);
    assert.match(probe, /probe_agent_spawn_failed:.*probe_agent_return_invalid:/);
    assert.match(probe, /不得.*自动再 spawn/);
    assert.match(probe, /随后运行同一个 Gate/);
    assert.match(probe, /同一 isolated probe 和同一 Gate/);
  });

  it('puts the fixed native-first sequence and compact return boundary in the guide', () => {
    const fallback = "curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'";

    assert.match(guide, /site:wikipedia\.org "Internet protocol suite"/);
    assert.match(guide, /at most the first three syntactically\s+eligible actual HTTP\(S\) URLs in returned order/);
    assert.match(guide, /candidate 2 after candidate 1.*candidate 3 only after candidate 2/s);
    assert.match(guide, /native fetch surface once\s+first/);
    assert.ok(guide.includes(fallback), 'missing exact bounded curl fallback');
    assert.match(guide, /single-quoted argument/);
    assert.match(guide, /no prefix\s+assignment, pipe, redirection, command substitution, shell chaining, or\s+trailing command/);
    assert.match(guide, /no surrounding\s+prose or additional fields/);
    assert.match(guide, /status: available[\s\S]*fetch_outcome: success[\s\S]*eligible_candidate_count: <1\.\.3>/);
    assert.match(guide, /status: unavailable[\s\S]*fetch_outcome: not_attempted[\s\S]*eligible_candidate_count: 0/);
    assert.match(guide, /`surface_absent:`/);
    assert.match(guide, /`permission_required:`/);
  });

  it('keeps the probe outside bundle, evidence, work-unit, and Gate authority', () => {
    assert.match(guide, /Do not read, write, inspect, name, or request a run bundle, filesystem path/);
    assert.match(guide, /profile, status, trace, receipt, ledger, work-unit, cache, artifact/);
    assert.match(guide, /Do not collect research evidence, preserve page bytes, candidate lists, raw/);
    assert.match(guide, /Do not ask the user.*permission bypass.*automatic retries/s);
    assert.match(guide, /Do not return page content, a candidate list, raw\s+tool output, transcript, analysis, receipt, or verdict/);
    assert.match(phase, /isolated probe agent 只返回 transient observation，绝不写 bundle state 或运行 Gate/);
    assert.match(phase, /Probe URL、page content 和 tool output SHALL NOT 写入或计入 `reference\/`.*Wave coverage\/count floor/s);
  });

  it('keeps adapter execution, profile ownership, and the non-bypass host boundary coherent', () => {
    assert.match(adapter, /generic launcher\s+mode\. It does not add, accept, or rely on a caller-supplied permission-bypass option/s);
    assert.match(adapter, /Phase Agent.*spawns one isolated probe agent/s);
    assert.match(adapter, /Phase Agent\s+remains the sole `rb_profile\.yaml#\/research_access` writer and reruns the existing\s+HITL1 Gate/s);
    assert.match(adapter, /does not choose a query or\s+candidate, run search\/fetch in place of the isolated agent, mutate a bundle, create\s+retries, or write a profile observation/s);
    assert.match(adapter, /has no bundle, filesystem, profile, status, trace, receipt, ledger, evidence, or\s+Gate authority/s);
    assert.match(adapter, /Tool names, launcher `--check`.*not evidence of available\s+research access/s);
  });

  it('uses exact status copy in observation-before-Gate order and retains Gate-pass-only exit', () => {
    const notice = '开始研究前，系统先快速检查一下联网搜索能力，大概几秒钟，请稍候。';
    const available = '联网能力正常，开始准备研究。';
    const unavailable = '联网检查没通过。多数是网络问题——请检查网络连接后重试；网络正常的话稍后再试也行。你刚才的选择不会丢。';

    for (const message of [notice, available, unavailable]) {
      assert.ok(brief.includes(message), `missing exact capability message: ${message}`);
    }

    const noticeIndex = probe.indexOf('能力检查沟通 > 探测前提示');
    const spawnIndex = probe.indexOf('Spawn 一个 isolated probe agent');
    const writeIndex = probe.indexOf('valid return 原样写入');
    const resultIndex = probe.indexOf('profile write 后、运行 `hitl1-recorded` Gate 前');
    assert.ok(noticeIndex >= 0 && spawnIndex > noticeIndex);
    assert.ok(writeIndex > spawnIndex && resultIndex > writeIndex);
    assert.match(probe, /`available` 输出「能力检查沟通 > 访问可用」/);
    assert.match(probe, /`unavailable` 输出「能力检查沟通 > 访问不可用」/);
    assert.match(probe, /结果不是 Gate verdict/);
    assert.match(probe, /`available` 不得提前发送「出口语」/);
    assert.match(gatePass, /仅在 `hitl1-recorded` Gate 通过后/);
    assert.match(gatePass, /「访问可用」结果不是出口语/);
    assert.match(brief, /不得承诺.*host permission.*provider success.*automatic retry/s);
    assert.match(brief, /不.*精确时长保证/);
  });
});
