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

说明 `rb_profile.yaml` 的字段含义和使用方式。此 node 是 Agent-readable guidance，不替代 schema 或 active bundle state。

## What This Covers

- `research_profile`：用户定义的研究范围、深度、约束
- `root_must_answer_set`：用户要求必须回答的核心问题集
- HITL1/HITL2 相关字段：用户输入、decision、retry config
- 字段的填写时机和格式

## Authority Boundary

- Schema authority 在 `DPT_FRAMEWORK/schema/contracts/profile.mjs`
- Runtime truth 在当前 active `dpt_rb_*` 的 `rb_profile.yaml`
- 此 shared node 仅为 Agent-readable 说明，与 schema 或 runtime state 冲突时以后者为准
