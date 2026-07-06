> req: FIO-001, FIO-002, FIO-003, FIO-004

## MODIFIED Requirements

### Requirement: Engine SHALL audit phase-owned directories against expected file patterns

File observability SHALL treat `_work_units/waveN/{work_id}/` as the production delegated runtime path. It SHALL audit work-unit directories, result files, output files, cache trails, and ledger declarations for consistency. Non-work-unit delegated directories SHALL be reported only as removal/bypass diagnostics.

#### Scenario: non-work-unit delegated file is diagnostic

- **WHEN** file observability finds a delegated result file outside submitted work-unit coverage
- **THEN** it SHALL classify the path as a non-authoritative delegated artifact
- **AND** it SHALL NOT treat the file as production coverage

### Requirement: Unplanned files SHALL produce inspect/advice requesting explanation

Unplanned delegated files SHALL produce inspect/advice that identifies whether the file is outside a submitted work-unit ledger row, outside the claimed work-unit directory, or outside the production delegated runtime path. Advice SHALL route repair through work-unit submit, fail, timeout, abandon, or refill.

#### Scenario: orphan output requests work-unit repair

- **WHEN** an expected output exists but no submitted work-unit ledger row declares it
- **THEN** inspect SHALL report the file as orphaned
- **AND** advice SHALL direct the Agent to submit or refill through work-unit mechanisms

### Requirement: Explained files SHALL remain non-authoritative unless declared through ledger or receipt

Agent explanations SHALL remain diagnostic only. Delegated output files SHALL become gate-authoritative only when covered by a successful work-unit submit ledger row and passing cross-checks.

#### Scenario: explanation does not create coverage

- **WHEN** an Agent explains an orphan delegated file in logs
- **THEN** that explanation SHALL NOT make the file count as gate coverage

## ADDED Requirements

### Requirement: File observability SHALL detect mixed delegated provenance

File observability SHALL detect bundles that contain submitted work-unit artifacts alongside non-work-unit delegated artifacts for the same delegated output scope and SHALL report mixed delegated provenance as a blocker.

#### Scenario: mixed provenance is a blocker

- **WHEN** a wave contains a submitted work-unit output and a non-work-unit-only delegated output
- **THEN** inspect SHALL report mixed delegated provenance
- **AND** the non-work-unit-only output SHALL remain non-authoritative
