> req: AGQ-002

## MODIFIED Requirements

### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL keep deterministic queue operations for non-delegated main-agent work and queue demand maintenance. Delegated sub-agent completion SHALL NOT use `operate-queue complete`; delegated completion SHALL use `operate-work-unit submit`, which validates result/receipt/output/cache, updates work-unit state, completes the bound queue demand, and appends the ledger in one Engine transition.

For a non-delegated current card with `producer_rule: seed_topic_materialize`, `operate-queue complete` SHALL, after its existing receipt check and before any terminal queue mutation, admit exactly one card declaration before it runs the shared deterministic seed authoring evaluator: `writes_to` SHALL contain exactly one path; `required_receipts` SHALL contain exactly one matching `file:` entry; `completion_receipt` SHALL be that same `file:` entry; all three SHALL name the same relative `seed_topics/<payload.topic_slug>.md`; and `payload.topic_slug` SHALL resolve to exactly one current canonical Topic with that expected seed path. The adapter SHALL reject a nonconforming declaration without scanning a directory, guessing a path, or reconstructing a task. That rejection SHALL return `repair_kind: missing_contract`, name the declaration/canonical-owner boundary in `missing_fact` and `write_to`, name the same completion checkpoint in `rerun`, and SHALL NOT invite manual queue mutation. For an admitted declaration, the evaluator boundary SHALL parse the declared seed bytes and validate only the accepted deterministic authoring facts: parseable frontmatter plus current UID/id/slug/title/must-answer/scope/dependency binding and filename/path consistency. Binding equality SHALL use the canonical-topic-state parsed-value contract rather than YAML serialization bytes. The evaluator SHALL NOT interpret the card's general `done_condition`, validate semantic enrichment/body quality, compare legacy duplicate body prose, or become a generic Markdown/YAML linter.

On an admitted declaration's seed authoring check failure, `operate-queue complete` SHALL return one direct root and the same completion command without terminal queue mutation. Only after the adapter establishes the current legal Seed Topics lifecycle window may a `canonical_binding_mismatch` return `repair_kind: engine_operation`; `missing_fact` SHALL retain the evaluator's exact field/expected/observed binding; `write_to` SHALL name the current Topic UID's existing `operate-topic-state apply` `enrich_seed` owner/input contract rather than authorize direct canonical YAML editing; and `rerun` SHALL name the same `operate-queue complete` checkpoint after that writer commits. In that same authorized window, a `frontmatter_invalid` parse root MAY return `repair_kind: agent_action` with only the exact syntax coordinate needed to make the existing seed parseable; its feedback SHALL require the Agent to rerun `enrich_seed` before rerunning completion and SHALL NOT ask the Agent to reconstruct canonical values. Without that lifecycle authorization, either authoring root SHALL remain a direct diagnostic with `repair_kind: missing_contract` naming the current lifecycle owner/absent window, and SHALL NOT advertise either writer. Every declaration-admission or authoring failure SHALL leave the current card non-terminal and preserve queue authority bytes: it SHALL NOT promote, refill, render a new projection, append `queue_completed`, save a touched queue state, or perform legacy `bundle_name` normalization before returning the failure. Ordinary attempt/receipt diagnostics MAY be emitted, but SHALL NOT represent terminal completion.

The final `seed-topics-ready` Gate SHALL reuse the same pure evaluator for each already enumerated seed while retaining its phase-wide registry, queue-drain, trace, routing, and verdict responsibilities. Only after its existing handoff/status preflight establishes the legal incoming Seed Topics window MAY its canonical-mismatch feedback name `enrich_seed` as the Engine operation; otherwise it SHALL retain a direct lifecycle/missing-contract diagnostic and no writer route. Topic-state `enrich_seed` SHALL invoke that evaluator earlier in the Agent loop; queue completion SHALL remain the terminalization defense rather than a second authoring writer. Other non-delegated producer rules SHALL retain the existing receipt-completion behavior unless an accepted requirement independently changes them.

When non-delegated `operate-queue claim` encounters a delegated item at the active-window front, it SHALL reject without moving or completing that demand. The result SHALL distinguish this blocker from an empty active window by returning a stable root reason, the blocked `queue_item_id`, and contract-lineage coordinates: `repair_kind: engine_operation`, `missing_fact` naming the delegated-owner mismatch, `write_to` naming the role-bound observation/claim input owned by `operate-work-unit`, and `rerun` naming the exact `operate-work-unit claim` checkpoint. A genuinely empty active window SHALL return a different root reason. These fields SHALL be read-only feedback projections and SHALL NOT create route, permission or persisted queue state.

#### Scenario: non-delegated queue completion remains available

- **WHEN** a queue item is assigned to main-agent work with no delegated work-unit binding
- **THEN** `operate-queue complete` SHALL remain a valid deterministic completion path
- **AND** no work-unit ledger row SHALL be required for that non-delegated queue item

#### Scenario: malformed declared seed cannot terminalize its queue card

- **WHEN** the current non-delegated card has `producer_rule: seed_topic_materialize`, its file receipt exists, its declared seed frontmatter is not parseable, and the current Seed Topics lifecycle window is verified
- **THEN** `operate-queue complete` SHALL return the exact parse repair fact and same-command rerun without guessing canonical values
- **AND** its feedback SHALL require the structured enrichment writer after syntax repair and before completion
- **AND** its active card, terminal history, refill pool, and queue authority bytes (including absent legacy `bundle_name`) SHALL remain unchanged
- **AND** it SHALL NOT append `queue_completed` or create a second success path; non-terminal attempt/receipt diagnostics do not constitute completion

#### Scenario: canonical seed drift routes to the existing writer in its legal window

- **WHEN** an admitted `seed_topic_materialize` declaration is parseable but one canonical field differs from the current registry Topic and the current Seed Topics lifecycle window is verified
- **THEN** `operate-queue complete` SHALL return `repair_kind: engine_operation` with the evaluator's first exact binding root
- **AND** `write_to` SHALL identify `operate-topic-state apply` `enrich_seed` for that Topic UID, not the seed YAML coordinate as a direct canonical write surface
- **AND** `rerun` SHALL remain the same queue completion command and queue authority bytes SHALL remain unchanged

#### Scenario: Out-of-window queue completion does not advertise a writer

- **WHEN** an admitted `seed_topic_materialize` declaration has a canonical mismatch or frontmatter-invalid root but the legal Seed Topics lifecycle window is absent, stale or closed
- **THEN** `operate-queue complete` SHALL retain the direct authoring diagnostic with `repair_kind: missing_contract` and name the current lifecycle owner/absent window
- **AND** it SHALL NOT expose `enrich_seed` or a raw YAML coordinate as an executable repair path

#### Scenario: ambiguous seed producer declaration has no guessed repair

- **WHEN** a `seed_topic_materialize` card has multiple or mismatched `writes_to` / `required_receipts` / `completion_receipt` paths, or its `payload.topic_slug` cannot resolve to one current canonical Topic with the expected seed path
- **THEN** `operate-queue complete` SHALL fail before authoring evaluation with `repair_kind: missing_contract`
- **AND** its feedback SHALL name the declaration/canonical-owner boundary and same completion checkpoint, without naming a file for the Agent to repair
- **AND** its queue authority bytes and terminal history SHALL remain unchanged

#### Scenario: repaired declared seed completes through the same queue operation

- **WHEN** the Agent uses `enrich_seed` to restore the declared seed's canonical envelope and the shared evaluator passes
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
