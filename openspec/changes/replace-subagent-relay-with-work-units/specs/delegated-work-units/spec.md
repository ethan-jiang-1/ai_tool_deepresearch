> req: DEW-001, DEW-002, DEW-003, DEW-004, DEW-005, DEW-006, DEW-007, DEW-008

## ADDED Requirements

### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path

Production delegated work SHALL use the path `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate`. A work unit SHALL mean one Engine-allocated delegated execution attempt for one queue demand item. A wave, phase, queue item, runtime thread, or filesystem artifact SHALL NOT be called a work unit unless it is the Engine-allocated attempt envelope.

#### Scenario: production delegated path is singular

- **WHEN** active specs, framework docs, phase docs, tests, or playbooks describe delegated completion
- **THEN** they SHALL describe queue demand claimed into a work unit and returned through submit
- **AND** they SHALL NOT describe any alternate production delegated-work mechanism

### Requirement: Work-unit identity SHALL be Engine-allocated and index-backed

The Engine SHALL allocate every `work_id` and record it in `_work_units/_index.json`. The canonical work ID format SHALL be `wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}`, with three-digit batch indexes and four-digit claim indexes. Encoded fields SHALL match the index, directory path, manifest, result, and ledger row.

#### Scenario: malformed work ID is rejected

- **WHEN** a submitted result names a `work_id` whose encoded wave, batch, kind, or claim index disagrees with the manifest or index
- **THEN** submit SHALL fail closed
- **AND** no queue completion or ledger append SHALL occur

### Requirement: Work-unit claim SHALL bind queue demand and lease

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move the queue demand into `delegated_in_flight`, write the effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

#### Scenario: claim creates in-flight attempt

- **WHEN** an eligible delegated queue demand item is claimed
- **THEN** the Engine SHALL create the work-unit envelope
- **AND** the queue demand SHALL be present in `delegated_in_flight` with the allocated `work_id`

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema, beacon, runtime receipt path, status, result surfaces, and optional runtime refs needed to validate submit and diagnose execution. The Engine SHALL generate an opaque `receipt_nonce` and require the nonce to agree across index, manifest, beacon, task, runtime receipt, result, and ledger.

#### Scenario: nonce mismatch blocks submit

- **WHEN** a result or runtime receipt carries a nonce that differs from the work-unit beacon
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be written

### Requirement: Submit SHALL be the only successful delegated completion transition

Successful delegated completion SHALL occur only through file-based `operate-work-unit submit`. Submit SHALL validate the result, runtime receipt, nonce, output files, cache trails, queue binding, snapshot hash, index state, and idempotency fingerprint before it completes queue demand or appends the bundle-root output declaration ledger.

#### Scenario: successful submit completes one queue demand

- **WHEN** a valid result is submitted for a claimed work unit
- **THEN** the Engine SHALL complete the bound `queue_item_id`
- **AND** append exactly one work-unit ledger row for that `work_id`

### Requirement: Invalid submit SHALL remain non-terminal

Invalid submit SHALL leave the attempt `claimed`, record `last_submit_rejection`, emit diagnostics, and write no ledger row. Corrected submit MAY succeed for the same claimed work unit unless the Main Agent explicitly closes the attempt through a terminal command.

#### Scenario: corrected submit can reuse claimed attempt

- **WHEN** submit rejects a result because a declared output is missing
- **AND** the result bundle is corrected for the same claimed `work_id`
- **THEN** a later submit MAY succeed for that work unit

### Requirement: Terminal attempt transitions SHALL fail closed

`fail`, `timeout`, and `abandon` SHALL close the current work-unit attempt without queue completion or ledger coverage. Retry or replacement SHALL allocate a new `work_id`. Late submit against a terminal attempt SHALL fail closed.

#### Scenario: timeout retry allocates replacement ID

- **WHEN** a claimed work unit is timed out and the queue demand remains valid
- **THEN** the Engine SHALL close the timed-out attempt
- **AND** a later retry SHALL use a different `work_id`

### Requirement: Gates SHALL read submitted work-unit ledger coverage

Delegated gate coverage SHALL come only from Engine-written work-unit rows in `rb_output_declarations.jsonl`. `_work_units/_index.json`, manifest, result, receipt, beacon, cache, and output files SHALL be cross-check surfaces, not independent pass coverage.

#### Scenario: filesystem-only delegated output cannot pass

- **WHEN** a delegated output file exists without submitted work-unit ledger coverage
- **THEN** the gate SHALL fail delegated coverage
- **AND** the file MAY be reported as cleanup or bypass diagnostic evidence only
