## MODIFIED Requirements

### Requirement: Enqueue SHALL validate topic_slug against topic_registry

> req: QIV-001

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

For `wave0_source_intake`, the same current-facts adapter SHALL derive each unclaimed candidate's exact canonical `source_yaml` target only from its resolved Topic binding and current assignment contract. For delegated in-flight work, it SHALL validate the queue/index current-profile binding and use the immutable required `source_yaml` target already written in that attempt's manifest output contract; it SHALL NOT reinterpret a claimed assignment from mutable current Topic state. It SHALL derive current non-terminal target owners from schema-valid queue demand and delegated in-flight/index/manifest bindings rather than queue ID, task prose, `writes_to`, cache paths, URLs, directory scans, or submitted ledger history. A malformed or unsupported in-flight current profile SHALL retain its existing fail-closed identity rather than being ignored or relabeled as a target conflict. Submitted or otherwise terminal prior work SHALL not remain a target owner; it MAY be the accepted prefix that a later, serial supplement legally extends.

The pure evaluator SHALL reject a Wave0 candidate when current facts identify an earlier queued demand or delegated in-flight attempt owning the same exact target. For check/claim processing of an existing queue, the queue-order-earliest same-target demand with no in-flight owner SHALL be the current eligible owner rather than conflicting with itself; later same-target demands SHALL receive the conflict result. The result SHALL expose `reason_code: wave0_source_target_conflict`, exact target, candidate queue ID, owner queue/work ID when available, the existing admission `repair_kind: agent_action`, and the consuming boundary's same-check or same-claim rerun after the Agent claims a conflict-free prefix or completes the disclosed in-flight owner's existing loop. It SHALL not reuse the attempt-recovery `wait` vocabulary, persist admission, delete or rewrite queue state, infer source-entry ownership, or authorize ledger/source edits.

When that existing assignment contract rejects a Wave1 task card because `payload.assignment_mode` is absent or outside its closed set, the evaluator SHALL project one non-persisted direct feedback record without revalidating or inferring the contract. For `operate-queue enqueue`, the exit-1 response SHALL be JSON on stdout and SHALL expose `reason_code: assignment_contract_rejected`, `coordinate: payload.assignment_mode`, `json_pointer: /payload/assignment_mode`, `allowed_values: [primary, supplementary]`, `repair_kind: agent_action`, `repair_surface: retained_unqueued_task_card`, and the same enqueue rerun using the supplied bundle/task inputs. It SHALL state that the task card, not `rb_queue.json`, is the legal write surface. A top-level `assignment_mode`, an empty receipt set, a queue-item ID suffix, task prose, or `writes_to` SHALL NOT be inferred as the missing payload value. The shared evaluator remains the assignment-contract rule consumer for enqueue, check, claim, and stale repair; those consumers SHALL not recreate a second assignment validator. Any rejected enqueue SHALL leave queue bytes and queue-success/repair trace authority unchanged.

The special enqueue JSON response SHALL apply only when the direct missing/unknown `payload.assignment_mode` failure supplies that feedback. A task card with a legal payload mode that later fails another assignment-contract rule (such as its receipt shape) SHALL retain its existing error channel and SHALL NOT claim the mode coordinate, closed mode values, or task-card repair loop as its failure.

`operate-queue check` SHALL apply the same evaluator to delegated unclaimed demand in `active_window` and `refill_pool`, return each rejected identity with its direct reason, and fail its verdict without admission-specific health persistence or repair. Existing bundle-name normalization remains unchanged. For a same-target Wave0 sequence already persisted by an older framework, check SHALL identify the queue-order-earliest current owner and each blocked later demand so the Agent can claim a conflict-free prefix and drain the sequence serially; it SHALL not prescribe queue deletion or migration.

#### Scenario: Enqueue feedback names the unqueued Wave1 assignment field

- **WHEN** a delegated Wave1 `topic_deepening` task card provides `assignment_mode: "primary"` at its top level but omits `payload.assignment_mode`
- **THEN** `operate-queue enqueue` SHALL exit `1` with a JSON stdout result naming `/payload/assignment_mode`, the exact `["primary", "supplementary"]` values, the retained unqueued task card as the Agent repair surface, and the same enqueue rerun
- **AND** it SHALL not direct the Agent to edit `rb_queue.json`, infer a mode from another card field, write queue state, or append a queue success/repair event

#### Scenario: A different assignment-contract rejection is not relabeled

- **WHEN** a delegated Wave1 `topic_deepening` task card provides legal `payload.assignment_mode: "primary"` but an invalid required-receipt shape
- **THEN** enqueue SHALL retain the existing rejection behavior for that direct receipt failure without emitting the special assignment-mode feedback record
- **AND** it SHALL not claim `/payload/assignment_mode`, `primary|supplementary`, or the mode-repair loop as the reason for rejection

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
- **THEN** enqueue SHALL reject because no slug can match an empty registry

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

#### Scenario: Enqueue rejects a second active Wave0 target owner

- **WHEN** an unqueued Wave0 card resolves to the same exact `source_yaml` target as an existing queued demand or delegated in-flight attempt
- **THEN** enqueue SHALL exit `1` with the target-conflict result and leave queue, index, trace, and work-unit envelope bytes unchanged
- **AND** changing the candidate's queue ID, brief, cache trails, or URL set SHALL not remove the conflict

#### Scenario: Submitted prefix does not permanently lock a target

- **WHEN** a prior Wave0 attempt for a target is submitted and no queued or delegated in-flight demand currently owns that target
- **THEN** a new valid supplementary demand for the same target MAY pass admission
- **AND** its later submit SHALL remain subject to the existing monotonic contribution contract

#### Scenario: Different Wave0 targets remain concurrently admissible

- **WHEN** two Wave0 cards resolve to different canonical Topic source targets
- **THEN** target exclusivity SHALL not reject either card merely because both use kind `wave0_source_intake`
- **AND** existing queue capacity, actor, and claim rules SHALL continue to decide admission
