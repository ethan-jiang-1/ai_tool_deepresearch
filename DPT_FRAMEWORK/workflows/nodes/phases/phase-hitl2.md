---
node_type: phase
id: phase-hitl2
phase: hitl2
gate: hitl2-recorded
stop: "yes"
requires:
  - shared/shared-profile
suggested_context:
  - shared/shared-gate-rules
  - shared/shared-anti-cheating-rules
---

# Phase: HITL2 (Human-in-the-Loop 2 — Final Review)

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

- 从 Wave0/Wave1/Wave2 artifact 中提取 key findings summary + open questions + recommended actions
- 产出 decision brief artifact：`artifacts/hitl2/decision-brief.md`
- 向用户展示 structured final review decision 问题（4 个 user_decision 选项）
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

- 更新 `rb_status.json` 中 HITL2 相关状态（`current_gate: hitl2_recorded`）
- 记录 `hitl2_recorded` trace event 到 `rb_trace.jsonl`

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

- `proceed_to_readiness` → 跟随 chain routing 进 `phase-readiness.md`
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
| `user_decision` 不在合法枚举中 | 修正为 4 个合法值之一 |
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
