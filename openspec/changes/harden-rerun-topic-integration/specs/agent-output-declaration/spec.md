# Agent Output Declaration (delta)

> req: AGO-005

## ADDED Requirements

### Requirement: Ledger declarations SHALL preserve enough creation context for accepted outputs

Each `rb_output_declarations.jsonl` record SHALL preserve enough context to explain why accepted Agent output files exist.

The record SHALL include the existing provenance fields (`work_id`, `producer_rule`, `slot_result_ref`, `runtime_receipt_ref`, `output_files`, `cache_trails`) and SHALL include a `creation_reason` string derived from one of:
- queue item title/action
- slot result summary
- rerun action/rationale when the output is rerun-related

`creation_reason` SHALL be human-readable, non-empty, and derived by the Engine from existing runtime state. Agent SHALL NOT write the ledger directly.

#### Scenario: Delegated completion explains output origin

- **WHEN** delegated `complete()` appends a ledger record
- **THEN** the record SHALL identify the queue work and relay slot that produced the file
- **AND** the record SHALL include a non-empty `creation_reason`
- **AND** a post-run audit SHALL be able to explain the file without reading chat memory
