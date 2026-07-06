> req: GSK-001, GSK-002, GSK-004, GSK-005, GSK-008, GSK-009

## ADDED Requirements

### Requirement: Gate definitions expose work-unit provenance check types

Gate definitions SHALL support the production check types `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`. Active production gate definitions SHALL NOT use unsupported delegated-provenance check names.

#### Scenario: unsupported delegated provenance check fails definition hygiene

- **WHEN** an active gate definition contains an unsupported delegated-provenance check name
- **THEN** gate definition validation SHALL fail
- **AND** the diagnostic SHALL require `work_unit_submission_presence`

### Requirement: Engine-derived gate attempt diagnostics

Engine-derived diagnostics SHALL include work-unit mismatch details for failed provenance checks, including `work_id`, `queue_item_id`, wave, kind, ledger ref, index ref, manifest ref, result ref, receipt ref, beacon ref, and hash mismatch details when available.

#### Scenario: diagnostic includes binding refs

- **WHEN** `work_unit_submission_presence` fails because a receipt nonce differs
- **THEN** the gate diagnostic SHALL identify the conflicting work-unit surfaces
- **AND** it SHALL not require non-work-unit delegated channel keys

## MODIFIED Requirements

### Requirement: Gate definition JSON skeleton structure

Gate definition JSON SHALL preserve the existing skeleton shape while allowing work-unit provenance rules to name wave, kind, output scope, and required coverage. Rule targets for delegated outputs SHALL be ledger-first and SHALL NOT target non-work-unit delegated directories as coverage authority.

#### Scenario: work-unit rule target is accepted

- **WHEN** a gate definition includes `check: "work_unit_output_coverage"` for Wave1 topic deepening
- **THEN** gate definition validation SHALL accept the rule shape
- **AND** the rule SHALL identify the required wave/kind/output scope

### Requirement: Gate CLI evaluates rules from definition

Gate CLIs SHALL evaluate work-unit provenance checks from definitions through shared gate helpers. They SHALL preserve exit-code conventions and double trace/audit behavior while refusing gate pass from filesystem-only work-unit artifacts or non-work-unit delegated artifacts.

#### Scenario: filesystem-only output fails gate rule

- **WHEN** a gate rule evaluates delegated output coverage
- **AND** only filesystem output exists without submitted work-unit ledger coverage
- **THEN** the gate CLI SHALL fail that rule

## REMOVED Requirements

### Requirement: Engine-derived gate attempt diagnostics (GSK-008)

**Reason**: Requirement IDs belong in the `> req:` header, registry, tasks, and implementation annotations, not in main-spec requirement titles.

**Migration**: Use `Engine-derived gate attempt diagnostics`.

#### Scenario: gate diagnostic title omits registry ID

- **WHEN** the gate-skeleton spec is archived
- **THEN** the replacement requirement title SHALL omit `(GSK-008)`
