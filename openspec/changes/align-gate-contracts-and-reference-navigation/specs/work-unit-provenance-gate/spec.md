> req: WPG-013

## ADDED Requirements

### Requirement: Wave1 output coverage SHALL bind required paths to canonical roles

Wave1 work-unit provenance coverage SHALL treat required delegated output path-to-role binding as part of the coverage contract. A submitted ledger row SHALL satisfy Wave1 required output coverage only when:

- `artifacts/wave1/{topic}/evidence-summary.md` is present with canonical role `evidence_summary`; and
- `artifacts/wave1/{topic}/question-list.md` is present with canonical role `question_list`.

The gate helper MAY rely on submit-time normalization to make future ledger rows canonical, but it SHALL NOT let role `other` satisfy these required outputs at gate time. Role `other` SHALL remain available for extra non-blocking outputs that are not selected by required output coverage.

#### Scenario: canonical roles satisfy required output coverage

- **WHEN** submitted Wave1 ledger rows declare `evidence-summary.md` as `evidence_summary`
- **AND** `question-list.md` as `question_list`
- **THEN** `wave1_work_unit_output_coverage` SHALL count those paths as covered when the other required coverage preconditions for that topic are satisfied

#### Scenario: other role does not satisfy required output coverage

- **WHEN** a submitted Wave1 ledger row declares `artifacts/wave1/01_topic/evidence-summary.md` only as role `other`
- **THEN** Wave1 required output coverage SHALL NOT treat that row as canonical evidence-summary coverage
- **AND** diagnostics SHALL identify the missing canonical coverage or the submit normalization that should have occurred

#### Scenario: extra other output remains non-blocking

- **WHEN** a Wave1 work unit declares an extra notes file as role `other`
- **THEN** that extra output SHALL NOT be reported as required-output drift
- **AND** it SHALL NOT satisfy evidence-summary or question-list coverage

### Requirement: Wave2 cross-reference provenance SHALL distinguish submitted targeted evidence from Phase-owned projections

Wave2 work-unit provenance checks for `reference/00-cross-*.md` SHALL distinguish two valid authority paths:

- new fetched evidence backed by submitted `wave2_targeted_evidence` work-unit rows; and
- existing-backed Phase-owned projections backed by prior accepted evidence plus deterministic Wave2 process refs.

The gate SHALL NOT collapse these paths into a single rule that requires every `00-cross` reference to have a new Wave2 submitted row. It also SHALL NOT treat filesystem presence, `source_layer: wave2_cross`, or reference index coverage as sufficient evidence authority without submitted targeted evidence or existing prior backing.

#### Scenario: new fetched cross reference requires submitted Wave2 authority

- **WHEN** a `reference/00-cross-*.md` file introduces a source URL not present in prior accepted backing
- **THEN** Wave2 provenance SHALL require submitted `wave2_targeted_evidence` coverage or receipt authority for that new evidence
- **AND** missing submitted authority SHALL be reported as blocking provenance drift

#### Scenario: existing-backed cross projection does not require a new Wave2 row

- **WHEN** a `reference/00-cross-*.md` file is backed by prior accepted evidence
- **AND** it includes auditable Wave2 process refs such as `W2F-xxx`, `finding-index.yaml`, and `cross-topic-ledger.md`
- **AND** the prior backing resolves to submitted or accepted evidence surfaces
- **THEN** Wave2 provenance MAY classify it as a Phase-owned projection
- **AND** missing new Wave2 submitted output coverage SHALL NOT fail that projection by itself
