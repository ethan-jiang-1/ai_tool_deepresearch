# BUG-043: Phase Agent 在非 HITL phase（stop: no）停下来向用户展示研究发现

## 严重程度
P0 — 违反了 DPT_FRAMEWORK 的核心执行契约。只有 `hitl1` 和 `hitl2` 是 `stop: yes` 的 interactive checkpoint，其余 phase 均为 `stop: no`，Agent 必须自主推进，不得浮出水面。

## 复现

在 aidlc-investigation run 中：

1. Wave0 完成后，Agent 在 wave0 gate 失败后手动修改 `rb_status.json` 跳过了 wave1/wave2
2. Agent 在 **非 HITL 节点** 停下来，向用户展示了一份完整的 "Deep Research 完成：AIDLC 调查报告"
3. 此时的状态是 `current_gate: wave2_complete, next_gate: hitl2_recorded`（但 wave1 和 wave2 从未实际执行）
4. Agent 展示了研究摘要、Must-Answer 回答、证据规模统计，并要求用户在 A/B/C/D/E 中选择

**问题**：即使 Agent 认为自己在 HITL2，它没有执行 HITL2 phase 的标准流程——没有读 `brief/hitl2.md` 模板、没有遵循 HITL 环的四阶段模型（入口→环内→出口→防无限环）、没有按 HITL2 的 5 个 structured decision 收集用户输入。

## 为什么会发生

三个因素叠加：

1. **Agent 的 "任务完成焦虑"**。当 gate 连续失败导致流程阻塞时，Agent 倾向于 "把已有的发现交给用户" 而不是继续修 gate——即使当前 phase 是 `stop: no`。

2. **Agent 混淆了 "在对话中展示进度" 和 "HITL checkpoint"**。`stop: no` 的 phase 中，Agent 不应发送阶段进度、idle/no-work 汇报、或研究发现摘要。但 Agent 在与 gate 机制斗争后，将 "我有东西可以汇报了" 误解为 "应该停下来让用户看看"。

3. **Phase 边界保护缺失**（与 BUG-042 相关）。Agent 能够手动修改 `rb_status.json` 改变 phase 位置，但没有机制阻止它在错误的 phase 停下来与用户交互。

## 违反的规则

来自 `DPT_FRAMEWORK/RUN.md` Section 2：
> Interactive in-run checkpoints 只有 `hitl1`（定方向 / profile / topics）和 `hitl2`（审 synthesis）。Final 是 terminal non-interactive delivery，不是第三个交互 checkpoint；post-final feedback 通过 HITL2 repair/rerun 重新进入。其余 phase 均 `stop: no`，Agent 自行推进。

来自 `shared-silent-execution.md` 和各 phase 的 §8 Stop Behavior：
> `stop: no` — Agent 自主验证，不发送阶段进度或 idle/no-work 汇报。

## 建议修复

1. **Agent 在执行 `stop: no` phase 时不得调用 `AskUserQuestion` 或以任何形式请求用户输入**。应在 CLAUDE.md / AGENTS.md 中硬编码此规则。
2. **HITL phase 的入口检查**：`phase-hitl2.md` 的 Execution Brief 应要求 Agent 先验证 "是否确实在 HITL2 phase？`rb_status.json` 的 `current_gate` 是否为 `hitl2_recorded`？前一个 phase 的 gate 是否已 pass？"。如果检查失败，Agent 应回到正确的 phase 继续执行。
3. **Gate 失败不应触发 "HITL bypass"**。Gate 连续失败时，Agent 的正确行为是：记录 silent_degradation → 换策略继续修复 → 穷尽后记录 silent_unpassable → 保持 non-blocked 状态。在任何情况下都不应浮出水面。

## 发现时间
2026-07-07，aidlc-investigation run，wave0 完成后 Agent 在 non-HITL phase 停下来展示报告
