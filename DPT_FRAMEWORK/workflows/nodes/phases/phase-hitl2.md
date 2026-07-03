---
node_type: phase
id: phase-hitl2
phase: hitl2
gate: hitl2-recorded
stop: "yes"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-profile
  - shared/shared-agent-ux-guidance
suggested_context:
  - brief/hitl2
  - shared/shared-gate-rules
  - shared/shared-anti-cheating-rules
---

# Phase: HITL2 (Human-in-the-Loop 2 — Final Review)

## 0. Execution Brief

- **Objective**: Present the final review decision brief and persist the user's HITL2 decision.
- **Start here**: Read Wave artifacts, `brief/hitl2.md`, `rb_profile.yaml`, `rb_status.json`, and `rb_trace.jsonl`.
- **Path to pass**: Write the decision brief and pending marker, ask the user, persist the canonical decision enum, then run the HITL2 gate.
- **Completion check**: User decision is recorded and `check-gate-hitl2-recorded.mjs` passes.
- **Failure posture**: Because `stop: yes`, never invent a final decision; repair only durable state and prompt/enum translation around real user input.

## 1. Stage Goal

产出 decision brief 并询问用户 structured final review decision。将用户 decision 记录到 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl2` 下。

HITL2 是 delivery 前最后一次人类审查——用户在此决定是否 proceed to readiness、revise view、rerun from instantiation、或 stop blocked。

用户 final 后反馈也通过 HITL2 repair/rerun 承载——反馈写入 `rb_profile.yaml` 的 HITL2/user feedback 字段，再回到受影响 phase 或 repair path。

## 2. Required Inputs

- Wave0/Wave1/Wave2 verified artifacts（全部 3 波研究产出）
- `rb_profile.yaml`（含 hitl1 和 prior HITL decision 历史）
- `rb_status.json`（当前 lifecycle 位置的 status 快照）
- `rb_trace.jsonl`（完整的 trace 记录）
- `shared-profile.md`（HITL2 字段文档：answerability_class, user_decision, final_report_view, custom_slug）

## 3. Allowed Actions

- 从 Wave0/Wave1/Wave2 artifact 中提取**语境叙事**的三个动态填入内容：
  - 目前证据足够回答的是：概括各 topic evidence-summary 中已确认的关键发现
  - 仍然不足或需要谨慎的地方是：汇总 question-list 中的 open/gap 问题 + 静默期降级汇总（`shared-silent-execution.md` §2 的 HITL2 汇总）
  - 如果继续补证据/重跑会优先补：从 gap 和 emergent question 中提取优先级最高的补充方向
- **展示 prompt 之前先写 durable state**：产出 decision brief artifact（`artifacts/hitl2/decision-brief.md`）+ 将 `hitl2.status` 设为 `pending_user`。此步骤不可跳过——session 断掉后 Agent 恢复时 SHALL 能通过 `hitl2.status = pending_user` 得知用户尚未回复
- 从 `brief/hitl2.md` 的「入口 Prompt」节读取 HITL2 入口 prompt 精确文本，填入三个动态部分，向用户展示
- 遵循 `shared-agent-ux-guidance.md` 的环内行为规则——用户可以直接选字母 A/B/C/D/E，也可以问问题、对比选项
- 将用户 decision 写入 `rb_profile.yaml#/human_decision_checkpoints/hitl2`：
  - `status: recorded`
  - `user_decision`: 见下方枚举
  - `rationale`: 自由文本
  - `final_report_view`: 用户期望的 final report 视角（可选）
  - `custom_slug`: 自定义 identifier（可选）

### user_decision 枚举

| user_decision | Authority | 行为 |
|---|---|---|
| `proceed_to_readiness` | chain | 正常进 readiness。Agent 跟随 chain routing。 |
| `request_view_revision` | Agent | Agent 读 profile，决定回到哪个 phase 修改 view。 |
| `repair` | Agent | 当前 run 有需要修复的问题。Agent 读 rationale 修复后 rerun 当前 gate，不重启 lifecycle。 |
| `rerun` | chain | 用户想调整方向/补充内容/改模式。Agent 用 `rerun` outcome 查 chain → 进入 `phase-rerun.md`。 |
| `stop_blocked` | Agent | lifecycle 终止，记录原因到 profile。 |

`proceed_to_readiness` 以外 decision **不编码进 transition chain**——chain 只管 `proceed_to_readiness` 的 normal next。branch 路由归 Agent decision authority。

### 字母→Canonical Enum 映射表

用户 prompt 中括号内的英文是**用户友好描述**（如 "change final report view"），不是 canonical enum 值。Agent SHALL 用以下映射表翻译：

| 字母 | 写入 `rb_profile.yaml` 的 canonical enum 值 |
|------|------------------------------------------|
| A | `proceed_to_readiness` |
| B | `request_view_revision` |
| C | `rerun` |
| D | `repair` |
| E | `stop_blocked` |

- 调用 `advance-status` 推进状态：
  ```bash
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to hitl2_recorded
  ```
- 记录 `hitl2_recorded` trace event 到 `rb_trace.jsonl`：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event hitl2_recorded
  ```

## 4. Expected Artifacts

- `artifacts/hitl2/decision-brief.md`（非空，含 findings summary、open questions、recommended actions）
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/status` = `recorded`
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/user_decision` 非空且为合法枚举值
- `rb_trace.jsonl` 中有 `hitl2_recorded` event
- `rb_status.json` 中 `current_gate: hitl2_recorded` / `next_gate: readiness_passed`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle <path> --current-node phases/phase-hitl2.md
```

## 6. On Gate Pass

Gate pass 后，Agent 读取 `rb_profile.yaml#/human_decision_checkpoints/hitl2/user_decision` 决定路由：

- `proceed_to_readiness` → **发送 HITL2 出口语**（从 `brief/hitl2.md` 的「出口语」节 A 路径读取模板文字，告知用户即将生成最终报告，期间不会浮出水面，完成后交付）→ 跟随 chain routing 进 `phase-readiness.md`
- `request_view_revision` → Agent 读取 rationale，决定回到哪个 phase 修改 view（不 restart）
- `repair` → Agent 就地修复当前问题后 rerun HITL2 gate，不重启 lifecycle
- `rerun` → Agent 用 `rerun` outcome 查 chain → chain 返回 `phases/phase-rerun.md` → 加载 phase-rerun node
- `stop_blocked` → lifecycle 终止，记录原因

**Chain routing 对 HITL2 有两条 entry**：`phase-hitl2.md` → `passed` → `phase-readiness.md`（正常交付）和 `phase-hitl2.md` → `rerun` → `phase-rerun.md`（增量重跑）。`proceed_to_readiness` 和 `rerun` 均为确定性出口——有固定、上下文无关的 next-node 目标。`request_view_revision`/`repair`/`stop_blocked` 不进入 chain——其目标依赖 Agent 判断运行时状态。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，按需修复：

| Fail | 修复 |
|------|------|
| decision brief 缺失或为空 | 基于 Wave0/1/2 artifact 生成 decision brief |
| `hitl2.status` ≠ `recorded` | 确保决策已写入 `rb_profile.yaml` 的 hitl2 section |
| `user_decision` 为空 | 向用户询问并填写 decision |
| `user_decision` 不在合法枚举中 | 修正为 5 个合法值之一 |
| `trace_event_present` fail | 确认 hitl2_recorded trace event 已写入 |
| status drift | 恢复 `current_gate`/`next_gate` 为 `hitl2_recorded`/`readiness_passed` |

## 8. Stop Behavior

`stop: yes` — Agent 暂停执行，等待用户 review decision brief 并做出 decision。用户回答完毕并写入 bundle 后，Agent 运行 gate CLI。Gate pass 后，Agent 根据 user_decision 决定下一步路由。

## 9. Anti-Cheating Rules

- **用户 decision MUST 写入 `rb_profile.yaml`**，不能只停留在 chat memory
- **MUST NOT 在用户未回答时填写 placeholder decision**——`user_decision` 必须来自真实用户输入
- **MUST NOT 将不确定 branch 的路由编码进 transition chain**——确定性出口（有固定、上下文无关的 next-node 目标）SHALL 进 chain。当前确定性出口：`passed`、`rerun`。不确定 branch：`request_view_revision`、`repair`、`stop_blocked`（目标依赖 Agent 判断运行时状态）——归 Agent
- **MUST NOT 在 `user_decision: rerun` 时仍然 advance 到 readiness**——Agent MUST 用 `rerun` outcome 查 chain，进入 `phase-rerun.md`
- **HITL2 phase 写 `human_decision_checkpoints/hitl2` 时 MUST preserve 已有的 `rerun_count` 值**——MUST NOT 重置或删除。`rerun_count` 由 `phase-rerun.md` 管理递增，HITL2 只能读取不能修改
- **用户 final 后反馈 MUST 通过 HITL2 repair/rerun 承载**，MUST NOT 通过 final node hidden loop
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl2 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl2 END — <summary>"` |
