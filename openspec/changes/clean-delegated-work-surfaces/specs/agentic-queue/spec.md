> req: AGQ-001, AGQ-005, AGQ-006, AGQ-009, AGQ-013, AGQ-019, AGQ-020

## MODIFIED Requirements

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
