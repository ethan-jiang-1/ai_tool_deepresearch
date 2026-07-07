## MODIFIED Requirements

> req: QIV-001

### Requirement: Enqueue SHALL validate topic_slug against topic_registry

`operate-queue enqueue` SHALL, before writing a task card to the queue, read `rb_plan.md` frontmatter's `topic_registry` and verify that the task card's topic slug exists in the registry whenever the task declares or implies topic scope.

Topic slug resolution SHALL be deterministic:

- If `payload.topic_slug` is present, it is the preferred explicit topic declaration and SHALL be validated against `topic_registry`.
- If `lineage.topic_slug` is present, it SHALL match `payload.topic_slug` when both are present and SHALL be validated.
- `queue_item_id` SHALL be parsed only as a fallback for known topic-scoped queue item templates when no explicit payload or lineage topic slug is present.
- If explicit payload/lineage slug is available and valid, a different slug that could be derived from `queue_item_id` SHALL NOT reject the task. The ID-derived slug MAY be reported as advisory naming drift, but it SHALL NOT override explicit topic identity.
- Topic scope SHALL be determined from explicit topic fields, known topic-scoped queue item templates, or declared output shape. It SHALL NOT depend on `producer_rule` alone. For example, `producer_rule: "topic_deepening"` can be topic-scoped for Wave1/Wave2 per-topic tasks, but Wave2 backing gap tasks such as `wave2-suppl-backing-{finding_id}-r{N}` are finding-scoped when they declare `payload.finding_id` or `lineage.finding_id` and no topic slug.
- If a task is topic-scoped but no slug can be resolved, enqueue SHALL reject the task rather than skip validation.
- Non-topic task cards SHALL skip topic_registry validation when they have no explicit topic slug and no known topic-scoped queue item template. Finding-scoped Wave2 search tasks SHALL skip topic_registry validation when they declare a `finding_id`; if `artifacts/wave2/finding-index.yaml` exists, enqueue SHALL validate that `finding_id` is present in the current bundle's finding index.

If the topic slug is not found in `topic_registry`, enqueue SHALL reject the task card with a structured error message identifying the unknown slug and the valid slugs in the registry. The error SHALL be returned as JSON on stdout with exit code 1. The task card SHALL NOT be written to `rb_queue.json`.

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

#### Scenario: Payload slug and lineage slug mismatch is rejected

- **WHEN** a task card has `producer_rule: "topic_deepening"`
- **AND** `payload.topic_slug: "03_clinical-scenarios"`
- **AND** `lineage.topic_slug: "01_chinese-professional-league"`
- **THEN** enqueue SHALL reject before writing queue state
- **AND** error SHALL identify the conflicting explicit slug sources

#### Scenario: Explicit payload slug overrides queue item suffix

- **WHEN** a task card has `producer_rule: "topic_deepening"`
- **AND** `queue_item_id: "wave1-deepen-01_chinese-professional-league-v2"`
- **AND** `payload.topic_slug: "01_chinese-professional-league"`
- **AND** `topic_registry` contains `01_chinese-professional-league`
- **THEN** enqueue SHALL accept the task card
- **AND** it SHALL NOT reject because parsing `queue_item_id` would include the `-v2` suffix

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
- **THEN** enqueue SHALL reject because no slug can match an empty registry

#### Scenario: Non-topic task cards skip topic validation

- **WHEN** a task card does NOT contain a derivable topic slug in its `queue_item_id`, `payload.topic_slug`, or `lineage.topic_slug`
- **AND** no known topic-scoped queue item template or declared output implies topic scope
- **THEN** enqueue SHALL skip topic_registry validation
- **AND** the task card SHALL still pass queue schema validation
