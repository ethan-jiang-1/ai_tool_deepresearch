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
- `rb_profile.yaml` 的 `root_must_answer_set` 和 `research_profile`（topic 派生的上游约束）
- `shared-schemas.md`（schema、trace、seed_topics/ 目录结构）
- `DPT_FRAMEWORK/cli/operate-queue.mjs`（Agentic Queue CLI — 灌料、claim、complete 的入口）

## 3. Allowed Actions — Queue-Driven 三阶段

Seed-topics 使用 Agentic Queue 驱动 topic 物化。每个 topic 一个 task，由 main-agent 直接执行（无外部 search，从 topic_registry 的结构化定义写为文件）。seed topic 文件 **不是笼统的标签**——它必须是能驱动后续 search 的决策级文件（对齐 V12 decompose-seed-topics 标准）。

### 3.1 灌料 (Filling) — 首次进入 seed-topics

如果 queue 为空（`operate-queue check <bundle>` 返回 `queue_health` 为 thin/blocked 或 active_window 为空）：

1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，确定 topic 集合
2. 为每个 topic 生成一个 task card JSON 文件，然后 enqueue：

**Task card JSON 模板（写入临时文件如 `/tmp/wfq-seed-{topic.key}.json`）：**

```json
{
  "work_id": "seed-topic-{topic.key}",
  "title": "Materialize seed topic: {topic.label}",
  "target": "main-agent",
  "action": "将 topic_registry 中的 [{topic.key}] 物化为 seed_topics/{topic.key}.md。该文件必须是 search-relevant decision document——能告诉后续 wave0 source intake 搜索什么、怎么搜、避免什么。具体要求见本 phase body §3.1 的 Seed Topic 文件结构。从 rb_plan.md topic_registry 和 rb_profile.yaml 中提取该 topic 的 must_answer、hypothesis、scope、search_guardrails、evidence_route 等信息填入。",
  "producer_rule": "seed_topic_materialize",
  "lineage": {"topic_key": "{topic.key}", "phase": "seed-topics"},
  "priority_class": "P3_current_gate_gap",
  "required_receipts": ["file:seed_topics/{topic.key}.md"],
  "done_condition": "seed_topics/{topic.key}.md 存在，frontmatter 含 id/slug/title（均非空），slug 与文件名 stem 一致，正文含研究骨架（关键维度/已知前提/open questions）+ 原始语境约束 block",
  "verification": {"engine": ["receipt_check"], "agent": ["frontmatter_completeness", "slug_consistency", "content_has_all_sections"]},
  "writes_to": ["seed_topics/{topic.key}.md"],
  "status_sync": ["seed_topics_materialized"],
  "completion_receipt": "file:seed_topics/{topic.key}.md",
  "failure_route": "queue_repair",
  "payload": {"topic_key": "{topic.key}", "topic_label": "{topic.label}"}
}
```

3. Enqueue 每个 task card：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-seed-{topic.key}.json
```

4. 全部 topic 灌入后验证：
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```

**Seed Topic 文件结构（每个 `seed_topics/<slug>.md` 必须满足）：**

```markdown
---
id: "<topic-id>"
slug: "<topic-key>"
title: "<topic 标题>"
must_answer:
  - "<该 topic 需要回答的具体问题 1>"
  - "<该 topic 需要回答的具体问题 2>"
hypothesis: "<初始假设或 known gap>"
in_scope: "<搜索边界——该 topic 覆盖什么>"
out_of_scope: "<排除边界——什么不属于该 topic>"
search_guardrails:
  required_terms: ["<必含词>"]
  forbidden_broadening: ["<禁止泛化的方向>"]
evidence_route:
  preferred_sources: ["<可信来源类型 1>", "<来源类型 2>"]
  noise_to_avoid: ["<已知噪音方向>"]
---

# <topic 标题>

## 关键维度
- 维度 1：...
- 维度 2：...

## 已知前提
- ...

## Open Questions
- ...

## 原始语境约束
- **source_anchor**: 从 `rb_plan.md` topic_registry 的 `<topic.key>` 条目和 `rb_profile.yaml` root_must_answer_set 派生
- **in_scope**: （与 frontmatter 一致，正文可展开）
- **out_of_scope**: （与 frontmatter 一致）
- **search_guardrails**: seed topic 层面的搜索护栏——告诉 wave0 sub-agent 哪些查询词必须用、哪些方向不能泛化
- **evidence_route**: seed topic 层面的证据路线——告诉 wave0 sub-agent 优先搜索哪些来源类型、避开哪些噪音
```

若 `rb_plan.md` 和 `rb_profile.yaml` 中不足以填充所有字段（如 hypothesis 或 search_guardrails 缺失），**标注为显式 gap**（如 `hypothesis: "pending — HITL1 未提供足够约束"`），不要编造。gap 本身是有效的 seed topic 信息——它告诉 wave0 "这个 topic 目前搜索范围较宽，需要 source intake 过程中收敛"。

### 3.2 Queue-Driven 执行循环

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUEUE-DRIVEN EXECUTION LOOP                      │
│                                                                      │
│  ┌─ 1. claim ──────────────────────────────────────────────────────┐│
│  │   operate-queue claim <bundle> --actor main-agent               ││
│  │   → stdout JSON: { item: {...task card...}, ... }                ││
│  │   → item 为 null → queue 空 → 跳到 §3.3                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 2. execute ────────────────────────────────────────────────────┐│
│  │   target = main-agent（seed topic 物化不涉及搜索，main-agent     ││
│  │   直接从 topic_registry + profile 提取信息写入）                 ││
│  │   a. 读取 task.payload.topic_key                                 ││
│  │   b. 从 rb_plan.md topic_registry 获取该 topic 的完整定义        ││
│  │   c. 从 rb_profile.yaml 获取 root_must_answer_set,               ││
│  │      research_profile 等上游约束                                 ││
│  │   d. 按 §3.1 Seed Topic 文件结构创建 seed_topics/<slug>.md       ││
│  │   e. 缺失信息标注为 gap（不编造）                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 3. complete ───────────────────────────────────────────────────┐│
│  │   a. 创建 result JSON → /tmp/wfq-seed-result-{work_id}.json:    ││
│  │      { "work_id": "...",                                         ││
│  │        "receipt": "file:seed_topics/{topic.key}.md",              ││
│  │        "summary": "materialized seed topic {topic.key}",          ││
│  │        "writes": ["seed_topics/{topic.key}.md"] }                 ││
│  │   b. 运行:                                                       ││
│  │      operate-queue complete <bundle> --result <result.json>      ││
│  │   → receipt check PASS → promote → refill → render               ││
│  │   → receipt check FAIL → engine 自动生成 repair task             ││
│  │       → 读 inspect/advice → 修复 → 回到 claim                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 4. 读投影 → 回到 step 1 ───────────────────────────────────────┐│
│  │   cat <bundle>/_cache/agentic-queue/current-task.md              ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**执行约束：**
- **不跳过 task**：只要 claim 返回了 task card，就执行+complete
- **不编造信息**：`must_answer`、`hypothesis`、`search_guardrails`、`evidence_route` 如果上游（topic_registry / profile）未提供，标注为显式 gap，不编造
- **complete 阻塞**：receipt check 失败 → engine 生成 repair → 修复 → re-claim
- **seed topic 不是 chapter label**：每个 seed topic 必须包含足够的 search-relevant 约束（search_guardrails + evidence_route），否则 wave0 sub-agent 无法做定向搜索

### 3.3 Queue 空后 — 收尾与 Gate

当 claim 返回 `item: null`（queue 空）时：

1. 跑 gate：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle <path> --current-node phases/phase-seed-topics.md
```
2. gate pass → 读取 `check.next` → 加载 `phase-wave0.md`
3. gate fail → 按 §7 On Gate Fail 处理

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
