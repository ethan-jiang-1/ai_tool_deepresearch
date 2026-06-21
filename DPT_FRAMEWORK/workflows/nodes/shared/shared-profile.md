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

- **类型**：enum，同 HITL1 status 值集
- **填写时机**：HITL2 phase（本 change 范围外）
- **当前 bundle 默认值**：`not_started`

### `human_decision_checkpoints.hitl2.answerability_class`

- **类型**：enum，值为 `not_assessed`、`ready_substantive`、`ready_insufficient_judgment`、`blocked_repair_required`
- **填写时机**：HITL2 phase（本 change 范围外）

### `human_decision_checkpoints.hitl2.user_decision`

- **类型**：enum，值为 `not_started`、`proceed_to_readiness`、`request_view_revision`、`repair_and_rerun`、`stop_blocked`
- **填写时机**：HITL2 phase（本 change 范围外）

### `human_decision_checkpoints.hitl2.final_report_view`

- **类型**：enum，值为 `not_started`、`profile_default`、`executive_brief`、`evidence_map`、`claim_judgment`、`technical_deep_dive`、`custom`
- **填写时机**：HITL2 phase（本 change 范围外）

## Authority Boundary

- **Schema authority**：`DPT_FRAMEWORK/schema/contracts/profile.mjs`（`ProfileSchema`）
- **Runtime truth**：当前 active bundle 的 `rb_profile.yaml`
- **此 node 的角色**：Agent-readable 字段说明；与 schema 或 runtime state 冲突时以后两者为准
- **此 node 不能替代**：`ProfileSchema` 的 Zod 校验、gate CLI 的 `schema_valid` / `field_value` 检查
