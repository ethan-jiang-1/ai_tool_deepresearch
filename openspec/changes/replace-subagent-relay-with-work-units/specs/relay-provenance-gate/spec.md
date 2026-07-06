## REMOVED Requirements

### Requirement: Gate SHALL verify scoped output declaration ledger entries

**Reason**: The relay-named capability is retired as the active provenance gate home.

**Migration**: Use `work-unit-provenance-gate` requirement `Gate SHALL verify submitted work-unit ledger rows`.

#### Scenario: relay capability no longer owns ledger authority

- **WHEN** main specs are archived
- **THEN** ledger authority SHALL be described under a work-unit provenance gate capability

### Requirement: Gate SHALL verify scoped output declaration coverage for current phase outputs

**Reason**: The relay-named capability is retired as the active provenance gate home.

**Migration**: Use `work-unit-provenance-gate` requirement `Gate SHALL verify work-unit output coverage`.

#### Scenario: coverage requirement moves to work-unit gate

- **WHEN** main specs describe delegated output coverage
- **THEN** they SHALL use work-unit provenance wording

### Requirement: Gate SHALL verify successful current-wave subagent slot binding

**Reason**: Current-wave subagent slot binding is replaced by work-unit submission presence.

**Migration**: Use `work_unit_submission_presence`.

#### Scenario: slot binding check is absent

- **WHEN** a wave gate evaluates delegated provenance
- **THEN** it SHALL NOT run `subagent_slot_presence`
- **AND** it SHALL run `work_unit_submission_presence`

### Requirement: Wave2 relay provenance SHALL be conditional on search evidence

**Reason**: The requirement title and semantics encode the removed delegated authority term.

**Migration**: Use `Wave2 work-unit provenance SHALL be conditional on search evidence`.

#### Scenario: Wave2 provenance wording is replaced

- **WHEN** accepted specs describe Wave2 delegated evidence provenance
- **THEN** they SHALL use work-unit provenance wording

### Requirement: Gate SHALL detect suspected relay bypass by phase

**Reason**: The bypass detector remains, but the active check name and wording must be delegated/work-unit based.

**Migration**: Use `delegated_bypass_suspected` and `Gate SHALL detect delegated bypass by phase`.

#### Scenario: bypass check name is replaced

- **WHEN** gate definitions name the bypass check
- **THEN** they SHALL use `delegated_bypass_suspected`

### Requirement: Provenance checks SHALL coexist with structural checks in gate definitions

**Reason**: The stable check-wiring contract moves to the work-unit provenance gate capability.

**Migration**: Use `work-unit-provenance-gate` requirement `Work-unit provenance checks SHALL be standard gate definition checks`.

#### Scenario: gate definition wiring moves to work-unit gate

- **WHEN** active gate definitions include delegated provenance checks
- **THEN** they SHALL use work-unit provenance check names

### Requirement: All gate provenance diagnostics SHALL carry slotKey and wave

**Reason**: Work-unit diagnostics identify `work_id` and `queue_item_id`; slot keys are not production context.

**Migration**: Use `Gate provenance diagnostics SHALL carry work-unit binding context`.

#### Scenario: diagnostics use work-unit context

- **WHEN** work-unit provenance fails
- **THEN** the diagnostic SHALL include work-unit binding context

### Requirement: Gate SHALL emit a provenance_nonce_mismatch diagnostic

**Reason**: The diagnostic remains useful, but it must be expressed through work-unit binding surfaces, not the relay capability.

**Migration**: Use `work-unit-provenance-gate` requirement `Gate SHALL emit work-unit nonce mismatch diagnostics`.

#### Scenario: nonce diagnostic moves to work-unit gate

- **WHEN** nonce binding is checked
- **THEN** the diagnostic SHALL compare work-unit binding surfaces

### Requirement: Gate SHALL emit an agent_timestamp_span_suspicious diagnostic

**Reason**: The old diagnostic reads relay runtime metadata and should not remain as a standalone production requirement.

**Migration**: Fold timestamp/timing forensics into the work-unit provenance-forensics guide and work-unit lifecycle diagnostics.

#### Scenario: timestamp diagnostic is not standalone authority

- **WHEN** runtime timing appears suspicious
- **THEN** it SHALL be advisory forensic context only

### Requirement: Framework SHALL ship a provenance-forensics judgment guide

**Reason**: The guide remains useful, but its stable home is the work-unit provenance gate capability.

**Migration**: Use `work-unit-provenance-gate` requirement `Framework SHALL ship a work-unit provenance-forensics guide`.

#### Scenario: guide moves to work-unit gate

- **WHEN** an agent needs post-run provenance guidance
- **THEN** it SHALL read the work-unit provenance-forensics guide

### Requirement: Gate SHALL emit a lifecycle_events_missing diagnostic

**Reason**: Lifecycle evidence remains useful, but relay slot wording must be removed.

**Migration**: Use `work-unit-provenance-gate` requirement `Gate SHALL emit work-unit lifecycle evidence diagnostics`.

#### Scenario: lifecycle diagnostic uses work-unit identity

- **WHEN** lifecycle evidence is checked
- **THEN** it SHALL bind to `work_id` and `receipt_nonce`

### Requirement: Gate SHALL emit a provenance_chain_inconsistency diagnostic

**Reason**: Chain inconsistency remains useful, but it must be expressed through work-unit binding surfaces.

**Migration**: Use `work-unit-provenance-gate` requirement `Framework SHALL ship a work-unit provenance-forensics guide` and work-unit cross-check diagnostics.

#### Scenario: chain diagnostic uses work-unit surfaces

- **WHEN** gate forensics detects inconsistent references
- **THEN** the diagnostic SHALL identify work-unit ledger/index/manifest/result/receipt surfaces

### Requirement: Gate SHALL emit a relay_commit_missing diagnostic

**Reason**: Relay commit is not a production transition after this replacement.

**Migration**: Missing work-unit submit, missing ledger row, and uncommitted work-unit transaction diagnostics replace relay commit diagnostics.

#### Scenario: missing submit replaces relay commit diagnostic

- **WHEN** a claimed work unit has no submitted ledger row
- **THEN** the gate/inspect diagnostic SHALL identify missing work-unit submission
- **AND** it SHALL NOT require relay commit evidence
