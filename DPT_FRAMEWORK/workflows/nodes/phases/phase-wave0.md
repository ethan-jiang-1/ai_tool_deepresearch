---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
requires:
  - shared/shared-profile
  - shared/shared-schemas
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Wave0 — Foundation Shared Reference

## 1. Stage Goal

搜集少量真实的 shared reference evidence，为 topic_registry 中的每个 topic 创建结构化 YAML metadata（url/title/retrieved_date/topic_tag），写入 `reference/<topic>/source.yaml`，更新 `reference/index.md`。

**Wave0 是 foundation evidence collection，不是 comprehensive research。** 每个 topic 只需要至少 foundation floor 数量的 reference。目标不是 coverage completeness，而是为 Wave1 的 topic-scoped skeleton 和 Wave2 的 cross-topic synthesis 提供可信的 evidence 基座。

## 2. Required Inputs

- 已通过 `seed-topics-ready` gate 的 active bundle（`seed_topics/` 已物化）
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-profile.md`（research profile 和 root must-answer set）
- `shared-schemas.md`（ReferenceMetadata schema 说明和 wave artifact 目录结构）

## 3. Allowed Actions

- 读取 `rb_plan.md` 的 `topic_registry`，确定 reference 覆盖方向
- 搜索/阅读真实来源，为每个 topic 搜集至少 foundation floor 数量（≥1）的 reference
- 为每条 reference 写结构化 YAML metadata：`url`、`title`、`retrieved_date`（YYYY-MM-DD）、`topic_tag`（对应 registry 中的 topic key），写入 `reference/<topic>/source.yaml`
- 写入或更新 `reference/index.md`（列出每个 topic 的 reference 摘要）
- 更新 `rb_status.json`（推进 `current_gate` / `next_gate`）与 `rb_trace.jsonl`
- 在 `rb_trace.jsonl` 中记录 `wave0_completion` trace event

## 4. Expected Artifacts

- `reference/index.md`（非空，摘要每个 topic 的 reference）
- `reference/<topic>/source.yaml`（对于 topic_registry 中的每个 topic，至少 foundation floor 数量的 reference metadata 条目，每条满足以下 contract）：
  - `url`：string，非空
  - `title`：string，非空
  - `retrieved_date`：string，YYYY-MM-DD 格式
  - `topic_tag`：string，非空，匹配 registry 中的 topic key
  - `notes`：string，可选
- `rb_trace.jsonl` 中有 `wave0_completion` event
- `rb_status.json` 中 `current_gate: wave0_complete` / `next_gate: wave1_complete`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `wave1`：加载 `phase-wave1.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `reference/index.md` 缺失或为空 | 写入 index 摘要 |
| `reference/<topic>/source.yaml` 缺失 | 为该 topic 搜索并写入 reference metadata |
| schema violation（缺少 url/title 等必填字段） | 补充缺失字段 |
| `count_floor` fail（某 topic reference 数量 < 1） | 为该 topic 搜集更多 reference |
| registry 为空 | 回到 HITL1 补充 topic_registry |
| `trace_event_present` fail | 确认已记录 `wave0_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave0_complete`/`wave1_complete` |

**Persistent failure：** 若 wave0 gate 连续 3 次修复无进展，记录 escalation 到 `rb_status.json`（`state: blocked`）和 `rb_trace.jsonl`。

## 8. Stop Behavior

`stop: no` — Agent 自主搜集 foundation reference。若 registry 为空，报告并停止，不编造假 reference。

## 9. Anti-Cheating Rules

- **禁止使用 fake URL 或伪造 source metadata**：每条 reference 必须来自真实搜索/阅读，url 必须指向真实可访问的页面
- **禁止声称 evidence coverage 或 research depth completeness**：Wave0 只需要 foundation floor，不是 comprehensive research
- **禁止跳过实际搜索直接编造 reference**：reference metadata 必须基于真实内容（title 反映实际页面标题，retrieved_date 是真实检索日期）
- **禁止在 Wave0 做 synthesis 或 claim verification**：Wave0 只收集 reference metadata，不做跨 topic 综合或结论判断
- 参见 `shared-anti-cheating-rules.md` 的通用禁令
