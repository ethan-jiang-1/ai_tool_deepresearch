> req: RPG-001, RPG-002, RPG-003, RPG-004, RPG-005, RPG-006, RPG-007, RPG-008, RPG-009, RPG-010, RPG-011, RPG-012, RPG-013

## ADDED Requirements

### Requirement: Gate SHALL verify work-unit submission presence

Gate provenance SHALL verify that each counted delegated ledger row binds to a `submitted` work unit whose `_work_units/_index.json` entry, manifest, result, runtime receipt, beacon, receipt nonce, output files, and hashes agree.

#### Scenario: stale manifest binding fails

- **WHEN** a ledger row references a `work_id` whose manifest claims a different `queue_item_id`
- **THEN** `work_unit_submission_presence` SHALL fail
- **AND** the gate SHALL report the mismatched surfaces

### Requirement: Gate SHALL reject non-work-unit delegated authority surfaces

Gate provenance SHALL reject delegated artifacts, result references, hand-written ledger rows, and filesystem-only outputs that are not covered by submitted work-unit ledger rows. These surfaces MAY appear in diagnostics only as bypass or cleanup evidence, but accepted specs SHALL NOT preserve concrete non-work-unit runtime paths as operational examples.

#### Scenario: non-work-unit delegated path cannot pass gate

- **WHEN** a delegated result file exists but no submitted work-unit ledger row covers the output
- **THEN** the gate SHALL fail delegated provenance
- **AND** the path SHALL be reported as non-authoritative

### Requirement: Wave2 work-unit provenance SHALL be conditional on search evidence

Wave2 work-unit provenance SHALL be conditional on delegated search/evidence work. Pure cross-topic synthesis remains main-agent work and SHALL NOT require a work-unit row; Wave2 targeted evidence search SHALL require submitted work-unit coverage.

#### Scenario: pure synthesis does not require delegated coverage

- **WHEN** Wave2 performs pure synthesis from already accepted artifacts
- **THEN** the gate SHALL NOT require a delegated work-unit row for that synthesis step
- **AND** any new delegated evidence search SHALL require submitted work-unit coverage

### Requirement: Gate SHALL detect delegated bypass by phase

Gate provenance SHALL detect suspected delegated bypass by phase using the check name `delegated_bypass_suspected`. It SHALL report direct/orphan outputs, non-work-unit delegated artifacts, and hand-written declarations that lack submitted work-unit coverage.

#### Scenario: bypass diagnostic is failure evidence

- **WHEN** a phase output exists without submitted work-unit ledger coverage
- **THEN** `delegated_bypass_suspected` SHALL report the file
- **AND** the diagnostic SHALL NOT provide alternate pass authority

### Requirement: Gate provenance diagnostics SHALL carry work-unit binding context

Gate provenance diagnostics SHALL carry `work_id` when available, `queue_item_id` when available, `wave`, `kind`, check name, and the mismatched surface refs. Diagnostics SHALL NOT require a slot key for work-unit production paths.

#### Scenario: mismatch diagnostic identifies work unit

- **WHEN** a result hash mismatch is found for a submitted work unit
- **THEN** the diagnostic SHALL include `work_id`, `queue_item_id`, `wave`, and `kind`
- **AND** it SHALL not depend on a slot key

## MODIFIED Requirements

### Requirement: Gate SHALL verify scoped output declaration ledger entries

Gate provenance SHALL verify scoped `rb_output_declarations.jsonl` entries written by `operate-work-unit submit`. The check name SHALL be `work_unit_ledger_exists`. A row SHALL be accepted only when its work-unit fields are schema-valid and its `ledger_record_hash` verifies.

#### Scenario: hand-written ledger row is rejected

- **WHEN** a ledger row contains work-unit-looking fields but lacks a valid submit fingerprint or matching index entry
- **THEN** `work_unit_ledger_exists` SHALL fail
- **AND** the row SHALL NOT count as coverage

### Requirement: Gate SHALL verify scoped output declaration coverage for current phase outputs

Gate provenance SHALL verify output coverage from submitted work-unit ledger rows for the target wave, kind, scope, and required output contract. The check name SHALL be `work_unit_output_coverage`.

#### Scenario: missing submitted output coverage fails

- **WHEN** a wave expects a delegated reference output
- **AND** no submitted work-unit ledger row declares that output
- **THEN** `work_unit_output_coverage` SHALL fail even if the file exists on disk

### Requirement: Provenance checks SHALL coexist with structural checks in gate definitions

Work-unit provenance check types SHALL be standard `check` values in gate definition JSON files using the same rule structure as existing check types. Supported delegated provenance checks are `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.

Gate CLI rule evaluation SHALL dispatch to work-unit provenance checks through the same `rule.check` switch as structural checks. Provenance checks SHALL NOT require a separate CLI or a separate gate pass.

#### Scenario: work-unit provenance rule in gate definition

- **WHEN** a wave gate definition contains a rule with `"check": "work_unit_output_coverage"`
- **THEN** the gate CLI SHALL evaluate it in the rule evaluation loop
- **AND** the rule SHALL contribute to the overall pass/fail determination

#### Scenario: provenance check uses standard gate result shape

- **WHEN** `work_unit_output_coverage` fails
- **THEN** the failure SHALL appear in `inspect` with the rule's failure message
- **AND** the output JSON SHALL use the standard check/inspect/advice shape

### Requirement: Gate SHALL emit a provenance_chain_inconsistency diagnostic

Gate provenance SHALL cross-check submitted work-unit ledger rows and work-unit binding surfaces, then emit a `provenance_chain_inconsistency` diagnostic when intra-chain references contradict. The diagnostic SHALL cover mismatches among ledger row, index entry, manifest, result, runtime receipt, beacon, lifecycle events, submit fingerprints, and work-unit status. Missing successful submit evidence is owned by work-unit submission/ledger checks and SHALL NOT be duplicated as a separate relay-commit trigger. The diagnostic is advisory only unless paired with a failing authoritative provenance check.

#### Scenario: submitted result without matching receipt is flagged

- **WHEN** a submitted work-unit ledger row points to a result whose receipt nonce disagrees with the runtime receipt or beacon
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`
- **AND** the diagnostic SHALL identify the mismatched work-unit surfaces

#### Scenario: lifecycle event mismatch is flagged

- **WHEN** lifecycle events for a work unit carry a nonce or work identity that disagrees with the submitted binding surfaces
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`

### Requirement: Gate SHALL emit a provenance_nonce_mismatch diagnostic

Gate provenance SHALL compare the work-unit `receipt_nonce` across submitted ledger row, manifest, result, runtime receipt, beacon, and lifecycle events when those surfaces are available. A missing nonce, malformed nonce, or nonce disagreement SHALL emit a `provenance_nonce_mismatch` diagnostic. The diagnostic is advisory unless paired with a failing authoritative work-unit provenance check.

#### Scenario: malformed nonce is flagged

- **WHEN** a work-unit binding surface carries a receipt nonce that is malformed or not equal to the manifest nonce
- **THEN** the gate SHALL emit `provenance_nonce_mismatch`
- **AND** the diagnostic SHALL identify the mismatched work-unit surfaces

#### Scenario: matching nonce emits no diagnostic

- **WHEN** all available work-unit binding surfaces carry the same valid receipt nonce
- **THEN** no `provenance_nonce_mismatch` diagnostic SHALL be emitted for that work unit

### Requirement: Framework SHALL ship a provenance-forensics judgment guide

The framework SHALL ship a durable provenance-forensics judgment guide that a coding agent can read post-run to decide whether delegated evidence provenance is real or bypassed. The guide SHALL describe work-unit signals across submitted ledger rows, `_work_units/_index.json`, manifest, result, runtime receipt, beacon, lifecycle events, submit fingerprints, output files, cache trails, and gate diagnostics.

The guide SHALL explain forge-resistance as a spectrum: single files can be hand-shaped, while Engine-written submit transactions plus cross-surface hash/nonce consistency and trace/log timing are stronger evidence. The guide SHALL include a decision matrix mapping signal patterns to conclusions and remediation. Signing remains out of scope.

#### Scenario: Coding agent decides from landed evidence using the guide

- **WHEN** a coding agent inspects a completed run bundle
- **THEN** it SHALL be able to open the shipped provenance-forensics judgment guide
- **AND** follow work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals to reach a documented conclusion

#### Scenario: Guide covers submit, bypass, and stale-binding patterns

- **WHEN** the guide describes common provenance failures
- **THEN** it SHALL include successful submit, non-work-unit bypass, stale binding, nonce mismatch, missing lifecycle evidence, and late-submit rejection patterns

## REMOVED Requirements

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

### Requirement: All gate provenance diagnostics SHALL carry slotKey and wave

**Reason**: Work-unit diagnostics identify `work_id` and `queue_item_id`; slot keys are not production context.

**Migration**: Use `Gate provenance diagnostics SHALL carry work-unit binding context`.

#### Scenario: diagnostics use work-unit context

- **WHEN** work-unit provenance fails
- **THEN** the diagnostic SHALL include work-unit binding context

### Requirement: Gate SHALL emit a relay_commit_missing diagnostic

**Reason**: Relay commit is not a production transition after this replacement.

**Migration**: Missing work-unit submit, missing ledger row, and uncommitted work-unit transaction diagnostics replace relay commit diagnostics.

#### Scenario: missing submit replaces relay commit diagnostic

- **WHEN** a claimed work unit has no submitted ledger row
- **THEN** the gate/inspect diagnostic SHALL identify missing work-unit submission
- **AND** it SHALL NOT require relay commit evidence
