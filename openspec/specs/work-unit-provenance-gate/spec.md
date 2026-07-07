# Work Unit Provenance Gate

> req: WPG-001, WPG-002, WPG-003, WPG-004, WPG-005, WPG-006, WPG-007, WPG-008, WPG-009, WPG-010, WPG-011

## Purpose

Accepted requirements for work-unit-provenance-gate after archiving replace-subagent-relay-with-work-units.

## Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL read Engine-written rows in bundle-root `rb_output_declarations.jsonl` as the delegated coverage authority. The check name SHALL be `work_unit_ledger_exists`. A row SHALL count only when its work-unit fields are schema-valid, its `ledger_record_hash` verifies, and it binds to a submitted work-unit attempt.

#### Scenario: hand-written ledger row is rejected

- **WHEN** a ledger row contains work-unit-looking fields but lacks a valid submit fingerprint or matching submitted index entry
- **THEN** `work_unit_ledger_exists` SHALL fail
- **AND** the row SHALL NOT count as coverage

### Requirement: Gate SHALL verify work-unit submission presence

Work-unit provenance gates SHALL verify that each counted delegated ledger row binds to a `submitted` work unit whose `_work_units/_index.json` entry, manifest, result, runtime receipt, beacon, receipt nonce, output files, cache trails, and hashes agree.

#### Scenario: stale manifest binding fails

- **WHEN** a ledger row references a `work_id` whose manifest claims a different `queue_item_id`
- **THEN** `work_unit_submission_presence` SHALL fail
- **AND** the gate SHALL report the mismatched surfaces

### Requirement: Gate SHALL verify work-unit output coverage

Work-unit provenance gates SHALL verify output coverage from submitted work-unit ledger rows for the target wave, kind, scope, and required output contract. The check name SHALL be `work_unit_output_coverage`.

#### Scenario: missing submitted output coverage fails

- **WHEN** a wave expects a delegated reference output
- **AND** no submitted work-unit ledger row declares that output
- **THEN** `work_unit_output_coverage` SHALL fail even if the file exists on disk

### Requirement: Gate SHALL reject non-work-unit delegated authority surfaces

Work-unit provenance gates SHALL reject delegated artifacts, result references, hand-written declarations, and filesystem-only outputs that are not covered by submitted work-unit ledger rows. These surfaces MAY appear in diagnostics as bypass or cleanup evidence, but they SHALL NOT become alternate coverage authority.

#### Scenario: non-work-unit delegated path cannot pass gate

- **WHEN** a delegated result file exists but no submitted work-unit ledger row covers the output
- **THEN** the gate SHALL fail delegated provenance
- **AND** the path SHALL be reported as non-authoritative

### Requirement: Wave2 work-unit provenance SHALL be conditional on delegated evidence search

Wave2 work-unit provenance SHALL be conditional on delegated search or evidence work. Pure cross-topic synthesis remains main-agent work and SHALL NOT require a work-unit row; Wave2 targeted evidence search SHALL require submitted work-unit coverage.

#### Scenario: pure synthesis does not require delegated coverage

- **WHEN** Wave2 performs pure synthesis from already accepted artifacts
- **THEN** the gate SHALL NOT require a delegated work-unit row for that synthesis step
- **AND** any new delegated evidence search SHALL require submitted work-unit coverage

### Requirement: Work-unit provenance checks SHALL be standard gate definition checks

Work-unit provenance check types SHALL be standard `check` values in gate definition JSON files using the same rule structure as existing check types. Supported delegated provenance checks are `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.

Gate CLI rule evaluation SHALL dispatch to work-unit provenance checks through the same `rule.check` switch as structural checks. Provenance checks SHALL NOT require a separate CLI or a separate gate pass.

#### Scenario: work-unit provenance rule in gate definition

- **WHEN** a wave gate definition contains a rule with `"check": "work_unit_output_coverage"`
- **THEN** the gate CLI SHALL evaluate it in the rule evaluation loop
- **AND** the rule SHALL contribute to the overall pass/fail determination

### Requirement: Gate SHALL detect delegated bypass by phase

Work-unit provenance gates SHALL detect suspected delegated bypass by phase using the check name `delegated_bypass_suspected`. It SHALL report direct/orphan outputs, non-work-unit delegated artifacts, and hand-written declarations that lack submitted work-unit coverage.

#### Scenario: bypass diagnostic is failure evidence

- **WHEN** a phase output exists without submitted work-unit ledger coverage
- **THEN** `delegated_bypass_suspected` SHALL report the file
- **AND** the diagnostic SHALL NOT provide alternate pass authority

### Requirement: Gate diagnostics SHALL carry work-unit binding context

Work-unit provenance diagnostics SHALL carry `work_id` when available, `queue_item_id` when available, `wave`, `kind`, check name, and mismatched surface refs. Diagnostics SHALL use work-unit binding context rather than non-work-unit channel keys.

#### Scenario: mismatch diagnostic identifies work unit

- **WHEN** a result hash mismatch is found for a submitted work unit
- **THEN** the diagnostic SHALL include `work_id`, `queue_item_id`, `wave`, and `kind`
- **AND** it SHALL identify the mismatched work-unit surfaces

### Requirement: Gate SHALL emit work-unit nonce mismatch diagnostics

Work-unit provenance gates SHALL compare the work-unit `receipt_nonce` across submitted ledger row, manifest, result, runtime receipt, beacon, and lifecycle events when those surfaces are available. A missing nonce, malformed nonce, or nonce disagreement SHALL emit a `provenance_nonce_mismatch` diagnostic. The diagnostic is advisory unless paired with a failing authoritative work-unit provenance check.

#### Scenario: malformed nonce is flagged

- **WHEN** a work-unit binding surface carries a receipt nonce that is malformed or not equal to the manifest nonce
- **THEN** the gate SHALL emit `provenance_nonce_mismatch`
- **AND** the diagnostic SHALL identify the mismatched work-unit surfaces

### Requirement: Gate SHALL emit work-unit lifecycle evidence diagnostics

Work-unit provenance gates SHALL check, for each evidence-producing submitted work unit, whether lifecycle events exist with matching `work_id` and `receipt_nonce` when lifecycle logging is expected. Missing lifecycle evidence SHALL emit `lifecycle_events_missing` as an advisory diagnostic and SHALL NOT replace authoritative ledger and submit checks.

#### Scenario: missing lifecycle evidence is advisory

- **WHEN** a submitted evidence-producing work unit has no matching lifecycle event
- **THEN** the gate SHALL emit `lifecycle_events_missing`
- **AND** pass/fail authority SHALL still come from submitted ledger coverage and required cross-checks

### Requirement: Framework SHALL ship a work-unit provenance-forensics guide

The framework SHALL ship a durable provenance-forensics judgment guide that a coding agent can read post-run to decide whether delegated evidence provenance is real or bypassed. The guide SHALL describe work-unit signals across submitted ledger rows, `_work_units/_index.json`, manifest, result, runtime receipt, beacon, lifecycle events, submit fingerprints, output files, cache trails, and gate diagnostics.

The guide SHALL explain forge-resistance as a spectrum: single files can be hand-shaped, while Engine-written submit transactions plus cross-surface hash/nonce consistency and trace/log timing are stronger evidence. The guide SHALL include a decision matrix mapping signal patterns to conclusions and remediation. Signing remains out of scope.

#### Scenario: coding agent decides from landed evidence using the guide

- **WHEN** a coding agent inspects a completed run bundle
- **THEN** it SHALL be able to open the shipped provenance-forensics judgment guide
- **AND** follow work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals to reach a documented conclusion
