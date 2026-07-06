> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-010, RWG-011, RWG-012, RWG-013, RWG-015

## MODIFIED Requirements

### Requirement: Wave0 complete gate rule set

The Wave0 complete gate definition SHALL include work-unit provenance checks for delegated source intake outputs: `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`. Wave0 SHALL NOT accept non-work-unit delegated artifacts or direct/orphan source files as delegated coverage.

#### Scenario: Wave0 source intake requires submitted work-unit coverage

- **WHEN** Wave0 source files exist but no submitted work-unit ledger row covers them
- **THEN** Wave0 complete gate SHALL fail
- **AND** the diagnostics SHALL report missing work-unit coverage

### Requirement: Wave1 complete gate rule set

The Wave1 complete gate definition SHALL include work-unit provenance checks for delegated topic deepening outputs. Wave1 SHALL validate per-topic output coverage through submitted work-unit ledger rows and SHALL reject non-work-unit-only evidence.

#### Scenario: Wave1 deepening coverage is ledger-first

- **WHEN** a topic deepening file exists without a matching submitted Wave1 work-unit ledger row
- **THEN** Wave1 complete gate SHALL fail delegated provenance

### Requirement: Wave2 complete gate rule set

The Wave2 complete gate definition SHALL distinguish pure main-agent synthesis from delegated targeted evidence search. Delegated Wave2 targeted evidence outputs SHALL require submitted work-unit ledger rows; pure synthesis artifact checks SHALL continue to use synthesis artifact rules.

#### Scenario: delegated Wave2 targeted search requires work-unit row

- **WHEN** Wave2 targeted evidence search creates new evidence outputs
- **THEN** Wave2 complete gate SHALL require submitted work-unit coverage for those outputs

### Requirement: Gate CLI evaluates wave0 rules from definition

The Wave0 gate CLI SHALL evaluate work-unit provenance rule types from the gate definition and SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash mismatches.

#### Scenario: Wave0 CLI rejects stale index

- **WHEN** Wave0 gate finds a ledger row whose work-unit index entry is not `submitted`
- **THEN** the CLI SHALL fail the work-unit provenance check

### Requirement: Gate CLI evaluates wave1 rules from definition

The Wave1 gate CLI SHALL evaluate work-unit provenance rule types from the gate definition and SHALL not scan `_subagents` as a production coverage source.

#### Scenario: Wave1 CLI ignores non-work-unit coverage

- **WHEN** `_subagents` contains Wave1-looking result files
- **AND** no submitted work-unit ledger rows cover the outputs
- **THEN** Wave1 gate CLI SHALL fail delegated provenance

### Requirement: Gate CLI evaluates wave2 rules from definition

The Wave2 gate CLI SHALL evaluate work-unit provenance rule types for delegated targeted evidence and SHALL preserve existing artifact-reference checks for pure synthesis artifacts.

#### Scenario: Wave2 synthesis artifact check remains separate

- **WHEN** Wave2 has no delegated targeted evidence work
- **THEN** Wave2 gate CLI SHALL evaluate synthesis artifact rules without requiring a work-unit row for pure synthesis

### Requirement: Wave2 phase-internal feedback checks are distinct from phase boundary gate

Wave2 phase-internal feedback checks SHALL remain distinct from the phase boundary gate, but any delegated Wave2 evidence work created by those checks SHALL enter the same work-unit claim/submit loop before gate coverage can pass.

#### Scenario: feedback-created evidence work enters loop

- **WHEN** Wave2 feedback identifies a missing evidence gap requiring delegated search
- **THEN** the Engine SHALL enqueue delegated queue demand
- **AND** the gap SHALL be resolved through a new work-unit claim/submit before gate pass

## ADDED Requirements

### Requirement: Wave gates reject mixed delegated provenance paths

Wave gate CLIs SHALL fail when the same phase mixes submitted work-unit coverage with non-work-unit authority for delegated outputs. Non-work-unit delegated artifacts may be reported for cleanup, but SHALL NOT supplement missing work-unit coverage.

#### Scenario: mixed path fails hygiene

- **WHEN** a wave has one submitted work-unit output and one non-work-unit-only delegated output
- **THEN** the gate SHALL fail for the non-work-unit-only output
- **AND** the diagnostic SHALL identify mixed delegated provenance
