---
node_type: shared
id: shared-schemas
shared_scope: schema-summary
authority: guidance-only
execution_contract:
  surface: shared-guidance
  search_policy: no_search
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
- **字段**：`current_mode`（必须为 `"execution"`）、`state`（`RunState` enum）、`current_gate`（`CurrentGate` enum）、`next_gate`（`CurrentGate` enum）、`current_node`（workflow node ref 或 `null`）
- **注意**：`rb_status.json` **没有** `phases.*` 树。gate window tracking 通过 `current_gate`/`next_gate` 两个字段完成；当前已加载 phase Markdown coordinate 通过非空 `current_node` 表示
- **位置**：`DPT_FRAMEWORK/schema/contracts/status.mjs`

### `contracts/queue.mjs` → `rb_queue.json`

- **Schema**：`QueueSchema`
- **字段**：`queue_health`、`stop_authorization_state`、`active_window[]`、`refill_pool[]`、`delegated_in_flight{}`、`terminal_history[]`
- **identity**：queue demand uses `queue_item_id`; delegated attempts use Engine-allocated `work_id` under `_work_units/`
- **delegated completion**：delegated queue demand is completed by `operate-work-unit submit` for claimed attempts, with explicit audited `operate-work-unit late-submit` as the only eligible `timed_out` recovery exception; never by queue maintenance commands
- **位置**：`DPT_FRAMEWORK/schema/contracts/queue.mjs`

### Trace: `rb_trace.jsonl`

- **`rb_trace.jsonl`**（唯一 trace sink）：位于每个 bundle 根目录，由 queue manager、work-unit lifecycle CLI/helper、gate CLI、playbook thin driver 统一 append。记录 runtime audit 事件（queue lifecycle、work-unit claim/submit/fail/timeout/abandon/inspect diagnostics、gate attempt、experiment verdict check）。**这是 runtime audit 与 experiment verdict 的单一 truth surface。**
- `rb_trace.jsonl` is the only current trace JSONL surface. Older trace JSONL names are not part of the current contract.

### `contracts/reference.mjs` → `artifacts/wave0/<topic>/source.yaml`

- **Schema**：`ReferenceMetadataSchema`（单条）、`ReferenceMetadataArraySchema`（YAML 数组）
- **字段**：`url`（string, 必填）、`title`（string, 必填）、`retrieved_date`（YYYY-MM-DD string, 必填）、`topic_tag`（string, 必填）、`notes`（string, 可选）
- **格式**：top-level YAML array，每项为一条 reference metadata。文件第一层必须直接是 `- url: ...` entries；不要包在 `sources:`, `wave:`, or `topic:` object wrapper 下。
- **序列化**：用 `yaml.stringify([{ url, title, retrieved_date, topic_tag, notes }])` 写入，避免手拼 YAML。含冒号、分号、箭头、括号、长句、CJK 或 emoji 的值必须由 serializer 引号或 block-string 处理。
- **位置**：`DPT_FRAMEWORK/schema/contracts/reference.mjs`
- **新增**：`validateIndexMD(content)` — _INDEX.md Markdown table 结构校验（8 列表头 + ≥1 行数据）

## Reference Layer

Reference evidence 存放在平铺的 `reference/` 目录下（无子目录）。每个 source 一个 rich MD 文件，格式见 `shared-reference-template.md`。

- **`reference/00-shared-<slug>.md`**：Wave 0 产出。共享基础 reference（rich MD），覆盖 ≥2 个 topic 的跨领域知识。每个文件含 metadata block（9 必填字段）+ 5 个标准 section。Foundation floor：≥ 1 个。
- **`reference/{topic_slug}-<qualifier>.md`**：Wave 1 产出。Topic 专属 reference（rich MD），`{topic_slug}` 为 topic 的完整 slug（已含 `NN_` 前缀，如 `01_meal-timing-...`），`<qualifier>` 为 source 短标识。每个文件含 metadata block + 5 个 section。Per topic ≥ 1 个。
- **`reference/00-cross-<slug>.md`**：Wave 2 consumer reference（可选）。它只能走两条 authority path：existing-backed Phase-owned projection 必须引用 `W2F-xxx`、finding-index/ledger 和 concrete prior accepted submitted backing；newly fetched evidence 必须先由 submitted `wave2_targeted_evidence` work unit 提供 result/receipt/cache/source backing。文件存在本身不建立 authority。
- **`reference/_INDEX.md`**：Canonical reference inventory table。8 列：`ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed`。每个 wave 完成时更新。`source_layer` 取值：`wave0_foundation` / `wave1_topic` / `wave2_cross`。Index row 和 `source_layer` 是 consumer navigation metadata，不是 evidence authority。
- **`reference/README.md`**：人类导航——命名约定、`_INDEX.md` 指向、模板格式简述。
- **`artifacts/wave0/<topic>/source.yaml`**：Thin YAML source 列表。Per topic，每条满足 `ReferenceMetadataSchema`（url/title/retrieved_date/topic_tag/notes）。来自 `topic_registry` 的 slug。Foundation floor：每个 topic ≥ 1 条。
- **不再存在**：`reference/<topic>/` 嵌套子目录、`reference/00_shared/` 目录、`reference/<topic>/source.yaml`（thin YAML 迁至 `artifacts/wave0/`）。

Reference rich MD metadata is the project metadata block format: lines such as `- source_url: ...` before the first `## ` section. It is not YAML frontmatter. Do not wrap reference metadata in `---` fences.

## Seed Topics

`seed_topics/` 位于 bundle root，与 `reference/`、`artifacts/` 同级。每个 topic 一个 `{slug}.md` 文件，`slug` 含 `NN_` 编号前缀（如 `01_meal-timing-...`），`NN` 取自 `topic_registry` 数组 1-based 位置（两位零填充）。文件内含 `__BACKFILL_*__` token，由各 wave 在完成时替换。

**分隔符有意区分：** seed topic 文件用 `_`（underscore，如 `01_meal-timing-....md`），reference 文件用 `-`（hyphen，如 `00-shared-...`、`01_meal-timing-...-author.md`）。两者是不同的命名空间——seed topic slug 把 `NN_` 作为 slug 的一部分编入，reference 前缀是文件命名约定而非 slug 的一部分。

| Token | 替换阶段 | 替换内容 |
|-------|---------|---------|
| `__BACKFILL_WAVE0_EVIDENCE__` | Wave0 inspect/formal gate 前 | source/reference return-map entries with meaning, relationship, refs, status, and next hop |
| `__BACKFILL_WAVE1_MECHANISMS__` | Wave1 complete 前 | mechanism return-map entries from `evidence-summary.md` |
| `__BACKFILL_WAVE1_TRENDS__` | Wave1 complete 前 | trend/limitation return-map entries from `evidence-summary.md` |
| `__BACKFILL_WAVE2_JUDGMENT__` | Wave2 complete 前 | W2F finding return-map entries projected from ledger/index |
| `__BACKFILL_PENDING_QUESTIONS__` | Wave1→Wave2 两阶段 | question-status return-map entries updated from question-list then ledger/index |

Gate 通过 `pattern_match`（`negate: true`）验证 `__BACKFILL_WAVE*_*__` token 已被替换。`__BACKFILL_PENDING_QUESTIONS__` 的检查在 wave1-complete gate 和 wave2-complete gate 中均执行。

## Research Return Map

Wave return/backfill content is an Agent-readable navigation layer over existing evidence authority. It helps the next Agent reload what the evidence means and where to read it; it does not replace submitted work-unit ledger rows, reference files, cache leaves, gate attempts, handoff witnesses, readiness evidence, or final delivery evidence.

Every important source, mechanism update, pending-question update, or finding projection should include the same minimum fields:

```markdown
- evidence_meaning: One or two sentences saying what this evidence/finding changes.
  relationship: supports | refutes | partial | opens | defers | context
  refs:
    - reference/<file>.md
    - artifacts/wave0/<topic>/source.yaml
    - artifacts/wave1/<topic>/evidence-summary.md
    - artifacts/wave1/<topic>/question-list.md
    - artifacts/wave2/cross-topic-ledger.md
    - artifacts/wave2/finding-index.yaml
    - _cache/<wave>/<batch>/<scope>/<leaf>/
    - _work_units/<phase>/<work_id>/result.json
  status: supported | refuted | partial | open | emergent | deferred
  next_hop: Read or repair the named path/action next.
```

Evidence-bearing `refs` must enumerate concrete existing bundle-relative `reference/*.md` files as the primary consumer navigation layer when those files are materialized. `artifacts/`, `_cache/`, `_work_units/`, finding ids, and index rows are secondary provenance/context. If no consumer reference can be materialized, record an explicit limitation with `refs: none`; do not use a glob or count summary.

Wave-specific projection:

- Wave0 backfill connects each important source/reference to the topic must-answer or initial hypothesis, leads with concrete existing `reference/00-shared-*.md` navigation, and says whether the source supports, refutes, partially answers, opens, defers, or provides context.
- Wave1 backfill connects mechanisms, trends, limits, and pending-question status to concrete existing topic `reference/*.md` navigation, with `evidence-summary.md`, `question-list.md`, cache leaves, and work-unit surfaces as secondary provenance.
- Wave2 backfill preserves `W2F-xxx` finding ids and leads with concrete existing `reference/00-cross-*.md` navigation for consumer-facing materialized findings, with `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, and source backing as secondary provenance.

Return-map navigation is not evidence authority. A Wave inspect may still classify missing concrete consumer navigation as blocking for that inspect command; that does not turn the return map into delegated coverage, a formal gate rule, phase handoff, readiness, final delivery, or HITL authority.

## Artifacts — Wave1 (Per-Topic Deepening)

Wave1 为每个 topic 产出 paired artifacts。Formal gate 与 `inspect-wave1-output.mjs` 复用同一份 artifact/provenance evaluator：required semantic sections、可解析 source URL、submitted roles/backing 和 explicit floors 保持 blocking；等价 heading、常见列表 marker、bare `http(s)` URL 与非空 Key Findings 段落使用宽容解析，不把展示样式变成第二份 authority。

- **`artifacts/wave1/<topic>/evidence-summary.md`**：Per-topic evidence summary（Markdown），submitted `output_files[]` role 必须是 `evidence_summary`。Canonical authoring surface 包含 Source URLs、Key Findings 和 Open Questions；source URL 可写 Markdown link 或 bare `http(s)` URL，Key Findings 可用常见 bullet、numbered list 或非空段落。Reader-facing links 不建立 accepted source coverage；coverage 来自 submitted structured `source_claims[]` 及其 cache/degraded backing。Role `other` 只用于额外非 blocking output，不能代替此 required role。
- **`artifacts/wave1/<topic>/question-list.md`**：Per-topic exploration ledger（Markdown），submitted `output_files[]` role 必须是 `question_list`。它必须提供 Topic Investigation Targets、Question Reconciliation、Emergent Question Protocol、Exploration / Exploitation Decision 四个语义区块；canonical template 的表格、状态标签和字段见 `subagent-dpt-evidence-extractor.md` §3.2。Equivalent heading case/spacing/list presentation is tolerated，四个语义区块本身仍 required。Role `other` 不能代替此 required role。
- **`artifacts/wave1/<topic>/depth-review.yaml`**：Phase-owned deterministic projection written after successful submit. `reviewed_work_unit_refs[]` 使用 `_work_units/wave1/<work_id>` 且无 trailing slash，并绑定 submitted work-unit rows。Novelty 从 accepted submitted `source_claims[]` 与 `wave0_source_urls[]` 的直接 URL 差集得到；accepted claim 必须由 submitted row + `cache_trail_refs[]` 或 explicit `degraded_capture_ref` 支撑。它同时记录 `new_source_urls[]`、`new_source_floor`、depth dimensions、profile checks、closed `decision`（`accept` / `supplement_required` / `blocked_contract`）和 supplementary queue ids，但不能自行创建 delegated coverage。

Producer 顺序固定为：materialize Wave1-owned artifacts → 运行 side-effect-free、non-routing `node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle <path>` → 修复 inspect 指向的最小 surface 并重跑同一 inspect → 记录 completion evidence → 调用 formal Wave1 gate。不要复制 evaluator 逻辑到 Markdown 或另写本地 validator。

## Artifacts — Wave2 (Cross-Topic Synthesis)

Wave2 产出三件套 artifact group，不是单个 synthesis.md。以下为 Wave2 所需的全部 artifact 信息。

### synthesis.md — Narrative Projection

- **角色**：面向人类阅读的 cross-topic narrative，不作为动态 finding source of truth
- **格式**：Markdown，用 `[label](relative/path.md)` 引用 Wave0/Wave1 artifact
- **引用路径**：相对于 `artifacts/wave2/`（`../wave1/<topic>/evidence-summary.md` 指向 Wave1、`../wave0/<topic>/source.yaml` 指向 Wave0；consumer reference 使用 `../../reference/<concrete-file>.md`）
- **必须包含**：至少 1 个 wave1 evidence-summary 或 question-list 引用、W2F-xxx finding id 引用、Unresolved Cross-Topic Questions section
- **不得包含**：完整 scan matrix（那是 ledger 的职责）、作为 backfill 的 sole source（那是 ledger/index 的职责）

### cross-topic-ledger.md — Dynamic Ledger

- **角色**：Agent-readable source of truth，动态增长（每轮追加/更新，不是最后写一次）
- **格式**：Markdown，使用下列 6 个 canonical semantic sections；inspect/gate 对 harmless heading marker、spacing 和 case 差异宽容，但六个语义区块都必须存在：
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
- **Top-level keys**：`version`（"0.1"）/ `source_layer`（"wave2_cross_topic"）/ `ledger` / `synthesis` / `scan` / `findings` / `synthesis_eligibility`
- **`scan` object**：`topic_count` / `pair_count_expected` / `pair_count_checked`
- **Per-finding required fields（15 个）**：

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | W2F-xxx |
| `type` | enum | `wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question` |
| `priority` | enum | `p0` / `p1` / `p2` |
| `status` | enum | `resolved` / `partial` / `open` / `deferred` |
| `decision` | enum | `use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only` |
| `affected_topics` | array | ≥2 for `cross_topic_emergent_question` |
| `origin_refs` | array | Legacy question 来源；emergent 可为空但必须显式 `[]` |
| `trigger_refs` | array | 触发 finding 的 evidence/question refs |
| `search_required` | boolean | 是否需要 Sub-agent search |
| `subagent_receipt_refs` | array | 搜索发生时的 work-unit runtime receipt refs |
| `appears_in_synthesis` | boolean | 是否已进入 narrative projection |
| `hitl2_handoff` | boolean | 是否进入 HITL2 handoff |
| `confidence` | enum | `high` / `medium` / `low` / `uncertain` |
| `independent_backing_refs` | array | Independent evidence refs for confidence/backing checks |
| `gap_status` | enum | `no_gap` / `needs_search` / `search_submitted` / `deferred_hitl2` / `requires_internal_data` / `record_only` |

`synthesis_eligibility` records `pure_synthesis_eligible`, `scan_matrix_present`, `scan_topic_pair_coverage`, `unresolved_search_required_count`, `targeted_search_required_count`, `targeted_search_submitted_count`, `explicit_deferral_count`, `profile_params_read[]`, and `ineligibility_reasons[]`.

- **Optional v1 extension fields**：`backfill_topics` / `synthesis_refs` / `handoff_refs` / `last_checked_at` / `repair_attempts`

### Finding Type / Status / Decision Enum 速查

| Enum | Values |
|------|--------|
| **type** | `wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question` |
| **priority** | `p0` / `p1` / `p2` |
| **status** | `resolved` / `partial` / `open` / `deferred` |
| **decision** | `use_existing_evidence` / `exploit_search` / `explore_search` / `defer_hitl2` / `requires_internal_data` / `record_only` |
| **confidence** | `high` / `medium` / `low` / `uncertain` |
| **gap_status** | `no_gap` / `needs_search` / `search_submitted` / `deferred_hitl2` / `requires_internal_data` / `record_only` |

### Wave2 Cross-Reference Authority

- Existing-backed projection: `reference/00-cross-*.md` uses a primary prior accepted backing URL and cites `W2F-xxx`, `artifacts/wave2/finding-index.yaml`, `artifacts/wave2/cross-topic-ledger.md`, and concrete prior Wave0/Wave1 submitted backing refs. It does not require a new Wave2 row.
- Targeted-evidence projection: any newly fetched source requires a submitted `wave2_targeted_evidence` row with matching result/receipt/cache/source backing before the Phase Agent may materialize or accept the `00-cross` reference.
- `reference/_INDEX.md` with `source_layer: wave2_cross` and `finding-index.yaml#source_layer: wave2_cross_topic` classify navigation/structured layers only. Neither value proves source authority by itself.
- Producer sequence for Wave0 and Wave2 is the same short loop: materialize phase-owned outputs/backfill → run the corresponding side-effect-free, non-routing Wave inspect → repair the named root and rerun the same inspect → record completion evidence → invoke the formal gate. Do not copy evaluator logic into Markdown.

### Wave2 Sub-agent Cache/Work-Unit 路径

Bare runtime paths in this node are active bundle-root relative. If the active bundle root is `dpt_rb_example/`, `_work_units/wave2/{work_id}/` means `dpt_rb_example/_work_units/wave2/{work_id}/`.

- `_cache/wave2/.../` — source cache leaf directories declared in submitted work-unit results
- `_work_units/wave2/{work_id}/` — work-unit envelope, task, beacon, runtime receipt, result/status, and diagnostic runtime refs

## Artifacts — HITL2

- **`artifacts/hitl2/decision-brief.md`**：HITL2 人类决策摘要。HITL2 是独立的 human-review phase——Agent 不自主推进。HITL2 gate（`gate-hitl2-recorded`）验证 decision-brief 存在 + non-empty + `rb_profile.yaml` 的 `hitl2.status` / `hitl2.user_decision` 字段已填写。

## Non-Authority Directories

以下目录以 `_` 前缀命名，gate 不检查其内容。它们是运行时暂存区，不属于 authority artifact surface：

- **`_cache/`**：Sub-agent 网络原始内容缓存，四级目录 `{wave}/{batch}/{scope}/{source_dir}/`。每个 source 写 `websearch.json` + `page.md` + `meta.json`（11 字段：url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status）。Phase Agent spawn 前 `mkdir -p`，通过 spawn prompt 传递绝对路径。Non-authority，wave 完成后可清理对应 wave 子目录。详见 `_cache/README.md`。
- **`_work_units/`**：bundle-root production delegated work-unit envelopes, allocated by `operate-work-unit claim` and validated by `operate-work-unit submit`. Each envelope contains `manifest.json` / `task.md` / `result.schema.json` / `_beacon.json` / `runtime-receipt.jsonl` / result/status surfaces. Gate coverage still comes from submitted rows in `rb_output_declarations.jsonl`; `_work_units/` is a cross-check and diagnostic surface.

## Final Delivery

- **`final/`**：Terminal delivery 目录（`gate: null`，无 gate CLI 检查）。Agent 从 verified bundle state 生成 final report artifact(s)，格式自由。Delivery 完成由 `final/` 下存在至少一份报告文件来证明。空目录不代表 delivery 完成。Post-delivery 反馈走 HITL2 `rerun` 路径。

### Work-Unit Role Spec Nodes

每个使用 Sub-agent 的 phase 有独立的 work-unit role spec 文件（Phase Agent 通过 `suggested_context` 加载，用来构造 work-unit `task.md`）。这些 role specs 不是 manifest lifecycle phase nodes，也不是通过 `manifest.shared[]` 全局加载的 shared guidance。共享 work-unit sub-agent 基础设施由 `shared-subagent-protocol.md` 定义。

- **`phases/subagent-dpt-source-intake.md`** — role: `dpt-source-intake`。Wave0 foundation reference 搜索和 `source.yaml` 写入
- **`phases/subagent-dpt-evidence-extractor.md`** — role: `dpt-evidence-extractor`。Wave1 topic-specific deepening、`evidence-summary.md` + `question-list.md` 成对产出；Wave2 backing supplementary tasks 也可复用
- **`phases/subagent-dpt-topic-scout.md`** — role: `dpt-topic-scout`。Wave2 targeted gap-fill search，仅在 Phase Agent 对 finding 做 `decision=exploit_search|explore_search` 时 spawn。输入：finding description + keywords + output schema。输出：structured JSON（found_evidence, source_urls, fills_gap, confidence）
- **`shared/shared-subagent-protocol.md`** — 共享 work-unit sub-agent 基础设施：envelope 契约、submit authority boundary、fan-out rules、禁区清单、页面抓取链

### Gate Contract

- **Gate definition JSON**：`DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json` — read-only deterministic rule definition
- **Gate transition-table contract**：`DPT_FRAMEWORK/schema/contracts/gate.mjs` — `GATE_MACHINE_STATES`、`GATE_TRANSITIONS`、transition validation
- **Gate CLI**：`DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` — 每个 gate 一个独立 CLI wrapper
- **Gate helpers**：`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — shared parse/load/validate/route/build/emit

## Authority Boundary

- **Executable schema authority**：`DPT_FRAMEWORK/schema/contracts/*.mjs`
- **Gate authority**：gate definition JSON + gate CLI output
- **此 node 的角色**：Agent-readable schema 导航和关键区分说明（尤其是 trace 双轨）；不复制完整 Zod 定义
- **冲突时**：以 executable schema 和 runtime state 为准
