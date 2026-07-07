# agent-output-declaration Specification

> req: AGO-001, AGO-002, AGO-003, AGO-004, AGO-005, AGO-006

## Purpose

Define the Agent output declaration contract that lets Relay slot results, delegated queue completion, the bundle-level output ledger, and downstream gates share one authoritative record of Agent-produced files and cache trails.
## Requirements
### Requirement: Engine SHALL consume declaration ledger, not scan directories to discover Agent outputs

The Engine and gates SHALL consume submitted work-unit rows in `rb_output_declarations.jsonl` as the production evidence of delegated outputs. Filesystem scanning MAY produce diagnostics for orphaned or bypass artifacts, but SHALL NOT create gate pass coverage without a matching Engine-written ledger row.

#### Scenario: orphan output is diagnostic only

- **WHEN** an output file exists under a phase-owned directory without a matching submitted work-unit ledger row
- **THEN** gate provenance SHALL treat it as bypass-suspected diagnostic evidence
- **AND** the file SHALL NOT satisfy delegated output coverage

### Requirement: Production and experiments SHALL converge at schema-validated declaration

Production SHALL obtain declarations from real work-unit submit results. Engine-layer experiments MAY use fixture work-unit results, but those fixtures SHALL pass the same work-unit result schema and enter the same submit / ledger / gate path as production after the declaration point.

#### Scenario: Experiment fixture uses same downstream pipeline

- **WHEN** an Engine-layer playbook provides a fixture work-unit result containing `output_files[]` and `cache_trails[]`
- **AND** that fixture passes work-unit result schema validation
- **THEN** submit and gate SHALL process it through the same code path as a production sub-agent result

#### Scenario: Production sub-agent uses same downstream pipeline

- **WHEN** a real sub-agent submits a work-unit result with declarations
- **THEN** `operate-work-unit submit` SHALL validate and ledger it using the same code path used by fixture-backed Engine tests

### Requirement: Ledger declarations SHALL preserve enough creation context for accepted outputs

Work-unit ledger declarations SHALL preserve creation context through `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `creation_reason`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `result_hash`, and `ledger_record_hash`.

#### Scenario: creation context binds queue and work unit

- **WHEN** a gate reads a delegated output ledger row
- **THEN** it SHALL be able to identify the queue demand, work-unit attempt, result file, runtime receipt, and creation reason from the row

### Requirement: Work-unit result declares output files and cache trails

A submitted work-unit result SHALL declare output files and cache trails through the kind-specific result schema. The Engine SHALL verify those declarations during `operate-work-unit submit` before writing the bundle-level output declaration ledger row.

#### Scenario: submit verifies declared outputs

- **WHEN** a result declares an output file that does not exist
- **THEN** `operate-work-unit submit` SHALL reject the result as non-terminal
- **AND** no `rb_output_declarations.jsonl` row SHALL be appended

### Requirement: Work-unit ledger rows include submit fingerprints

Each Engine-written output declaration ledger row for delegated work SHALL include `result_hash` and `ledger_record_hash`. Same-content duplicate submit SHALL return success without a duplicate ledger append; different-content duplicate submit SHALL fail closed.

#### Scenario: duplicate submit is idempotent only for same content

- **WHEN** the same submitted `work_id` is submitted again with the same result hash and ledger record hash
- **THEN** submit SHALL return success without appending a duplicate row
- **AND** a duplicate submit with different content SHALL fail closed

### Requirement: Work-unit submit SHALL write bundle-level output declaration ledger

For delegated work, `operate-work-unit submit` SHALL write the bundle-level `rb_output_declarations.jsonl` ledger. Queue completion SHALL NOT write delegated work ledger rows. The ledger SHALL remain the single production submission ledger and SHALL use work-unit-only provenance fields.

#### Scenario: successful submit appends one ledger row

- **WHEN** a delegated work unit submits successfully
- **THEN** the Engine SHALL append exactly one `rb_output_declarations.jsonl` row for that `work_id`
- **AND** the row SHALL include `work_id`, `queue_item_id`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `output_files`, and `cache_trails`

