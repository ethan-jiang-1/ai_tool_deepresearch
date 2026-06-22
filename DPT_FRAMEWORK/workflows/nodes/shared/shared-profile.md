---
node_type: shared
id: shared-profile
shared_scope: profile
authority: guidance-only
requires: []
suggested_context:
  - shared-schemas
---

# Shared: Profile (`rb_profile.yaml`)

## Purpose

说明 `rb_profile.yaml` 的当前字段、类型、填写时机、示例值和 Source of Record。此 node 是 Agent-readable guidance，不替代 schema 或 active bundle state。

## Field Reference

### `plan_basename`

- **类型**：`string`
- **填写时机**：bundle instantiation 时由 `instantiate-run-bundle.mjs` 写入，与 `rb_plan.md` frontmatter 的 `plan_basename` 一致
- **含义**：当前 run / experiment 的 canonical logical name
- **disposable bundle 注意**：目录名可能是 `dpt_disp_<plan_basename>_<hex>`，但 `plan_basename` 本身不包含 `dpt_disp_` 前缀或随机 hex suffix。例如目录 `dpt_disp_wff_setup_a3f2` 的 `plan_basename` 是 `wff_setup`
- **示例**：`"climate-policy"`、`"wff_setup"`

### `research_profile`

- **类型**：enum，当前 accepted 值为 `not_selected`、`quick_factual`、`exploratory_map`、`claim_verification`
- **填写时机**：HITL1 phase，Agent 向用户展示选项后基于用户选择写入
- **默认值**（bundle 创建时）：`not_selected`
- **含义**：用户选择的研究深度/广度 profile
  - `quick_factual`：快速事实核查，轻量，单一维度
  - `exploratory_map`：探索性全景 mapping，覆盖面广但深度可控
  - `claim_verification`：对核心主张做 adversarial verification
- **gate 行为**：`hitl1-recorded` gate 检查此字段 ≠ `not_selected`

### `root_must_answer_set`

- **类型**：`string[]`
- **填写时机**：HITL1 phase
- **默认值**（bundle 创建时）：`[]`
- **含义**：用户明确要求必须回答的核心问题列表
- **gate 行为**：`hitl1-recorded` gate 检查此字段非空

### `human_decision_checkpoints.hitl1.status`

- **类型**：enum，值为 `not_started`、`pending_user`、`recorded`、`blocked`、`not_applicable`
- **填写时机**：HITL1 phase，用户回答完毕后 Agent 写入 `recorded`
- **gate 行为**：`hitl1-recorded` gate 检查此字段 == `recorded`

### `human_decision_checkpoints.hitl1.recorded_at`

- **类型**：`string`（ISO 8601 timestamp），optional
- **填写时机**：HITL1 phase，与 `status: recorded` 同时写入
- **gate 行为**：`hitl1-recorded` gate 检查此字段非空

### `human_decision_checkpoints.hitl2.status`

- **类型**：enum，同 HITL1 status 值集（`not_started`、`pending_user`、`recorded`、`blocked`、`not_applicable`）
- **填写时机**：HITL2 phase，用户完成 structured final review decision 后 Agent 写入 `recorded`
- **默认值**（bundle 创建时）：`not_started`
- **gate 行为**：`hitl2-recorded` gate 检查此字段 == `recorded`

### `human_decision_checkpoints.hitl2.user_decision`

- **类型**：enum，值为 `proceed_to_readiness`、`request_view_revision`、`repair`、`rerun`、`stop_blocked`
- **填写时机**：HITL2 phase，用户从 5 个 structured decision 中选择后 Agent 写入
- **默认值**（bundle 创建时）：`""`（空字符串）
- **含义**：
  - `proceed_to_readiness`：用户确认研究完整，进入 readiness 确定性检查
  - `request_view_revision`：用户要求修改某个 wave 的 view（Agent 读取 rationale 决定回到哪个 phase）
  - `repair`：当前 run 有需要修复的问题，Agent 就地修复后 rerun 当前 gate，不重启 lifecycle
  - `rerun`：用户想调整方向/补充内容/改模式，Agent 从 `seed-topics` 重新跑，profile 已有新反馈
  - `stop_blocked`：用户判定研究阻塞，终止 lifecycle
- **gate 行为**：`hitl2-recorded` gate 检查此字段非空且在合法枚举中

### `human_decision_checkpoints.hitl2.rationale`

- **类型**：`string`（自由文本）
- **填写时机**：HITL2 phase，与 user_decision 同时写入
- **含义**：用户 decision 的理由或补充说明
- **gate 行为**：不强制检查（optional field），但建议填写以帮助 Agent 理解后续修复方向

### `human_decision_checkpoints.hitl2.recorded_at`

- **类型**：`string`（ISO 8601 timestamp）
- **填写时机**：HITL2 phase，与 `status: recorded` 同时写入
- **gate 行为**：不强制检查（optional field），但建议填写作为审计记录

### `human_decision_checkpoints.hitl2.answerability_class`

- **类型**：enum，值为 `not_assessed`、`ready_substantive`、`ready_insufficient_judgment`、`blocked_repair_required`
- **填写时机**：HITL2 phase，用户评估当前研究产出的 answerability 后写入
- **含义**：
  - `ready_substantive`：研究产出足以支撑实质性回答
  - `ready_insufficient_judgment`：研究产出存在但判断依据不足
  - `blocked_repair_required`：必须修复才能继续
- **gate 行为**：不强制检查（Agent advisory field），但影响 `user_decision` 的选择合理性

### `human_decision_checkpoints.hitl2.final_report_view`

- **类型**：enum，值为 `profile_default`、`executive_brief`、`evidence_map`、`claim_judgment`、`technical_deep_dive`、`custom`
- **填写时机**：HITL2 phase，用户选择期望的 final report 视角
- **含义**：控制 `phase-final.md` 中 Agent 生成 final report 的格式和侧重点
- **gate 行为**：不强制检查，但 final phase 读此字段决定报告结构

### `human_decision_checkpoints.hitl2.custom_slug`

- **类型**：`string`，optional
- **填写时机**：HITL2 phase，仅当 `final_report_view == custom` 时填写
- **含义**：用户自定义的报告视角标识符

## Authority Boundary

- **Schema authority**：`DPT_FRAMEWORK/schema/contracts/profile.mjs`（`ProfileSchema`）
- **Runtime truth**：当前 active bundle 的 `rb_profile.yaml`
- **此 node 的角色**：Agent-readable 字段说明；与 schema 或 runtime state 冲突时以后两者为准
- **此 node 不能替代**：`ProfileSchema` 的 Zod 校验、gate CLI 的 `schema_valid` / `field_value` 检查
