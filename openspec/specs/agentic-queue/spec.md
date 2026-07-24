# Agentic Queue

> req: AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006, AGQ-007, AGQ-008, AGQ-009, AGQ-010, AGQ-011, AGQ-012, AGQ-013, AGQ-014, AGQ-015, AGQ-016, AGQ-017, AGQ-018, AGQ-019, AGQ-020, AGQ-021, AGQ-022, AGQ-023, AGQ-024, AGQ-025

> delta-synced: add-audited-late-accept-for-timed-out-work-units (AGQ-018, AGQ-019)

## Purpose

Define the JS-owned Agentic Queue Manager: a structured, Zod-validated queue v2 system with ordered `active_window`, `refill_pool`, `delegated_in_flight`, deterministic receipts, and Markdown projection. The Queue Manager owns all queue mutation; the Agent actor does semantic work but does not self-govern queue state. Queue demand identity is `queue_item_id`; `work_id` is reserved for Engine-allocated delegated work-unit attempts.
## Requirements
### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL keep deterministic queue operations for non-delegated main-agent work and queue demand maintenance. Delegated sub-agent completion SHALL NOT use `operate-queue complete`; delegated completion SHALL use `operate-work-unit submit`, which validates result/receipt/output/cache, updates work-unit state, completes the bound queue demand, and appends the ledger in one Engine transition.

For a non-delegated current card with `producer_rule: seed_topic_materialize`, `operate-queue complete` SHALL, after its existing receipt check and before any terminal queue mutation, admit exactly one card declaration before it runs the shared deterministic seed authoring evaluator: `writes_to` SHALL contain exactly one path; `required_receipts` SHALL contain exactly one matching `file:` entry; `completion_receipt` SHALL be that same `file:` entry; all three SHALL name the same relative `seed_topics/<payload.topic_slug>.md`; and `payload.topic_slug` SHALL resolve to exactly one current canonical Topic with that expected seed path. The adapter SHALL reject a nonconforming declaration without scanning a directory, guessing a path, or reconstructing a task. That rejection SHALL return `repair_kind: missing_contract`, name the declaration/canonical-owner boundary in `missing_fact` and `write_to`, name the same completion checkpoint in `rerun`, and SHALL NOT invite manual queue mutation. For an admitted declaration, the evaluator boundary SHALL parse the declared seed bytes and validate only the accepted deterministic authoring facts: parseable frontmatter plus current UID/id/slug/title/must-answer/scope/dependency binding and filename/path consistency. It SHALL NOT interpret the card's general `done_condition`, judge semantic/body quality, or become a generic Markdown/YAML linter.

On an admitted declaration's seed authoring check failure, `operate-queue complete` SHALL return structured direct feedback for the declared repair surface and same completion command: `repair_kind: agent_action`, `missing_fact` naming the deterministic parse/binding failure, `write_to` naming the declared seed path and applicable coordinate, and `rerun` naming the same `operate-queue complete` checkpoint. Every declaration-admission or authoring failure SHALL leave the current card non-terminal and preserve queue authority bytes: it SHALL NOT promote, refill, render a new projection, append `queue_completed`, save a touched queue state, or perform legacy `bundle_name` normalization before returning the failure. Ordinary attempt/receipt diagnostics MAY be emitted, but SHALL NOT represent terminal completion. The final `seed-topics-ready` Gate SHALL reuse the same pure evaluator for each already enumerated seed while retaining its phase-wide registry, queue-drain, trace, routing, and verdict responsibilities. Other non-delegated producer rules SHALL retain the existing receipt-completion behavior unless an accepted requirement independently changes them.

When non-delegated `operate-queue claim` encounters a delegated item at the active-window front, it SHALL reject without moving or completing that demand. The result SHALL distinguish this blocker from an empty active window by returning a stable root reason, the blocked `queue_item_id`, and contract-lineage coordinates: `repair_kind: engine_operation`, `missing_fact` naming the delegated-owner mismatch, `write_to` naming the role-bound observation/claim input owned by `operate-work-unit`, and `rerun` naming the exact `operate-work-unit claim` checkpoint. A genuinely empty active window SHALL return a different root reason. These fields SHALL be read-only feedback projections and SHALL NOT create route, permission or persisted queue state.

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

Projection, docs, and tests MAY discuss ordered `active_window` capacity, `QUEUE_ACTIVE_WINDOW_LIMIT`, the queue front, the displaced tail, insertion indexes, or a case that stages at least five queue items to prove refill/preemption/restore behavior. These positional terms SHALL remain derived from array order. They SHALL NOT be reintroduced as named queue positions such as current/next/pending/tail, and they SHALL NOT imply that a fixed small position set is the production queue shape.

#### Scenario: projection avoids old queue position shape

- **WHEN** current projection guidance or tests describe queue v2 state
- **THEN** they SHALL describe ordered `active_window` entries by `queue_item_id`
- **AND** they SHALL NOT present legacy named queue-position fields or fixed small-window wording as the current projection contract

#### Scenario: front and tail are derived positions

- **WHEN** queue guidance refers to the front item, displaced tail, or an insertion point
- **THEN** those terms SHALL be explained as positions in the ordered `active_window` array
- **AND** they SHALL NOT be modeled as stable named fields or separate queue-position roles

#### Scenario: multi-item queue tests are not old queue-position proof

- **WHEN** a queue experiment or test stages five or more queue items to exercise refill, restore, or preemption
- **THEN** it SHALL assert array locations by `active_window[index].queue_item_id` and `refill_pool[index].queue_item_id`
- **AND** it SHALL NOT assert named queue-position fields or use `work_id` as queue demand identity

### Requirement: Command experiments prove queue manager mechanics

Queue Manager command experiments SHALL use current manifest-registered `case-<id>-<cost>-<proof-role>` playbooks and V2 proof policy, not old simple/medium/complex `test-*` surfaces. Each current case SHALL create a real bundle under its Supervisor-owned case root, exercise the current Engine JS API or CLI, convert every verdict-affecting assertion into a strict playbook-owned root-trace check, and invoke native completion. The Playbook Agent SHALL stop before health or cleanup; the Autorun Supervisor SHALL validate completion, run V2-declared health targets and apply explicit cleanup policy. Old queue-control cases that depend on fixed queue-position shape SHALL be migrated to queue v2 or removed from current runner-readable locations.

#### Scenario: current queue experiments use case taxonomy

- **WHEN** current docs or the manifest list queue-manager experiment cases
- **THEN** they SHALL use current case/cost proof roles and V2 policy
- **AND** they SHALL NOT list old simple/medium/complex `test-*` playbooks as current proof
- **AND** no playbook-local success cleanup SHALL bypass native completion, health, durable audit, or explicit Supervisor policy

### Requirement: Wave0 queue-loop simple playbook

The current manifest-registered Wave0 queue-loop role SHALL verify the work-unit queue loop end to end in a fresh contained disposable bundle. It SHALL use real framework CLIs, work-unit claim/submit for delegated source intake when that behavior is claimed, gate failure diagnostics, and repair/refill through new queue demand. Verdict-affecting facts SHALL be strict root-trace checks finalized through native completion, not console confidence or a Playbook Agent summary.

#### Scenario: real search uses work-unit loop

- **WHEN** the playbook runs a real Wave0 source-intake case
- **THEN** the declared Subject actor SHALL receive queue demand through `operate-work-unit claim`
- **AND** each delegated result SHALL return through `operate-work-unit submit`
- **AND** the Wave0 gate SHALL pass only after submitted ledger coverage exists

### Requirement: Seed-topics queue-loop simple playbook

The current manifest-registered seed-topics queue-loop role SHALL verify the queue-driven execution loop in a fresh contained disposable bundle. It SHALL pre-seed three fixture `topic_registry` entries plus the required profile, exercise the current seed-topics enqueue/claim/execute/complete/gate path, require complete seed-topic frontmatter and original-context constraints, verify bidirectional slug consistency, and mark missing upstream facts as gaps rather than fabricate them. The deterministic fixture case SHALL require no web search, SHALL use V2 deterministic proof policy, and SHALL finish through strict trace checks and native completion rather than a hard-coded legacy path or console PASS.

#### Scenario: Full seed-topics queue-loop

- **WHEN** the case pre-seeds a post-setup bundle with three sufficiently described topics and executes the current seed-topics queue flow
- **THEN** three task cards SHALL be enqueued and completed through the current queue contract
- **AND** the queue SHALL drain, each `seed_topics/<slug>.md` SHALL contain required fields, and the real gate SHALL pass
- **AND** native PASS SHALL require the case-owned required checks; cleanup remains Supervisor policy

### Requirement: Queue state and item schema are structured

The target `rb_queue.json` schema SHALL be queue v2 with ordered `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`. Queue demand identity SHALL be `queue_item_id`. `work_id` SHALL mean only an Engine-allocated delegated execution attempt and SHALL NOT be used as queue demand identity, task-card identity, or old queue-position identity.

Current main spec Purpose SHALL describe queue v2 as an ordered active-window queue with refill and delegated in-flight binding. The accepted active-window capacity SHALL be expressed through the current queue v2 schema/constant, currently `QUEUE_ACTIVE_WINDOW_LIMIT = 20`. It SHALL NOT describe the current state model as a fixed small window, named queue positions, or top-level current/next projection.

For audited late-submit success, the completed `queue_item_id` SHALL appear in exactly one durable queue location: the targeted work unit's `done` entry in `terminal_history`. Queued retry demand for that queue item SHALL be removed. Claimed retry attempts for that queue item SHALL be cleared from `delegated_in_flight` and terminalized through work-unit status, not through a second queue terminal-history row.

#### Scenario: late-submit leaves one queue location

- **WHEN** late-submit accepts a targeted timed-out work unit
- **THEN** `rb_queue.json` SHALL validate
- **AND** the completed `queue_item_id` SHALL appear only in the targeted terminal-history `done` row

#### Scenario: queue v2 purpose names ordered active window

- **WHEN** active main specs are synced after this change
- **THEN** `agentic-queue` Purpose SHALL describe ordered `active_window`, its current capacity semantics, `refill_pool`, delegated in-flight attempts, deterministic receipts, and Markdown projection
- **AND** it SHALL NOT describe a fixed small active window as the current state model
- **AND** if it mentions capacity, it SHALL refer to the queue v2 schema/constant rather than a historical fixed-position shape

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

### Requirement: Producer rule topic_deepening

The Agentic Queue system SHALL recognize `topic_deepening` as a valid `producer_rule` value. This producer rule governs the generation of Wave1 topic-specific deepening task cards.

A primary paired-artifact task card with `producer_rule: topic_deepening` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `queue_item_id` | yes | `"wave1-deepen-{topic.slug}"` |
| `title` | yes | `"Deepen topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }` |
| `action` | yes | Natural-language instruction to derive search terms from `seed_topics/{topic.slug}.md`, use WebSearch/WebFetch, write paired Wave1 artifacts, declared references, and cache trails |
| `producer_rule` | yes | `"topic_deepening"` |
| `priority_class` | yes | `"P4_progressive_artifact_or_seed_backfill"` |
| `required_receipts` | yes | `["file:artifacts/wave1/{topic.slug}/evidence-summary.md", "file:artifacts/wave1/{topic.slug}/question-list.md"]` |
| `done_condition` | yes | Paired evidence-summary and question-list exist and can be validated later by the Wave1 gate structure requirements |
| `writes_to` | yes | `["artifacts/wave1/{topic.slug}/evidence-summary.md", "artifacts/wave1/{topic.slug}/question-list.md"]` |
| `payload` | yes | `{ topic_uid: "<uid>", topic_slug: "<slug>", topic_title: "<title>", assignment_mode: "primary" }` |

`payload.assignment_mode` SHALL be a closed `primary|supplementary` assignment-intent fact for `topic_deepening`, bound by the queue-item snapshot. It SHALL NOT contain or select a direct-contract ID. Canonical `file:` entries in `required_receipts` SHALL be the corresponding exact-output facts: current `primary` requires exactly the canonical evidence-summary/question-list pair, while current `supplementary` requires an empty set. Operation-specific enqueue and claim admission SHALL reject missing/unknown mode, mode/receipt mismatch, and unsupported shapes before work-unit allocation. Generic persisted queue parsing SHALL keep the field optional so historical terminal-history items and old live demand remain loadable for inspection/repair; loadability SHALL NOT authorize claim. `writes_to` SHALL remain the allowed write surface and SHALL NOT make every optional or pattern path required. Existing queue/payload kind-contract customization MAY retain its current result/cache/source fields when strictly valid. The closed reserved selector-key set is `required_outputs`, `direct_contract`, `direct_contract_id`, `assignment_contract_version`, `resolver_version`, and `contract_id`; enqueue, mode repair and claim SHALL reject those keys at the queue-item root or recursively under payload/output_contract. Other unknown payload fields SHALL never become resolver inputs. A task card, its Markdown projection, and an actor result SHALL NOT author the Engine-owned direct contract.

An explicitly supplementary `topic_deepening` task that only acquires new source/cache facts SHALL use `payload.assignment_mode: "supplementary"`, MAY use `required_receipts: []`, and SHALL retain `completion_receipt: "work_unit:submitted-ledger"`. Its `writes_to` MAY name optional current outputs, but no path SHALL become a required direct output without a canonical `file:` receipt. The supplementary result MAY cite an exact contract-authorized prior submitted `evidence_summary` for the same canonical Topic and SHALL NOT be required to redeclare or overwrite the paired evidence-summary/question-list solely to complete the supplementary attempt. Current source claims, accepted URLs, cache/degraded refs, receipt, result, and formal submit requirements remain in force.

The paired and supplementary shapes SHALL be selected from `assignment_mode` plus the exact snapshot-bound receipt set and canonical Topic binding, not from an empty receipt set alone, `queue_item_id` suffixes, title/action prose, path regexes over `writes_to`, or actor-declared roles. Any unsupported, duplicate, unsafe, non-canonical, partial, or mode-conflicting required-receipt set SHALL fail closed before work-unit allocation rather than silently becoming supplementary.

An already-enqueued, not-yet-claimed Wave1 item that lacks `assignment_mode` SHALL require AGQ-013 `operate-queue repair <bundle> --queue-item-id <id> --set-assignment-mode <primary|supplementary>` before claim. The queue owner SHALL choose explicit intent; the Engine SHALL derive its receipt obligation while preserving queue position, creation identity, Topic, producer/kind, delegation and non-selector contract fields. Claim SHALL NOT infer primary from an exact pair or supplementary from an empty set because field absence cannot prove historical origin or assignment intent. Already-claimed attempt compatibility remains owned by the work-unit index marker, not by queue-card inference. Newly enqueued `topic_deepening` cards SHALL always require explicit mode.

Assignment-mode repair SHALL target exactly one `status: queued` `topic_deepening` card in `active_window` or `refill_pool` whose `payload.assignment_mode` is genuinely absent. It SHALL reject an already-classified card rather than reclassify it. The operation SHALL preserve queue location/order, `queue_item_id`, original `created_at`, producer rule, kind, canonical Topic UID/slug, delegation target, lineage, action and non-selector contract customization. Apart from the already-accepted QIV-002 root `bundle_name` initialization when genuinely absent, it SHALL change only `payload.assignment_mode`, `required_receipts`, `updated_at`, and the primary mode's canonical paired `writes_to` inclusion. Primary SHALL derive the exact canonical Topic-bound evidence-summary/question-list receipts and ensure both paths are allowed writes; supplementary SHALL derive an empty receipt set and SHALL NOT erase otherwise valid allowed writes merely because they are optional.

Before mutation, repair SHALL clone the loaded queue and the derived card SHALL pass the same canonical Topic binding, assignment-mode/receipt-shape, direct-selector rejection, kind-contract and queue-item schema admission required by current enqueue. Bundle-name validation SHALL be non-persisting during admission; any required legacy `bundle_name` initialization SHALL join the same final queue value. Exactly one canonical queue save SHALL occur only after all checks pass, and the named success event SHALL be appended only after that save returns. Missing/ambiguous ID, already-present mode, wrong producer/kind, unknown requested mode, non-queued location, `delegated_in_flight` or `terminal_history` target, unresolved Topic, selector-bearing customization, or invalid derived card SHALL return before save and leave prior queue state unchanged. The operation SHALL NOT accept a task document, arbitrary field names, JSON Pointer/merge patch input, revive terminal demand, edit work-unit authority, or broaden QIV-004 stale-card removal.

Successful repair SHALL append one structured `queue_assignment_mode_repaired` trace/audit event naming queue item, canonical Topic coordinates, queue location, prior receipt shape, selected mode and derived receipt shape. The saved queue item remains assignment authority; claim SHALL validate it rather than trust the event. Rejected repair SHALL not emit that success event.

For a multi-item work-unit claim, the Engine SHALL validate assignment mode, receipt shape, Topic binding and direct-selector absence for the complete planned contiguous candidate batch before allocating any work ID, opening a batch, moving demand or writing an envelope. One invalid candidate SHALL reject the planned batch with zero partial claim mutation.

Normal invalid-batch admission SHALL run before the work-unit transaction and SHALL create no work-unit lock or transaction record. After entering the transaction, claim SHALL reload the queue/index and recheck the exact planned prefix identities and snapshot hashes before mutation; concurrent drift MAY retain only the existing failed-transaction diagnostic and SHALL create no partial claim authority.

Task cards with `producer_rule: topic_deepening` SHALL NOT predeclare `work_id`; the Engine SHALL allocate `work_id` only when the delegated demand is claimed through `operate-work-unit claim`.

#### Scenario: topic deepening card waits for Engine work_id allocation

- **WHEN** the Phase Agent generates topic-deepening task cards
- **THEN** each task card SHALL identify demand by `queue_item_id`
- **AND** `operate-work-unit claim` SHALL allocate the delegated `work_id` later when the demand enters `delegated_in_flight`

#### Scenario: primary deepening binds paired file receipts

- **WHEN** a primary Wave1 task requires the canonical evidence-summary and question-list for one UID-bound current Topic
- **THEN** its snapshot SHALL contain `payload.assignment_mode: "primary"`, exactly the two canonical `file:` receipts, and both concrete paths in `writes_to`
- **AND** the work-unit resolver SHALL treat those two paths as required direct outputs while Phase-owned reference materialization remains outside the task

#### Scenario: supplementary source work does not rewrite paired artifacts

- **WHEN** a supplementary Wave1 task is assigned only new source/cache acquisition and can cite a contract-authorized prior submitted `evidence_summary`
- **THEN** it SHALL carry `payload.assignment_mode: "supplementary"`, MAY carry an empty required-receipt set, and complete only through a valid work-unit submitted-ledger receipt
- **AND** it SHALL NOT be forced to redeclare or overwrite the prior evidence-summary or question-list

#### Scenario: partial paired receipt set fails before allocation

- **WHEN** a `topic_deepening` card carries only the evidence-summary receipt, only the question-list receipt, a duplicate receipt, or a receipt for another Topic
- **THEN** `operate-work-unit claim` SHALL reject the assignment contract before allocating a work ID or mutating queue state
- **AND** it SHALL NOT infer the missing requirement from `writes_to`, prose, or a queue ID suffix

#### Scenario: queue item cannot select direct contract implementation

- **WHEN** a new `topic_deepening` queue item contains any closed reserved selector key at its root or recursively under payload/output_contract
- **THEN** enqueue or work-unit claim SHALL reject the unsupported selector before mutation
- **AND** only the Engine-owned closed resolver SHALL select direct contract identities

#### Scenario: non-selector kind customization remains compatible

- **WHEN** a queue item carries a strictly valid existing output_contract customization limited to result fields, allowed roles, and source-claim policy
- **THEN** claim MAY preserve it as the kind-contract base and merge Engine-resolved required_outputs
- **AND** submit SHALL reconstruct the same merged contract from the hash-bound snapshot

#### Scenario: empty receipts without supplementary intent fail closed

- **WHEN** a current `topic_deepening` card has empty required receipts but lacks `payload.assignment_mode: "supplementary"`
- **THEN** enqueue or claim SHALL reject the ambiguous assignment
- **AND** it SHALL NOT treat missing primary receipts as supplementary intent

#### Scenario: pre-change unclaimed card requires explicit repair

- **WHEN** a not-yet-claimed `topic_deepening` card lacks assignment_mode even if it has the exact canonical paired receipts
- **THEN** claim SHALL reject before allocation and direct AGQ-013 explicit unclaimed assignment-mode repair
- **AND** it SHALL NOT infer historical origin or assignment intent from receipt shape

#### Scenario: historical queue remains readable for repair

- **WHEN** persisted terminal history or an old live Wave1 item lacks assignment_mode
- **THEN** generic queue loading SHALL remain possible
- **AND** a live mode-absent item SHALL still fail new claim admission until explicit mode repair derives a card that passes current admission

#### Scenario: assignment-mode repair preserves demand identity

- **WHEN** a genuinely mode-absent unclaimed `topic_deepening` card receives an explicit supported repair mode
- **THEN** the Engine SHALL derive that mode's canonical receipts, preserve immutable card fields and queue position, and update only the bounded repair fields
- **AND** a later claim SHALL revalidate the saved card under current assignment-contract admission

#### Scenario: assignment-mode repair cannot reclassify or broaden mutation

- **WHEN** the target already has a mode, belongs to another producer/kind, is in-flight/terminal/non-queued, or the requested/derived contract is invalid
- **THEN** repair SHALL reject with no queue mutation and no success event
- **AND** it SHALL not accept a replacement task or arbitrary field patch

#### Scenario: assignment-mode repair is auditable but queue remains authority

- **WHEN** assignment-mode repair succeeds
- **THEN** exactly one canonical queue save SHALL complete before one structured event records queue ID, Topic, location, prior receipts, selected mode and derived receipts
- **AND** claim SHALL validate `rb_queue.json` rather than treat that event as a second assignment authority

#### Scenario: mixed-validity claim batch has zero partial allocation

- **WHEN** a planned Wave1 claim batch contains a valid first item and a later item with missing/mismatched assignment mode
- **THEN** claim SHALL reject the planned batch before entering the work-unit transaction, allocating any work ID or moving either item
- **AND** no work-unit lock/transaction record, envelope, index row, batch counter, delegated-in-flight binding or claim-success event SHALL be written

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

Existing terminal or submitted work-unit history and an earlier batch SHALL NOT make a later eligible queue-front demand unclaimable. After the existing batch owner opens the next batch, a valid current role-bound actor observation SHALL allocate the rerun demand from that batch through the same claim transaction. Missing or unknown actor observation SHALL continue to return no claim and one probe-then-rerun action without changing queue, batch counters or work-unit authority. A `phase_agent_fallback` request SHALL remain invalid unless the same claim carries a matching classified unavailable observation and the kind policy permits fallback; the diagnostic SHALL explain that exact missing precondition through `repair_kind`, `missing_fact`, `write_to`, and `rerun` rather than presenting the demand as empty.

#### Scenario: claim allocates delegated attempt

- **WHEN** the active queue front contains an eligible delegated queue item for Wave0
- **THEN** `operate-work-unit claim` SHALL allocate a `work_id`
- **AND** the queue item SHALL move from `active_window` to `delegated_in_flight`
- **AND** `_work_units/_index.json` SHALL contain the same `queue_item_id` and `work_id` binding

#### Scenario: Rerun demand claims from the next historical batch

- **WHEN** Wave0 has prior work-unit history in batch b000, the existing batch owner opens b001 for rerun work, and an eligible new-topic demand is at the active queue front
- **AND** claim receives a valid current actor observation for the demand role
- **THEN** `operate-work-unit claim` SHALL allocate the demand in b001
- **AND** it SHALL move only that demand into `delegated_in_flight`
- **AND** prior batch records SHALL remain unchanged

#### Scenario: Missing actor observation does not consume rerun demand

- **WHEN** an eligible rerun demand exists after historical work but claim has no current role-bound actor observation
- **THEN** claim SHALL allocate zero work units and return `observation_required` with one probe-then-rerun action
- **AND** `write_to` SHALL identify the claim observation fields and `rerun` SHALL identify the same work-unit claim command
- **AND** active queue demand, batch counters and work-unit index authority SHALL remain unchanged

#### Scenario: Fallback rejection names the missing authorization fact

- **WHEN** the Agent requests `phase_agent_fallback` without a matching classified unavailable observation
- **THEN** claim SHALL allocate zero work units and preserve the demand
- **AND** the diagnostic SHALL identify `repair_kind`, the required role-bound unavailable observation in `missing_fact`, the exact claim arguments in `write_to`, and the same-claim command in `rerun`
- **AND** it SHALL NOT describe the active queue as empty

### Requirement: Delegated submit completes queue demand by work-id binding

The Agentic Queue system SHALL complete delegated queue demand only through Engine-owned work-unit completion commands. Normal `operate-work-unit submit` SHALL complete a claimed attempt by validating the `work_id` binding in `delegated_in_flight`.

Explicit audited `operate-work-unit late-submit` is the only terminal recovery completion path. Because the targeted timed-out attempt is no longer expected in `delegated_in_flight`, late-submit SHALL complete queue demand only after validating the targeted work-unit identity, rejecting submitted replacement coverage, and cleaning up any non-submitted retry state for the same `queue_item_id`.

#### Scenario: out-of-order submit completes correct demand

- **WHEN** three delegated work units are in flight for the same wave
- **AND** the third work unit submits before the first
- **THEN** the queue SHALL complete the `queue_item_id` bound to the submitted `work_id`
- **AND** the other in-flight queue items SHALL remain in `delegated_in_flight`

#### Scenario: late-submit does not use queue-complete

- **WHEN** an eligible timed-out targeted work unit is recovered
- **THEN** queue completion SHALL happen through `operate-work-unit late-submit`
- **AND** `operate-queue complete` SHALL remain invalid for delegated work

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

### Requirement: Supplementary queue demand IDs MAY carry iteration labels when explicit topic identity is valid

Queue demand identity SHALL remain `queue_item_id`, but topic identity SHALL come from explicit task-card fields when available. Topic-scoped supplementary queue items MAY include iteration or repair labels in `queue_item_id`, such as `-v2`, `-supplement`, or `-deep`, without making those suffixes part of the topic slug.

The queue system SHALL allow these supplementary IDs when the task card includes a valid `payload.topic_slug` or `lineage.topic_slug` matching the bundle `topic_registry`.

#### Scenario: Supplementary topic task uses explicit topic identity

- **WHEN** a task card has `queue_item_id: "wave1-deepen-01_event-basics-logistics-v2"`
- **AND** it has `payload.topic_slug: "01_event-basics-logistics"`
- **AND** `topic_registry` contains `01_event-basics-logistics`
- **THEN** queue validation SHALL treat the task as topic-scoped to `01_event-basics-logistics`
- **AND** it SHALL NOT reject merely because the queue item ID contains `-v2`

### Requirement: Wave delegated queue loops SHALL prefer bounded batched claims for independent demand

Wave0 and Wave1 queue-loop guidance SHALL instruct the Phase Agent to claim independent eligible delegated demand in bounded batches rather than treating `--count 1` as the normal drain strategy. The Phase Agent SHALL compute an explicit claim count from an accepted profile/runtime cap when available, the currently available independent delegated demand, and a conservative documented default no higher than 5 when no explicit cap exists.

The explicit claim count SHALL top up available parallel capacity rather than blindly claim all remaining demand. It SHALL be bounded by independent eligible demand, the accepted/default cap, and remaining free delegated in-flight capacity for that wave. If reconstructed in-flight work already reaches the cap, phase guidance SHALL poll/submit/terminalize existing attempts before claiming more.

The Engine SHALL remain the sole allocator of work-unit IDs. Batched execution SHALL still use `operate-work-unit claim --count <N>`, one Engine-created work unit per delegated queue demand, and successful completion through `operate-work-unit submit`. The queue active window, refill pool, and delegated in-flight bindings remain the authority; batching SHALL NOT introduce another scheduler or let Sub-agents allocate IDs.

`--count 1` MAY be used when only one eligible item remains, when dependency/queue-front ordering blocks a larger batch, when an accepted cap is 1, or for a narrow repair attempt. Phase guidance SHALL NOT present serial `--count 1` as the default strategy for independent topic source intake or topic deepening.

#### Scenario: Wave0 claims independent source-intake work in a batch

- **WHEN** Wave0 has multiple independent `wave0_source_intake` queue items eligible at the queue front
- **THEN** phase guidance SHALL instruct the Phase Agent to compute a bounded effective claim count and call `operate-work-unit claim --count <claim-count>`
- **AND** the returned prompts SHALL be fanned out as distinct Engine-allocated work units

#### Scenario: Wave1 claims independent topic-deepening work in a batch

- **WHEN** Wave1 has multiple independent `wave1_topic_deepening` queue items eligible at the queue front
- **THEN** phase guidance SHALL instruct the Phase Agent to claim a bounded batch before waiting for the first topic to submit
- **AND** out-of-order submit SHALL remain valid because each attempt is bound by `work_id`

#### Scenario: claim count tops up available capacity

- **WHEN** a phase has 5 as its effective cap and already has 3 delegated attempts in flight
- **AND** more independent eligible demand remains
- **THEN** phase guidance SHALL instruct the Phase Agent to claim at most 2 additional work units before polling/submitting again
- **AND** it SHALL NOT claim a full cap-sized batch while in-flight work is already occupying capacity

#### Scenario: batching does not change CLI default authority

- **WHEN** `operate-work-unit claim` is invoked without an explicit `--count`
- **THEN** this change SHALL NOT require the CLI to infer active-window length or change its default behavior
- **AND** Phase Agent guidance SHALL be responsible for passing an explicit count when independent batching is desired

#### Scenario: dependent or single-item work can remain serial

- **WHEN** only one eligible delegated queue demand remains or the queue front is blocked by a non-independent item
- **THEN** using `--count 1` SHALL remain legal
- **AND** the phase SHALL still proceed through submit, repair, terminalization, inspect, and gate feedback rather than bypassing queue authority

### Requirement: Phase task-card examples SHALL preserve queue demand identity

Agent-facing phase Markdown task-card and result examples for queue demand SHALL use `queue_item_id` as queue demand identity. They SHALL NOT use `work_id` as queue demand identity, task-card identity, non-delegated queue completion identity, or old queue-position identity.

Static hygiene checks SHALL scan active phase Markdown queue task-card/result examples for retired queue identity drift, not only the queue JSON template or work-unit generated surfaces. Queue task-card examples SHALL validate against the active queue demand schema. Non-delegated `operate-queue complete --result` examples SHALL validate against the active queue result schema. `work_id` SHALL remain valid only when a surface explicitly describes an Engine-allocated delegated work-unit attempt, such as work-unit claim/submit, work-unit result, runtime receipt, or submitted ledger context.

The validation surface SHALL be example-driven, not token-only: when active phase Markdown presents a JSON object as an Agent-copyable task card or complete result, static hygiene or regression tests SHALL extract and parse that JSON against the same queue schemas that `operate-queue enqueue` or `operate-queue complete` uses.

#### Scenario: seed-topic materialization example uses queue item identity

- **WHEN** the Agent reads the seed-topics phase task-card template for `producer_rule: seed_topic_materialize`
- **THEN** the task-card example SHALL identify the queue demand with `queue_item_id`
- **AND** it SHALL NOT include `work_id` as the task-card's queue demand identifier

#### Scenario: phase template hygiene fails on queue demand work_id

- **WHEN** an active phase Markdown queue task-card or queue result example uses `work_id` where the queue demand identity is required
- **THEN** static hygiene SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

#### Scenario: seed-topic queue complete result uses queue item identity

- **WHEN** the Agent reads the seed-topics phase `operate-queue complete --result` example
- **THEN** the example SHALL identify the completed non-delegated queue item with `queue_item_id`
- **AND** the example SHALL NOT use `work_id` as the completion result identity

#### Scenario: phase examples match queue schemas

- **WHEN** static hygiene scans active phase Markdown queue task-card and non-delegated queue result JSON examples
- **THEN** task-card examples SHALL parse against the queue demand schema
- **AND** non-delegated complete result examples SHALL parse against the queue result schema

#### Scenario: token-only hygiene is insufficient for Agent-copyable JSON

- **WHEN** an active phase Markdown JSON example avoids retired `work_id` wording but still violates the active queue demand or queue result schema
- **THEN** static hygiene or regression tests SHALL fail
- **AND** the diagnostic SHALL identify the example surface and the schema mismatch

#### Scenario: work-unit attempt contexts may still use work_id

- **WHEN** active documentation or generated task text explicitly describes `operate-work-unit claim`, `operate-work-unit submit`, work-unit result JSON, work-unit runtime receipts, or submitted ledger rows
- **THEN** `work_id` SHALL remain valid as the Engine-allocated delegated attempt identity
- **AND** queue hygiene SHALL NOT require replacing that work-unit attempt identity with `queue_item_id`

### Requirement: Delegated queue demand SHALL remain unclaimed until actor preflight permits allocation

Wave0, Wave1, and Wave2 delegated loops SHALL submit one current role-bound actor observation and execution actor choice to the existing work-unit claim checkpoint before queue demand is moved into delegated in-flight state. Claim SHALL first preview a homogeneous contiguous queue-front candidate prefix for the observed delegated role. An actor-preflight no-claim verdict SHALL leave `active_window`, `refill_pool`, `delegated_in_flight`, terminal history, batch counters, and pending demand semantics unchanged except for existing diagnostic trace/log behavior.

The effective claim count for an allowed normal delegated branch SHALL continue to obey existing independent-demand and delegated-capacity limits. An allowed `phase_agent_fallback` branch SHALL claim exactly one queue-front item and leave remaining eligible demand unclaimed. Actor availability SHALL NOT add another queue, scheduler, retry pool, priority class, or persistent availability field to `rb_queue.json`.

Fallback SHALL be attempt-level execution metadata, not a queue-demand rewrite. `targets.controller`, `targets.delegates`, kind, producer rule, payload, lineage, and queue item identity SHALL remain unchanged when a fallback attempt is claimed.

#### Scenario: Unavailable actor preserves eligible queue demand

- **WHEN** five eligible delegated queue items exist and actor preflight returns no-claim for unavailable delegated execution
- **THEN** all five items SHALL remain eligible and unclaimed
- **AND** no delegated in-flight binding or failed work-unit attempt SHALL be created

#### Scenario: Fallback claim is single-attempt degradation

- **WHEN** actor preflight permits `phase_agent_fallback`, requested count is five, and free delegated capacity is five
- **THEN** claim SHALL allocate exactly one existing queue demand
- **AND** it SHALL leave the other four demands unclaimed without introducing a fallback queue

#### Scenario: Mixed delegated roles are not covered by one observation

- **WHEN** requested queue-front demand contains a `dpt-source-intake` prefix followed by a different delegated role
- **THEN** one source-intake observation SHALL authorize only the homogeneous source-intake prefix
- **AND** the later role SHALL require its own current observation at a later claim decision

#### Scenario: Availability recovery resumes through the same queue demand

- **WHEN** a prior unavailable preflight allocated no work and a later current observation reports the delegated actor available
- **THEN** the Agent MAY rerun normal claim against the same queue demand without hand-editing queue/index/ledger state
- **AND** work IDs SHALL be allocated only by that later successful claim

### Requirement: New topic-scoped demand SHALL bind canonical UID and current slug

New topic-scoped queue demand SHALL store canonical `payload.topic_uid` together with current `payload.topic_slug`. The Engine SHALL derive and persist UID from a valid current slug when the caller omits UID; a caller-supplied UID and any lineage topic projection SHALL match. Queue schema version SHALL remain unchanged. Existing terminal history SHALL remain immutable; nonterminal topic demand SHALL block layout mutation and SHALL be drained, submitted, repaired or terminalized through the existing queue/work-unit owner before retry.

#### Scenario: Current UID and slug enqueue together
- **WHEN** enqueue targets a committed canonical topic using its current slug
- **THEN** the Engine SHALL persist matching topic UID and current slug binding without requiring the Agent to calculate UID

#### Scenario: Nonterminal demand blocks layout mutation
- **WHEN** a target UID has queued, running or delegated-in-flight demand
- **THEN** topic-state apply SHALL return the existing owner and one nearest drain or terminalization action
- **AND** SHALL NOT rewrite queue state itself
