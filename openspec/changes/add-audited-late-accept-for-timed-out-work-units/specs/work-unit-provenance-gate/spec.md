> req: WPG-014

## MODIFIED Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL read Engine-written rows in bundle-root `rb_output_declarations.jsonl` as the delegated coverage authority. The check name SHALL be `work_unit_ledger_exists`. A row SHALL count only when its work-unit fields are schema-valid, its `ledger_record_hash` verifies, and it binds to a submitted work-unit attempt.

Audited late-accepted rows SHALL count as submitted work-unit ledger rows only when the row is Engine-written, hash-valid, schema-valid, marked with valid late-accept audit fields, and the corresponding `_work_units/_index.json` record is `submitted`. A late-accepted row SHALL NOT count if a different replacement work unit for the same `queue_item_id` has also submitted.

#### Scenario: audited late-accepted row is eligible coverage

- **WHEN** `rb_output_declarations.jsonl` contains an Engine-written audited late-accepted row for work unit `W`
- **AND** the row hash, result hash, nonce, output, cache, receipt, index, and audit fields all validate
- **THEN** `work_unit_ledger_exists` SHALL count `W` as submitted delegated coverage

#### Scenario: double submitted replacement blocks late-accepted coverage

- **WHEN** an audited late-accepted row exists for an original timed-out work unit
- **AND** a different replacement work unit for the same `queue_item_id` is also submitted
- **THEN** work-unit provenance SHALL fail closed
- **AND** diagnostics SHALL identify the double-success conflict

## ADDED Requirements

### Requirement: Gates SHALL count audited late-accepted work-unit ledger rows

Work-unit provenance gates SHALL treat audited late-accepted ledger rows as the same authority class as normal submitted work-unit rows after all submit-time and gate-time cross-checks pass. Late acceptance SHALL NOT create a weaker coverage tier, alternate filesystem coverage path, metadata-only relabel, or manual ledger repair path.

A valid audited late-accepted row SHALL preserve late-submit audit fields in diagnostics and cross-checks:

- `late_accept`
- `late_accept_reason`
- `terminal_status_before_accept`
- `superseded_retry_work_ids`

Gate readers SHALL verify that the late-accepted row binds to the original work-unit identity and that every superseded retry work ID is terminal and non-covering when such IDs are present. Malformed audit fields, missing original submitted index status, missing ledger hash coverage, identity mismatch, cache/source/output drift, or submitted replacement conflict SHALL fail closed.

#### Scenario: late-accept audit fields are preserved

- **WHEN** a gate consumes a valid audited late-accepted ledger row
- **THEN** diagnostics or inspect surfaces MAY expose `late_accept`, `terminal_status_before_accept`, `late_accept_reason`, and `superseded_retry_work_ids`
- **AND** the row SHALL still be evaluated as a submitted work-unit row rather than a separate authority class

#### Scenario: malformed late-accept audit fails provenance

- **WHEN** a ledger row claims `late_accept: true`
- **BUT** `terminal_status_before_accept` is not `timed_out`, `late_accept_reason` is missing, or `superseded_retry_work_ids` is malformed
- **THEN** work-unit provenance SHALL reject the row
- **AND** the row SHALL NOT count as delegated coverage

#### Scenario: filesystem-only late output still cannot pass

- **WHEN** original timed-out output files exist on disk
- **BUT** no audited late-accepted Engine ledger row covers them
- **THEN** work-unit provenance SHALL fail delegated coverage
- **AND** diagnostics MAY report the files as cleanup or bypass evidence only

#### Scenario: superseded retry is non-covering

- **WHEN** a late-accepted row lists `superseded_retry_work_ids`
- **THEN** gates SHALL verify those retry IDs are not submitted coverage rows
- **AND** a superseded retry output SHALL NOT count alongside the late-accepted original output
