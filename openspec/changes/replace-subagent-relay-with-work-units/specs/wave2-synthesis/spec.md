> req: WTS-001, WTS-002, WTS-003, WTS-004, WTS-005, WTS-006, WTS-007, WTS-008, WTS-009

## MODIFIED Requirements

### Requirement: Wave2 phase uses queue-driven three-stage execution

Wave2 SHALL keep queue-driven execution, but delegated targeted evidence search SHALL use work-unit claim/submit. Pure cross-topic synthesis SHALL remain main-agent work.

#### Scenario: pure synthesis has no delegated work-unit requirement

- **WHEN** Wave2 performs synthesis using existing accepted evidence
- **THEN** it SHALL not require a work-unit row for that synthesis step

### Requirement: Gap-fill sub-agent dispatch for targeted evidence search

Gap-fill sub-agent dispatch SHALL be represented as queue demand claimed into work-unit kind `wave2_targeted_evidence`. The result SHALL be submitted by `work_id` before any gate coverage can pass.

#### Scenario: gap-fill creates evidence work unit

- **WHEN** Wave2 triage identifies a delegated evidence gap
- **THEN** the Engine SHALL allocate a `wave2_targeted_evidence` work unit

### Requirement: Iterative finding triage + targeted search loop with convergence criteria

Iterative triage SHALL enqueue delegated queue demand for targeted search only when the Main Agent judges new evidence is required. Each delegated search SHALL return through the same work-unit submit loop.

#### Scenario: triage-created search is submitted

- **WHEN** triage creates delegated targeted search demand
- **THEN** gate coverage SHALL require successful work-unit submit

### Requirement: Wave2 sub-agent behavior specification

Wave2 sub-agent behavior SHALL be specified through work-unit task/result/receipt contracts and SHALL bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: Wave2 sub-agent result binds nonce

- **WHEN** a Wave2 targeted evidence result is submitted
- **THEN** submit SHALL verify the receipt nonce across result, receipt, beacon, and manifest

### Requirement: Three-artifact Wave2 output with JS feedback integration

Three-artifact Wave2 synthesis output SHALL continue to use JS feedback for structural/reference checks. Delegated evidence supporting those artifacts SHALL be work-unit ledger covered when it was produced by sub-agent search.

#### Scenario: artifact reference uses delegated evidence row

- **WHEN** a Wave2 artifact references newly delegated evidence
- **THEN** the evidence SHALL be covered by a submitted work-unit ledger row

### Requirement: Cross-topic scan matrix as process evidence surface

The cross-topic scan matrix remains process evidence for synthesis. It SHALL NOT substitute for work-unit ledger coverage when new delegated targeted evidence search was performed.

#### Scenario: scan matrix cannot cover delegated search

- **WHEN** delegated targeted evidence search produced a file
- **THEN** the scan matrix SHALL NOT make that file gate-authoritative without submitted work-unit coverage
