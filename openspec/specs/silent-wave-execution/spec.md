# silent-wave-execution

> req: SWE-001

## Purpose

Silent Wave Execution 定义了 Agent 在用户缺席（静默自主阶段）时的行为契约——在 wave0/1/2 执行期间完全自主、不浮出水面、遇错按降级优先级链自行处理、将 escalation 改写为降级并完整 trace、到达合法浮出水面点（HITL2）时汇总报告静默期积累的降级。

## Requirements

### Requirement: Silent wave execution contract

在 wave0、wave1、wave2 执行阶段，Agent SHALL 完全静默自主执行——不向用户呈现任何内容、不提问、不请求确认、不报告进度。setup、seed-topics、readiness 同属静默阶段（`stop: no`），静默纪律同样适用（其中 readiness 是程序化 precheck——执行时间极短，实践中几乎不会触发降级，但概念一致性上属于静默阶段）。静默阶段的合法浮出水面点为以下 3 个（2 个交互式决策点 + 1 个终端交付点）：

- **交互式决策点**：HITL1 和 HITL2——声明 `stop: yes`，Agent 停止等待用户输入
- **终端交付点**：Final——声明 `stop: no` 且 `gate: null`，Agent 生成报告后自然终止，不等待用户输入

其他 phase（`stop: no`，除 Final 外）Agent SHALL NOT 停止等待用户。

在静默自主阶段中，Agent SHALL 自行处理所有执行问题，遵循以下降级优先级链（从先到后）：

**降级优先级链（Degradation Priority Chain）：**
1. **重试（Retry）**：网络波动、临时不可用 → 等待后重试（遵循 `shared-repair-guidance.md` 已有修复策略），阻塞消除后自动恢复
2. **换源（Alternative Source）**：特定 URL 不可访问、爬取被拒 → 搜索替代源（更换 domain、更换搜索策略），不降低 evidence quality tier 要求
3. **降级方法（Method Degradation）**：当前方法路径全部失败 → 切换到替代方法（如 WebFetch 不可用 → curl → node fetch → python3），记录方法切换链
4. **标记 gap（Mark Gap）**：所有替代方案已穷尽、源和方法均不可用 → 在 `rb_trace.jsonl` 中标记为 `silent_gap`，记录对 must-answer 问题的影响评估（`gap_impact: none|partial|blocks_must_answer`），继续到下一个 task
   - `gap_impact: blocks_must_answer` 时 Agent SHALL 在周围 topic 中搜索替代覆盖路径，但不浮出水面

Agent SHALL 在每个降级步骤记录到 `rb_trace.jsonl`：原问题、已尝试的恢复步骤（按优先级链顺序）、最终降级决策、影响评估（`gap_impact`）。

Agent SHALL NOT 在任何静默阶段因阻塞而向用户请求决策（包括但不限于 "网络不通，是否等待？"、"源不可访问，是否跳过？" 等）。

用户可以在静默阶段关闭终端——系统 SHALL 能从 durable state（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`）恢复，Agent 恢复时 SHALL 通过 `rb_status.json` 定位当前 phase 继续执行，SHALL NOT 重新开始已完成的工作。

Agent SHALL NOT 在任何静默阶段向用户发送类似 "继续吗？"、"已完成 XX，是否继续？"、"遇到错误，是否重试？" 的消息。静默阶段的行为纪律 SHALL 通过 `shared-silent-execution.md` 定义，所有 wave phase MD（`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`）SHALL 通过 `requires` 加载该文件。

**静默阶段优先级覆盖（Silent-Phase Priority Override）：**

在 wave0/1/2 静默阶段，以下来自其他 shared 文件的规则被本 requirement 的静默纪律显式覆盖：

| 被覆盖的规则 | 来源 | 静默阶段改写 |
|-------------|------|------------|
| "修复需要用户 decision 或权限 → escalation/block" | `shared-repair-guidance.md` Escalation 段 | → 降级处理（按降级优先级链），不 escalation，不 block |
| "连续 repair 达到 retry limit 且无进展 → escalation" | `shared-repair-guidance.md` Retry Limit 段 | → 降级处理（按降级优先级链），不 escalation |
| "不能在 escalation 条件触发后继续假装一切正常" | `shared-anti-cheating-rules.md` 规则 3 | → 在静默阶段，"继续执行"不是"假装正常"——降级 + trace 本身就是静默阶段的正确行为。本规则在静默阶段不适用 |
| "遵守 3 次 retry limit；no-progress 或超限后 escalation→block" | `shared-anti-cheating-rules.md` 规则 3 | → 3 次 retry 后不 escalation/block，改为降级 + trace + 继续，按降级优先级链选择下一步 |

Agent SHALL NOT 因 escalation 条件满足而浮出水面。只有在到达下一个合法浮出水面点（HITL2）时，Agent 才将静默期积累的降级和未解决阻塞汇总报告给用户。

**降级期间的 `rb_status.json` state 规则：**

Agent 在静默阶段降级时 SHALL NOT 将 `rb_status.json` 的 state 设为 `blocked`。降级期间的 state 行为：
- 当前 phase 的 run state SHALL 保持 `in_progress`（不写入 `blocked`，不触发 stop）
- 每次降级 SHALL 在 `rb_trace.jsonl` 中写入 `silent_degradation` event，包含：原 escalation 原因（如 "repair 3 次 fail，源 example.com 不可访问"）、降级决策（按优先级链选择的具体步骤，如 "mark gap，gap_impact=partial"）、影响评估（对 must-answer 问题的影响）
- 如果降级类型为 mark gap 且 `gap_impact: blocks_must_answer`，在 `rb_trace.jsonl` 中额外写入 `silent_gap_critical` event，但不改变 `rb_status.json` state
- Agent SHALL NOT 写入 `rb_status.json` 的 `blocked` state 或以任何方式触发 stop——静默阶段的降级不构成 lifecycle block

#### Scenario: Agent handles errors silently during wave execution
- **WHEN** Agent 在 wave0 执行中遇到网络波动导致爬取失败
- **THEN** Agent SHALL 自行重试或切换到替代源
- **AND** Agent SHALL 将错误和恢复决策写入 `rb_trace.jsonl`
- **AND** Agent SHALL NOT 向用户报告错误或请求决策

#### Scenario: User closes terminal during silent phase
- **WHEN** 用户在静默自主阶段（wave0/1/2）关闭终端
- **THEN** 系统 SHALL 能够从 durable state（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`）恢复
- **AND** Agent 恢复时 SHALL 通过 `rb_status.json` 定位当前 phase，继续执行
- **AND** Agent SHALL NOT 因为 session 断开而重新开始已完成的工作

#### Scenario: Agent must not stop mid-wave to ask "continue?"
- **WHEN** Agent 在 wave1 中完成一个 queue task
- **THEN** Agent SHALL 继续到下一个 queue task 或运行 gate
- **AND** Agent SHALL NOT 输出 "已完成 XX，是否继续？" 等停止等待消息
- **AND** 只有交互式决策点（HITL1/HITL2，`stop: yes`）和终端交付点（Final，`stop: no` + `gate: null`）允许 Agent 停止/终止——其他 phase 不允许

#### Scenario: Repair escalation degrades silently during wave execution
- **WHEN** Agent 在静默阶段遇到需要 escalation 的情况（如 repair 3 次仍 fail，或 `shared-repair-guidance.md` 判定 "修复需要用户 decision"）
- **THEN** Agent SHALL 按降级优先级链选择下一步（重试→换源→降级方法→标记 gap）
- **AND** Agent SHALL 将完整的 escalation 原因、降级决策（具体到优先级链的哪一级）、`gap_impact` 评估写入 `rb_trace.jsonl` 的 `silent_degradation` event
- **AND** Agent SHALL NOT 将 `rb_status.json` state 设为 `blocked`
- **AND** Agent SHALL NOT 浮出水面请求用户决策
- **AND** 到达 HITL2 时 Agent SHALL 将静默期积累的降级和未解决阻塞汇总在 decision brief 中

#### Scenario: Cumulative degradations summarized at HITL2
- **WHEN** 静默阶段（wave0/1/2）积累了一个或多个降级事件（`silent_degradation` trace events）
- **THEN** Agent 在 HITL2 的 decision brief 中 SHALL 包含 "静默期降级汇总" section，列出：
  - 降级总数及按严重程度（`gap_impact`）分布：`none` / `partial` / `blocks_must_answer` 各多少
  - 每个 `gap_impact: blocks_must_answer` 的降级的详细描述（哪个 topic、哪个源、为什么阻塞 must-answer、Agent 尝试了哪些替代覆盖路径）
  - 每个 `gap_impact: partial` 的降级的简要描述（哪个 topic、哪个源、影响范围）
- **AND** 汇总 SHALL 帮助用户判断累积降级是否影响研究质量，从而做出 informed HITL2 decision
- **AND** 用户可以选择在 HITL2 中选 C (rerun) 或 D (repair) 来针对性修复被降级的 gap

#### Scenario: User sends message during silent phase
- **WHEN** 用户在静默阶段（wave0/1/2）主动发送消息（如 "怎么样了？"、"还要多久？"）
- **THEN** Agent MAY 以单轮、陈述式状态回复（如 "正在执行 Wave1 证据采集。完成后会在 HITL2 与你见面。"）——回复 SHALL 是信息告知，SHALL NOT 以问号结尾、SHALL NOT 邀请进一步对话、SHALL NOT 提供选项
- **AND** Agent SHALL NOT 因用户消息而停止等待——回复后继续执行
- **AND** Agent SHALL NOT 将用户消息当作 HITL 交互——不进入环模型，不询问决策
- **AND** 即使用户在静默阶段连续发送多条消息，Agent SHALL 仅做单轮状态告知，SHALL NOT 将对话扩展为交互环——重复回复后继续执行
- **AND** 如果用户消息包含研究相关的补充信息（如 "对了，也帮我看看 X"），Agent SHALL 记录到 `rb_trace.jsonl` 但不立即处理——在 HITL2 时提醒用户该补充信息尚未纳入当前研究
