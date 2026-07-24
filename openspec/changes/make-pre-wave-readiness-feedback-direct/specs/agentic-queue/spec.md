> req: AGQ-002, AGQ-009

## MODIFIED Requirements

### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL keep deterministic queue operations for non-delegated main-agent work and queue demand maintenance. Delegated sub-agent completion SHALL NOT use `operate-queue complete`; delegated completion SHALL use `operate-work-unit submit`, which validates result/receipt/output/cache, updates work-unit state, completes the bound queue demand, and appends the ledger in one Engine transition.

For a non-delegated current card with `producer_rule: seed_topic_materialize`, `operate-queue complete` SHALL, after its existing receipt check and before any terminal queue mutation, admit exactly one card declaration before it runs the shared deterministic seed authoring evaluator: `writes_to` SHALL contain exactly one path; `required_receipts` SHALL contain exactly one matching `file:` entry; `completion_receipt` SHALL be that same `file:` entry; all three SHALL name the same relative `seed_topics/<payload.topic_slug>.md`; and `payload.topic_slug` SHALL resolve to exactly one current canonical Topic with that expected seed path. The adapter SHALL reject a nonconforming declaration without scanning a directory, guessing a path, or reconstructing a task. That rejection SHALL return `repair_kind: missing_contract`, name the declaration/canonical-owner boundary in `missing_fact` and `write_to`, name the same completion checkpoint in `rerun`, and SHALL NOT invite manual queue mutation. For an admitted declaration, the evaluator boundary SHALL parse the declared seed bytes and validate only the accepted deterministic authoring facts: parseable frontmatter plus current UID/id/slug/title/must-answer/scope/dependency binding and filename/path consistency. It SHALL NOT interpret the card's general `done_condition`, judge semantic/body quality, or become a generic Markdown/YAML linter.

On an admitted declaration's seed authoring check failure, `operate-queue complete` SHALL return structured direct feedback for the declared repair surface and same completion command: `repair_kind: agent_action`, `missing_fact` naming the deterministic parse/binding failure, `write_to` naming the declared seed path and applicable coordinate, and `rerun` naming the same `operate-queue complete` checkpoint. Every declaration-admission or authoring failure SHALL leave the current card non-terminal and preserve queue authority bytes: it SHALL NOT promote, refill, render a new projection, append `queue_completed`, save a touched queue state, or perform legacy `bundle_name` normalization before returning the failure. Ordinary attempt/receipt diagnostics MAY be emitted, but SHALL NOT represent terminal completion. The final `seed-topics-ready` Gate SHALL reuse the same pure evaluator for each already enumerated seed while retaining its phase-wide registry, queue-drain, trace, routing, and verdict responsibilities. Other non-delegated producer rules SHALL retain the existing receipt-completion behavior unless an accepted requirement independently changes them.

When non-delegated `operate-queue claim` encounters a delegated item at the active-window front, it SHALL reject without moving or completing that demand. The result SHALL distinguish this blocker from an empty active window by returning a stable root reason, the blocked `queue_item_id`, and contract-lineage coordinates: `repair_kind: engine_operation`, `missing_fact` naming the delegated-owner mismatch, `write_to` naming the role-bound observation/claim input owned by `operate-work-unit`, and `rerun` naming the exact `operate-work-unit claim` checkpoint. A genuinely empty active window SHALL return a different root reason. These fields SHALL be read-only feedback projections and SHALL NOT create route, permission, or persisted queue state.

#### Scenario: non-delegated queue completion remains available

- **WHEN** a queue item is assigned to main-agent work with no delegated work-unit binding
- **THEN** `operate-queue complete` SHALL remain a valid deterministic completion path
- **AND** no work-unit ledger row SHALL be required for that non-delegated queue item

#### Scenario: malformed declared seed cannot terminalize its queue card

- **WHEN** the current non-delegated card has `producer_rule: seed_topic_materialize`, its file receipt exists, and its declared seed bytes fail parse or current deterministic binding
- **THEN** `operate-queue complete` SHALL return the local repair fact and same-command rerun
- **AND** its `repair_kind`, `missing_fact`, `write_to`, and `rerun` SHALL identify only the declared seed repair and same completion checkpoint
- **AND** its active card, terminal history, refill pool, and queue authority bytes (including absent legacy `bundle_name`) SHALL remain unchanged
- **AND** it SHALL NOT append `queue_completed` or create a second success path; non-terminal attempt/receipt diagnostics do not constitute completion

#### Scenario: ambiguous seed producer declaration has no guessed repair

- **WHEN** a `seed_topic_materialize` card has multiple or mismatched `writes_to` / `required_receipts` / `completion_receipt` paths, or its `payload.topic_slug` cannot resolve to one current canonical Topic with the expected seed path
- **THEN** `operate-queue complete` SHALL fail before authoring evaluation with `repair_kind: missing_contract`
- **AND** its feedback SHALL name the declaration/canonical-owner boundary and same completion checkpoint, without naming a file for the Agent to repair
- **AND** its queue authority bytes and terminal history SHALL remain unchanged

#### Scenario: repaired declared seed completes through the same queue operation

- **WHEN** the Agent repairs only the declared seed file so that the shared evaluator passes
- **THEN** rerunning the same `operate-queue complete` command SHALL terminalize that current card through the existing promotion/refill path
- **AND** the final seed-topics Gate SHALL consume the same evaluator rather than a duplicate parser

#### Scenario: delegated queue completion rejects operate-queue complete

- **WHEN** a queue item is present in `delegated_in_flight`
- **THEN** `operate-queue complete` SHALL fail closed for that queue item
- **AND** the diagnostic SHALL instruct completion through `operate-work-unit submit`

#### Scenario: Delegated queue claim rejection is not reported as empty queue

- **WHEN** the active-window front contains a queued item whose target delegates to a sub-agent
- **AND** the caller invokes non-delegated `operate-queue claim`
- **THEN** claim SHALL return `item: null` and `reason_code: delegated_requires_work_unit_claim`
- **AND** it SHALL name the blocked `queue_item_id`, the delegated ownership fact, the actor-observation input surface, and one exact `operate-work-unit claim` rerun
- **AND** queue authority bytes SHALL remain unchanged

#### Scenario: Empty active window has a distinct reason

- **WHEN** `operate-queue claim` runs with no active-window item
- **THEN** the result SHALL use an empty-window reason distinct from delegated rejection
- **AND** it SHALL NOT imply that an existing delegated item disappeared

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

The card's exact one-item `writes_to` seed path, matching one-item `required_receipts` / `completion_receipt` `file:` declaration, and canonical Topic binding resolved by `payload.topic_slug` SHALL be the only completion-evaluator inputs derived from the card. The file receipt remains an existence precondition; it does not by itself prove parseable or canonically bound authoring. The evaluator SHALL validate the deterministic identity/binding facts named by AGQ-002, but the card's semantic body/research quality remains Agent-owned and the phase-final Gate retains its broader phase verdict. This producer rule SHALL NOT cause generic completion validation for other cards.

Task cards with `producer_rule: seed_topic_materialize` SHALL NOT use `work_id` as a task-card field. Any delegated execution attempt created later from a queue demand SHALL receive its own Engine-allocated `work_id` through work-unit claim.

#### Scenario: seed topic materialization card uses queue identity

- **WHEN** the Phase Agent generates seed-topic materialization task cards
- **THEN** each task card SHALL include a distinct `queue_item_id`
- **AND** it SHALL NOT include `work_id` as the queue demand identifier

#### Scenario: file receipt alone cannot prove seed authoring completion

- **WHEN** a `seed_topic_materialize` card declares an existing `seed_topics/<slug>.md` receipt but that exact file has malformed frontmatter or disagrees with the current canonical Topic binding
- **THEN** AGQ-002 SHALL reject terminal completion before queue mutation
- **AND** the Agent SHALL repair only the declared file and rerun the same completion command
