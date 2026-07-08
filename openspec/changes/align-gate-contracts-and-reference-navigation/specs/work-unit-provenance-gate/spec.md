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
- **THEN** `wave1_work_unit_output_coverage` MAY count those paths as covered

#### Scenario: other role does not satisfy required output coverage

- **WHEN** a submitted Wave1 ledger row declares `artifacts/wave1/01_topic/evidence-summary.md` only as role `other`
- **THEN** Wave1 required output coverage SHALL NOT treat that row as canonical evidence-summary coverage
- **AND** diagnostics SHALL identify the missing canonical coverage or the submit normalization that should have occurred

#### Scenario: extra other output remains non-blocking

- **WHEN** a Wave1 work unit declares an extra notes file as role `other`
- **THEN** that extra output SHALL NOT be reported as required-output drift
- **AND** it SHALL NOT satisfy evidence-summary or question-list coverage
