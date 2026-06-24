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
- **`_trace_subagent.jsonl`**（subagent relay trace）：位于 active bundle 根目录，由 `subagent-relay.mjs` 的 `ensureTrace()` 自动创建，记录 slot 生命周期事件（`slot_create`、`agent_spawn_requested`、`agent_runtime_started`、`agent_result_ready`、`result_schema_validated`、`merge_complete` 等）。用于 relay pipeline 调试和 trace 对账。
- **区分**：gate CLI 只写 `rb_trace.jsonl`；`_trace.jsonl` 只能由 experiment driver 创建；`_trace_subagent.jsonl` 由 relay engine 自动管理。

### `contracts/reference.mjs` → `reference/<topic>/source.yaml`

- **Schema**：`ReferenceMetadataSchema`（单条）、`ReferenceMetadataArraySchema`（YAML 数组）
- **字段**：`url`（string, 必填）、`title`（string, 必填）、`retrieved_date`（YYYY-MM-DD string, 必填）、`topic_tag`（string, 必填）、`notes`（string, 可选）
- **格式**：YAML array，每项为一条 reference metadata
- **位置**：`DPT_FRAMEWORK/schema/contracts/reference.mjs`

## Reference Layer

Foundation reference data，由 Wave0 初始填充（`source.yaml` + `index.md`）。后续 wave 可继续向 `reference/` 追加新的 reference entry，也可通过 seed topic backfill 间接关联。

- **`reference/<topic>/source.yaml`**：Per-topic reference metadata（YAML array，每项满足 `ReferenceMetadataSchema`）。字段：`url` / `title` / `retrieved_date` / `topic_tag` / `notes`（详见上方 `contracts/reference.mjs`）。Foundation floor：每个 topic ≥ 1 条 metadata。`<topic>` 来自 `topic_registry` 的 slug（`{index}_` 编号前缀：`01_`、`02_`、…）。
- **`reference/00_shared/`**：Shared/cross-cutting reference 目录（可选）。存放不属于单个 topic 的 foundation reference——行业全景、方法论文献、跨 topic 对比数据等。Wave0 创建共享 foundation reference，后续 wave（尤其 Wave2 cross-topic search）可继续追加。编号 `00_` 与 topic slug 的 1-based 编号（`01_`、`02_`、…）一致：`00_` = 第零号 = shared layer。
- **`reference/index.md`**：Foundation reference 索引（Agent 可读摘要，列出每个 topic 和 shared 目录的 reference）。

## Seed Topics

`seed_topics/` 位于 bundle root，与 `reference/`、`artifacts/` 同级。每个 topic 一个 `.md` 文件，内含 `__BACKFILL_*__` token，由各 wave 在完成时替换。

| Token | 替换阶段 | 替换内容 |
|-------|---------|---------|
| `__BACKFILL_WAVE0_EVIDENCE__` | Wave0 complete 后 | source intake 产出的 reference 摘要列表 |
| `__BACKFILL_WAVE1_MECHANISMS__` | Wave1 complete 前 | evidence-summary 提取的机制理解 |
| `__BACKFILL_WAVE1_TRENDS__` | Wave1 complete 前 | evidence-summary 提取的趋势与难点 |
| `__BACKFILL_WAVE2_JUDGMENT__` | Wave2 complete 前 | 从 ledger/index 投影的跨 topic 判断 |
| `__BACKFILL_PENDING_QUESTIONS__` | Wave1→Wave2 两阶段 | Wave1 写入初始问题状态，Wave2 从 ledger/index 投影更新 |

Gate 通过 `pattern_match`（`negate: true`）验证 `__BACKFILL_WAVE*_*__` token 已被替换。`__BACKFILL_PENDING_QUESTIONS__` 的检查在 wave1-complete gate 和 wave2-complete gate 中均执行。

## Artifacts — Wave1 (Per-Topic Deepening)

Wave1 为每个 topic 产出 paired artifacts。Gate 通过 `pattern_match` 规则验证 structure（section 标题、source URL、key finding pattern、backfill token absence）。

- **`artifacts/wave1/<topic>/evidence-summary.md`**：Per-topic evidence summary（Markdown）。§Source URLs（Markdown link + retrieved date）、§Key Findings（编号条目，bold prefix 必须是 `**机制理解**:` 或 `**趋势观察**:`）、§Open Questions（编号条目，状态标签必须是 `[开放]` / `[部分解答]` / `[涌现]`——不允许 topic-descriptor 标签如 `[Bridge gap]`）。**Schema**：模板级约束（无独立 Zod contract）；structure 由 `phase-wave1-subagent.md` §2.1 定义。
- **`artifacts/wave1/<topic>/question-list.md`**：Per-topic exploration ledger（Markdown，四节结构，顺序固定）。§1 Topic Investigation Targets（表：target_id / question / origin / status / backing_refs / next_action）。§2 Question Reconciliation（用 `[已解决]` / `[部分进展]` / `[仍开放]` / `[需内部数据]` 标记状态变化）。§3 Emergent Question Protocol（4 项检查：new_concept / contradiction / missing_information_gap / noise_pattern，每项 checked + trigger_refs）。§4 Exploration / Exploitation Decision（decision + trigger_refs + unresolved_questions + queue_consequence + next_action）。详见 `phase-wave1-subagent.md` §2.2 和 `phase-wave1.md` §3.2.1。

## Artifacts — Wave2 (Cross-Topic Synthesis)

Wave2 产出三件套 artifact group，不是单个 synthesis.md。以下为 Wave2 所需的全部 artifact 信息。

### synthesis.md — Narrative Projection

- **角色**：面向人类阅读的 cross-topic narrative，不作为动态 finding source of truth
- **格式**：Markdown，用 `[label](relative/path.md)` 引用 Wave0/Wave1 artifact
- **引用路径**：相对于 `artifacts/wave2/`（`../wave1/<topic>/evidence-summary.md` 指向 Wave1、`../../reference/<topic>/source.yaml` 指向 Wave0）
- **必须包含**：至少 1 个 wave1 evidence-summary 或 question-list 引用、W2F-xxx finding id 引用、Unresolved Cross-Topic Questions section
- **不得包含**：完整 scan matrix（那是 ledger 的职责）、作为 backfill 的 sole source（那是 ledger/index 的职责）

### cross-topic-ledger.md — Dynamic Ledger

- **角色**：Agent-readable source of truth，动态增长（每轮追加/更新，不是最后写一次）
- **格式**：Markdown，6 个固定 section，按顺序：
  1. **Cross-Topic Scan Matrix** — 记录 topic pair 检查情况（pair_id / topics / checked_dimensions / finding_ids / notes）
  2. **Wave1 Legacy Questions** — 从 Wave1 question-list 汇入未完全解决的问题
  3. **Cross-Topic Resolutions** — 用其他 topic evidence 回答 legacy question（不搜索）
  4. **Emergent Cross-Topic Questions** — Wave1 不存在、Wave2 拉通后首次出现的问题
  5. **Exploration Decisions** — 每个 finding 的 action decision
  6. **HITL2 Handoff** — 需人类判断/内部数据/超出 budget 的 finding
- **Checked dimensions**：`shared_pattern` / `contradiction` / `resolution_opportunity` / `emergent_question`

### finding-index.yaml — JS-Readable Shadow Index

- **角色**：Ledger 的结构化影子，让 JS engine 能做确定性反馈（不承载长篇 reasoning）
- **格式**：YAML
- **Top-level keys**：`version`（"0.1"）/ `source_layer`（"wave2_cross_topic"）/ `ledger` / `synthesis` / `scan` / `findings`
- **`scan` object**：`topic_count` / `pair_count_expected` / `pair_count_checked`
- **Per-finding required fields（11 个）**：

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | W2F-xxx |
| `type` | enum | `wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question` |
| `status` | enum | `resolved` / `partial` / `open` / `deferred` |
| `decision` | enum | `use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only` |
| `affected_topics` | array | ≥2 for `cross_topic_emergent_question` |
| `origin_refs` | array | Legacy question 来源；emergent 可为空但必须显式 `[]` |
| `trigger_refs` | array | 触发 finding 的 evidence/question refs |
| `search_required` | boolean | 是否需要 sub-agent search |
| `subagent_receipt_refs` | array | 搜索发生时的 relay/runtime receipt refs |
| `appears_in_synthesis` | boolean | 是否已进入 narrative projection |
| `hitl2_handoff` | boolean | 是否进入 HITL2 handoff |

- **Optional v1 extension fields**：`backfill_topics` / `synthesis_refs` / `handoff_refs` / `last_checked_at` / `repair_attempts`

### Finding Type / Status / Decision Enum 速查

| Enum | Values |
|------|--------|
| **type** | `wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question` |
| **status** | `resolved` / `partial` / `open` / `deferred` |
| **decision** | `use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only` |

### Wave2 Sub-Agent Cache/Slot 路径

- `_cache/wave2/slot_MM/` — 中间产物
- `_subagents/wave_02/slot_MM/` — slot 目录 + runtime receipt

## Artifacts — HITL2

- **`artifacts/hitl2/decision-brief.md`**：HITL2 人类决策摘要。HITL2 是独立的 human-review phase——Agent 不自主推进。HITL2 gate（`gate-hitl2-recorded`）验证 decision-brief 存在 + non-empty + `rb_profile.yaml` 的 `hitl2.status` / `hitl2.user_decision` 字段已填写。

## Non-Authority Directories

以下目录以 `_` 前缀命名，gate 不检查其内容。它们是运行时暂存区，不属于 authority artifact surface：

- **`_cache/`**：Sub-agent 中间产物（搜索结果缓存、抓取页面、提取笔记）。Wave0→`_cache/wave0/slot_MM/`，Wave1→`_cache/wave1/slot_MM/`，Wave2→`_cache/wave2/slot_MM/`。
- **`_subagents/`**：Sub-agent relay slot 目录，由 `subagent-relay.mjs` 自动管理。每个 slot 含 `task.md` / `result.schema.json` / `runtime-receipt.jsonl` / `result.json`。Wave0→`wave_00/`，Wave1→`wave_01/`，Wave2→`wave_02/`。

## Final Delivery

- **`final/`**：Terminal delivery 目录（`gate: null`，无 gate CLI 检查）。Agent 从 verified bundle state 生成 final report artifact(s)，格式自由。Delivery 完成由 `final/` 下存在至少一份报告文件来证明。空目录不代表 delivery 完成。Post-delivery 反馈走 HITL2 `rerun` 路径。

### Sub-Agent Protocol Nodes

每个使用 sub-agent 的 phase 有独立的 sub-agent 指令文件（main-agent 通过 `suggested_context` 加载）。共享 relay 基础设施由 `shared-subagent-protocol.md` 定义。

- **`phases/phase-wave0-subagent.md`** — Wave0 sub-agent（role: `dpt-source-intake`）：foundation reference 搜索和 `source.yaml` 写入
- **`phases/phase-wave1-subagent.md`** — Wave1 sub-agent（role: `dpt-evidence-extractor`）：topic-specific deepening、`evidence-summary.md` + `question-list.md` 成对产出
- **`phases/phase-wave2-subagent.md`** — Wave2 sub-agent（role: `dpt-topic-scout`）：targeted gap-fill search，仅在 main-agent 对 finding 做 `decision=exploit_search|explore_search` 时 spawn。输入：finding description + keywords + output schema。输出：structured JSON（found_evidence, source_urls, fills_gap, confidence）
- **`shared/shared-subagent-protocol.md`** — 共享 relay 基础设施：slot 契约、目录 authority boundary、并发控制、禁区清单、页面抓取链

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
