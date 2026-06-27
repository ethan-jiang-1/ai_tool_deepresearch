---
node_type: shared
id: shared-silent-execution
shared_scope: silent-execution
authority: behavioral-contract
requires: []
suggested_context:
  - shared/shared-repair-guidance
  - shared/shared-anti-cheating-rules
---

# Shared: Silent Execution（静默阶段行为纪律）

## Purpose

定义 wave0/1/2、setup、seed-topics 和 readiness 阶段的静默自主执行契约。Agent 在这些阶段 SHALL NOT 浮出水面——不展示内容、不提问、不确认、不报告进度。遇错按降级优先级链自行处理。

此文件是 **行为约定**——wave phase MD 通过 `requires` 加载此文件，Agent 在静默阶段 SHALL 遵守本文中的所有规则。

**冲突解决**：当本文规则与 `shared-repair-guidance.md` 或 `shared-anti-cheating-rules.md` 冲突时，本文的静默纪律优先（详见第 3 节优先级覆盖表）。

**Authority boundary**：此文件定义 Agent 行为规则。Engine（gate CLI）保证 gate 推进 + schema 验证，不参与静默行为判断。

---

## 1. 静默阶段核心行为纪律

@impl SWE-001

### 1.1 适用范围

以下 phase 为静默阶段（均为 `stop: no`）：

| Phase | 特点 |
|-------|------|
| setup | 执行时间短，实践中几乎不会触发降级 |
| seed-topics | 执行时间短，实践中几乎不会触发降级 |
| wave0 | 长程，可能触发降级 |
| wave1 | 长程，可能触发降级 |
| wave2 | 长程，可能触发降级 |
| readiness | 程序化 precheck，执行时间极短 |

### 1.2 核心禁令

Agent 在静默阶段 SHALL NOT：
- 向用户展示任何内容
- 向用户提问
- 请求用户确认
- 报告执行进度
- 发送类似 "继续吗？"、"已完成 XX，是否继续？"、"遇到错误，是否重试？" 的消息

### 1.3 降级优先级链（Degradation Priority Chain）

遇错时 Agent SHALL 按以下顺序自行处理，不浮出水面：

1. **重试（Retry）**：网络波动、临时不可用 → 等待后重试（遵循 `shared-repair-guidance.md` 已有修复策略），阻塞消除后自动恢复
2. **换源（Alternative Source）**：特定 URL 不可访问、爬取被拒 → 搜索替代源（更换 domain、更换搜索策略），不降低 evidence quality tier 要求
3. **降级方法（Method Degradation）**：当前方法路径全部失败 → 切换到替代方法（如 WebFetch 不可用 → curl → node fetch → python3），记录方法切换链
4. **标记 gap（Mark Gap）**：所有替代方案已穷尽 → 在 `rb_trace.jsonl` 中标记为 `silent_gap`，记录 `gap_impact: none|partial|blocks_must_answer`，继续到下一个 task
   - `gap_impact: blocks_must_answer` 时 Agent SHALL 在周围 topic 中搜索替代覆盖路径，但不浮出水面

Agent SHALL 在每个降级步骤记录到 `rb_trace.jsonl`：原问题、已尝试的恢复步骤（按优先级链顺序）、最终降级决策、影响评估（`gap_impact`）。

### 1.4 终端恢复

用户可以在静默阶段关闭终端。系统 SHALL 能从 durable state（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`）恢复。Agent 恢复时 SHALL 通过 `rb_status.json` 定位当前 phase 继续执行，SHALL NOT 重新开始已完成的工作。

---

## 2. 降级期间 State 规则

@impl SWE-001

Agent 在静默阶段降级时 SHALL NOT 将 `rb_status.json` 的 state 设为 `blocked`：

- 当前 phase 的 run state SHALL 保持 `in_progress`（不写入 `blocked`，不触发 stop）
- 每次降级 SHALL 在 `rb_trace.jsonl` 中写入 `silent_degradation` event，包含：
  - 原 escalation 原因（如 "repair 3 次 fail，源 example.com 不可访问"）
  - 降级决策（按优先级链选择的具体步骤，如 "mark gap，gap_impact=partial"）
  - 影响评估（对 must-answer 问题的影响）
- 如果降级类型为 mark gap 且 `gap_impact: blocks_must_answer`，在 `rb_trace.jsonl` 中额外写入 `silent_gap_critical` event，但不改变 `rb_status.json` state
- Agent SHALL NOT 写入 `rb_status.json` 的 `blocked` state 或以任何方式触发 stop——静默阶段的降级不构成 lifecycle block

到达 HITL2 时，Agent SHALL 将静默期积累的降级汇总报告给用户：
- 降级总数及按 `gap_impact` 严重程度分布
- 每个 `gap_impact: blocks_must_answer` 事件的详细描述
- 用户可在 HITL2 中选择 C (rerun) 或 D (repair) 针对性修复

---

## 3. Repair Escalation 冲突覆盖

@impl SWE-001

在 wave0/1/2 静默阶段，以下来自其他 shared 文件的规则被静默纪律显式覆盖：

| 被覆盖的规则 | 来源 | 静默阶段改写 |
|-------------|------|------------|
| "修复需要用户 decision 或权限 → escalation/block" | `shared-repair-guidance.md` Escalation 段 | → 降级处理（按降级优先级链），不 escalation，不 block |
| "连续 repair 达到 retry limit 且无进展 → escalation" | `shared-repair-guidance.md` Retry Limit 段 | → 降级处理（按降级优先级链），不 escalation |
| "不能在 escalation 条件触发后继续假装一切正常" | `shared-anti-cheating-rules.md` 规则 3 | → 在静默阶段，"继续执行"不是"假装正常"——降级 + trace 本身就是静默阶段的正确行为。本规则在静默阶段不适用 |
| "遵守 3 次 retry limit；no-progress 或超限后 escalation→block" | `shared-anti-cheating-rules.md` 规则 3 | → 3 次 retry 后不 escalation/block，改为降级 + trace + 继续，按降级优先级链选择下一步 |

Agent SHALL NOT 因 escalation 条件满足而浮出水面。只有在到达下一个合法浮出水面点（HITL2）时，Agent 才将静默期积累的降级和未解决阻塞汇总报告给用户。

---

## 4. 用户主动消息处理

@impl SWE-001

用户在静默阶段主动发送消息时的处理规则：

**允许的响应**：
- Agent MAY 以单轮、陈述式状态回复（如 "正在执行 Wave1 证据采集。完成后会在 HITL2 与你见面。"）
- 回复 SHALL 以句号结尾（不以问号结尾）
- 回复 SHALL NOT 邀请进一步对话
- 回复 SHALL NOT 提供选项

**禁止的行为**：
- Agent SHALL NOT 因用户消息而停止等待——回复后继续执行
- Agent SHALL NOT 将用户消息当作 HITL 交互——不进入环模型，不询问决策
- 即使用户连续发送多条消息，Agent SHALL 仅做单轮状态告知（不展开对话环），重复回复后继续执行

**补充信息处理**：
- 如果用户消息包含研究相关的补充信息（如 "对了，也帮我看看 X"），Agent SHALL 记录到 `rb_trace.jsonl` 但不立即处理
- 在 HITL2 时提醒用户该补充信息尚未纳入当前研究
