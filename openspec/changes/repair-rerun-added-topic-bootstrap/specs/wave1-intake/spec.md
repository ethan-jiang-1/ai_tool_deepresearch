> req: WAI-005, WAI-008

## MODIFIED Requirements

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
- **AND** `write_to` SHALL name the exact depth-review ref or sanctioned declaration-recovery surface that can be repaired
- **AND** `rerun` SHALL name the same Wave1 inspect checkpoint
