# Agentic Queue

> req: AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006, AGQ-007, AGQ-008, AGQ-009, AGQ-010, AGQ-011, AGQ-012, AGQ-013, AGQ-014, AGQ-015, AGQ-016

## Purpose

Define the JS-owned Agentic Queue Manager: a structured, Zod-validated queue system with a five-slot active window, refill pool, deterministic receipts, and Markdown projection. The Queue Manager owns all queue mutation; the Agent actor does semantic work but does not self-govern queue state. This capability replaces the V12 Markdown-governed queue pattern with machine-enforced scheduling, receipt checking, promotion, preemption, and trace.

## Requirements

### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL expose JS APIs for `enqueue`, `claim`, `complete`, and `fail`. `enqueue` SHALL fill open active slots before using `refill_pool`. `claim` SHALL only expose `slot_1_current`. `complete` SHALL verify completion receipts before promotion. `fail` SHALL record failure and create repair/refill work instead of authorizing chat progress.

#### Scenario: Enqueue fills active window before refill pool

- **WHEN** six valid items are enqueued into an empty queue
- **THEN** five items occupy active window slots and the sixth is stored in `refill_pool`

#### Scenario: Claim returns current slot only

- **WHEN** `claim(queue, { actor })` is called
- **THEN** it returns `slot_1_current` and does not expose pending slots as executable work

#### Scenario: Complete promotes next work

- **WHEN** `complete()` succeeds for `slot_1_current`
- **THEN** slot 2 promotes to slot 1 and the tail refills from the highest-priority pool item when available

#### Scenario: Failure creates repair work

- **WHEN** `fail()` is called with a structured failure
- **THEN** the queue records failure trace data and adds concrete repair work to the active window or refill pool

### Requirement: Preemption inserts urgent work without hidden execution

The Queue Manager SHALL expose `preempt(queue, item, { reason, unsafeCurrent })`. By default, preemption SHALL insert urgent work into the earliest pending slot and SHALL NOT interrupt `slot_1_current`. When the active window is full, displaced `slot_5_tail` SHALL move to the top of `refill_pool` with restore metadata. Replacing `slot_1_current` SHALL require `unsafeCurrent=true`.

#### Scenario: Preempt inserts into pending slot

- **WHEN** urgent work preempts a queue with current and pending work
- **THEN** the urgent item is inserted into the earliest pending slot and current work remains unchanged

#### Scenario: Full window displacement is preserved

- **WHEN** urgent work preempts a full active window
- **THEN** the previous `slot_5_tail` appears in `refill_pool` with `preempted_from_slot=slot_5_tail` and `restore_priority=next_tail_opening`

#### Scenario: Current slot replacement requires unsafe flag

- **WHEN** `preempt()` is asked to replace current work without `unsafeCurrent=true`
- **THEN** it rejects the operation

### Requirement: Receipts fail closed and feedback is structured

The Queue Manager SHALL check deterministic receipts through `checkReceipts()` and `inspect()`. Supported receipt prefixes SHALL include `file:`, `json:`, `queue:`, `slot:`, `trace:`, and `none`. Unknown prefixes SHALL fail closed. Feedback SHALL be returned as check/inspect/advice-style structured data.

#### Scenario: Unknown receipt prefix fails

- **WHEN** a queue item contains `chat:trust_me` as a receipt
- **THEN** receipt validation fails and reports the unsupported prefix

#### Scenario: Missing completion receipt blocks promotion

- **WHEN** `complete()` is called but the item completion receipt is missing
- **THEN** the current item is not promoted and feedback explains the missing receipt

### Requirement: Projection is generated from queue JSON

The Queue Manager SHALL render an Agent-readable Markdown task card/window from JSON queue state via `render()`. The projection SHALL describe current work, pending previews, receipts, writes, and failure route. The projection SHALL NOT be a mutation input or machine authority.

#### Scenario: Render projection writes Markdown

- **WHEN** `render(queue, bundleDir)` is called
- **THEN** a Markdown projection file is written at the queue projection path

#### Scenario: Projection drift cannot mutate state

- **WHEN** the projection file is edited manually
- **THEN** Queue Manager decisions still use JSON queue state and ignore projection content as authority

### Requirement: Command experiments prove queue manager mechanics

The Queue Manager engine SHALL include simple, medium, and complex experiment playbooks under `experiments_playbook/exp_agentic-queue/`. Each playbook SHALL create a real disposable bundle, validate and inspect it, exercise the engine JS API or CLI, derive verdict from trace JSONL `check` events, and clean up on success.

#### Scenario: Simple playbook proves enqueue claim complete promotion

- **WHEN** `test-simple.md` is executed
- **THEN** it proves enqueue, claim, complete, promotion, projection, and trace verdict

#### Scenario: Medium playbook proves preemption and restore

- **WHEN** `test-medium.md` is executed
- **THEN** it proves full-window preemption, displaced tail restore metadata, refill, and trace verdict

#### Scenario: Complex playbook proves fail-closed behavior

- **WHEN** `test-complex.md` is executed
- **THEN** it proves invalid task rejection, missing receipt blocking, unsafe-current guard, and empty queue after refill/blocker handling without fake pass evidence

### Requirement: Wave0 queue-loop simple playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_wfn_wave0/test-simple-wave0-queue-loop.md` that verifies the wave0 queue-driven execution loop end-to-end on a disposable bundle.

The playbook SHALL cover three scenarios, with distinct data strategies:

- **Scenario 1 — Real search (1 topic):** Uses real WebSearch + WebFetch to verify the queue-loop + search integration works end-to-end. Single topic to control real-search cost and non-determinism.
- **Scenario 2 — Gate fail (3 topics, local fixture):** Pre-seeded bundle with 3 topics but only 2 source.yaml files produced — verifies gate correctly identifies the missing topic via `count_floor` rule.
- **Scenario 3 — Repair (continues from S2 state, local fixture):** Creates the missing source.yaml → reruns gate → verifies repair loop in queue-driven context.

The playbook SHALL use a disposable bundle (`dpt_disp_*`), import real framework CLIs (`operate-queue.mjs`, `check-gate-wave0-complete.mjs`), and read verdict from trace JSONL.

#### Scenario: Real search — full queue-loop from filling to gate pass

- **WHEN** the playbook pre-seeds a post-seed-topics bundle with 1 topic in `topic_registry`（topic slug 和 label 指向一个具体、可搜索的真实话题——如 "Claude Code CLI tool Anthropic"）
- **AND** Phase Agent loads `phase-wave0.md` and executes §3.1 灌料：创建 task card JSON → `operate-queue enqueue`
- **THEN** 1 task card SHALL be enqueued with `producer_rule: source_intake_fan_in`, `targets.delegates.to: "sub-agent"`, `priority_class: P5_new_reference_intake`
- **AND** Phase Agent SHALL `operate-queue claim --actor main-agent` → 获取 task card（`main-agent` 是当前 CLI actor wire value）
- **AND** Phase Agent SHALL delegate Sub-agent search：使用 **真实 WebSearch + WebFetch** 工具搜索该 topic 的 foundation reference，找到至少 1 条可信来源
- **AND** Sub-agent SHALL 产出 `reference/<topic>/source.yaml`，每项 reference 的 `url` 指向真实可访问页面、`title` 反映实际页面标题、`retrieved_date` 为 YYYY-MM-DD、`topic_tag` 匹配 topic slug
- **AND** search/retrieval 中间结果 SHALL 写入 `_cache/search-results/`
- **AND** Phase Agent SHALL 创建 result JSON → `operate-queue complete --result <result.json>` → receipt check PASS
- **AND** Phase Agent SHALL 读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition
- **AND** claim 返回 `item: null` → queue 空
- **AND** Phase Agent SHALL 更新 `reference/index.md` → 跑 gate
- **AND** gate SHALL pass（exit code 0）— `file_exists` rule 找到 source.yaml、`schema_valid` rule 通过 ReferenceMetadata 校验
- **AND** trace SHALL 含 `queue_enqueued`, `queue_claimed`, `receipt_checked`, `queue_completed`, `gate_attempt(passed: true)` events
- **AND** verdict SHALL be PASS — 验证了 queue-loop + 真实搜索集成的闭环

#### Scenario: Gate fail identifies missing topic

- **WHEN** the playbook pre-seeds a bundle with 3 topics but only 2 source.yaml files after execution
- **AND** Phase Agent runs gate
- **THEN** gate SHALL fail (exit code 1) — `count_floor` rule reports missing reference
- **AND** inspect SHALL reference the missing topic by key
- **AND** verdict SHALL be FAIL (gate fail is expected behavior for this negative case)

#### Scenario: Repair after gate fail closes the loop

- **WHEN** the playbook continues from the gate-fail state (3 topics, 2 source.yaml, inspect points to missing topic)
- **AND** Phase Agent creates the missing `reference/<topic>/source.yaml` for the reported topic
- **AND** reruns gate
- **THEN** gate SHALL pass (exit code 0)
- **AND** trace SHALL contain two `gate_attempt` events: first with `passed: false`, second with `passed: true`
- **AND** verdict SHALL be PASS — confirming the repair loop works in queue-driven wave0 context

### Requirement: Seed-topics queue-loop simple playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_wfn_seedtopic/test-simple-seedtopics-queue-loop.md` that verifies the seed-topics queue-driven execution loop end-to-end on a disposable bundle.

The playbook SHALL verify:
- Bundle pre-seeded with `topic_registry` (3 topics + sufficient detail for seed topic fields) and `rb_profile.yaml`
- Phase Agent loads `phase-seed-topics.md`, executes §3.1 灌料 (enqueue 3 task cards), §3.2 执行循环 (claim → execute → complete × 3), §3.3 收尾 (run gate)
- Each produced `seed_topics/<slug>.md` contains V12-aligned frontmatter (must_answer, hypothesis, etc.) and 原始语境约束 block
- Gate pass confirms bidirectional slug consistency
- Missing upstream info annotated as gap (not fabricated)

The playbook SHALL use local fixture data for topic_registry entries (pre-written YAML in rb_plan.md frontmatter). No web search required.

#### Scenario: Full seed-topics queue-loop

- **WHEN** the playbook pre-seeds a post-setup bundle with 3 topics in `topic_registry`（含 topic title, description 等足够信息）
- **AND** Phase Agent loads `phase-seed-topics.md` and executes §3.1 灌料
- **THEN** 3 task cards SHALL be enqueued
- **AND** Phase Agent SHALL claim → execute → complete each task
- **AND** after 3 tasks, queue SHALL be empty
- **AND** each `seed_topics/<slug>.md` SHALL contain complete V12-aligned fields
- **AND** gate SHALL pass
- **AND** verdict SHALL be PASS

### Requirement: Queue state and item schema are structured

The Queue Manager SHALL define Zod-validated `QueueState` and `QueueItem` schemas. `QueueState` SHALL contain a five-slot active window (`slot_1_current` through `slot_5_tail`), a `refill_pool`, queue health, stop authorization state, and a trace path. `QueueItem` SHALL contain fixed executable work fields (`work_id`, `title`, `targets`, `action`, `producer_rule`, `lineage`, `priority_class`, `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`, `completion_receipt`, `failure_route`, `status`, `created_at`, `updated_at`) plus a flexible JSON `payload`. The `targets` field SHALL be a `TargetSpec` object with `controller` (enum: `main-agent` | `engine`) and optional `delegates` (object with `to`: `sub-agent`, `role_key`: string, `timeout_ms`: number). The schema SHALL reject items missing `producer_rule`, `required_receipts`, or `completion_receipt`.

#### Scenario: Valid queue item passes schema

- **WHEN** a queue item has all fixed core fields and `payload` is an object
- **THEN** `QueueItemSchema.safeParse()` succeeds

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
| `writes_to` | yes | `["reference/{topic.slug}/source.yaml", "_cache/search-results/"]` |

The task card template in `phase-wave0.md` §3.1 SHALL set `targets.delegates` with `to: "sub-agent"` and `role_key: "dpt-source-intake"`. The `targets.controller` value `"main-agent"` is the current schema wire value for Phase Agent workflow authority, not the preferred conceptual role name. The Sub-agent executes the search within its relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`); directory isolation is enforced by the relay slot contract, not by a path in the task card. After Sub-agent completion, Phase Agent collects the structured result via relay (`ingestAgentReceipt` + `commitSlotResult`), verifies the artifact receipt, and completes the queue task.

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
- **THEN** Phase Agent SHALL generate 3 task cards, each with `producer_rule: topic_deepening`
- **AND** each task card's `targets.delegates.role_key` SHALL be `dpt-evidence-extractor`
- **AND** each task card's `priority_class` SHALL be `P4_progressive_artifact_or_seed_backfill`

### Requirement: Producer rule cross_topic_synthesis for wave2 synthesis task cards

The Queue Manager SHALL accept `producer_rule: cross_topic_synthesis` on task cards. This producer_rule identifies the wave2 cross-topic synthesis task: a single Phase Agent-executed task that reads all topic evidence-summary and question-list artifacts, produces a three-artifact group (`synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml`), and contains an embedded iterative finding triage + targeted search loop.

Task cards with `producer_rule: cross_topic_synthesis` SHALL:
- Use `targets: { controller: "main-agent" }` without delegates. `main-agent` is the current schema wire value for Phase Agent execution, not the preferred conceptual role name.
- Have `priority_class: P2_close_open_loop`.
- Have `required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`; structure, content, reference, and token requirements SHALL be verified by the wave2 gate, not by queue receipts.
- Have `done_condition` requiring synthesis completion, finding triage loop convergence, and all three artifacts produced.

#### Scenario: Synthesis task card validates with cross_topic_synthesis producer rule

- **WHEN** a queue item has `producer_rule: cross_topic_synthesis`, `targets: { controller: "main-agent" }`, `priority_class: P2_close_open_loop`, and supported `file:` receipts
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Synthesis task card completes with three-artifact file receipts

- **WHEN** `complete()` is called for a synthesis task
- **THEN** receipt check SHALL verify `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, and `artifacts/wave2/finding-index.yaml` all exist
- **AND** receipt failure SHALL block promotion and generate repair work
- **AND** non-empty content, structure, references, and backfill token absence SHALL be verified later by `gate-wave2-complete`

### Requirement: Producer rule seed_topic_backfill_wave2 for wave2 per-topic backfill task cards

The Queue Manager SHALL accept `producer_rule: seed_topic_backfill_wave2` on task cards. This producer_rule identifies wave2 per-topic backfill tasks: Phase Agent-executed tasks that replace `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` tokens in seed topic files with content projected from the Wave2 ledger/index, not directly copied from `synthesis.md` narrative.

Task cards with `producer_rule: seed_topic_backfill_wave2` SHALL:
- Use `targets: { controller: "main-agent" }` without delegates. `main-agent` is the current schema wire value for Phase Agent execution.
- Have `priority_class: P4_progressive_artifact_or_seed_backfill`.
- Have `required_receipts` limited to current queue-engine supported prefixes, for example `file:seed_topics/{topic}.md`.
- Have `done_condition` requiring both tokens to be replaced with content projected from ledger/index while preserving `source_layer: wave2_cross_topic`, finding id, decision, and status.
- Rely on the wave2 gate's `pattern_match` checks to deterministically verify that stale token literals are absent.

#### Scenario: Backfill task card validates with seed_topic_backfill_wave2 producer rule

- **WHEN** a queue item has `producer_rule: seed_topic_backfill_wave2`, `targets: { controller: "main-agent" }`, `priority_class: P4_progressive_artifact_or_seed_backfill`, and supported receipts
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Backfill task completion leaves token checks to gate

- **WHEN** `complete()` is called for a backfill task
- **THEN** receipt check SHALL verify only the supported receipt prefixes declared on the task card
- **AND** token replacement SHALL be verified by the wave2 gate before phase completion

### Requirement: TargetSpec schema defines two-tier execution model

The Queue Manager SHALL define a Zod-validated `TargetSpec` schema. `TargetSpec` SHALL contain `controller` (required enum: `main-agent` | `engine`) and optional `delegates` (object with required `to`: enum `sub-agent`, required `role_key`: string, optional `timeout_ms`: number, default 600000). The `delegates` field SHALL be validated as a complete object when present — `to` and `role_key` are required if `delegates` exists; `timeout_ms` is optional with default.

#### Scenario: Targets without delegates for direct Phase Agent work

- **WHEN** a task requires only direct Phase Agent execution (e.g., seed topic materialization, synthesis writing)
- **THEN** `targets` SHALL be `{ controller: "main-agent" }` without `delegates`

#### Scenario: Targets with delegates for Sub-agent work

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
- **THEN** it SHALL define that Sub-agents operate within relay-assigned slot directories
- **AND** Sub-agents SHALL receive only bounded context (`task.md` + `result.schema.json`)
- **AND** Phase Agent SHALL collect results via relay validation pipeline, not by reading raw Sub-agent output
