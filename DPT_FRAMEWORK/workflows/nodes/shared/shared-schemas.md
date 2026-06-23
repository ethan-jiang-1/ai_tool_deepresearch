---
node_type: shared
id: shared-schemas
shared_scope: schema-summary
authority: guidance-only
requires: []
suggested_context: []
---

# Shared: Schema Summary

## Purpose

为 Agent 提供 `DPT_FRAMEWORK/schema/` 下关键 schema contract 的简洁摘要。此 node 是 Agent-readable reference，不替代 executable schema。

## Schema Contracts

### `contracts/plan.mjs` → `rb_plan.md`

- **Schema**：`PlanSchema`
- **字段**：`plan_basename`（string）、`derived_topic_count`（number）、`topic_registry`（array）
- **格式**：Markdown with YAML frontmatter (FRE-003)
- **位置**：`DPT_FRAMEWORK/schema/contracts/plan.mjs`

### `contracts/profile.mjs` → `rb_profile.yaml`

- **Schema**：`ProfileSchema`
- **字段**：`plan_basename`、`research_profile`（enum）、`root_must_answer_set`（string[]）、`human_decision_checkpoints.hitl1.*`、`human_decision_checkpoints.hitl2.*`
- **当前 HITL1 路径**：`human_decision_checkpoints.hitl1.status`、`human_decision_checkpoints.hitl1.recorded_at`
- **格式**：YAML
- **位置**：`DPT_FRAMEWORK/schema/contracts/profile.mjs`

### `contracts/status.mjs` → `rb_status.json`

- **Schema**：`StatusSchema`
- **字段**：`current_mode`（必须为 `"execution"`）、`state`（`RunState` enum）、`current_gate`（`CurrentGate` enum）、`next_gate`（`CurrentGate` enum）
- **注意**：`rb_status.json` **没有** `phases.*` 树。当前 gate tracking 通过 `current_gate`/`next_gate` 两个字段完成
- **位置**：`DPT_FRAMEWORK/schema/contracts/status.mjs`

### `contracts/queue.mjs` → `rb_queue.json`

- **Schema**：`QueueSchema`
- **字段**：`queue_health`、`stop_authorization_state`、5 个 slot（nullable）、`refill_pool`
- **位置**：`DPT_FRAMEWORK/schema/contracts/queue.mjs`

### Trace: `rb_trace.jsonl` vs `_trace.jsonl`

- **`rb_trace.jsonl`**（runtime audit trace）：位于每个 active bundle 根目录，由 gate CLI 在每次 gate attempt 时追加 entry。记录 gate pass/fail、repair、waiting/block 等 runtime audit 事件。**这是 production runtime audit surface。**
- **`_trace.jsonl`**（experiment verdict trace）：位于 disposable experiment bundle 根目录，由 playbook thin driver 通过 `DPT_FRAMEWORK/engine/trace.mjs` 的 `createTrace()` 写入 `check` event。**这是 command experiment 的 verdict evidence surface，不作为 production runtime truth。**
- **区分**：gate CLI 只写 `rb_trace.jsonl`；`_trace.jsonl` 只能由 experiment driver 创建。

### `contracts/reference.mjs` → `reference/<topic>/source.yaml`

- **Schema**：`ReferenceMetadataSchema`（单条）、`ReferenceMetadataArraySchema`（YAML 数组）
- **字段**：`url`（string, 必填）、`title`（string, 必填）、`retrieved_date`（YYYY-MM-DD string, 必填）、`topic_tag`（string, 必填）、`notes`（string, 可选）
- **格式**：YAML array，每项为一条 reference metadata
- **位置**：`DPT_FRAMEWORK/schema/contracts/reference.mjs`

### `final/` — Terminal Delivery Directory

- **位置**：active bundle 根目录下的 `final/` 目录
- **角色**：final 是 terminal node（`gate: null`），没有 gate CLI 检查此目录。delivery 完成由 `final/` 目录下存在至少一份报告文件来证明
- **内容**：Agent 从 verified bundle state 生成的 final report artifact(s)，格式自由（Markdown、executive summary 等）
- **注意**：`final/` 目录在 bundle instantiation 时已创建（scaffold），但内容是 final phase 才产生。空目录不代表 delivery 完成
- **Post-delivery 反馈**：走 HITL2 `rerun` 路径，不通过 final node

### Wave Artifact 目录结构

- **`reference/<topic>/source.yaml`**：Wave0 per-topic reference metadata（YAML array，每项满足 `ReferenceMetadataSchema`）。Foundation floor：每个 topic ≥ 1 条 metadata。
- **`reference/index.md`**：Wave0 foundation reference 索引（Agent 可读摘要，列出每个 topic 收集的 reference）。
- **`artifacts/wave1/<topic>/skeleton.md`**：Wave1 topic-scoped placeholder skeleton（Markdown，显式标记 `capability: foundation-placeholder`）。Skeleton 包含已知前提、关键维度、open questions，用 Markdown link 引用 Wave0 reference。
- **`artifacts/wave2/synthesis.md`**：Wave2 cross-topic synthesis（Markdown，用 `[label](relative/path.md)` 格式引用 Wave0/Wave1 artifact）。引用路径相对于 `artifacts/wave2/`：如 `../wave1/<topic>/skeleton.md` 指向 Wave1 skeleton，`../../reference/<topic>/source.yaml` 指向 Wave0 metadata。

### Gate Contract

- **Gate definition JSON**：`DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json` — read-only deterministic rule definition
- **Gate definition schema**：`DPT_FRAMEWORK/schema/contracts/gate.mjs` — `GATE_MACHINE_STATES`、`GATE_TRANSITIONS`、transition validation
- **Gate CLI**：`DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` — 每个 gate 一个独立 CLI wrapper
- **Gate helpers**：`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — shared parse/load/validate/route/build/emit

## Authority Boundary

- **Executable schema authority**：`DPT_FRAMEWORK/schema/contracts/*.mjs`
- **Gate authority**：gate definition JSON + gate CLI output
- **此 node 的角色**：Agent-readable schema 导航和关键区分说明（尤其是 trace 双轨）；不复制完整 Zod 定义
- **冲突时**：以 executable schema 和 runtime state 为准
