// @impl HIU-001, HIU-002, HIU-003, HIU-005, HIU-006, PRP-002, PRP-012, CDP-001, CDP-004,
// @impl ACS-001, RUE-005, CHI-001, RWP-002, RWP-018, RWP-019, DEW-013

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function read(path) {
  return readFileSync(path, 'utf8');
}

const HITL1_BRIEF = 'DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md';
const HITL2_BRIEF = 'DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl2.md';
const HITL1_PHASE = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md';
const HITL2_PHASE = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md';
const FINAL_PHASE = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md';
const SEED_PHASE = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-seed-topics.md';
const UX = 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-agent-ux-guidance.md';
const SILENT = 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-silent-execution.md';
const CHAIN = 'DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs';

describe('iterative research interaction contract', () => {
  it('makes HITL1 recommendation-first with concrete must-answer and natural-language acceptance', () => {
    const brief = read(HITL1_BRIEF);
    const phase = read(HITL1_PHASE);
    assert.match(brief, /推荐|建议/);
    assert.match(brief, /目标|范围/);
    assert.match(brief, /必须回答|must-answer/i);
    assert.match(brief, /话题|topic/i);
    assert.match(brief, /按.*建议.*开始|按这个开始/);
    assert.match(brief, /修正|调整/);
    assert.match(phase, /apply-research-style\.mjs/);
    assert.match(phase, /operate-topic-state\.mjs apply|operate-topic-state apply/);
    assert.match(phase, /check-gate-hitl1-recorded\.mjs/);
  });

  it('keeps bounded HITL1 alignment a draft before canonical writes', () => {
    const brief = read(HITL1_BRIEF);
    const phase = read(HITL1_PHASE);
    const ux = read(UX);
    const surfaces = [brief, phase, ux].join('\n');

    assert.match(brief, /研究对齐草案/);
    assert.match(brief, /目标、研究对象、决策\/交付用途与范围/);
    assert.match(brief, /首轮最多提出三个问题/);
    assert.match(brief, /彼此独立且现在可以回答/);
    assert.match(brief, /推荐或透明默认值/);
    assert.match(brief, /依赖另一个未决答案的问题会等前置决定清楚后再提/);
    assert.match(brief, /直接说“按这个开始”/);
    assert.match(brief, /自然语言修正/);
    assert.match(brief, /请按你的建议继续/);
    assert.match(ux, /不要求笼统的第二次确认/);

    const snapshotWrite = phase.indexOf('按 §3b.1 先写 alignment snapshot');
    const profileWrite = phase.indexOf('将 `research_profile` 写入 `rb_profile.yaml`');
    const controlsWrite = phase.indexOf('按 §3b.2 保持 separately rendered controls snapshot');
    const retainedInputWrite = phase.indexOf('才写 retained topic-state input 并运行 `operate-topic-state apply`');
    assert.ok(snapshotWrite >= 0, 'Expected an explicit alignment snapshot write');
    assert.ok(profileWrite >= 0, 'Expected the existing profile write');
    assert.ok(controlsWrite >= 0, 'Expected the separately rendered controls snapshot');
    assert.ok(retainedInputWrite >= 0, 'Expected the existing retained topic-state input write');
    assert.ok(snapshotWrite < profileWrite, 'Alignment snapshot must precede the profile write');
    assert.ok(snapshotWrite < controlsWrite, 'Alignment snapshot must precede the controls snapshot');
    assert.ok(controlsWrite < retainedInputWrite, 'Controls snapshot must precede retained topic-state input');
    assert.match(phase, /只有在 §3b\.1 已写入 alignment snapshot、§3b\.2 已写入 separately rendered controls snapshot，且既有 status synchronization 已成功后，才把完整 approved topic set 写入 caller-owned retained JSON/);
    assert.match(phase, /reviewable draft；不得写 accepted profile、HITL1 status 或 canonical Topic state/);
    assert.match(phase, /不证明任何 profile\/status\/Topic fact 已记录，也不允许推进 Gate 或 phase/);
    assert.match(phase, /既有 inspect\/recover\/apply 或 no-path owner/);

    assert.doesNotMatch(surfaces, /\b(?:question_count|clarification_mode|clarification_state|clarification_queue|frontier_question_queue)\b/);
    assert.doesNotMatch(surfaces, /(?:HITL0|HITL3|第三个\s*HITL)/i);
    assert.doesNotMatch(surfaces, /(?:snapshot|快照).*(?:语义\s*Gate|Gate\s*(?:语义|通过|pass))/i);
  });

  it('uses semantic progress instead of round counters or blanket second confirmation', () => {
    const ux = read(UX);
    assert.match(ux, /语义|信息增益|实质进展|重复困惑/);
    assert.match(ux, /最小.*(?:歧义|成本|权限|风险)/);
    assert.doesNotMatch(ux, /追踪用户探索轮数|第 3 轮|5\+ 轮|子环的轮数|独立计数/);
    assert.doesNotMatch(ux, /显式二次确认|统一.*二次确认/);
  });

  it('removes retired search-preference and text-sentinel parsing from HITL1 and seed topics', () => {
    const surfaces = [read(HITL1_BRIEF), read(HITL1_PHASE), read(UX), read(SEED_PHASE)].join('\n');
    assert.doesNotMatch(surfaces, /搜索偏好|search_preference|not_specified_use_profile_defaults/);
    assert.doesNotMatch(surfaces, /gap_queue_backed|文本模式识别|不确定.*语义标记/);
    assert.match(read(HITL1_BRIEF), /具体.*(?:问题|must-answer)|拟定.*(?:问题|must-answer)/i);
  });

  it('makes HITL2 review recommendation-first and delegates availability semantics to one read-only shared evaluator', () => {
    const brief = read(HITL2_BRIEF);
    const phase = read(HITL2_PHASE);
    assert.match(brief, /目前证据足够回答/);
    assert.match(brief, /不足|谨慎/);
    assert.match(brief, /我推荐|当前推荐|建议的下一步/);
    assert.match(brief, /理由|影响/);
    assert.match(brief, /自然语言|直接说|按.*(?:建议|这个)/);
    assert.match(phase, /evaluateRerunAvailability/);
    assert.match(phase, /includeNextIncrement:\s*true/);
    assert.match(phase, /loadGateDefinition\(['"]rerun-ready['"]\)/);
    assert.match(phase, /readBundleProfile/);
    assert.doesNotMatch(brief, /rerun_count\s*[<>]=?|less_than|exclusiveLimit\s*[<>]=?/);
  });

  it('keeps context-dependent HITL2 actions honest instead of inventing a default route', () => {
    const phase = read(HITL2_PHASE);
    for (const action of ['request_view_revision', 'repair', 'stop_blocked']) assert.match(phase, new RegExp(action));
    assert.match(phase, /没有.*(?:合法|accepted).*(?:path|route)|missing.*(?:capability|contract)|不得.*(?:发明|自造).*(?:route|transition)/i);
    assert.match(phase, /check-gate-hitl2-recorded\.mjs/);
  });

  it('defines silence as framework do-not-initiate while normal user replies add no authority', () => {
    const silent = read(SILENT);
    const header = read(CHAIN);
    assert.match(silent, /用户主动|user-initiated/i);
    assert.match(silent, /直接回答|正常回答|respond.*directly|answer.*directly/i);
    assert.match(silent, /不.*(?:创建|改变|授予).*(?:checkpoint|state|permission|authority|reentry)|no.*(?:checkpoint|state|permission|authority)/i);
    assert.match(header, /do not initiate|shall not initiate/i);
    assert.doesNotMatch(silent, /Agent SHALL NOT 因用户消息而.*(?:发送 acknowledgement|发送状态回复|发送进度回复)/);
    assert.doesNotMatch(silent, /rerun_count\s*>=\s*\d+/);
  });

  it('keeps Final terminal delivery while allowing a current factual reply without a delivery overclaim', () => {
    const final = read(FINAL_PHASE);
    const header = read(CHAIN);
    assert.match(final, /terminal delivery|终态|terminal node/i);
    assert.match(final, /用户主动|user-initiated/i);
    assert.match(final, /事实|factual/i);
    assert.match(final, /final\/.*(?:为空|empty)|artifact.*(?:之前|before)/i);
    assert.match(final, /不.*(?:发起|启动).*(?:提问|等待|反馈.*循环|repair loop)|shall not initiate/i);
    assert.match(header, /TERMINAL DELIVERY MODE/);
    assert.match(header, /deliver final artifacts/i);
    assert.match(header, /current factual|user-initiated/i);
    assert.doesNotMatch(final, /Final\s+(?:是|is)\s+(?:第三|third).*(?:checkpoint|交互点)/i);
  });
});
