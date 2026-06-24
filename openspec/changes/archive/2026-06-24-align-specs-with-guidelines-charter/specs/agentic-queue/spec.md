# agentic-queue

> req: AGQ-007, AGQ-009, AGQ-012, AGQ-014

## MODIFIED Requirements

> Apply note: the accepted `agentic-queue` spec currently contains repeated same-name producer-rule sections from prior accepted changes. During apply, update all active copies that describe the same accepted behavior, or consolidate stale duplicates in the accepted spec. Do not leave one active duplicate using legacy `target` / `main-agent` conceptual prose while another copy uses `targets` / `Phase Agent`. Because `MODIFIED Requirement` matching is name-based, do not apply this delta through an automatic one-match sync without first resolving the duplicate headings.

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` value. This producer rule governs the generation of source-intake task cards during wave0 (foundation reference collection).

A task card with `producer_rule: source_intake_fan_in` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave0-source-{topic.slug}"` |
| `title` | yes | `"Source intake: {topic.title}"` |
| `action` | yes | 自然语言描述：搜索 topic、找到可信来源、获取页面、提取 url/title/retrieved_date/topic_tag、写入 `reference/{topic.slug}/source.yaml`（满足 ReferenceMetadata schema） |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-source-intake", timeout_ms: 600000 } }` |
| `producer_rule` | yes | `"source_intake_fan_in"` |
| `priority_class` | yes | `"P5_new_reference_intake"` |
| `required_receipts` | yes | `["file:reference/{topic.slug}/source.yaml"]` |
| `done_condition` | yes | `"reference/{topic.slug}/source.yaml` 存在且通过 `ReferenceMetadata` schema 校验" |
| `verification.engine` | yes | `["receipt_check"]` |
| `writes_to` | yes | `["reference/{topic.slug}/source.yaml", "_cache/search-results/"]` |

The task card template in `phase-wave0.md` §3.1 SHALL set `targets.delegates` with `to: "sub-agent"` and `role_key: "dpt-source-intake"`. The `targets.controller` value `"main-agent"` is the current schema wire value for Phase Agent workflow authority, not the preferred conceptual role name. The Sub-agent executes the search and bounded output; the Phase Agent reads the render projection (`_cache/agentic-queue/current-task.md`) to confirm done-condition without pulling full search results into conversation context.

**Enforcement boundary:** The `targets` field shape is JS-enforced (Zod schema). The mapping `producer_rule: source_intake_fan_in → targets.delegates.role_key: dpt-source-intake` is an MD-template-level constraint (Path A) — the queue manager validates the `targets` schema but does not infer producer_rule-to-role policy.

Filling (灌料) for wave0 SHALL follow this pattern: the Phase Agent reads `rb_plan.md` frontmatter `topic_registry` and generates one task card per topic, using `operate-queue enqueue` CLI with the fields above. All task cards SHALL be enqueued at once (one-shot fill) before entering the queue-driven execution loop.

#### Scenario: Task card derived from topic registry

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Phase Agent SHALL generate 3 task cards, each with `producer_rule: source_intake_fan_in`
- **AND** each task card's `work_id` SHALL contain the topic slug
- **AND** each task card's `required_receipts` SHALL reference `reference/{topic.slug}/source.yaml`

#### Scenario: Task card delegates Sub-agent through targets

- **WHEN** a `source_intake_fan_in` task card is claimed
- **THEN** `targets.delegates.to` SHALL be `"sub-agent"`
- **AND** `targets.delegates.role_key` SHALL be `"dpt-source-intake"`
- **AND** search/retrieval results SHALL be written to `_cache/search-results/`
- **AND** structured metadata SHALL be written to `reference/{topic.slug}/source.yaml`

#### Scenario: Phase Agent reads render projection only

- **WHEN** Sub-agent completes a source-intake task and writes result
- **THEN** Phase Agent SHALL read `_cache/agentic-queue/current-task.md` projection to confirm done-condition
- **AND** Phase Agent SHALL NOT read full search results back into conversation context

> **Enforcement gap (Path A limitation):** This constraint is MD-instruction-level only. Under Path A, there is no JS-enforced mechanism to detect or prevent the Phase Agent from reading full search results back. No metric, warning, or gate failure signals a violation. Formal verification of this constraint is deferred to Path B (stop authorization enforcement) or a future context-sustainability measurement change. Design decision D5 and the Risks section of design.md document this as a known blind spot.

### Requirement: Producer rule seed_topic_materialize

The Agentic Queue system SHALL recognize `seed_topic_materialize` as a valid `producer_rule` value. This producer rule governs the materialization of seed topic files from `topic_registry` entries during seed-topics phase.

A task card with `producer_rule: seed_topic_materialize` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"seed-topic-{topic.slug}"` |
| `title` | yes | `"Materialize seed topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent" }` |
| `action` | yes | 自然语言描述：从 topic_registry 和 rb_profile.yaml 提取信息，按 seed topic 文件结构创建 `seed_topics/{topic.slug}.md`（YAML frontmatter 含 must_answer/hypothesis/scope/search_guardrails/evidence_route） |
| `producer_rule` | yes | `"seed_topic_materialize"` |
| `priority_class` | yes | `"P3_current_gate_gap"` |
| `required_receipts` | yes | `["file:seed_topics/{topic.slug}.md"]` |
| `done_condition` | yes | `seed_topics/{topic.slug}.md` 存在，YAML frontmatter 含 id/slug/title（均非空），slug 与文件名 stem 一致，正文含研究骨架 + 原始语境约束 block |
| `writes_to` | yes | `["seed_topics/{topic.slug}.md"]` |
| `payload` | yes | `{ topic_slug: "<slug>", topic_title: "<title>" }` — 用于 Phase Agent 在 execute 阶段定位 registry 条目和生成文件 |

Seed topic materialization uses `targets: { controller: "main-agent" }` because it involves structured writing from existing registry data — no external web search is required. The `main-agent` value is the current schema wire value for direct Phase Agent execution. The Phase Agent reads `topic_registry` and `rb_profile.yaml`, fills in the YAML-frontmatter seed topic template, and writes the file.

**Enforcement boundary:** The `targets` field shape is JS-enforced (Zod schema). The mapping `producer_rule: seed_topic_materialize → targets: { controller: "main-agent" }` is an MD-template-level constraint (Path A) — the queue manager validates `targets` but does not infer producer_rule-to-controller policy.

#### Scenario: Task card for seed topic materialization

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Phase Agent SHALL generate 3 task cards, each with `producer_rule: seed_topic_materialize`
- **AND** each task card's `targets.controller` SHALL be `"main-agent"`
- **AND** each task card's `priority_class` SHALL be `P3_current_gate_gap`

#### Scenario: Seed topic file contains V12-aligned fields

- **WHEN** a `seed_topic_materialize` task is executed
- **THEN** the produced `seed_topics/<slug>.md` SHALL contain frontmatter fields: id, slug, title, must_answer, hypothesis, in_scope, out_of_scope, search_guardrails, evidence_route
- **AND** the body SHALL contain 原始语境约束 block

### Requirement: TargetSpec schema defines two-tier execution model

The Queue Manager SHALL define a Zod-validated `TargetSpec` schema. `TargetSpec` SHALL contain `controller` (required enum: `main-agent` | `engine`) and optional `delegates` (object with required `to`: enum `sub-agent`, required `role_key`: string, optional `timeout_ms`: number, default 600000). The `delegates` field SHALL be validated as a complete object when present — `to` and `role_key` are required if `delegates` exists; `timeout_ms` is optional with default.

#### Scenario: Targets without delegates for direct Phase Agent work

- **WHEN** a task requires only direct Phase Agent execution (e.g., seed topic materialization, synthesis writing)
- **THEN** `targets` SHALL be `{ controller: "main-agent" }` without `delegates`

#### Scenario: Targets with delegates for sub-agent work

- **WHEN** a task requires external search/fetch (e.g., wave0 source intake, wave1 deepening)
- **THEN** `targets` SHALL include `delegates` with `to`, `role_key`
- **AND** `timeout_ms` MAY be specified to override the default 600000

#### Scenario: Targets with engine controller

- **WHEN** a task requires deterministic engine execution only
- **THEN** `targets.controller` SHALL be `"engine"`
- **AND** `delegates` SHALL NOT be present

### Requirement: Claim advice reports delegates config for relay dispatch

When `claim()` returns a task card, the returned advice SHALL include the parsed `targets` structure. If `targets.delegates` exists, the advice SHALL explicitly indicate that a Sub-agent SHALL be spawned via relay with the specified `role_key` and `timeout_ms`. If `targets.delegates` is absent, the advice SHALL indicate direct Phase Agent execution.

#### Scenario: Claim advice signals relay dispatch needed

- **WHEN** `claim()` returns a task with `targets.delegates`
- **THEN** the advice field SHALL contain `delegates_required: true`
- **AND** the advice SHALL include `role_key` and `timeout_ms` from the task card

#### Scenario: Claim advice signals direct Phase Agent execution

- **WHEN** `claim()` returns a task with `targets: { controller: "main-agent" }` only
- **THEN** the advice field SHALL contain `delegates_required: false`

### Requirement: Shared subagent protocol defines batch execution contract

A shared node SHALL exist at `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`. This node SHALL define: (1) communication contract between the Phase Agent and Sub-agent via relay slot files (`task.md`, `result.schema.json`, `runtime-receipt.jsonl`), (2) directory structure with authority boundary — `_subagents/wave_NN/slot_MM/` for relay-managed structured output (authority: `result.json`, `_status.json`) and `_cache/waveN/slot_MM/` for intermediate Sub-agent work products (non-authority: raw WebSearch results, fetched pages, extraction drafts — reconstructable, not receipt targets), (3) batch parallel execution protocol (fill → stage → parallel spawn → collect-as-return → refill → merge), (4) concurrency control (`MAX_CONCURRENT_SUBAGENTS`, negative = unlimited), (5) parameterized interface (role_key, artifact_template, artifact_schema, backfill_tokens, search_focus) so each phase MD declares only its differences, (6) forbidden authority list for all Sub-agent roles.

#### Scenario: Protocol node is referenced by phase nodes using sub-agents

- **WHEN** a phase node uses `targets.delegates` in task cards
- **THEN** the phase node frontmatter `suggested_context` SHALL include `shared/shared-subagent-protocol.md`

#### Scenario: Protocol defines relay-based isolation, not MD convention

- **WHEN** `shared-subagent-protocol.md` is read
- **THEN** it SHALL define that sub-agents operate within relay-assigned slot directories
- **AND** Sub-agents SHALL receive only bounded context (`task.md` + `result.schema.json`)
- **AND** Phase Agent SHALL collect results via relay validation pipeline, not by reading raw Sub-agent output
