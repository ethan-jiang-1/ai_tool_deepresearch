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

HITL2 是 delivery 前最后一次人类审查——用户在此决定是否 proceed to readiness、revise view、repair current run、rerun through `phase-rerun`，或 stop blocked。

当 accepted post-final reentry path 把反馈带回 HITL2 时，Agent 将决定写入现有 HITL2 `user_decision` / `rationale` fields，再走 repair 或 rerun path；本 phase 不自行创造 post-final reentry capability。

## 2. Required Inputs

- Wave0/Wave1/Wave2 verified artifacts（全部 3 波研究产出）
- `rb_profile.yaml`（含 hitl1 和 prior HITL decision 历史）
- `rb_status.json`（当前 lifecycle 位置的 status 快照）
- `rb_trace.jsonl`（完整的 trace 记录）
- `shared-profile.md`（HITL2 字段文档：answerability_class, user_decision, final_report_view, custom_slug）

## 3. Allowed Actions

### 3a. Read-Only Rerun Availability

在展示推荐或记录 rerun 决定前，从 repo root 运行一次只读 evaluator；它只打印 closed facts，不写文件、trace 或 state：

```bash
node --input-type=module -e "import { loadGateDefinition, readBundleProfile, evaluateRerunAvailability } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs'; const definition = loadGateDefinition('rerun-ready'); const profile = readBundleProfile(process.argv[1]); console.log(JSON.stringify(evaluateRerunAvailability({ definition, profile, includeNextIncrement: true })));" <bundle-path>
```

- `supported: true, available: true`：rerun 可以作为当前 bundle 的候选推荐。
- `supported: true, available: false`：不要推荐当前 bundle rerun；只询问是否为该 scope 新建 bundle。
- `supported: false`：陈述 `reason` 指向的 rule/profile/HITL2 parent contract boundary；不要猜测新 bundle 能解决。

本 phase 不解释 operator/value/count，不读取 definition `failure_message`，不复制比较，也不把结果持久化。formal legality 仍由 rerun-ready Gate 拥有。

- 从 Wave0/Wave1/Wave2 artifact 中提取 research review 与一个当前可用推荐：
  - 目前证据足够回答的是：概括各 topic evidence-summary 中已确认的关键发现
  - 仍然不足或需要谨慎的地方是：汇总 question-list 中的 open/gap 问题 + 静默期降级汇总（`shared-silent-execution.md` §2 的 HITL2 汇总）
  - 当前推荐、理由与影响：从 direct facts、legal path 和 shared availability 中选择一个用户可理解的动作
- **展示 prompt 之前先写 durable state**：产出 decision brief artifact（`artifacts/hitl2/decision-brief.md`）+ 将 `hitl2.status` 设为 `pending_user`。此步骤不可跳过——session 断掉后 Agent 恢复时 SHALL 能通过 `hitl2.status = pending_user` 得知用户尚未回复
- 从 `brief/hitl2.md` 的「入口 Prompt」读取 recommendation-first 文本，填入 review、一个推荐、理由与影响后展示
- 遵循 `shared-agent-ux-guidance.md`：用户可以直接接受推荐、自然语言修正、使用 A/B/C/D/E 快捷方式或继续提问；清楚决定本身就是确认
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
| `rerun` | chain | 用户想调整方向/补充内容/改模式。Gate CLI 使用 `rerun` outcome 产出 `check.next: phases/phase-rerun.md`，Agent 通过 `enter-phase` 消费该 selected target。 |
| `stop_blocked` | Agent | lifecycle 终止，记录原因到 profile。 |

`proceed_to_readiness` 与 `rerun` 是 HITL2 当前两个 deterministic chain exit。`request_view_revision`、`repair`、`stop_blocked` 不编码进 transition chain——其目标依赖 Agent 判断运行时状态，归 Agent decision authority。

对 `request_view_revision`、`repair`、`stop_blocked`，先用 current direct facts 确认现有 accepted path。只有 path 存在时，才把动作推荐为可立即执行并由 Agent 完成；若缺失，只陈述一次最小 capability/permission/route 边界，保留用户表达的语义，不手工创建 blocked state、transition、status 或默认 readiness。用户不需要运行普通命令。

### 字母→Canonical Enum 映射表

用户 prompt 中括号内的英文是**用户友好描述**（如 "change final report view"），不是 canonical enum 值。Agent SHALL 用以下映射表翻译：

| 字母 | 写入 `rb_profile.yaml` 的 canonical enum 值 |
|------|------------------------------------------|
| A | `proceed_to_readiness` |
| B | `request_view_revision` |
| C | `rerun` |
| D | `repair` |
| E | `stop_blocked` |

- 记录 `hitl2_recorded` trace event 到 `rb_trace.jsonl`：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event hitl2_recorded
  ```

## 4. Expected Artifacts

- `artifacts/hitl2/decision-brief.md`（非空，含 findings summary、open questions、recommended actions）
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/status` = `recorded`
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/user_decision` 非空且为合法枚举值
- `rb_trace.jsonl` 中有 `hitl2_recorded` event
- Gate 前 status window 为 `current_gate: wave2_complete` / `next_gate: hitl2_recorded`。HITL2 自己通过后，才在 §6 按 selected branch 运行 `advance-status --to hitl2_recorded`，写入 `next_gate: readiness_passed` 或 `next_gate: rerun_ready`。

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle <path> --current-node phases/phase-hitl2.md
```

## 6. On Gate Pass

Gate pass 后，Agent 读取 `rb_profile.yaml#/human_decision_checkpoints/hitl2/user_decision` 决定路由：

- `proceed_to_readiness` → gate CLI 使用 deterministic `passed` outcome，`check.next` 应为 `phases/phase-readiness.md`。先消费 selected handoff，再同步 source gate status：
  ```bash
  node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to hitl2_recorded
  ```
  然后从 `enter-phase` 渲染出的 readiness Markdown 继续执行。不要让 `advance-status` 替代 target selection。
- `request_view_revision` → 仅在已有 legal view path 时由 Agent 执行；否则说明最小缺失边界
- `repair` → 仅在已有 legal repair path 时由 Agent 就地修复并 rerun HITL2 gate；否则说明最小缺失边界
- `rerun` → gate CLI 使用 deterministic `rerun` outcome，`check.next` 应为 `phases/phase-rerun.md`。先消费 selected handoff，再同步 source gate status：
  ```bash
  node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to hitl2_recorded
  ```
  然后从 `enter-phase` 渲染出的 rerun Markdown 继续执行。不得把 rerun 默认洗成 readiness。
- `stop_blocked` → 仅在已有 accepted stop behavior 时执行并保留原因；否则说明最小缺失边界

**Chain routing 对 HITL2 有两条 entry**：`phase-hitl2.md` → `passed` → `phase-readiness.md`（正常交付）和 `phase-hitl2.md` → `rerun` → `phase-rerun.md`（增量重跑）。`proceed_to_readiness` 和 `rerun` 均为确定性出口——有固定、上下文无关的 next-node 目标。`request_view_revision`/`repair`/`stop_blocked` 不进入 chain——其目标依赖 Agent 判断运行时状态。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。不得从旧表格、legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段或命令。按每个 independent primary hint 执行：

1. `repair_kind: user_decision`：仅当 `missing_fact` 指出尚未取得或无效的真实 HITL2 decision 时，向用户询问该最小决定；不得重复询问已经记录的 choice，也不得要求用户运行普通命令。
2. `repair_kind: agent_action`：在用户决定已经存在、且 `write_to` 是 authorized mutable surface 时，由 Agent 生成/修正 exact decision brief 或 profile field；不得用机械 repair 发明用户 decision。
3. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal status/handoff/topic/lifecycle operation；不得直接编辑 `rb_status.json`、trace、ledger、index、receipt、hash 或 provenance authority。
4. `repair_kind: external_action`：只暴露不可代理的权限/环境前置条件；满足后由 Agent 继续。
5. `repair_kind: missing_contract`：报告 exact unavailable capability/contract boundary，不创建新 route、override、controller、lifecycle 或平行成功状态。

Hint 不创造 permission、controller 或 lifecycle。用户决定或外部前置条件满足后，后续机械步骤立即回到 Agent；完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 `hitl2-recorded` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

Phase Agent 仍写 `hitl2_recorded` diagnostic event，但缺少该独立 event 不是 gate definition blocker；gate verdict/audit 由 profile/brief direct facts 和 CLI-authored `gate_attempt` 决定。

## 8. Stop Behavior

`stop: yes` — 仅当当前 `user_decision` hint 指出尚未取得的真实 HITL2 decision 时，Agent 暂停并等待该最小决定。用户回答写入 accepted owner 后，由 Agent 执行剩余合法机械步骤并运行 exact `rerun`。若 choice 已记录而 Gate 只剩 `agent_action` 或 `engine_operation`，Agent 必须自行执行，不得再次把用户变成 pipeline co-runner。Gate pass 后只消费 CLI 的 `check.next`，不由 prose 自定路由。

## 9. Anti-Cheating Rules

- **用户 decision MUST 写入 `rb_profile.yaml`**，不能只停留在 chat memory
- **MUST NOT 在用户未回答时填写 placeholder decision**——`user_decision` 必须来自真实用户输入
- **MUST NOT 将不确定 branch 的路由编码进 transition chain**——确定性出口（有固定、上下文无关的 next-node 目标）SHALL 进 chain。当前确定性出口：`passed`、`rerun`。不确定 branch：`request_view_revision`、`repair`、`stop_blocked`（目标依赖 Agent 判断运行时状态）——归 Agent
- **MUST NOT 在 `user_decision: rerun` 时仍然 advance 到 readiness**——gate CLI MUST emit the `rerun` outcome, and Agent MUST consume `check.next: phases/phase-rerun.md` through `enter-phase`
- **HITL2 phase 写 `human_decision_checkpoints/hitl2` 时 MUST preserve 已有的 `rerun_count` 值**——MUST NOT 重置或删除。`rerun_count` 由 `phase-rerun.md` 管理递增，HITL2 只能读取不能修改
- **accepted post-final feedback route MUST 通过 HITL2 repair/rerun 承载**，MUST NOT 通过 final node hidden loop；本 phase 不暗示该 reentry route 已由当前 runtime 实现
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl2 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:hitl2 END — <summary>"` |
