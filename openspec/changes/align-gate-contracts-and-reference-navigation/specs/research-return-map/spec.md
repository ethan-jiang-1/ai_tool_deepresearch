> req: RRM-004

## ADDED Requirements

### Requirement: Evidence-bearing return-map refs SHALL include concrete existing reference files

Evidence-bearing seed-topic return-map entries SHALL include at least one concrete, bundle-relative, existing `reference/*.md` file ref unless the entry explicitly records that no consumer-facing reference is materializable and gives a limitation / deferral reason.

`reference/` is the primary consumer navigation layer. `artifacts/`, `_cache/`, and `_work_units/` MAY appear as secondary provenance refs, but they SHALL NOT be the only refs for an evidence-bearing return-map entry that claims support, refutation, partial support, emergent evidence, or context from existing evidence.

Glob refs and count summaries SHALL be invalid as consumer navigation refs. This includes patterns such as `reference/topic-*.md`, `reference/topic-*.md (8 files)`, and `reference/topic-*.md（8 个）`. The map must enumerate concrete files.

This requirement does not make return maps evidence authority. Submitted work-unit ledgers, reference backing checks, cache trails, and accepted gate surfaces remain the authority for whether evidence counts. The return map only tells a future Agent or reader where to navigate.

Implementation SHALL use a deterministic evidence-bearing predicate instead of broad prose interpretation. At minimum, entries with relationship/status values that claim support, refutation, partial support, emergent evidence, or contextual evidence SHALL be treated as evidence-bearing. Entries may be treated as limitation/non-materialized only when their return-map fields explicitly mark deferral/open/no materializable evidence and do not claim existing evidence support through refs or status.

#### Scenario: concrete existing reference ref passes

- **WHEN** an evidence-bearing return-map entry contains `refs: reference/01_topic-source.md`
- **AND** `reference/01_topic-source.md` exists under the active bundle root
- **THEN** return-map concrete reference validation SHALL pass for that entry

#### Scenario: internal-only refs fail

- **WHEN** an evidence-bearing return-map entry contains refs only to `artifacts/wave1/01_topic/evidence-summary.md`, `_cache/wave1/...`, or `_work_units/wave1/...`
- **THEN** return-map concrete reference validation SHALL fail
- **AND** advice SHALL ask the Agent to add concrete `reference/*.md` navigation or record an explicit limitation

#### Scenario: globbed reference ref fails

- **WHEN** a return-map entry contains `reference/01_topic-*.md`
- **THEN** validation SHALL fail
- **AND** diagnostics SHALL require enumerated concrete reference files

#### Scenario: count-summary reference ref fails

- **WHEN** a return-map entry contains `reference/01_topic-*.md (8 files)` or `reference/01_topic-*.md（8 个）`
- **THEN** validation SHALL fail
- **AND** diagnostics SHALL identify the glob/count summary as non-navigable

#### Scenario: missing concrete reference ref fails

- **WHEN** a return-map entry contains `reference/01_topic-source.md`
- **AND** that file does not exist under the active bundle root
- **THEN** validation SHALL fail
- **AND** diagnostics SHALL name the missing reference file

#### Scenario: explicit limitation may omit concrete reference

- **WHEN** a return-map entry records an explicit limitation, deferral, no materializable source, or non-consumer-facing status
- **THEN** the entry MAY omit concrete `reference/*.md`
- **AND** it SHALL still include refs to the relevant artifacts or process surfaces when available

#### Scenario: deterministic evidence-bearing predicate does not rely on prose judgment

- **WHEN** a return-map entry uses `relationship: supports`, `relationship: refutes`, `relationship: partial`, `relationship: context`, `status: supported`, `status: refuted`, `status: partial`, or `status: emergent`
- **THEN** concrete reference validation SHALL treat the entry as evidence-bearing
- **AND** the validator SHALL NOT require semantic interpretation of the surrounding prose to decide whether the entry needs concrete `reference/*.md` refs
