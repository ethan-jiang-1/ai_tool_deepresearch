---
node_type: shared
id: shared-gate-rules
shared_scope: gate-summary
authority: generated-summary
requires: []
suggested_context: []
---

# Shared: Gate Rules Summary

## Purpose

向 Agent 解释 8 个 gate 的用途和大致检查方向。此 node 是 generated-summary——由 Gate definition JSON 和 gate definition tooling 生成或随 gate 规则升级同步更新。

## What This Covers

- 每个 gate 保护什么（instantiation_complete、hitl1_recorded、setup_ready、wave0_complete、wave1_complete、wave2_complete、hitl2_recorded、readiness_passed）
- 每个 gate 的大致检查方向（文件存在性、字段合法性、计数、状态、trace）
- gate failure 后的 repair posture

## Authority Boundary

> **此 node 不是 deterministic rule authority。**

- Gate rule authority 在 `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json`
- Gate verdict authority 在 gate CLI output（`check-gate-*.mjs --bundle <path>`）
- Gate runtime history 在 `dpt_rb_*/rb_trace.jsonl` 和 `dpt_rb_*/rb_status.json`
- 如果此 shared prose 和 JSON/CLI/trace 冲突，以 JSON/CLI/trace 为准
- 此 node 不应长期人工维护——应随 Gate definition JSON 升级同步更新
