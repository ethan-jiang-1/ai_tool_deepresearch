# Queue Input Validation

> req: QIV-001, QIV-002, QIV-003, QIV-004, QIV-005, QIV-006, QIV-007

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

Before writing a delegated card to the existing work-unit claim path, enqueue SHALL use one shared side-effect-free delegated queue-demand admission path: a thin current-facts adapter plus one pure evaluator. The evaluator SHALL use the current canonical Topic/finding and committed-topic facts, a supported explicit kind (`wave0_source_intake`, `wave1_topic_deepening`, or `wave2_targeted_evidence`), and the closed assignment-contract inputs. It SHALL apply only to delegated work-unit demand; non-delegated cards retain their existing validation and completion contract. Admission is recomputed at each consuming boundary and SHALL not persist or trust an enqueue verdict.

When that existing assignment contract rejects a Wave1 task card because
`payload.assignment_mode` is absent or outside its closed set, the evaluator
SHALL project one non-persisted direct feedback record without revalidating or
inferring the contract. For `operate-queue enqueue`, the exit-1 response SHALL
be JSON on stdout and SHALL expose `reason_code: assignment_contract_rejected`,
`coordinate: payload.assignment_mode`,
`json_pointer: /payload/assignment_mode`,
`allowed_values: [primary, supplementary]`, `repair_kind: agent_action`,
`repair_surface: retained_unqueued_task_card`, and the same enqueue rerun using
the supplied bundle/task inputs. It SHALL state that the task card, not
`rb_queue.json`, is the legal write surface. A top-level `assignment_mode`, an
empty receipt set, a queue-item ID suffix, task prose, or `writes_to` SHALL NOT
be inferred as the missing payload value. The shared evaluator remains the
assignment-contract rule consumer for enqueue, check, claim, and stale repair;
those consumers SHALL not recreate a second assignment validator. Any rejected
enqueue SHALL leave queue bytes and queue-success/repair trace authority
unchanged.

The special enqueue JSON response SHALL apply only when the direct
missing/unknown `payload.assignment_mode` failure supplies that feedback. A
task card with a legal payload mode that later fails another assignment-contract
rule (such as its receipt shape) SHALL retain its existing error channel and
SHALL NOT claim the mode coordinate, closed mode values, or task-card repair
loop as its failure.

`operate-queue check` SHALL apply the same evaluator to delegated unclaimed demand in `active_window` and `refill_pool`, return each rejected identity with its direct reason, and fail its verdict without admission-specific health persistence or repair. Existing bundle-name normalization remains unchanged.

#### Scenario: Enqueue feedback names the unqueued Wave1 assignment field

- **WHEN** a delegated Wave1 `topic_deepening` task card provides
  `assignment_mode: "primary"` at its top level but omits
  `payload.assignment_mode`
- **THEN** `operate-queue enqueue` SHALL exit `1` with a JSON stdout result
  naming `/payload/assignment_mode`, the exact
  `["primary", "supplementary"]` values, the retained unqueued task card as
  the Agent repair surface, and the same enqueue rerun
- **AND** it SHALL not direct the Agent to edit `rb_queue.json`, infer a mode
  from another card field, write queue state, or append a queue success/repair
  event

#### Scenario: A different assignment-contract rejection is not relabeled

- **WHEN** a delegated Wave1 `topic_deepening` task card provides legal
  `payload.assignment_mode: "primary"` but an invalid required-receipt shape
- **THEN** enqueue SHALL retain the existing rejection behavior for that direct
  receipt failure without emitting the special assignment-mode feedback record
- **AND** it SHALL not claim `/payload/assignment_mode`,
  `primary|supplementary`, or the mode-repair loop as the reason for rejection

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

#### Scenario: delegated kind is never phase-inferred

- **WHEN** a delegated card omits or declares an unsupported `kind`
- **THEN** enqueue and claim SHALL reject it before queue or work-unit mutation

#### Scenario: check does not become a queue mutation owner

- **WHEN** queue check finds an unclaimable unclaimed delegated demand and bundle identity is current
- **THEN** it SHALL return the item identity and direct admission reason
- **AND** it SHALL leave queue authority bytes unchanged

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

For unclaimed delegated cards in `active_window` and `refill_pool`, repair SHALL additionally use the shared delegated admission evaluator. It SHALL remove a rejected card with its location and direct reason, without adding terminal history, replacement demand, drop permission, or a terminal operation. Non-delegated cards retain only the preceding stale checks. `delegated_in_flight` remains outside current admission evaluation and SHALL not be removed, rewritten, or terminalized by this repair.

#### Scenario: stale active-window task card removed

- **WHEN** `active_window` contains a queue item whose topic slug is absent from `topic_registry`
- **THEN** repair SHALL remove that queue item
- **AND** the summary SHALL identify the removed `queue_item_id`

#### Scenario: in-flight delegated demand is not silently removed

- **WHEN** a stale topic is bound to a non-terminal work unit in `delegated_in_flight`
- **THEN** repair SHALL fail closed with advice to resolve the work-unit attempt first

#### Scenario: legacy unclaimable demand has one existing cleanup path

- **WHEN** a legacy unclaimed delegated card is rejected by current admission
- **THEN** `repair --remove-stale` SHALL remove it and report its direct reason
- **AND** in-flight demand remains owned by existing work-unit terminal handling

### Requirement: Queue and work-unit runtime CLIs SHALL reject help and suspicious bundle arguments before side effects

`operate-queue.mjs` and `operate-work-unit.mjs` SHALL handle help flags and suspicious bundle arguments before any runtime side effect. A runtime side effect includes creating bundle-like directories, creating `_logs/`, reading or mutating `rb_queue.json`, reading or mutating `_work_units/`, appending trace/log files, or writing diagnostic artifacts.

Top-level `--help` or `-h` SHALL print usage and exit 0. Subcommand help such as `operate-queue enqueue --help` or `operate-work-unit claim --help` SHALL print usage or a clear argument error matching that CLI's local error-output convention, but SHALL NOT treat the help token as a bundle path. Any positional bundle value that begins with `-` SHALL be rejected before runtime load unless a future explicit path-escape syntax is specified by a separate change. This change SHALL NOT introduce a new `--bundle` alias for these positional-bundle CLIs.

#### Scenario: top-level help has no runtime side effect

- **WHEN** `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs --help` is invoked
- **OR** `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs --help` is invoked
- **THEN** the CLI SHALL print usage and exit 0
- **AND** it SHALL NOT create a `--help/` directory or any bundle-like runtime files

#### Scenario: subcommand help is not treated as bundle path

- **WHEN** `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue --help` is invoked
- **OR** `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim --help` is invoked
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

### Requirement: Topic enqueue SHALL require committed canonical seed binding

Without changing the queue schema, topic-scoped enqueue SHALL reuse the same
topic-state registry/seed/workspace evaluator used by inspect. Before queue
mutation it SHALL require a schema-valid canonical plan entry for the resolved
current slug, an exact UID-bound seed projection, and no accepted topic-state
workspace affecting the bundle.

A legacy mutable plan, missing/mismatched seed, or accepted workspace SHALL
reject without queue mutation and return the existing nearest direct
schema/seed/workspace boundary. A noncanonical plan SHALL not advertise a
sanctioned rerun, `migrate_legacy`, adoption, upgrade, raw-YAML repair, or any
other current Engine conversion as a legal action. Existing finding-scoped
non-topic exceptions remain unchanged.

#### Scenario: Plan-first crash cannot enqueue work

- **WHEN** topic-state apply has committed new plan bytes but an accepted
  workspace still has pending seed replacements
- **THEN** topic-scoped enqueue SHALL reject without changing queue state
- **AND** the result SHALL return the exact recover action

#### Scenario: Canonical topic enqueue preserves existing slug contract

- **WHEN** a topic slug resolves to a canonical entry, its UID-bound seed
  matches, and no workspace remains
- **THEN** existing topic-slug validation MAY continue and enqueue SHALL not
  require a queue schema migration

#### Scenario: Legacy enqueue does not advertise unreachable migration

- **WHEN** topic-scoped enqueue reads a plan that fails the current canonical
  plan contract
- **THEN** enqueue SHALL reject without queue mutation at its existing current
  plan/topic-state boundary
- **AND** it SHALL not present a direct or deferred migrate, adoption, upgrade,
  or conversion command

### Requirement: Enqueue SHALL accept only current UID-bound layout

Topic-scoped enqueue SHALL resolve the requested current slug to one canonical UID and persist both values in payload. Omitted UID SHALL be deterministically filled; a caller-supplied UID/current-slug mismatch, previous-layout slug, accepted topic-state workspace or noncanonical plan SHALL reject before queue mutation with one nearest action. Historical aliases SHALL be readable for provenance only and SHALL NOT reopen work eligibility.

#### Scenario: Historical slug cannot enqueue
- **WHEN** a task card names a slug present only in `previous_layouts[]`
- **THEN** enqueue SHALL reject without mutation and return the topic's current slug

#### Scenario: Accepted layout workspace short-circuits enqueue
- **WHEN** a topic layout operation remains prepared or partially committed
- **THEN** enqueue SHALL return the exact recover action before evaluating derivative UID/slug symptoms
