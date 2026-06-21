---
node_type: phase
id: phase-seed-topics
phase: seed-topics
gate: seed-topics-ready
stop: "no"
requires:
  - shared/shared-profile
  - shared/shared-schemas
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Seed Topics Materialization

## 1. Stage Goal

把 `rb_plan.md` frontmatter 的 `topic_registry` 物化为 `seed_topics/` 目录下的独立文件——每个 topic 一个 `<slug>.md`，含 frontmatter（id/slug/title）和正文研究骨架（关键维度/已知前提/open questions）。为 Wave0 的 reference collection 提供可追溯的 topic 入口。

**`seed-topics-ready` 是结构+数量+一致性 gate，不是 topic 语义质量 gate。** 语义质量（topic 是否覆盖关键维度、是否与 research question 对齐）由 HITL1 阶段人类审查（`stop: yes`）负责。

## 2. Required Inputs

- 已通过 `setup-ready` gate 的 active bundle
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-schemas.md`（schema 和 trace 说明）

## 3. Allowed Actions

- 读取 `rb_plan.md` frontmatter `topic_registry`，获取 topic 集合
- 为 registry 中每个 topic 在 `seed_topics/` 下创建 `<slug>.md` 文件
- 每个 `seed_topics/<slug>.md` 包含：
  - **Frontmatter**：`id`、`slug`、`title`（三个字段均非空，`slug` 与文件名 stem 一致）
  - **正文**：该 topic 的研究骨架——关键维度（从哪些角度研究）、已知前提（已有的知识）、open questions（需要 research 回答的问题）
- 更新 `rb_status.json`（推进 `current_gate` / `next_gate`）与 `rb_trace.jsonl`
- 在 `rb_trace.jsonl` 中记录 `seed_topics_completion` trace event

## 4. Expected Artifacts

- `seed_topics/` 目录非空，其中对于 `topic_registry` 中的每个 topic 存在一个 `<slug>.md` 文件
- 每个文件的 frontmatter `slug` 与文件名 stem 一致，`title` 非空
- `seed_topics/` 下文件 slug 集合与 `topic_registry` slug 集合双向一致（无缺失、无多余）
- `rb_trace.jsonl` 中有 `seed_topics_completion` event
- `rb_status.json` 中 `current_gate: seed_topics_ready` / `next_gate: wave0_complete`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle <path> --current-node phases/phase-seed-topics.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `wave0`：加载 `phase-wave0.md`。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `seed_topics/` 为空目录 | 按 registry 创建对应 `<slug>.md` 文件 |
| slug 缺失（registry 有但磁盘无） | 为缺失的 topic 创建文件 |
| slug 多余（磁盘有但 registry 无） | 删除不在 registry 中的多余文件 |
| frontmatter `title` 为空 | 补充对应文件的 `title` 字段 |
| slug 与文件名 stem 不一致 | 统一为 registry 中的 slug |
| `trace_event_present` fail | 确认已记录 `seed_topics_completion` trace event |
| status drift | 将 `current_gate`/`next_gate` 恢复为 `seed_topics_ready`/`wave0_complete` |
| registry 为空 | 回到 HITL1 补充 topic_registry；不能物化空目录 |

**Persistent failure：** 若 seed-topics gate 连续 3 次修复无进展，记录 escalation 到 `rb_status.json`（`state: blocked`）和 `rb_trace.jsonl`。

## 8. Stop Behavior

`stop: no` — Agent 自主物化。若 registry 为空（topic 集合未建立），报告并停止物化，不编造 topic。

## 9. Anti-Cheating Rules

- **禁止物化空目录就声称完成**：每个 registry topic 必须有对应文件
- **禁止创建与 `topic_registry` slug 不一致的文件**：slug 以 registry 为 source of truth
- **禁止编造 `must_answer_refs` 引用**：seed topic 正文只写研究骨架（维度/前提/open questions），不编造不存在的 reference
- **禁止在 seed-topics 阶段做 research**：seed-topics 是物化已有的 topic 定义，不做搜索/阅读/evidence 工作
- 参见 `shared-anti-cheating-rules.md` 的通用禁令
