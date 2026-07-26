> req: QIV-001, QIV-004

## MODIFIED Requirements

### Requirement: Enqueue SHALL validate topic_slug against topic_registry

`operate-queue enqueue` SHALL, before writing a task card to the queue, read `rb_plan.md` frontmatter's `topic_registry` and verify that the task card's topic slug exists in the registry whenever the task declares or implies topic scope.

Topic slug resolution SHALL be deterministic:

- If `payload.topic_slug` is present, it is the preferred explicit topic declaration and SHALL be validated against `topic_registry`.
- If `lineage.topic_slug` is present, it SHALL match `payload.topic_slug` when both are present and SHALL be validated.
- `queue_item_id` SHALL be parsed only as a fallback for known topic-scoped queue item templates when no explicit payload or lineage topic slug is present. Known fallback templates include `wave0-source-{topic.slug}`, `wave0-suppl-{topic.slug}-r{N}`, `wave1-deepen-{topic.slug}`, `wave1-suppl-{topic.slug}-r{N}`, `seed-topic-{topic.slug}`, `wave2-backfill-{topic.slug}`, `wave2-suppl-cross-{topic.slug}-r{N}`, and `wave2-suppl-emergent-{topic.slug}-r{N}`.
- If explicit payload/lineage slug is available and valid, a different slug that could be derived from `queue_item_id` SHALL NOT reject the task. The ID-derived slug MAY be reported as advisory naming drift, but it SHALL NOT override explicit topic identity.
- Topic scope SHALL be determined from explicit topic fields, known topic-scoped queue item templates, or declared output shape. It SHALL NOT depend on `producer_rule` alone. For example, `producer_rule: "topic_deepening"` can be topic-scoped for Wave1/Wave2 per-topic tasks, but Wave2 backing gap tasks such as `wave2-suppl-backing-{finding_id}-r{N}` are finding-scoped when they declare `payload.finding_id` or `lineage.finding_id` and no topic slug.
- If a task is topic-scoped but no slug can be resolved, enqueue SHALL reject the task rather than skip validation.
- Non-topic task cards SHALL skip topic_registry validation when they have no explicit topic slug and no topic-scoped work_id template. Finding-scoped Wave2 search tasks SHALL skip topic_registry validation when they declare a `finding_id`; if `artifacts/wave2/finding-index.yaml` exists, enqueue SHALL validate that `finding_id` is present in the current bundle's finding index.

If the topic slug is not found in `topic_registry`, enqueue SHALL reject the task card with a structured error message identifying the unknown slug and the valid slugs in the registry. The error SHALL be returned as JSON on stdout with exit code 1. The task card SHALL NOT be written to `rb_queue.json`.

`operate-queue enqueue` SHALL retain the preceding validation for every task card. Before writing a delegated task card to the existing work-unit claim path, it SHALL additionally use one shared side-effect-free delegated queue-demand admission path: a thin current-facts adapter plus one pure evaluator. The adapter SHALL reuse the preceding Topic/finding/committed-topic checks; the evaluator SHALL apply the registered delegated work-unit kind contract and closed work-unit assignment-contract inputs, and reject a card whose current canonical binding, explicit kind, kind policy, required-receipt shape, assignment mode, or assignment-contract resolution is invalid. A delegated card SHALL explicitly declare exactly one supported work-unit kind: `wave0_source_intake`, `wave1_topic_deepening`, or `wave2_targeted_evidence`; enqueue and claim SHALL NOT infer a missing kind from the requested phase.

The evaluator SHALL apply only to a card whose current target is delegated to the existing work-unit claim path. A non-delegated card SHALL retain its existing topic validation and completion contract and SHALL NOT be sent through the work-unit assignment resolver. Admission SHALL be recomputed from current facts at every delegated consuming boundary and SHALL NOT persist, cache, or trust an enqueue verdict. On admission rejection, enqueue SHALL fail before writing `rb_queue.json` using its existing CLI failure convention.

`operate-queue check` SHALL use the same evaluator for each unclaimed delegated demand in `active_window` and `refill_pool`. It SHALL report each rejection with its queue item identity and direct reason, fail its check verdict, and SHALL NOT add admission-specific queue mutation, persist a derived health state, or perform repair. Existing bundle-name validation/legacy normalization remains unchanged.

#### Scenario: Valid topic slug passes validation

- **WHEN** a task card has `queue_item_id: "wave0-source-01_chinese-professional-league"`
- **AND** `topic_registry` contains a topic with slug `01_chinese-professional-league`
- **THEN** enqueue SHALL accept the task card and write to queue

#### Scenario: Unknown topic slug is rejected

- **WHEN** a task card has `queue_item_id: "wave0-source-03_clinical-scenarios"`
- **AND** `topic_registry` does NOT contain a topic with slug `03_clinical-scenarios`
- **THEN** enqueue SHALL reject with error: `topic_slug '03_clinical-scenarios' not found in bundle topic_registry`
- **AND** the task card SHALL NOT be written to `rb_queue.json`
- **AND** exit code SHALL be 1

#### Scenario: Conflicting payload and lineage topic slugs are rejected

- **WHEN** a task card has `producer_rule: "topic_deepening"`
- **AND** `queue_item_id: "wave1-deepen-01_chinese-professional-league"`
- **AND** `payload.topic_slug: "01_chinese-professional-league"`
- **AND** `lineage.topic_slug: "03_clinical-scenarios"`
- **THEN** enqueue SHALL reject before writing queue state
- **AND** error SHALL identify the conflicting slug sources

#### Scenario: Topic-scoped task missing slug is rejected

- **WHEN** a task card has `producer_rule: "topic_deepening"`
- **AND** its `queue_item_id` or declared outputs imply a topic-scoped task
- **AND** it has no `payload.topic_slug`, no `lineage.topic_slug`, and no recognized topic slug in `queue_item_id`
- **THEN** enqueue SHALL reject with a structured unresolved topic slug error

#### Scenario: Wave2 finding-scoped backing task is not forced through topic_registry

- **WHEN** a task card has `queue_item_id: "wave2-suppl-backing-W2F-001-r1"`
- **AND** `producer_rule: "topic_deepening"`
- **AND** `payload.finding_id: "W2F-001"`
- **AND** it has no topic slug because the backing search is finding-scoped
- **THEN** enqueue SHALL NOT reject merely for missing `topic_slug`
- **AND** if `artifacts/wave2/finding-index.yaml` exists, enqueue SHALL validate that `W2F-001` belongs to the current bundle

#### Scenario: Empty topic_registry still validates

- **WHEN** `topic_registry` is empty
- **AND** a task card with any topic slug is enqueued
- **THEN** enqueue SHALL reject (no slug can match an empty registry)

#### Scenario: Non-topic task cards skip topic validation

- **WHEN** a task card does NOT contain a derivable topic slug in its `queue_item_id`, `payload.topic_slug`, or `lineage.topic_slug`
- **AND** no known topic-scoped queue item template or declared output implies topic scope
- **THEN** enqueue SHALL skip topic_registry validation
- **AND** the task card SHALL still pass queue schema validation

#### Scenario: a non-Wave1 kind is not admitted by omission

- **WHEN** a delegated non-Wave1 work-unit kind has an invalid closed assignment-contract input
- **THEN** enqueue SHALL reject it through the shared evaluator
- **AND** it SHALL NOT pass merely because a Wave1-only card validator does not apply

#### Scenario: delegated kind is never phase-inferred

- **WHEN** a delegated card omits `kind`
- **THEN** enqueue SHALL reject it before queue mutation
- **AND** claim SHALL reject a legacy unclaimed card with the same omission before work-unit allocation

#### Scenario: check does not become a queue mutation owner

- **WHEN** queue check finds an unclaimable unclaimed delegated demand and bundle identity is already current
- **THEN** it SHALL return the item identity and direct admission reason
- **AND** it SHALL leave active-window, refill-pool, in-flight and terminal-history bytes unchanged

### Requirement: Queue repair SHALL remove stale task cards

`operate-queue repair --remove-stale` SHALL read `rb_plan.md` topic_registry and inspect queue v2 locations: `active_window`, `refill_pool`, and eligible non-terminal queue demand references. It SHALL resolve each queue item's topic slug using the same deterministic resolver as enqueue and remove task cards whose resolved topic slug is not in the registry. Delegated attempts already claimed into `delegated_in_flight` SHALL require work-unit terminal handling before queue repair mutates their demand binding.

For unclaimed delegated cards in `active_window` and `refill_pool`, repair SHALL additionally use the same delegated queue-demand admission evaluator used by enqueue, queue check and claim. It SHALL remove a card rejected by current delegated admission, including absent/unsupported explicit kind, and report the `queue_item_id`, location and direct reason. Non-delegated cards retain the preceding stale checks only. Repair SHALL not create a terminal-history row, replacement demand, drop permission, or new terminal operation.

`delegated_in_flight` remains outside current admission evaluation: its work-unit submit/terminal behavior is bound to the claimed snapshot rather than mutable current queue/plan facts. Repair SHALL preserve the existing in-flight stale/terminal handling and SHALL NOT remove, rewrite, or terminalize an attempt through `--remove-stale`.

#### Scenario: stale active-window task card removed

- **WHEN** `active_window` contains a queue item whose topic slug is absent from `topic_registry`
- **THEN** repair SHALL remove that queue item
- **AND** the summary SHALL identify the removed `queue_item_id`

#### Scenario: in-flight delegated demand is not silently removed

- **WHEN** a stale topic is bound to a non-terminal work unit in `delegated_in_flight`
- **THEN** repair SHALL fail closed with advice to resolve the work-unit attempt first

#### Scenario: legacy unclaimable demand has one existing cleanup path

- **WHEN** a legacy delegated card in `refill_pool` is rejected by the current assignment-contract admission evaluator and has no in-flight work unit
- **THEN** `repair --remove-stale` SHALL remove the card and report its direct admission reason
- **AND** no direct queue-file edit or new terminal command SHALL be required

#### Scenario: in-flight demand remains a work-unit concern

- **WHEN** a queue contains a delegated in-flight attempt while repair evaluates unclaimed delegated demand
- **THEN** `repair --remove-stale` SHALL not apply current admission to or remove that attempt
- **AND** the existing work-unit terminal handling SHALL remain its only terminal owner
