# Wave1 Intake

> req: WAI-001, WAI-002, WAI-003, WAI-004, WAI-005, WAI-006, WAI-007, WAI-008

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

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger coverage, cross-checks, and one Phase-owned depth-review projection. Each topic SHALL have submitted `evidence-summary.md` and `question-list.md` output coverage plus `artifacts/wave1/{topic}/depth-review.yaml` bound to the exact submitted work-unit rows the Phase Agent reviewed.

Submitted work-unit rows SHALL remain the single direct authority for structured `source_claims[]`, `accepted_source_urls[]`, cache/degraded-capture refs and actor provenance. The gate SHALL derive accepted claims, cache mapping, exact-new URLs and the profile-derived new-source floor from `reviewed_work_unit_refs[]`, current Wave0 source URLs and profile facts. `depth-review.yaml` SHALL NOT be required to copy those deterministic ledger fields into a second blocking authority.

The minimum blocking depth-review structure SHALL therefore be limited to facts that are not already owned by submitted rows or directly derivable:

- `version`
- `topic_slug`
- `reviewed_work_unit_refs[]`
- `depth_dimensions` with `mechanism`, `trend_or_difficulty`, and `limitation_or_dispute` statuses and refs
- `profile_checks` for required counterexample search and cross-verification judgments
- `decision` in `accept`, `supplement_required`, or `blocked_contract`
- `supplementary_queue_item_ids[]`

Legacy or Agent-helpful projections such as `wave0_source_urls[]`, `source_claims[]`, `new_source_urls[]`, and `new_source_floor` MAY remain readable for compatibility or explanation, but SHALL NOT override submitted ledger facts or create independent pass/fail truth. A mismatch in such an optional projection MAY be advisory; the Engine-derived result SHALL remain authoritative.

The gate SHALL validate deterministic depth-adjacent facts only: reviewed submitted-row binding, exact URL novelty, current submitted cache/degraded mapping, profile parameter presence, depth-dimension/ref structure, decision closure and supplementary loop coverage. It SHALL NOT judge prose quality or require the Phase Agent to reproduce ledger/cache arrays manually.

#### Scenario: Deepening artifacts require submitted rows

- **WHEN** Wave1 evidence-summary or question-list artifacts exist without submitted work-unit coverage
- **THEN** Wave1 gate SHALL fail delegated provenance

#### Scenario: Reviewed work-unit refs derive source and cache facts

- **WHEN** `depth-review.yaml` names submitted Wave1 work-unit refs
- **THEN** the checker SHALL read source claims, accepted URLs and cache/degraded refs from those exact rows
- **AND** it SHALL derive novelty and floor observations without requiring copied `source_claims[]` or `cache_trail_refs[]` in the review

#### Scenario: Filesystem-only cache cannot create coverage

- **WHEN** a Phase Agent creates a structurally valid cache leaf that is absent from the reviewed submitted rows
- **THEN** the cache leaf SHALL NOT satisfy source/cache coverage
- **AND** the nearest action SHALL be a legal supplementary or repaired work-unit submit, not copying the path into depth-review

#### Scenario: Missing reviewed row masks derived symptoms

- **WHEN** `reviewed_work_unit_refs[]` is missing, unsafe, unsubmitted or otherwise unresolved
- **THEN** the checker SHALL report that binding as the parent root
- **AND** source/cache/novelty/floor implications derived from the missing rows SHALL be masked

#### Scenario: Shallow derived evidence routes to supplementary work

- **WHEN** accepted exact-new source URLs derived from reviewed submitted rows are below the profile floor
- **THEN** Wave1 gate SHALL report observed and required counts
- **AND** repair SHALL use supplementary `wave1_topic_deepening`

#### Scenario: Missing profile parameter remains blocking

- **WHEN** a required profile/runtime parameter for the new-source floor is absent
- **THEN** the gate SHALL emit `missing_profile_parameter`
- **AND** it SHALL NOT invent a hidden default

#### Scenario: Legacy duplicated fields do not become authority

- **WHEN** an existing depth review contains copied source/cache/new-source fields that differ from current reviewed submitted rows
- **THEN** Engine-derived submitted facts SHALL decide the check
- **AND** the copied fields SHALL be ignored or diagnosed as non-authoritative projection drift rather than treated as a second truth path

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

Wave1 deepening queue items SHALL become eligible for `operate-work-unit claim` rather than non-work-unit delegated dispatch. The queue demand SHALL include the registered `wave1_topic_deepening` kind, canonical Topic UID/current slug, closed `payload.assignment_mode`, canonical required receipts, and any strictly valid non-selector kind-contract customization needed for the Engine to create the work unit.

Current primary demand SHALL use `payload.assignment_mode: "primary"` with exactly the canonical evidence-summary/question-list `file:` receipt pair for the bound Topic. Current supplementary demand SHALL use `payload.assignment_mode: "supplementary"` with empty required receipts and shall acquire new source/cache facts without rewriting the prior pair. Mode and receipt shape SHALL agree at enqueue and claim. Empty receipts alone, a queue-item suffix, title/action prose, `writes_to`, actor role, or current filesystem state SHALL NOT select supplementary behavior.

Supplementary Wave1 deepening queue items SHALL use the same work-unit path. Their `queue_item_id` MAY include a suffix such as `-v2` or `-suppl-rN`, but identity SHALL come from explicit `payload.topic_uid` plus current `payload.topic_slug`, and assignment intent SHALL come only from `payload.assignment_mode`. Queue item ID parsing SHALL NOT supply either fact for current cards.

An unclaimed Wave1 card missing assignment_mode SHALL return to AGQ-013 `repair --queue-item-id --set-assignment-mode` and SHALL NOT be claimed through compatibility inference. A work-unit attempt already claimed before assignment_contract_version existed MAY retain the bounded legacy submit semantics defined by delegated-work-units; queue-card repair SHALL NOT retrofit or reinterpret that attempt.

Persisted historical queue/terminal items MAY remain readable without assignment_mode. Current operation admission, rather than historical storage parsing, SHALL enforce the field before new enqueue/claim success. A planned Wave1 claim batch SHALL validate every candidate's mode/receipt/Topic obligation before any member is allocated.

When post-work_done candidate validation rejects missing research semantics, replacement demand SHALL preserve the failed attempt's canonical Topic and assignment obligation. A failed primary pair SHALL be closed through `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, followed by an explicitly enqueued new primary paired demand under a fresh globally unused queue ID, not weakened into supplementary empty-output work. The semantic reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. This requirement SHALL NOT create automatic requeue, contract IDs in queue payloads, or a second success path.

#### Scenario: Wave1 claim creates deepening work unit

- **WHEN** a current Wave1 primary queue item is enqueued and claimed
- **THEN** it SHALL carry assignment_mode primary and the exact Topic-bound paired receipts
- **AND** the allocated work unit SHALL have kind `wave1_topic_deepening` with current assignment contract binding

#### Scenario: Supplementary Wave1 task keeps topic identity

- **WHEN** shallow Wave1 output requires a second task for canonical topic A
- **AND** the Agent enqueues a new queue item with topic A's UID/current slug, assignment_mode supplementary, and empty required receipts
- **THEN** `operate-work-unit claim` SHALL preserve the Topic binding and supplementary intent through manifest, result guidance, submitted ledger row, and depth-review repair refs
- **AND** the queue ID suffix SHALL remain non-authoritative

#### Scenario: Missing mode cannot be inferred from receipt shape

- **WHEN** an unclaimed Wave1 queue item lacks assignment_mode
- **THEN** enqueue or claim SHALL fail before work-unit allocation and direct AGQ-013 explicit unclaimed assignment-mode repair
- **AND** neither an exact pair nor empty receipts SHALL cause implicit primary/supplementary selection

#### Scenario: historical missing mode is readable but not claimable

- **WHEN** an existing queue contains a terminal-history item or live pre-change Wave1 card without assignment_mode
- **THEN** queue inspection/repair SHALL still load the persisted state
- **AND** new claim SHALL reject a live mode-absent card until the queue owner selects explicit mode and the Engine-derived repaired card passes current admission

#### Scenario: Semantic replacement preserves primary obligation

- **WHEN** a current primary attempt reaches work_done and dry-submit reports missing required research semantics
- **THEN** the Phase Agent SHALL fail that attempt and explicitly enqueue a new primary item with a fresh globally unused `queue_item_id`, the same canonical Topic, and paired receipts
- **AND** it SHALL NOT change assignment_mode to supplementary to avoid the failed direct-output obligation
- **AND** it SHALL NOT reuse the failed ID now retained in terminal_history

### Requirement: Wave1 topic references SHALL be Phase-owned materializations after successful submit

Wave1 topic-specific references SHALL be materialized by the Phase Agent after successful `wave1_topic_deepening` submit. The Sub-agent SHALL provide `evidence-summary.md`, `question-list.md`, structured submitted source claims, accepted URLs when available, verified cache/degraded refs, runtime receipt and result JSON. The Phase Agent SHALL use that submitted substrate to write consumer-facing `reference/{topic_slug}-<source-slug>.md` files and update the accepted eight-column `_INDEX.md`.

The Wave1 Phase Agent SHALL receive `shared/shared-reference-template` as loaded required context through the phase node's actual `requires` chain at the materialization decision point rather than being told to discover it indirectly. Each reference SHALL expose the accepted metadata/topic-binding contract and the five semantic sections, including distinct non-empty `Key Facts` and `Core Content Capture` semantics. Parsing SHALL tolerate harmless heading case, heading level, spacing and section order. Fixed prose character counts and fixed Key Facts bullet counts SHALL NOT be blocking reference-quality authority.

Every Phase-owned topic reference SHALL remain backed by at least one reviewed submitted Wave1 source claim, accepted source URL surface, verified cache trail for the same source, or explicit degraded-capture record. A Phase-owned reference SHALL NOT introduce accepted source coverage absent from submitted rows. If a needed source is absent, the Agent SHALL enqueue supplementary work rather than direct-search, invent a reference, or ask the user to perform ordinary repair.

#### Scenario: Successful submit triggers complete reference materialization

- **WHEN** a Wave1 work unit submits accepted source backing
- **THEN** the Phase Agent SHALL load the shared reference template and materialize a complete topic reference from that backing
- **AND** it SHALL update `_INDEX.md` before inspect/gate

#### Scenario: Key Facts does not substitute for narrative capture

- **WHEN** a materialized reference contains `Key Facts` but no non-empty `Core Content Capture`
- **THEN** the shared format evaluator SHALL report one missing semantic-section root
- **AND** count-floor SHALL NOT additionally report zero countable references due to a hidden prose-length rule

#### Scenario: Harmless Markdown presentation is tolerated

- **WHEN** the five semantic sections are identifiable but use harmless case, spacing, heading-level or ordering differences
- **THEN** the parser SHALL accept them or emit advisory feedback
- **AND** presentation alone SHALL NOT block the reference

#### Scenario: Unsubmitted source cannot become reference authority

- **WHEN** the Phase Agent wants to materialize a source absent from reviewed submitted backing
- **THEN** it SHALL repair through supplementary work-unit execution or record a limitation
- **AND** filesystem-only cache or prose SHALL not create accepted source authority

#### Scenario: Depth review cannot expand delegated coverage

- **WHEN** depth review or backfill names a Phase-owned reference
- **THEN** the reference SHALL bind to the reviewed submitted source substrate
- **AND** copied review fields SHALL NOT expand coverage beyond that substrate

#### Scenario: Missing reviewed authority returns one repair coordinate

- **WHEN** a reviewed work-unit ref cannot resolve to a submitted ledger row
- **THEN** the primary diagnostic SHALL identify that missing submitted binding as `missing_fact`
- **AND** `repair_kind` SHALL identify `agent_action`, `engine_operation`, or `missing_contract` according to whether the reviewed ref, declaration recovery, or unavailable capability is the direct root
- **AND** `write_to` SHALL name the exact depth-review ref or sanctioned declaration-recovery surface that can be repaired
- **AND** `rerun` SHALL name the same Wave1 inspect checkpoint

#### Scenario: successful submit triggers Phase-owned topic reference materialization

- **WHEN** a `wave1_topic_deepening` work unit submits successfully with accepted source backing such as source claims, accepted source URL surfaces, cache trails, or explicit degraded-capture records
- **THEN** the Phase Agent SHALL write `reference/{topic_slug}-<source-slug>.md` files for accepted submitted sources suitable for consumer navigation
- **AND** each reference SHALL include body refs or links to submitted source/cache/work-unit backing that gates or inspectors can scan
- **AND** it SHALL update `reference/_INDEX.md` before the Wave1 gate

#### Scenario: no materializable submitted source is explicit

- **WHEN** a Wave1 topic has no accepted submitted source suitable for a consumer reference after repair attempts are exhausted
- **THEN** the Phase Agent SHALL record the limitation or repair state explicitly in Wave1 artifacts
- **AND** the Wave1 gate SHALL diagnose missing topic reference backing rather than silently treating absence as successful materialization

#### Scenario: unsubmitted source cannot become topic reference authority

- **WHEN** the Phase Agent wants to create a topic reference for a source URL absent from submitted source claims, accepted source URL surfaces, verified cache trails, and explicit degraded-capture records
- **THEN** it SHALL NOT materialize that URL as accepted Wave1 evidence
- **AND** it SHALL repair through supplementary `wave1_topic_deepening` or record a limitation

#### Scenario: Sub-agent omission of rich reference file is not submit failure by itself

- **WHEN** a Wave1 Sub-agent submits valid evidence-summary, question-list, accepted source backing, and cache/degraded-capture surfaces where required but no rich reference Markdown file
- **THEN** the submit path SHALL NOT reject the work unit solely because the rich reference Markdown file is absent when all delegated output/cache contracts pass
- **AND** the Phase Agent remains responsible for post-submit reference materialization before gate

#### Scenario: depth review cannot create new delegated coverage

- **WHEN** `depth-review.yaml` or seed-topic backfill names a Phase-owned topic reference
- **THEN** that reference SHALL bind back to submitted work-unit rows, source claims, cache trails, or explicit degraded-capture records
- **AND** it SHALL NOT expand delegated coverage beyond the submitted source substrate

