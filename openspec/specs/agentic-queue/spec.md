# Agentic Queue

> req: AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006, AGQ-007, AGQ-008, AGQ-009, AGQ-010, AGQ-011, AGQ-012, AGQ-013, AGQ-014, AGQ-015, AGQ-016, AGQ-017, AGQ-018, AGQ-019, AGQ-020

## Purpose

Define the JS-owned Agentic Queue Manager: a structured, Zod-validated queue v2 system with ordered `active_window`, `refill_pool`, `delegated_in_flight`, deterministic receipts, and Markdown projection. The Queue Manager owns all queue mutation; the Agent actor does semantic work but does not self-govern queue state. Queue demand identity is `queue_item_id`; `work_id` is reserved for Engine-allocated delegated work-unit attempts.
## Requirements
### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL keep deterministic queue operations for non-delegated main-agent work and queue demand maintenance. Delegated sub-agent completion SHALL NOT use `operate-queue complete`; delegated completion SHALL use `operate-work-unit submit`, which validates result/receipt/output/cache, updates work-unit state, completes the bound queue demand, and appends the ledger in one Engine transition.

#### Scenario: non-delegated queue completion remains available

- **WHEN** a queue item is assigned to main-agent work with no delegated work-unit binding
- **THEN** `operate-queue complete` SHALL remain a valid deterministic completion path
- **AND** no work-unit ledger row SHALL be required for that non-delegated queue item

#### Scenario: delegated queue completion rejects operate-queue complete

- **WHEN** a queue item is present in `delegated_in_flight`
- **THEN** `operate-queue complete` SHALL fail closed for that queue item
- **AND** the diagnostic SHALL instruct completion through `operate-work-unit submit`

### Requirement: Preemption inserts urgent work without hidden execution

Preemption SHALL operate on queue v2 locations. By default, `preempt(queue, item, { reason, unsafeCurrent })` SHALL insert urgent work at the earliest safe position in `active_window` without interrupting an already claimed delegated attempt or non-delegated current task. When the active window is full, the displaced tail queue item SHALL move to `refill_pool` with restore metadata. Replacing active in-progress work SHALL require `unsafeCurrent=true`.

#### Scenario: preempt preserves in-flight work

- **WHEN** urgent work preempts a queue with delegated work in `delegated_in_flight`
- **THEN** the in-flight work-unit binding SHALL remain unchanged
- **AND** the urgent work SHALL enter `active_window` or `refill_pool` according to preemption rules

### Requirement: Receipts fail closed and feedback is structured

The Queue Manager SHALL check deterministic receipts through `checkReceipts()` and `inspect()`. Supported receipt prefixes SHALL include `file:`, `json:`, `queue:`, `trace:`, `work_unit:`, and `none`. Unknown prefixes SHALL fail closed. Feedback SHALL be returned as check/inspect/advice-style structured data.

#### Scenario: work-unit receipt prefix is recognized

- **WHEN** a queue receipt references submitted delegated work
- **THEN** the receipt SHALL use work-unit identity and submitted ledger evidence
- **AND** unknown receipt prefixes SHALL fail closed

### Requirement: Projection is generated from queue JSON

Queue projection SHALL be generated from queue v2 JSON and SHALL include delegated in-flight counts, expired attempt diagnostics, blocked queue-front item diagnostics, and phase-drain status. Projection SHALL remain read-only derived output and SHALL NOT be authority for queue or work-unit state.

Projection, docs, and tests MAY discuss ordered `active_window` capacity, `QUEUE_ACTIVE_WINDOW_LIMIT`, the queue front, the displaced tail, insertion indexes, or a case that stages at least five queue items to prove refill/preemption/restore behavior. These positional terms SHALL remain derived from array order. They SHALL NOT be reintroduced as named queue slots such as current/next/pending/tail, and they SHALL NOT imply that five fixed slots are the production queue shape.

#### Scenario: projection avoids old slot shape

- **WHEN** current projection guidance or tests describe queue v2 state
- **THEN** they SHALL describe ordered `active_window` entries by `queue_item_id`
- **AND** they SHALL NOT present `slot_1_current`, `slot_2_next`, `slot_5_tail`, or fixed five-slot wording as the current projection contract

#### Scenario: front and tail are derived positions

- **WHEN** queue guidance refers to the front item, displaced tail, or an insertion point
- **THEN** those terms SHALL be explained as positions in the ordered `active_window` array
- **AND** they SHALL NOT be modeled as stable named fields or separate slot roles

#### Scenario: multi-item queue tests are not old slot proof

- **WHEN** a queue experiment or test stages five or more queue items to exercise refill, restore, or preemption
- **THEN** it SHALL assert array locations by `active_window[index].queue_item_id` and `refill_pool[index].queue_item_id`
- **AND** it SHALL NOT assert named slot fields or use `work_id` as queue demand identity

### Requirement: Command experiments prove queue manager mechanics

Queue Manager command experiments SHALL use current command-experiment case naming and cost/role taxonomy. Current runner-facing playbooks SHALL be named and reported as `case-<id>-<cost>-<proof-role>` or another currently accepted case surface, not as the old simple/medium/complex `test-*` taxonomy unless the old wording is being removed or explicitly mapped during this cleanup.

Each current playbook SHALL create a real disposable bundle, validate and inspect it, exercise the current engine JS API or CLI, derive verdict from trace JSONL `check` events, and clean up on success. Old queue-control playbooks that still depend on fixed slot shape SHALL be migrated to queue v2 or removed from current runner surfaces.

#### Scenario: current queue experiments use case taxonomy

- **WHEN** runner docs list queue-manager experiment cases
- **THEN** they SHALL use current case/cost proof roles
- **AND** they SHALL NOT list old simple/medium/complex `test-*` playbooks as current production proof unless those files have been migrated and renamed or explicitly mapped as current cases

### Requirement: Wave0 queue-loop simple playbook

The Wave0 queue-loop playbook SHALL verify the work-unit queue loop end-to-end on a disposable bundle. It SHALL use real framework CLIs, work-unit claim/submit for delegated source intake, gate failure diagnostics, and repair/refill through new queue demand. Verdicts SHALL be read from trace JSONL or gate outcomes, not console confidence.

#### Scenario: real search uses work-unit loop

- **WHEN** the playbook runs a real Wave0 source-intake case
- **THEN** the Phase Agent SHALL claim queue demand through `operate-work-unit claim`
- **AND** each delegated result SHALL return through `operate-work-unit submit`
- **AND** the Wave0 gate SHALL pass only after submitted ledger coverage exists

### Requirement: Seed-topics queue-loop simple playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_wfn_seedtopic/test-simple-seedtopics-queue-loop.md` that verifies the seed-topics queue-driven execution loop end-to-end on a disposable bundle.

The playbook SHALL verify:
- Bundle pre-seeded with `topic_registry` (3 topics + sufficient detail for seed topic fields) and `rb_profile.yaml`
- Phase Agent loads `phase-seed-topics.md`, executes §3.1 灌料 (enqueue 3 task cards), §3.2 执行循环 (claim → execute → complete × 3), §3.3 收尾 (run gate)
- Each produced `seed_topics/<slug>.md` contains required frontmatter fields (must_answer, hypothesis, etc.) and 原始语境约束 block
- Gate pass confirms bidirectional slug consistency
- Missing upstream info annotated as gap (not fabricated)

The playbook SHALL use local fixture data for topic_registry entries (pre-written YAML in rb_plan.md frontmatter). No web search required.

#### Scenario: Full seed-topics queue-loop

- **WHEN** the playbook pre-seeds a post-setup bundle with 3 topics in `topic_registry`（含 topic title, description 等足够信息）
- **AND** Phase Agent loads `phase-seed-topics.md` and executes §3.1 灌料
- **THEN** 3 task cards SHALL be enqueued
- **AND** Phase Agent SHALL claim → execute → complete each task
- **AND** after 3 tasks, queue SHALL be empty
- **AND** each `seed_topics/<slug>.md` SHALL contain complete required fields
- **AND** gate SHALL pass
- **AND** verdict SHALL be PASS

### Requirement: Queue state and item schema are structured

The target `rb_queue.json` schema SHALL be queue v2 with ordered `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`. Queue demand identity SHALL be `queue_item_id`. `work_id` SHALL mean only an Engine-allocated delegated execution attempt and SHALL NOT be used as queue demand identity, task-card identity, or old queue slot identity.

Current main spec Purpose SHALL describe queue v2 as an ordered active-window queue with refill and delegated in-flight binding. The accepted active-window capacity SHALL be expressed through the current queue v2 schema/constant, currently `QUEUE_ACTIVE_WINDOW_LIMIT = 20`. It SHALL NOT describe the current state model as a fixed five-slot window, named queue slots, or top-level slot/current projection.

#### Scenario: queue v2 purpose names ordered active window

- **WHEN** active main specs are synced after this change
- **THEN** `agentic-queue` Purpose SHALL describe ordered `active_window`, its current capacity semantics, `refill_pool`, delegated in-flight attempts, deterministic receipts, and Markdown projection
- **AND** it SHALL NOT describe a fixed five-slot active window as the current state model
- **AND** if it mentions capacity, it SHALL refer to the queue v2 schema/constant rather than a historical five-slot shape

#### Scenario: work_id is not queue demand identity

- **WHEN** a queue item or task-card example identifies queue demand
- **THEN** it SHALL use `queue_item_id`
- **AND** it SHALL reserve `work_id` for delegated work-unit attempts allocated by `operate-work-unit claim`

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` for Wave0 source-intake queue demand. Queue items generated by this producer rule SHALL use `queue_item_id` as demand identity, SHALL include delegated target metadata and output contracts sufficient for `operate-work-unit claim`, and SHALL route successful delegated completion through work-unit submit.

#### Scenario: source-intake queue item uses queue identity

- **WHEN** `topic_registry` contains three topics
- **THEN** the Phase Agent SHALL generate three queue demand items with distinct `queue_item_id` values
- **AND** claiming those items SHALL allocate distinct work-unit `work_id` values

#### Scenario: source-intake output is submitted

- **WHEN** a source-intake sub-agent produces the required source metadata and cache trail
- **THEN** `operate-work-unit submit` SHALL validate the output contract and cache trail before ledger append

### Requirement: Producer rule seed_topic_materialize

The Agentic Queue system SHALL recognize `seed_topic_materialize` as a valid `producer_rule` value. This producer rule governs the materialization of seed topic files from `topic_registry` entries during seed-topics phase.

A task card with `producer_rule: seed_topic_materialize` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `queue_item_id` | yes | `"seed-topic-{topic.slug}"` |
| `title` | yes | `"Materialize seed topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent" }` |
| `action` | yes | Natural-language instruction to derive seed topic fields from `topic_registry` and `rb_profile.yaml`, then create `seed_topics/{topic.slug}.md` with the required YAML frontmatter and original-context body block |
| `producer_rule` | yes | `"seed_topic_materialize"` |
| `priority_class` | yes | `"P3_current_gate_gap"` |
| `required_receipts` | yes | `["file:seed_topics/{topic.slug}.md"]` |
| `done_condition` | yes | `seed_topics/{topic.slug}.md` exists; YAML frontmatter includes non-empty `id`, `slug`, and `title`; slug matches filename stem; body contains research skeleton and original-context block |
| `writes_to` | yes | `["seed_topics/{topic.slug}.md"]` |
| `payload` | yes | `{ topic_slug: "<slug>", topic_title: "<title>" }` for Phase Agent lookup during execute |

Seed topic materialization uses `targets: { controller: "main-agent" }` because it involves structured writing from existing registry data and does not require external web search. The `main-agent` value is the current schema wire value for direct Phase Agent execution. The queue manager validates `targets`; it does not infer producer-rule-to-controller policy from this table.

Task cards with `producer_rule: seed_topic_materialize` SHALL NOT use `work_id` as a task-card field. Any delegated execution attempt created later from a queue demand SHALL receive its own Engine-allocated `work_id` through work-unit claim.

#### Scenario: seed topic materialization card uses queue identity

- **WHEN** the Phase Agent generates seed-topic materialization task cards
- **THEN** each task card SHALL include a distinct `queue_item_id`
- **AND** it SHALL NOT include `work_id` as the queue demand identifier

### Requirement: Producer rule topic_deepening

The Agentic Queue system SHALL recognize `topic_deepening` as a valid `producer_rule` value. This producer rule governs the generation of wave1 topic-specific deepening task cards.

A task card with `producer_rule: topic_deepening` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `queue_item_id` | yes | `"wave1-deepen-{topic.slug}"` |
| `title` | yes | `"Deepen topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }` |
| `action` | yes | Natural-language instruction to derive search terms from `seed_topics/{topic.slug}.md`, use WebSearch/WebFetch, write paired wave1 artifacts, declared references, and cache trails |
| `producer_rule` | yes | `"topic_deepening"` |
| `priority_class` | yes | `"P4_progressive_artifact_or_seed_backfill"` |
| `required_receipts` | yes | `["file:artifacts/wave1/{topic.slug}/evidence-summary.md", "file:artifacts/wave1/{topic.slug}/question-list.md"]` |
| `done_condition` | yes | Paired evidence-summary and question-list exist and can be validated later by the wave1 gate structure requirements |
| `writes_to` | yes | `["artifacts/wave1/{topic.slug}/evidence-summary.md", "artifacts/wave1/{topic.slug}/question-list.md", "reference/{topic.slug}-*.md"]` |
| `payload` | yes | `{ topic_slug: "<slug>", topic_title: "<title>" }` |

Task cards with `producer_rule: topic_deepening` SHALL NOT predeclare `work_id`; the Engine SHALL allocate `work_id` only when the delegated demand is claimed through `operate-work-unit claim`.

#### Scenario: topic deepening card waits for Engine work_id allocation

- **WHEN** the Phase Agent generates topic-deepening task cards
- **THEN** each task card SHALL identify demand by `queue_item_id`
- **AND** `operate-work-unit claim` SHALL allocate the delegated `work_id` later when the demand enters `delegated_in_flight`

### Requirement: Producer rule cross_topic_synthesis for wave2 synthesis task cards

The Queue Manager SHALL accept `producer_rule: cross_topic_synthesis` on task cards. This producer_rule identifies the wave2 cross-topic synthesis task: a single Phase Agent-executed task that reads all topic evidence-summary and question-list artifacts, produces a three-artifact group (`synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml`), and runs a **single-pass** finding triage + targeted search protocol per `phase-wave2.md` §3.2. Quality/convergence gaps SHALL be addressed via §3.3.2 Quality Re-Fill Loop supplementary task cards, not via an embedded multi-round loop inside the synthesis task.

Task cards with `producer_rule: cross_topic_synthesis` SHALL:
- Use `targets: { controller: "main-agent" }` without delegates.
- Have `priority_class: P2_close_open_loop`.
- Have `required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`; structure, content, reference, and token requirements SHALL be verified by the wave2 gate, not by queue receipts.
- Have `done_condition` requiring single-pass synthesis completion and all three artifacts produced.

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

The Queue Manager SHALL continue to define `targets.controller` as enum `main-agent | engine`. Delegated Sub-agent work SHALL be expressed with `targets.delegates.to: "sub-agent"` while keeping `targets.controller: "main-agent"`.

`targets.controller: "sub-agent"` SHALL NOT be introduced by this change. The queue schema SHALL reject it unless a future accepted spec explicitly changes TargetSpec.

#### Scenario: Delegated Sub-agent task keeps main-agent controller

- **WHEN** a task requires external search/fetch via Sub-agent
- **THEN** its targets SHALL be `controller: "main-agent"` plus `delegates.to: "sub-agent"`
- **AND** queue schema validation SHALL pass

#### Scenario: sub-agent controller remains invalid

- **WHEN** a task uses `targets.controller: "sub-agent"`
- **THEN** queue schema validation SHALL fail

### Requirement: Queue exposes pending task count

The queue manager SHALL export `pendingCount(queue)` for queue v2. The count SHALL include outstanding queue demand in `active_window` plus `refill_pool` and SHALL report delegated in-flight attempts separately. The count SHALL NOT treat delegated work-unit attempts as unclaimed queue demand.

#### Scenario: pending count separates in-flight attempts

- **WHEN** queue v2 has active demand, refill demand, and delegated in-flight work units
- **THEN** pending count SHALL count only unclaimed queue demand
- **AND** inspect/projection SHALL expose in-flight attempt counts separately

### Requirement: Work-unit claim moves delegated demand into in-flight state

The Agentic Queue system SHALL expose delegated queue demand through `operate-work-unit claim`, not through queue completion or any non-work-unit delegated channel. A claim SHALL allocate one Engine-owned work unit for each claimed queue demand item, move the bound `queue_item_id` into `delegated_in_flight`, and write the allocation to `_work_units/_index.json`.

#### Scenario: claim allocates delegated attempt

- **WHEN** the active queue front contains an eligible delegated queue item for Wave0
- **THEN** `operate-work-unit claim` SHALL allocate a `work_id`
- **AND** the queue item SHALL move from `active_window` to `delegated_in_flight`
- **AND** `_work_units/_index.json` SHALL contain the same `queue_item_id` and `work_id` binding

### Requirement: Delegated submit completes queue demand by work-id binding

The Agentic Queue system SHALL complete delegated queue demand only through `operate-work-unit submit`. Submit SHALL complete the bound `queue_item_id` by validating the `work_id` binding in `delegated_in_flight`; it SHALL NOT depend on queue-front aliases or return order.

#### Scenario: out-of-order submit completes correct demand

- **WHEN** three delegated work units are in flight for the same wave
- **AND** the third work unit submits before the first
- **THEN** the queue SHALL complete the `queue_item_id` bound to the submitted `work_id`
- **AND** the other in-flight queue items SHALL remain in `delegated_in_flight`

### Requirement: Phase drain includes queue demand and in-flight attempts

The Agentic Queue system SHALL report a phase as drained only when the phase has no unclaimed queue demand and no non-terminal or expired delegated in-flight attempt.

#### Scenario: expired attempt blocks drain

- **WHEN** a wave has no remaining unclaimed delegated queue items
- **AND** `delegated_in_flight` contains a claimed work unit whose `deadline_at` has passed
- **THEN** queue inspect SHALL report the phase as not drained
- **AND** the Main Agent SHALL resolve the attempt through submit, fail, timeout, or abandon before the wave gate may be run

### Requirement: Work-unit submit SHALL validate delegated cache trails

Delegated cache trail validation SHALL occur during `operate-work-unit submit`, not queue completion. Submit SHALL validate candidate `cache_trails[]` from the work-unit result against the kind-specific cache policy, filter or reject paths according to that policy, and write only verified cache trails to the submitted ledger row.

#### Scenario: valid cache leaf is ledger-written

- **WHEN** a work-unit result declares a valid leaf cache trail required by its kind
- **THEN** submit SHALL write the verified cache trail to the ledger row

#### Scenario: unsafe cache trail rejects submit

- **WHEN** a work-unit result declares a cache trail outside the bundle cache policy
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be appended

### Requirement: Work-unit submit SHALL validate declared output files

For delegated tasks, `operate-work-unit submit` SHALL validate `output_files[]` from the work-unit result. It SHALL verify each declared `path` is bundle-relative, does not escape the bundle, and exists on disk. Standard completion receipt and writes checks SHALL be consistent with the declared output files.

#### Scenario: declared output file exists

- **WHEN** a work-unit result declares `output_files: [{ path: "reference/source.md", role: "reference", source_url: "https://example.com/article" }]`
- **AND** `reference/source.md` exists in the bundle
- **THEN** output file validation SHALL pass for that entry

#### Scenario: missing declared file rejects submit

- **WHEN** a work-unit result declares `output_files: [{ path: "reference/missing.md", role: "reference", source_url: "https://example.com/article" }]`
- **AND** that file does not exist
- **THEN** `operate-work-unit submit` SHALL reject the result as non-terminal
- **AND** feedback SHALL identify the missing declared output file

### Requirement: Non-delegated queue completion SHALL skip work-unit checks

If a queue item has no delegated target and no work-unit binding, `operate-queue complete` SHALL skip delegated work-unit receipt, ledger, cache trail, and submission checks. It SHALL retain standard non-delegated receipt behavior for direct Phase Agent or engine tasks.

#### Scenario: non-delegated task skips work-unit checks

- **WHEN** a direct Phase Agent task with no delegated target calls `operate-queue complete`
- **THEN** work-unit result and runtime receipt checks SHALL be skipped
- **AND** standard completion receipt checks SHALL still run

