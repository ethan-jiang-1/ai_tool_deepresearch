> req: RWP-001, RWP-002, RWP-003, RWP-008, RWP-009, RWP-010, RWP-011, RWP-014

## ADDED Requirements

### Requirement: Wave phases SHALL teach the work-unit drain loop

Wave0, Wave1, and Wave2 phase Markdown SHALL teach the delegated-work loop as queue demand claim, work-unit execution, submit, ledger append, and gate aggregation. Phase docs SHALL say that multiple work units may be claimed and submitted before the gate runs.

#### Scenario: phase doc explains aggregate gate

- **WHEN** a Phase Agent reads a wave phase doc
- **THEN** it SHALL see that the wave gate runs after queue demand and in-flight work units are drained

### Requirement: Gate failure SHALL refill through work units

Wave phase docs SHALL state that gate failure creates repair/refill queue demand that re-enters the same work-unit loop. Gate failure SHALL NOT introduce another delegated mechanism.

#### Scenario: gate repair returns to claim loop

- **WHEN** a wave gate reports missing delegated coverage
- **THEN** the phase instructions SHALL route repair through queue refill and new work-unit claim

### Requirement: Work-unit role guidance SHALL be Phase-Agent-loaded guidance

Role guidance SHALL be work-unit sub-agent task guidance. Active phase docs SHALL not instruct the Phase Agent to load non-work-unit role protocols as production execution protocol.

#### Scenario: role guidance uses work-unit protocol

- **WHEN** delegated task guidance is loaded
- **THEN** it SHALL describe work-unit task/result/receipt expectations

## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, submit results by `work_id`, and run the gate after phase drain.

#### Scenario: Wave0 source intake uses work-unit commands

- **WHEN** Wave0 source intake has delegated queue demand
- **THEN** the phase doc SHALL instruct `operate-work-unit claim` and `operate-work-unit submit`

### Requirement: Wave1 phase body completeness with subagent boundary

Wave1 phase body SHALL describe topic deepening delegated work as work-unit kind `wave1_topic_deepening`, with bounded sub-agent execution, lifecycle receipt, submit, and ledger coverage.

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 deepening is delegated
- **THEN** the phase doc SHALL identify `wave1_topic_deepening` work units

### Requirement: Wave2 phase body completeness

Wave2 phase body SHALL describe pure synthesis as main-agent work and targeted evidence search as optional delegated work-unit kind `wave2_targeted_evidence`.

#### Scenario: Wave2 targeted search uses work-unit loop

- **WHEN** Wave2 identifies a gap requiring delegated evidence search
- **THEN** the phase doc SHALL route that gap into queue demand and work-unit submit

### Requirement: Wave1 foundation placeholder boundary enforcement

Wave1 SHALL forbid fake completion claims while allowing topic-specific deepening only when delegated evidence-producing outputs are covered by submitted work-unit ledger rows and pass the Wave1 gate. The boundary is no longer "do not claim deepening"; it is "do not claim deepening without work-unit-backed evidence, declared references, cache trail handling, and gate pass."

#### Scenario: deepening claim requires submitted work-unit coverage

- **WHEN** a Wave1 artifact claims topic-specific deepening completed
- **AND** the corresponding evidence outputs lack submitted work-unit ledger coverage
- **THEN** `wave1-complete` SHALL fail provenance checks or emit delegated bypass diagnostics

## REMOVED Requirements

### Requirement: Relay role spec files are Phase-Agent-loaded guidance

**Reason**: Active phase guidance should load work-unit task guidance, not relay role protocols.

**Migration**: Use `Work-unit role guidance SHALL be Phase-Agent-loaded guidance`.

#### Scenario: obsolete role guidance is replaced

- **WHEN** active phase docs describe delegated task guidance
- **THEN** they SHALL use work-unit guidance

### Requirement: Wave1 future expansion tracks documentation

**Reason**: Work-unit replacement makes Wave1 delegated execution active production behavior rather than future relay expansion wording.

**Migration**: Wave1 phase docs SHALL directly describe `wave1_topic_deepening` work units and gate coverage.

#### Scenario: Wave1 no longer labels delegated deepening as future relay expansion

- **WHEN** Wave1 docs describe delegated topic deepening
- **THEN** they SHALL present the work-unit loop as current production behavior
