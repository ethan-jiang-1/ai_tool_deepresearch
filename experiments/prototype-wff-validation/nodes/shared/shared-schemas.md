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

## What This Covers

- `contracts/plan.mjs`：`rb_plan.md` 的 Zod schema
- `contracts/profile.mjs`：`rb_profile.yaml` 的 Zod schema
- `contracts/status.mjs`：`rb_status.json` 的 Zod schema
- `contracts/queue.mjs`：`rb_queue.json` 的 Zod schema
- `contracts/trace.mjs`：`rb_trace.jsonl` 的 Zod schema
- `contracts/gate-definition.mjs`：Gate definition JSON 的 Zod schema

## Authority Boundary

- Executable schema authority 在 `DPT_FRAMEWORK/schema/contracts/*.mjs`
- 此 shared node 是 human/Agent-readable 摘要，与 executable schema 冲突时以后者为准
