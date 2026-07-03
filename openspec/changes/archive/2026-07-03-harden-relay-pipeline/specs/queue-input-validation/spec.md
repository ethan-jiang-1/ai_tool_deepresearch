# Queue Input Validation

> req: QIV-001, QIV-002, QIV-003, QIV-004

## Purpose

定义 Queue 入口校验——在 enqueue 阶段验证 task card 与 bundle 的一致性，防止跨 bundle 污染（bug 016）。Queue schema 增加 bundle identity 字段，projection cache 增加 staleness detection。

## ADDED Requirements

### Requirement: Enqueue SHALL validate topic_slug against topic_registry

`operate-queue enqueue` SHALL, before writing a task card to the queue, read `rb_plan.md` frontmatter's `topic_registry` and verify that the task card's topic slug exists in the registry whenever the task declares or implies topic scope.

Topic slug resolution SHALL be deterministic:

- If `payload.topic_slug` is present, it is the preferred explicit topic declaration and SHALL be validated against `topic_registry`.
- If `lineage.topic_slug` is present, it SHALL match `payload.topic_slug` when both are present and SHALL be validated.
- `work_id` SHALL be parsed only as a fallback for known topic-scoped producer/work_id templates, such as `wave0-source-{topic.slug}`, `wave0-suppl-{topic.slug}-r{N}`, `wave1-deepen-{topic.slug}`, `wave1-suppl-{topic.slug}-r{N}`, `seed-topic-{topic.slug}`, `wave2-backfill-{topic.slug}`, `wave2-suppl-cross-{topic.slug}-r{N}`, and `wave2-suppl-emergent-{topic.slug}-r{N}`.
- If both explicit payload/lineage slug and derived `work_id` slug are available, they SHALL match. A mismatch SHALL reject the task.
- Topic scope SHALL be determined from explicit topic fields or known topic-scoped work_id templates, not from `producer_rule` alone. For example, `producer_rule: "topic_deepening"` can be topic-scoped for Wave1/Wave2 per-topic tasks, but Wave2 backing gap tasks such as `wave2-suppl-backing-{finding_id}-r{N}` are finding-scoped when they declare `payload.finding_id` or `lineage.finding_id` and no topic slug.
- If a task is topic-scoped but no slug can be resolved, enqueue SHALL reject the task rather than skip validation.
- Non-topic task cards SHALL skip topic_registry validation when they have no explicit topic slug and no topic-scoped work_id template. Finding-scoped Wave2 search tasks SHALL skip topic_registry validation when they declare a `finding_id`; if `artifacts/wave2/finding-index.yaml` exists, enqueue SHALL validate that `finding_id` is present in the current bundle's finding index.

If the topic slug is not found in `topic_registry`, enqueue SHALL reject the task card with a structured error message identifying the unknown slug and the valid slugs in the registry. The error SHALL be returned as JSON on stdout with exit code 1. The task card SHALL NOT be written to `rb_queue.json`.

#### Scenario: Valid topic slug passes validation

- **WHEN** a task card has `work_id: "wave0-source-01_chinese-professional-league"`
- **AND** `topic_registry` contains a topic with slug `01_chinese-professional-league`
- **THEN** enqueue SHALL accept the task card and write to queue

#### Scenario: Unknown topic slug is rejected

- **WHEN** a task card has `work_id: "wave0-source-03_clinical-scenarios"`
- **AND** `topic_registry` does NOT contain a topic with slug `03_clinical-scenarios`
- **THEN** enqueue SHALL reject with error: `topic_slug '03_clinical-scenarios' not found in bundle topic_registry`
- **AND** the task card SHALL NOT be written to `rb_queue.json`
- **AND** exit code SHALL be 1

#### Scenario: Payload slug and work_id slug mismatch is rejected

- **WHEN** a task card has `producer_rule: "topic_deepening"`
- **AND** `work_id: "wave1-deepen-01_chinese-professional-league"`
- **AND** `payload.topic_slug: "03_clinical-scenarios"`
- **THEN** enqueue SHALL reject before writing queue state
- **AND** error SHALL identify the conflicting slug sources

#### Scenario: Topic-scoped task missing slug is rejected

- **WHEN** a task card has `producer_rule: "topic_deepening"`
- **AND** its `work_id` or declared outputs imply a topic-scoped task
- **AND** it has no `payload.topic_slug`, no `lineage.topic_slug`, and no recognized topic slug in `work_id`
- **THEN** enqueue SHALL reject with a structured unresolved topic slug error

#### Scenario: Wave2 finding-scoped backing task is not forced through topic_registry

- **WHEN** a task card has `work_id: "wave2-suppl-backing-W2F-001-r1"`
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

- **WHEN** a task card does NOT contain a derivable topic slug in its `work_id`, `payload.topic_slug`, or `lineage.topic_slug`
- **AND** no known topic-scoped work_id template or declared output implies topic scope
- **THEN** enqueue SHALL skip topic_registry validation
- **AND** the task card SHALL still pass queue schema validation

### Requirement: Queue schema SHALL include bundle identity

`rb_queue.json` SHALL include a top-level `bundle_name` field. In normal persisted runtime state this field SHALL be a non-empty string equal to `rb_status.json`'s `bundle` field.

Bundle templates or legacy queue files MAY contain `bundle_name: null` or omit the field only at instantiation/migration boundary. The first `operate-queue` operation SHALL inject the bundle name before any mutation, then validate normally.

All `operate-queue` operations SHALL validate that `bundle_name` in the queue file matches the `bundle` field in `rb_status.json` of the bundle directory specified by `--bundle`. Mismatch SHALL result in a rejected operation with a diagnostic message identifying both names.

#### Scenario: Bundle name matches during enqueue

- **WHEN** `rb_queue.json` has `bundle_name: "chinese-football"`
- **AND** `rb_status.json` has `bundle: "chinese-football"`
- **THEN** enqueue SHALL proceed normally

#### Scenario: Bundle name mismatch rejects operation

- **WHEN** `rb_queue.json` has `bundle_name: "medical-ai"`
- **AND** `rb_status.json` has `bundle: "chinese-football"`
- **THEN** the operation SHALL be rejected
- **AND** error SHALL state: `bundle_name mismatch: queue belongs to 'medical-ai', but bundle is 'chinese-football'`

#### Scenario: Missing or null bundle_name in queue is treated as legacy

- **WHEN** `rb_queue.json` was created before this change and has no `bundle_name` field or has `bundle_name: null`
- **THEN** the first `operate-queue` operation SHALL inject `bundle_name` from `rb_status.json`
- **AND** subsequent operations SHALL validate normally

### Requirement: Projection cache SHALL include staleness detection

`operate-queue project` SHALL, when generating the Markdown projection at `_cache/agentic-queue/current-task.md`, include a header comment with `generated_at` (ISO 8601 timestamp) and `source_queue_sha256` (SHA256 hash of `rb_queue.json` content).

`operate-queue check` SHALL, when reading the projection, compare the stored hash against the current `rb_queue.json` hash. If they differ, check SHALL emit a warning: `projection is stale — rerun operate-queue project`. The check SHALL NOT fail on staleness alone — staleness is a warning, not a blocking condition.

#### Scenario: Fresh projection matches authority

- **WHEN** projection hash matches current `rb_queue.json` hash
- **THEN** `operate-queue check` SHALL report projection as current

#### Scenario: Stale projection emits warning

- **WHEN** `rb_queue.json` has been modified since the projection was generated
- **THEN** `operate-queue check` SHALL emit a staleness warning
- **AND** the check SHALL continue with other validations

### Requirement: Queue repair SHALL remove stale task cards

`operate-queue repair --remove-stale` SHALL read `rb_plan.md` topic_registry, iterate all slots and refill_pool, resolve each task card's topic slug using the same deterministic resolver as enqueue, and remove task cards whose resolved topic slug is not in the registry. Finding-scoped Wave2 task cards without topic slug SHALL NOT be removed by topic repair solely for lacking `topic_slug`; if a current finding-index is available and their `finding_id` is absent, repair SHALL remove them and report them as stale finding-scoped cards in the JSON summary.

The repair command SHALL output a JSON summary of changes: which task cards were removed, from which slots, and why. It SHALL NOT modify task cards whose topic slugs ARE in the registry.

Repair SHALL NOT run while an add-topic or rerun instantiation flow is in progress, as the topic_registry may be in a transitional state. The caller SHALL gate repair on stable bundle phase/status (e.g., between waves, not during active topic addition). If repair detects an in-progress instantiation marker, it SHALL exit with a diagnostic message rather than risk removing legitimate in-flight task cards.

#### Scenario: Stale task card removed

- **WHEN** `slot_3_pending` contains a task card with `work_id: "seed-topic-03_clinical-scenarios"`
- **AND** `topic_registry` does NOT contain `03_clinical-scenarios`
- **THEN** `repair --remove-stale` SHALL remove the task card from `slot_3_pending`
- **AND** the slot SHALL be set to `null`
- **AND** summary SHALL list the removal

#### Scenario: Valid task card preserved

- **WHEN** `slot_1_current` contains a task card with slug in `topic_registry`
- **THEN** `repair --remove-stale` SHALL NOT remove or modify it
