---
node_type: shared
id: shared-gate-rules
shared_scope: gate-summary
authority: generated-summary
execution_contract:
  surface: shared-guidance
  search_policy: no_search
requires: []
suggested_context: []
---

# Shared: Gate Rules Summary

## Purpose

向 Agent 解释所有 gate 的用途和大致检查方向。此 node 是 **generated-summary**——由 Gate definition JSON 和 gate CLI 输出衍生，不替代它们作为 deterministic rule authority。Gate 数量和规则随生命周期拓扑变化，以此 node 表格和 definition JSON 为准。

## Gate Overview

| Gate | 保护什么 | 检查方向 | Repair Posture |
|------|---------|---------|----------------|
| `instantiation-complete` | Bundle 已按 contract 创建，control files 和 scaffold dirs 齐全，命名合法 | 文件存在性、目录存在性、命名 pattern、status 字段值 | 补建缺失文件/目录；非法名→重新 instantiate |
| `hitl1-recorded` | 用户已通过 HITL1 做出 research profile / must-answer 决策，且回答已持久化到 `rb_profile.yaml` | profile YAML 可解析、schema 校验、字段非空/非默认、HITL1 marker 已写入 | 补充缺失字段、修正默认值、确保用户回答写入 bundle |
| `setup-ready` | Bundle 在进入 wave0 前具备 structural consistency：control files 完整可解析、scaffold 存在、HITL1 已记录、basename 跨文件一致 | 文件存在性、schema 校验（4 schemas）、目录存在性、字段值、status 值、cross-field 一致性（basename_consistency） | 补建缺失 scaffold；修正 schema 违规；修正 basename 不一致 |
| `seed-topics-ready` | topic_registry 已物化为 `seed_topics/<slug>.md` 文件，结构和数量合法 | 目录非空（`dir_non_empty`）、slug 双向一致（`cross_field` slug_consistency）、frontmatter title 非空、trace event、status 值 | 按 registry 补建缺失文件、删除多余文件、修正 slug 不一致 |
| `wave0-complete` | Wave0 foundation source intake 已通过 relay 收集：每个 topic 有 `artifacts/wave0/{topic}/source.yaml`，并维护 `reference/_INDEX.md`、`reference/README.md`、可选 `reference/00-shared-*.md` | 文件存在性与 schema 校验（`artifacts/wave0/{topic}/source.yaml`、`reference/_INDEX.md`）、current-wave output declaration coverage、successful current-wave slot binding、count/cache/dedup checks、`trace_event_present`（`wave0_completion`）、status 值 | 补充缺失 source/reference，修正 schema violation（url/title/date/topic_tag），通过 relay re-fill 修复 count/provenance gap |
| `wave1-complete` | Wave1 relay-backed topic deepening 已完成：每个 topic 有 `evidence-summary.md`、`question-list.md` 和 topic reference rich MD | 文件存在性与结构检查（`artifacts/wave1/{topic.slug}/evidence-summary.md`、`artifacts/wave1/{topic.slug}/question-list.md`、`reference/{topic.slug}-*.md`）、current-wave output declaration coverage、successful current-wave slot binding、accepted reference quality/count/cache/dedup checks、`trace_event_present`（`wave1_completion`）、status 值 | 通过 relay 补做缺失 deepening/reference，修正 artifact 结构、reference metadata、cache trail 和 count/provenance gap |
| `wave2-complete` | Wave2 cross-topic synthesis 三件套已派生；新增 search/evidence/reference 或 promoted `reference/00-cross-*.md` 必须有条件 relay provenance | 文件存在性（`artifacts/wave2/synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`）、section/YAML/link checks、conditional output declaration coverage + successful Wave2 slot binding for new search/evidence/reference outputs、`trace_event_present`（`wave2_completion`）、status 值 | 补充 synthesis/ledger/index 结构，修正失效引用；对 search-required finding 或 `00-cross` reference 通过 relay 补齐 provenance |
| `hitl2-recorded` | 用户已通过 HITL2 做出 final review decision，decision brief 已产出且 decision 已持久化到 profile | 文件存在性（`artifacts/hitl2/decision-brief.md`）、`field_non_empty`（decision brief 内容）、`yaml_parse`（`rb_profile.yaml` 可解析）、`field_value`（`hitl2.status == recorded`、`user_decision` 非空且在合法枚举中）、`trace_event_present`（`hitl2_recorded`）、status 值 | 补充 decision brief、修正缺失字段、选择合法 user_decision 值、确保 trace event 已记录 |
| `readiness-passed` | 最终交付前确定性 precheck：所有 required artifacts 可达、所有 prior gate pass 可审计（从 manifest 推导期望 gate 集合）、profile/trace 无结构性矛盾 | `dir_non_empty`（`seed_topics/`）、`file_exists`（`reference/_INDEX.md`、`artifacts/wave2/synthesis.md`、`artifacts/hitl2/decision-brief.md`）、`trace_has_all_gates`（从 manifest 拓扑推导 prior gate 集合，逐个核对 trace）、`yaml_parse`（profile）、`jsonl_parse`（trace）、status 值。**不做任何 content quality 判断** | 补产缺失 artifact、修复 YAML/JSONL 解析错误、确认所有 prior gate 已 pass、修正 status drift。不修复"写得不够好" |

## Authority Boundary

> **此 node 不是 deterministic rule authority。**

- Gate rule authority 在 `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json`
- Gate verdict authority 在 gate CLI output（`check-gate-*.mjs --bundle <path>`）
- Gate runtime history 在 `dpt_rb_*/rb_trace.jsonl` 和 `dpt_rb_*/rb_status.json`
- **如果此 shared prose 与 JSON/CLI/trace 冲突，以 JSON/CLI/trace 为准**
- 此 node 应随 Gate definition JSON 升级同步更新
