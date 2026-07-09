> req: AGO-003, AGO-005

## MODIFIED Requirements

### Requirement: Work-unit submit SHALL write bundle-level output declaration ledger

For delegated work, Engine-owned work-unit completion SHALL write the bundle-level `rb_output_declarations.jsonl` ledger. Normal `operate-work-unit submit` remains the standard path for claimed attempts. Explicit audited `operate-work-unit late-submit` MAY append the same authority class of submitted ledger row only for eligible `timed_out` originals.

The ledger SHALL remain the single production submission ledger. Late-submit SHALL append exactly one submitted row for the original `work_id`; it SHALL NOT amend old rows, rewrite identity into a retry work unit, or create a second submitted row when a replacement already submitted.

#### Scenario: audited late-submit writes one ledger row

- **WHEN** an eligible timed-out original is accepted through `late-submit`
- **THEN** the Engine SHALL append one submitted ledger row for the original `work_id`
- **AND** the row SHALL include hash-covered late-accept audit fields

### Requirement: Ledger declarations SHALL preserve enough creation context for accepted outputs

Audited late-accepted rows SHALL preserve the normal work-unit creation context plus `late_accept`, `late_accept_reason`, `terminal_status_before_accept`, and `superseded_retry_work_ids`. These audit fields SHALL be included in `ledger_record_hash`.

#### Scenario: half-audit rows are invalid

- **WHEN** a submitted row omits `late_accept` or has `late_accept: false`
- **BUT** it carries late-accept companion fields
- **THEN** ledger schema validation SHALL reject the row
