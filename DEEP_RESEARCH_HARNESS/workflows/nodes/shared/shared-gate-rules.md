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
| `wave0-complete` | Wave0 foundation source intake 已通过 `wave0_source_intake` work units 提交：每个 topic 有 `artifacts/wave0/{topic}/source.yaml`，并维护 `reference/_INDEX.md`、`reference/README.md`、可选 `reference/00-shared-*.md` | 文件存在性与 schema 校验（`artifacts/wave0/{topic}/source.yaml`、`reference/_INDEX.md`）、submitted work-unit output declaration coverage、work-unit submission presence、count/cache/dedup checks、`trace_event_present`（`wave0_completion`）、status 值 | 补充缺失 source/reference，修正 schema violation（url/title/date/topic_tag），通过 work-unit refill/claim/submit 修复 count/provenance gap |
| `wave1-complete` | Wave1 work-unit-backed topic deepening 已完成：每个 topic 有 submitted `evidence-summary.md`、`question-list.md`、topic reference rich MD 和 Phase-owned `depth-review.yaml` | 文件存在性与结构检查、submitted work-unit output declaration coverage、work-unit submission presence、accepted reference quality/count/cache checks、depth-review closed decision、exact URL new-source floor、structured source claim→submitted cache trail mapping、`trace_event_present`（`wave1_completion`）、status 值 | 通过 `wave1_topic_deepening` work units 补做缺失 deepening/reference/source claims/cache，修正 artifact 结构、reference metadata、depth-review 和 count/provenance gap；缺 profile parameter 时显式 `missing_profile_parameter` |
| `wave2-complete` | Wave2 cross-topic synthesis 三件套已派生；pure synthesis 只在 scan/triage/gap-analysis 完成且无 unresolved search-required gap 时合法；新增 search/evidence/reference 或 promoted `reference/00-cross-*.md` 必须有条件 work-unit provenance | 文件存在性（`artifacts/wave2/synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`）、section/YAML/link checks、finding-index required fields、`gap_status` / `synthesis_eligibility` consistency、conditional submitted work-unit declaration coverage + work-unit submission presence for new search/evidence/reference outputs、`trace_event_present`（`wave2_completion`）、status 值 | 补充 synthesis/ledger/index 结构，修正失效引用；对 search-required finding 或 `00-cross` reference 通过 `wave2_targeted_evidence` work units 补齐 provenance，或显式 route to HITL2/internal-data/record-only |
| `hitl2-recorded` | 用户已通过 HITL2 做出 final review decision，decision brief 已产出且 decision 已持久化到 profile | definition rules：decision brief 存在/非空、profile YAML 可解析、`hitl2.status == recorded`、`user_decision` 非空且属于 5 个 recorded actions；CLI 另执行 shared phase-handoff preflight | 补充 decision brief、修正 profile direct facts、选择合法 recorded action，并从 Wave2→HITL2 source window 重跑同一 gate |
| `rerun-ready` | Bundle 处于合法增量 rerun 状态：`phase-rerun.md` 已加载、rerun 请求 rationale 非空、`rerun_count` 在限制内、bundle 结构完整、status 一致 | definition rules：`field_non_empty`（rationale）、`rerun_count_limit`（count 未超限）、`rerun_direction_structure`（rerun 方向结构合法）、`structural`（bundle 结构完整）、status 值 | 修正 rationale/status 直接事实；count 超限→只暴露 new-bundle 用户决策边界；结构残缺→按报告 root 修复后从同一 rerun-ready checkpoint 重跑 |
| `readiness-passed` | 最终交付前确定性 precheck：所有 required artifacts 可达、所有 prior gate pass 可审计（从 manifest 推导期望 gate 集合）、profile/trace 无结构性矛盾 | `dir_non_empty`（`seed_topics/`）、`file_exists`（`reference/_INDEX.md`、`artifacts/wave2/synthesis.md`、`artifacts/hitl2/decision-brief.md`）、`trace_has_all_gates`（从 manifest 拓扑推导 prior gate 集合，逐个核对 trace）、`yaml_parse`（profile）、`jsonl_parse`（trace）、status 值。**不做任何 content quality 判断** | 补产缺失 artifact、修复 YAML/JSONL 解析错误、确认所有 prior gate 已 pass、修正 status drift。不修复"写得不够好" |

`hitl2_recorded` phase event 是 Agent-authored diagnostic/audit history，不是 `hitl2-recorded` definition blocker。Gate CLI 自己写的 `gate_attempt` 才记录 deterministic verdict 与 selected handoff。`proceed_to_readiness` selects `phases/phase-readiness.md`；`rerun` selects `phases/phase-rerun.md`；`request_view_revision`、`repair`、`stop_blocked` pass direct decision checks but do not default to readiness。

## Authority Boundary

> **此 node 不是 deterministic rule authority。**

- Gate rule authority 在 `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-*.definition.json`
- Gate verdict authority 在 gate CLI output（`check-gate-*.mjs --bundle <path>`）
- Gate runtime history 在 `dpt_rb_*/rb_trace.jsonl` 和 `dpt_rb_*/rb_status.json`
- **如果此 shared prose 与 JSON/CLI/trace 冲突，以 JSON/CLI/trace 为准**
- 此 node 应随 Gate definition JSON 升级同步更新
