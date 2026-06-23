# Agentic Queue

> req: AGQ-011, AGQ-012, AGQ-013, AGQ-014

## MODIFIED Requirements

### Requirement: Queue state and item schema are structured

The Queue Manager SHALL define Zod-validated `QueueState` and `QueueItem` schemas. `QueueState` SHALL contain a five-slot active window (`slot_1_current` through `slot_5_tail`), a `refill_pool`, queue health, stop authorization state, and a trace path. `QueueItem` SHALL contain fixed executable work fields (`work_id`, `title`, `targets`, `action`, `producer_rule`, `lineage`, `priority_class`, `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`, `completion_receipt`, `failure_route`, `status`, `created_at`, `updated_at`) plus a flexible JSON `payload`. The `targets` field SHALL be a `TargetSpec` object with `controller` (enum: `main-agent` | `engine`) and optional `delegates` (object with `to`: `sub-agent`, `role_key`: string, `timeout_ms`: number). The schema SHALL reject items missing `producer_rule`, `required_receipts`, or `completion_receipt`.

#### Scenario: Valid queue item with targets.delegates passes schema

- **WHEN** a queue item has `targets: { controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }`
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Valid queue item with targets.controller only passes schema

- **WHEN** a queue item has `targets: { controller: "main-agent" }` (no delegates)
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Missing controller is rejected

- **WHEN** a queue item has `targets: { delegates: { to: "sub-agent", role_key: "dpt-source-intake" } }` without `controller`
- **THEN** validation fails

#### Scenario: Invalid delegates.to is rejected

- **WHEN** a queue item has `targets: { controller: "main-agent", delegates: { to: "chatgpt" } }`
- **THEN** validation fails (only `sub-agent` is a valid delegate target)

#### Scenario: Missing core field is rejected

- **WHEN** a queue item is missing `producer_rule`, `required_receipts`, or `completion_receipt`
- **THEN** validation fails

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` value. This producer rule governs the generation of source-intake task cards during wave0 (foundation reference collection).

A task card with `producer_rule: source_intake_fan_in` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave0-source-{topic.slug}"` |
| `title` | yes | `"Source intake: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-source-intake", timeout_ms: 600000 } }` |
| `action` | yes | 自然语言描述：搜索 topic、找到可信来源、获取页面、提取 url/title/retrieved_date/topic_tag、写入 `reference/{topic.slug}/source.yaml`（满足 ReferenceMetadata schema） |
| `producer_rule` | yes | `"source_intake_fan_in"` |
| `priority_class` | yes | `"P5_new_reference_intake"` |
| `required_receipts` | yes | `["file:reference/{topic.slug}/source.yaml"]` |
| `done_condition` | yes | `"reference/{topic.slug}/source.yaml` 存在且通过 `ReferenceMetadata` schema 校验" |
| `verification.engine` | yes | `["receipt_check"]` |
| `writes_to` | yes | `["reference/{topic.slug}/source.yaml"]` |

The task card template in `phase-wave0.md` §3.1 SHALL set `targets.delegates` with `role_key: dpt-source-intake`. The sub-agent executes the search within its relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`); directory isolation is enforced by the relay slot contract, not by a path in the task card. After sub-agent completion, main-agent collects the structured result via relay (`ingestAgentReceipt` + `commitSlotResult`), verifies the artifact receipt, and completes the queue task.

**Enforcement boundary:** The `targets` field is JS-enforced (Zod schema). The mapping `producer_rule: source_intake_fan_in → targets.delegates.role_key: dpt-source-intake` is an MD-template-level constraint (Path A).

#### Scenario: Task card derived from topic registry

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Agent SHALL generate 3 task cards, each with `producer_rule: source_intake_fan_in`
- **AND** each task card's `work_id` SHALL contain the topic slug
- **AND** each task card's `required_receipts` SHALL reference `reference/{topic.slug}/source.yaml`

#### Scenario: Task card dispatches sub-agent via relay

- **WHEN** a `source_intake_fan_in` task card is dispatched
- **THEN** `targets.delegates.to` SHALL be `"sub-agent"`
- **AND** `targets.delegates.role_key` SHALL be `"dpt-source-intake"`
- **AND** the sub-agent SHALL execute in its relay slot directory (`_subagents/wave_NN/slot_MM/`)
- **AND** structured metadata SHALL be written to `reference/{topic.slug}/source.yaml`

#### Scenario: Main-agent collects via relay, not by reading raw output

- **WHEN** sub-agent completes a source-intake task and returns JSON
- **THEN** main-agent SHALL call `ingestAgentReceipt()` + `commitSlotResult()` to validate and collect
- **AND** main-agent SHALL verify `done_condition` via the artifact receipt file
- **AND** main-agent's context SHALL NOT contain sub-agent's raw search trail

### Requirement: Producer rule seed_topic_materialize

The Agentic Queue system SHALL recognize `seed_topic_materialize` as a valid `producer_rule` value. This producer rule governs the materialization of seed topic files from `topic_registry` entries during seed-topics phase.

A task card with `producer_rule: seed_topic_materialize` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"seed-topic-{topic.slug}"` |
| `title` | yes | `"Materialize seed topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent" }` — no delegates (pure structured writing) |
| `action` | yes | 自然语言描述：从 topic_registry 和 rb_profile.yaml 提取信息，按 seed topic 文件结构创建 `seed_topics/{topic.slug}.md` |
| `producer_rule` | yes | `"seed_topic_materialize"` |
| `priority_class` | yes | `"P3_current_gate_gap"` |
| `required_receipts` | yes | `["file:seed_topics/{topic.slug}.md"]` |
| `done_condition` | yes | `seed_topics/{topic.slug}.md` 存在，YAML frontmatter 含 id/slug/title（均非空） |
| `writes_to` | yes | `["seed_topics/{topic.slug}.md"]` |
| `payload` | yes | `{ topic_slug: "<slug>", topic_title: "<title>" }` |

Seed topic materialization uses `targets: { controller: "main-agent" }` without delegates because it involves structured writing from existing registry data — no external web search is required.

#### Scenario: Task card for seed topic materialization

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Agent SHALL generate 3 task cards, each with `producer_rule: seed_topic_materialize`
- **AND** each task card's `targets.controller` SHALL be `main-agent`
- **AND** each task card's `targets` SHALL NOT have `delegates`

## ADDED Requirements

### Requirement: Producer rule topic_deepening

The Agentic Queue system SHALL recognize `topic_deepening` as a valid `producer_rule` value. This producer rule governs the generation of wave1 topic-specific deepening task cards.

A task card with `producer_rule: topic_deepening` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave1-deepen-{topic.slug}"` |
| `title` | yes | `"Deepen topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }` |
| `action` | yes | 自然语言描述：从 `seed_topics/{topic.slug}.md` 的 search_guardrails 和 open questions 派生搜索关键词。使用 WebSearch 找到 topic-specific 深度证据，使用 WebFetch 获取每个来源的页面内容。提取关键发现、趋势、难点，写入 `artifacts/wave1/{topic.slug}/evidence-summary.md` |
| `producer_rule` | yes | `"topic_deepening"` |
| `priority_class` | yes | `"P4_progressive_artifact_or_seed_backfill"` |
| `required_receipts` | yes | `["file:artifacts/wave1/{topic.slug}/evidence-summary.md"]` |
| `done_condition` | yes | `artifacts/wave1/{topic.slug}/evidence-summary.md` 存在，含至少 1 条 source URL 和 key findings |
| `writes_to` | yes | `["artifacts/wave1/{topic.slug}/evidence-summary.md"]` |
| `payload` | yes | `{ topic_slug: "<slug>", topic_title: "<title>" }` |

**Enforcement boundary:** The `targets` field is JS-enforced (Zod schema). The mapping `producer_rule: topic_deepening → targets.delegates.role_key: dpt-evidence-extractor` is an MD-template-level constraint (Path A).

#### Scenario: Task card for topic deepening

- **WHEN** `topic_registry` contains 3 topics in wave1 phase
- **THEN** Agent SHALL generate 3 task cards, each with `producer_rule: topic_deepening`
- **AND** each task card's `targets.delegates.role_key` SHALL be `dpt-evidence-extractor`
- **AND** each task card's `priority_class` SHALL be `P4_progressive_artifact_or_seed_backfill`

### Requirement: TargetSpec schema defines two-tier execution model

The Queue Manager SHALL define a Zod-validated `TargetSpec` schema. `TargetSpec` SHALL contain `controller` (required enum: `main-agent` | `engine`) and optional `delegates` (object with required `to`: enum `sub-agent`, required `role_key`: string, optional `timeout_ms`: number, default 600000). The `delegates` field SHALL be validated as a complete object when present — `to` and `role_key` are required if `delegates` exists; `timeout_ms` is optional with default.

#### Scenario: Targets without delegates for main-agent-only work

- **WHEN** a task requires only main-agent execution (e.g., seed topic materialization, synthesis writing)
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

When `claim()` returns a task card, the returned advice SHALL include the parsed `targets` structure. If `targets.delegates` exists, the advice SHALL explicitly indicate that a sub-agent SHALL be spawned via relay with the specified `role_key` and `timeout_ms`. If `targets.delegates` is absent, the advice SHALL indicate main-agent direct execution.

#### Scenario: Claim advice signals relay dispatch needed

- **WHEN** `claim()` returns a task with `targets.delegates`
- **THEN** the advice field SHALL contain `delegates_required: true`
- **AND** the advice SHALL include `role_key` and `timeout_ms` from the task card

#### Scenario: Claim advice signals direct main-agent execution

- **WHEN** `claim()` returns a task with `targets: { controller: "main-agent" }` only
- **THEN** the advice field SHALL contain `delegates_required: false`

### Requirement: Shared subagent protocol defines batch execution contract

A shared node SHALL exist at `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`. This node SHALL define: (1) communication contract between main-agent and sub-agent via relay slot files (`task.md`, `result.schema.json`, `runtime-receipt.jsonl`), (2) directory structure with authority boundary — `_subagents/wave_NN/slot_MM/` for relay-managed structured output (authority: `result.json`, `_status.json`) and `_cache/waveN/slot_MM/` for intermediate sub-agent work products (non-authority: raw WebSearch results, fetched pages, extraction drafts — reconstructable, not receipt targets), (3) batch parallel execution protocol (fill → stage → parallel spawn → collect-as-return → refill → merge), (4) concurrency control (`MAX_CONCURRENT_SUBAGENTS`, negative = unlimited), (5) parameterized interface (role_key, artifact_template, artifact_schema, backfill_tokens, search_focus) so each phase MD declares only its differences, (6) forbidden authority list for all sub-agent roles.

#### Scenario: Protocol node is referenced by phase nodes using sub-agents

- **WHEN** a phase node uses `targets.delegates` in task cards
- **THEN** the phase node frontmatter `suggested_context` SHALL include `shared/shared-subagent-protocol.md`

#### Scenario: Protocol defines relay-based isolation, not MD convention

- **WHEN** `shared-subagent-protocol.md` is read
- **THEN** it SHALL define that sub-agents operate within relay-assigned slot directories
- **AND** sub-agents SHALL receive only bounded context (`task.md` + `result.schema.json`)
- **AND** main-agent SHALL collect results via relay validation pipeline, not by reading raw sub-agent output
