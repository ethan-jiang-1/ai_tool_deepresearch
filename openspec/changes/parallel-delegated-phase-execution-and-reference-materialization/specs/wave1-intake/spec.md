> req: WAI-008

## ADDED Requirements

### Requirement: Wave1 topic references SHALL be Phase-owned materializations after successful submit

Wave1 topic-specific reference files SHALL be materialized by the Phase Agent after a successful `wave1_topic_deepening` work-unit submit. The Sub-agent SHALL provide the evidence substrate: `evidence-summary.md`, `question-list.md`, structured `source_claims[]`, accepted source URLs when available, cache trails, runtime receipt, and bounded result JSON. The Phase Agent SHALL use that submitted substrate to write consumer-facing `reference/{topic_slug}-<source-slug>.md` files and update `reference/_INDEX.md`.

Every Phase-owned topic reference SHALL be backed by at least one submitted Wave1 source claim or submitted cache trail for the same source URL, or by an explicit degraded-capture record accepted through submit. A Phase-owned topic reference SHALL NOT introduce accepted source coverage absent from submitted work-unit rows. If the Phase Agent needs a source not present in submitted backing, it SHALL enqueue supplementary `wave1_topic_deepening` demand rather than direct-search or invent a reference.

Backfill and depth review MAY reference Phase-owned topic references, but delegated coverage authority remains the submitted work-unit ledger and cache/source-claim binding.

#### Scenario: successful submit triggers Phase-owned topic reference materialization

- **WHEN** a `wave1_topic_deepening` work unit submits successfully with accepted source claims and cache trails
- **THEN** the Phase Agent SHALL write one or more `reference/{topic_slug}-<source-slug>.md` files for consumer navigation when suitable sources exist
- **AND** it SHALL update `reference/_INDEX.md` before the Wave1 gate

#### Scenario: unsubmitted source cannot become topic reference authority

- **WHEN** the Phase Agent wants to create a topic reference for a source URL absent from submitted source claims and verified cache trails
- **THEN** it SHALL NOT materialize that URL as accepted Wave1 evidence
- **AND** it SHALL repair through supplementary `wave1_topic_deepening` or record a limitation

#### Scenario: Sub-agent omission of rich reference file is not submit failure by itself

- **WHEN** a Wave1 Sub-agent submits valid evidence-summary, question-list, source claims, accepted source URLs, and cache trails but no rich reference Markdown file
- **THEN** the submit path MAY still accept the work unit if all delegated output/cache contracts pass
- **AND** the Phase Agent remains responsible for post-submit reference materialization before gate

#### Scenario: depth review cannot create new delegated coverage

- **WHEN** `depth-review.yaml` or seed-topic backfill names a Phase-owned topic reference
- **THEN** that reference SHALL bind back to submitted work-unit rows and cache/source claims
- **AND** it SHALL NOT expand delegated coverage beyond the submitted source substrate
