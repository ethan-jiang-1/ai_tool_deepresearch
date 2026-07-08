# Wave1 Intake

> req: WAI-001, WAI-002, WAI-003, WAI-004, WAI-005, WAI-006, WAI-007

## Purpose

Define wave1 topic-specific deepening via queue-driven three-stage execution. Each topic gets one deepening task card — Sub-agent executes WebSearch+WebFetch, writes `artifacts/wave1/{topic}/evidence-summary.md`, and Phase Agent immediately backfills the corresponding `seed_topics/{slug}.md` `__BACKFILL_*__` tokens. This replaces the foundation-placeholder skeleton with real evidence-backed deepening, while keeping search noise out of Phase Agent context via Sub-agent dispatch + `_cache/` isolation.
## Requirements
### Requirement: Wave1 phase uses queue-driven three-stage execution

Wave1 SHALL use queue-driven execution with delegated topic deepening represented as queue demand items claimed into work units, submitted by `work_id`, and validated by gate coverage after phase drain.

#### Scenario: Wave1 gate waits for in-flight work

- **WHEN** Wave1 has an in-flight topic deepening work unit
- **THEN** Wave1 SHALL not be considered drained

### Requirement: Sub-agent executes deepening search and writes bounded output

The Wave1 sub-agent SHALL execute bounded topic deepening according to the work-unit task/result schema and SHALL return through `operate-work-unit submit`.

The task SHALL require more than summarizing Wave0. For each assigned topic, the sub-agent SHALL search for topic-specific new evidence, fetch source content, write cache trails, and produce outputs that support mechanism analysis, trend/difficulty/limitation analysis, and profile-required counterexample or cross-verification checks. Wave0 artifacts MAY be used as starting context, but Wave0 URLs SHALL NOT satisfy the Wave1 new-source floor.

The submitted result SHALL expose enough structured fields for the Phase Agent and Engine to compare accepted source claims against Wave0 source URLs and verified cache trails. At minimum, the result SHALL expose `source_claims[]` directly in result metadata or through a machine-readable artifact declared by the result, plus output files and cache trail refs inspectable by `work_id`. Phase-owned `depth-review.yaml` MAY aggregate these claims, but SHALL NOT introduce accepted source coverage that lacks submitted `work_id` backing.

Each `source_claims[]` entry SHALL identify `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional `degraded_capture_ref`. Only structured claims with an accepted/countable status defined by the current source contract count toward coverage. Prose links in `evidence-summary.md` MAY be reported as diagnostics when absent from `source_claims[]`, but SHALL NOT be the primary authority for accepted source coverage.

#### Scenario: bounded output is submitted

- **WHEN** the Wave1 sub-agent writes bounded output
- **THEN** submit SHALL validate the output contract before ledger append

#### Scenario: Wave1 work finds new topic-specific sources

- **WHEN** a Wave1 topic deepening work unit completes
- **THEN** its submitted outputs SHALL identify source URLs that are new relative to that topic's Wave0 source URL set
- **AND** reused Wave0 URLs MAY provide context but SHALL NOT count toward the Wave1 new-source floor

#### Scenario: Wave1 work covers depth dimensions

- **WHEN** a Wave1 topic deepening work unit completes
- **THEN** `evidence-summary.md` or the submitted result SHALL cover mechanism, trend/difficulty, and limitation/dispute/failure-mode dimensions
- **AND** when `rb_profile.yaml` enables counterexample search or cross-verification, the submitted output SHALL record the attempted check and its evidence or limitation

### Requirement: Inline backfill after each task completion

Inline backfill after delegated Wave1 completion SHALL occur after successful work-unit submit and ledger append. Backfill SHALL not treat claimed or invalid-submitted attempts as completed.

#### Scenario: invalid submit does not trigger backfill

- **WHEN** a Wave1 submit is rejected as invalid
- **THEN** inline backfill SHALL not run for that queue demand

### Requirement: Wave1 gate checks deepening artifacts

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger coverage, cross-checks, and deterministic depth-review projections. It SHALL require each topic to have `evidence-summary.md` and `question-list.md` covered by submitted work-unit outputs, plus a Phase-owned `depth-review.yaml` derived from submitted work-unit rows rather than filesystem-only artifacts.

The gate SHALL validate deterministic depth-adjacent facts only: source URL novelty by exact URL comparison against Wave0 source URLs, claimed source URL to submitted cache trail mapping, required depth-review keys, profile parameter presence, and supplementary loop coverage. It SHALL NOT judge whether the evidence is insightful or whether the prose quality is sufficient.

`depth-review.yaml` SHALL contain the following minimum structure:
- `version`
- `topic_slug`
- `reviewed_work_unit_refs[]`
- `wave0_source_urls[]`
- `source_claims[]` with `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs[]`, and optional `degraded_capture_ref`
- `new_source_urls[]`
- `new_source_floor` with `required`, `observed`, and `source`
- `depth_dimensions` with `mechanism`, `trend_or_difficulty`, and `limitation_or_dispute` statuses and refs
- `profile_checks` with entries for counterexample search and cross-verification when required
- `decision` in `accept`, `supplement_required`, or `blocked_contract`
- `supplementary_queue_item_ids[]`

Missing profile/runtime parameters required to compute the floor SHALL produce `decision: blocked_contract` or a gate diagnostic; the gate SHALL NOT invent hidden default thresholds.

#### Scenario: deepening artifact requires ledger row

- **WHEN** a Wave1 deepening artifact exists without submitted ledger coverage
- **THEN** Wave1 gate SHALL fail

#### Scenario: shallow depth review fails

- **WHEN** `depth-review.yaml` records fewer new source URLs than the profile-derived floor
- **THEN** Wave1 gate SHALL fail with diagnostics naming the topic, observed new-source count, required floor, and repair path through supplementary `wave1_topic_deepening`

#### Scenario: missing profile parameter blocks hidden floor

- **WHEN** the required profile/runtime parameter for `new_source_floor.required` is absent
- **THEN** `depth-review.yaml` SHALL record `decision: blocked_contract` or Wave1 gate SHALL fail with a `missing_profile_parameter` diagnostic
- **AND** Wave1 gate SHALL NOT invent a hidden default source floor

#### Scenario: missing cache trail for claimed source fails

- **WHEN** submitted `source_claims[]`, submitted `accepted_source_urls[]`, or a Phase-owned review/reference projection declares an accepted source URL
- **AND** no submitted verified cache trail or explicit degraded-capture record maps to that source URL
- **THEN** Wave1 gate SHALL fail cache/source mapping for that topic

### Requirement: Wave1 queue-loop playbook verifies deepening end-to-end

Wave1 playbook SHALL verify deepening end to end through work-unit claim, sub-agent execution, submit, ledger, Phase Agent depth review, supplementary refill when shallow, backfill, and gate.

The playbook SHALL include negative coverage where a structurally valid Wave1 output is shallow: it reuses Wave0 sources, omits depth dimensions, or declares structured accepted source claims without cache trails. That fixture-backed negative case SHALL prove Engine/phase contract rejection only; it SHALL NOT claim to prove real Agent research quality.

#### Scenario: Wave1 playbook covers out-of-order submit

- **WHEN** multiple Wave1 deepening work units are in flight
- **THEN** the playbook SHALL allow submits to arrive out of order

#### Scenario: Wave1 playbook rejects shallow output

- **WHEN** a Wave1 fixture submits evidence-summary and question-list files that mostly summarize Wave0 and lack enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate check
- **AND** repair SHALL proceed through supplementary work-unit demand rather than force-advance

### Requirement: Wave1 deepening queue items SHALL claim work units

Wave1 deepening queue items SHALL become eligible for `operate-work-unit claim` rather than non-work-unit delegated dispatch. The queue demand SHALL include enough kind/output contract data for the Engine to create a `wave1_topic_deepening` work unit.

Supplementary Wave1 deepening queue items SHALL use the same work-unit path. Their `queue_item_id` MAY include a suffix such as `-v2` or `-suppl-rN`, but topic identity SHALL come from explicit `payload.topic_slug`; queue item ID parsing SHALL be fallback only.

#### Scenario: Wave1 claim creates deepening work unit

- **WHEN** a Wave1 deepening queue item is claimed
- **THEN** the allocated work unit SHALL have kind `wave1_topic_deepening`

#### Scenario: Supplementary Wave1 task keeps topic identity

- **WHEN** shallow Wave1 output requires a second task for topic `topic-a`
- **AND** the Agent enqueues `wave1-deepen-topic-a-v2` with `payload.topic_slug: "topic-a"`
- **THEN** `operate-work-unit claim` SHALL preserve the topic binding through manifest, result, submitted ledger row, and depth review repair refs

