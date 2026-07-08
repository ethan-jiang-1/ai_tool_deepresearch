# Queue Input Validation

> req: QIV-001, QIV-002, QIV-003, QIV-004, QIV-005

## Purpose

Queue entry validation — verify task card consistency with bundle at enqueue time, preventing cross-bundle contamination. Queue schema includes bundle identity, and projection cache includes staleness detection.
## Requirements
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

`operate-queue repair --remove-stale` SHALL read `rb_plan.md` topic_registry and inspect queue v2 locations: `active_window`, `refill_pool`, and eligible non-terminal queue demand references. It SHALL resolve each queue item's topic slug using the same deterministic resolver as enqueue and remove task cards whose resolved topic slug is not in the registry. Delegated attempts already claimed into `delegated_in_flight` SHALL require work-unit terminal handling before queue repair mutates their demand binding.

#### Scenario: stale active-window task card removed

- **WHEN** `active_window` contains a queue item whose topic slug is absent from `topic_registry`
- **THEN** repair SHALL remove that queue item
- **AND** the summary SHALL identify the removed `queue_item_id`

#### Scenario: in-flight delegated demand is not silently removed

- **WHEN** a stale topic is bound to a non-terminal work unit in `delegated_in_flight`
- **THEN** repair SHALL fail closed with advice to resolve the work-unit attempt first

### Requirement: Queue and work-unit runtime CLIs SHALL reject help and suspicious bundle arguments before side effects

`operate-queue.mjs` and `operate-work-unit.mjs` SHALL handle help flags and suspicious bundle arguments before any runtime side effect. A runtime side effect includes creating bundle-like directories, creating `_logs/`, reading or mutating `rb_queue.json`, reading or mutating `_work_units/`, appending trace/log files, or writing diagnostic artifacts.

Top-level `--help` or `-h` SHALL print usage and exit 0. Subcommand help such as `operate-queue enqueue --help` or `operate-work-unit claim --help` SHALL print usage or a clear argument error matching that CLI's local error-output convention, but SHALL NOT treat the help token as a bundle path. Any positional bundle value that begins with `-` SHALL be rejected before runtime load unless a future explicit path-escape syntax is specified by a separate change. This change SHALL NOT introduce a new `--bundle` alias for these positional-bundle CLIs.

#### Scenario: top-level help has no runtime side effect

- **WHEN** `node DPT_FRAMEWORK/cli/operate-queue.mjs --help` is invoked
- **OR** `node DPT_FRAMEWORK/cli/operate-work-unit.mjs --help` is invoked
- **THEN** the CLI SHALL print usage and exit 0
- **AND** it SHALL NOT create a `--help/` directory or any bundle-like runtime files

#### Scenario: subcommand help is not treated as bundle path

- **WHEN** `node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue --help` is invoked
- **OR** `node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim --help` is invoked
- **THEN** the CLI SHALL print usage or a clear argument error matching its local convention
- **AND** it SHALL NOT load queue/work-unit state from `--help`
- **AND** it SHALL NOT create a `--help/` directory

#### Scenario: suspicious bundle positional is rejected early

- **WHEN** `operate-queue` or `operate-work-unit` receives a bundle positional value beginning with `-`
- **THEN** the CLI SHALL reject the invocation before loading queue, trace, log, or work-unit state
- **AND** the rejection SHALL identify the suspicious bundle argument

#### Scenario: unsupported bundle flag form has no side effect

- **WHEN** `operate-queue` or `operate-work-unit` receives an unsupported flag-shaped bundle form such as `--bundle --help`
- **THEN** the CLI SHALL reject the invocation or print usage before runtime side effects
- **AND** it SHALL NOT create directories or files named `--bundle`, `--help`, or another flag-shaped token
- **AND** it SHALL NOT add a new `--bundle` alias as part of this change

#### Scenario: valid bundle invocation is unchanged

- **WHEN** `operate-queue` or `operate-work-unit` receives a valid explicit bundle path and valid subcommand arguments
- **THEN** the CLI SHALL continue to execute the existing queue or work-unit operation
- **AND** the help/suspicious-argument guard SHALL NOT weaken existing schema, bundle identity, or queue validation
