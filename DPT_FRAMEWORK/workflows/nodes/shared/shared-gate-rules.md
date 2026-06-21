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

向 Agent 解释 9 个 gate 的用途和大致检查方向。此 node 是 **generated-summary**——由 Gate definition JSON 和 gate CLI 输出衍生，不替代它们作为 deterministic rule authority。

## Gate Overview

| Gate | 保护什么 | 检查方向 | Repair Posture |
|------|---------|---------|----------------|
| `instantiation-complete` | Bundle 已按 contract 创建，control files 和 scaffold dirs 齐全，命名合法 | 文件存在性、目录存在性、命名 pattern、status 字段值 | 补建缺失文件/目录；非法名→重新 instantiate |
| `hitl1-recorded` | 用户已通过 HITL1 做出 research profile / must-answer 决策，且回答已持久化到 `rb_profile.yaml` | profile YAML 可解析、schema 校验、字段非空/非默认、HITL1 marker 已写入 | 补充缺失字段、修正默认值、确保用户回答写入 bundle |
| `setup-ready` | Bundle 在进入 wave0 前具备 structural consistency：control files 完整可解析、scaffold 存在、HITL1 已记录、basename 跨文件一致 | 文件存在性、schema 校验（4 schemas）、目录存在性、字段值、status 值、cross-field 一致性（basename_consistency） | 补建缺失 scaffold；修正 schema 违规；修正 basename 不一致 |
| `seed-topics-ready` | topic_registry 已物化为 `seed_topics/<slug>.md` 文件，结构和数量合法 | 目录非空（`dir_non_empty`）、slug 双向一致（`cross_field` slug_consistency）、frontmatter title 非空、trace event、status 值 | 按 registry 补建缺失文件、删除多余文件、修正 slug 不一致 |
| `wave0-complete` | Wave0 foundation shared reference 已收集：每个 topic 至少 foundation floor 数量的 reference metadata，且通过 schema 校验 | 文件存在性（`reference/index.md`、`reference/{topic}/source.yaml`）、`schema_valid`（ReferenceMetadata schema）、`count_floor`（≥1 per topic）、`trace_event_present`（`wave0_completion`）、status 值 | 补充缺失 reference、修正 schema violation（url/title/date/topic_tag） |
| `wave1-complete` | Wave1 topic-scoped skeleton 已写入，标记 foundation placeholder boundary，无 false completion claim | 文件存在性（`artifacts/wave1/{topic}/skeleton.md`）、`pattern_match`（placeholder marker 存在 + false claim 排除）、`trace_event_present`（`wave1_completion`）、status 值 | 补充缺失 skeleton、加回 placeholder marker、移除 false completion claim |
| `wave2-complete` | Wave2 cross-topic synthesis 已派生，Markdown link 引用链可验证 | 文件存在性（`artifacts/wave2/synthesis.md`）、`field_non_empty`、`cross_field`（`markdown_link_resolution` 模式：解析 Markdown links → 验证目标存在）、`trace_event_present`（`wave2_completion`）、status 值 | 补充 synthesis 内容、追加 artifact 引用 link、修正失效引用路径 |
| `hitl2-recorded` | 用户已通过 HITL2 做出 final report view / proceed/repair 决策 | profile HITL2 字段、status marker | 补充 HITL2 字段 |
| `readiness-passed` | 最终报告就绪，所有前序 gate 通过 | 综合检查 | 修复前序 gate 的残留问题 |

## Authority Boundary

> **此 node 不是 deterministic rule authority。**

- Gate rule authority 在 `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json`
- Gate verdict authority 在 gate CLI output（`check-gate-*.mjs --bundle <path>`）
- Gate runtime history 在 `dpt_rb_*/rb_trace.jsonl` 和 `dpt_rb_*/rb_status.json`
- **如果此 shared prose 与 JSON/CLI/trace 冲突，以 JSON/CLI/trace 为准**
- 此 node 应随 Gate definition JSON 升级同步更新
