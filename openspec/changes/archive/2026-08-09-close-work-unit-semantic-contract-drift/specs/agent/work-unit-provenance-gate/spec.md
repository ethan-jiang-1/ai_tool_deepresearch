> req: WPG-007

## MODIFIED Requirements

### Requirement: Gate SHALL detect delegated bypass by phase

Work-unit provenance gates SHALL detect suspected delegated bypass by phase using the check name `delegated_bypass_suspected`. It SHALL report direct/orphan outputs, non-work-unit delegated artifacts, and hand-written declarations that lack submitted work-unit coverage.

The bypass diagnostic SHALL determine whether a declaration is current, historical, missing, malformed, or unsubmitted through the same normalized submitted-ledger and immutable-supersession conclusion used by provenance coverage. A raw `rb_output_declarations.jsonl` reader MAY display or locate historical rows, but SHALL NOT independently infer that a row is bypass evidence by comparing raw history with a current normalized set. It MAY suppress a raw row only when its exact work-id/hash pair matches a normalized `hash_valid_historical` predecessor with one complete immutable supersession relation and matching successor lineage. That row is historical context, not a hand-written declaration or a current coverage candidate. A missing, attributable-drift, malformed, unattributable, invalid, or genuinely unsubmitted declaration SHALL remain bypass evidence and SHALL fail closed.

#### Scenario: bypass diagnostic is failure evidence

- **WHEN** a phase output exists without submitted work-unit ledger coverage
- **THEN** `delegated_bypass_suspected` SHALL report the file
- **AND** the diagnostic SHALL NOT provide alternate pass authority

#### Scenario: superseded predecessor is historical rather than bypass evidence

- **WHEN** a raw declaration reader exposes a submitted predecessor with one valid immutable supersession relation and matching successor lineage
- **THEN** `delegated_bypass_suspected` SHALL not report that predecessor as a hand-written or non-submitted declaration
- **AND** the Gate SHALL continue to evaluate the successor's current submitted coverage through the normal normalized-ledger path

#### Scenario: raw history does not hide a real bypass

- **WHEN** a raw declaration row is not a valid historical predecessor and cannot resolve to a hash-valid current submitted ledger row
- **THEN** `delegated_bypass_suspected` SHALL report that row as bypass evidence
- **AND** it SHALL not classify the row historical merely because another work unit exists for the same phase

#### Scenario: drifted historical-looking raw row remains bypass evidence

- **WHEN** a raw declaration names a superseded predecessor but its ledger hash
  does not exactly match a normalized `hash_valid_historical` entry
- **THEN** `delegated_bypass_suspected` SHALL report the row as bypass evidence
- **AND** it SHALL not suppress the row merely because its work ID has a valid
  supersession relation
