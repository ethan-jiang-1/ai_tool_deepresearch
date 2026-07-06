> req: SUC-001, SUC-002

## ADDED Requirements

### Requirement: Work-unit submit SHALL be the delegated return path

Delegated return SHALL occur through `operate-work-unit submit <bundle> --work-id <id> --result <result.json>`. Submit SHALL validate the result bundle, receipt, nonce, output files, cache trails, queue binding, and index state before queue completion or ledger append.

#### Scenario: valid submit completes one in-flight demand

- **WHEN** a sub-agent returns a valid result for an in-flight `work_id`
- **THEN** submit SHALL complete the bound `queue_item_id`
- **AND** append one work-unit ledger row

### Requirement: Invalid submit SHALL be a non-terminal rejection

Invalid submit SHALL record `last_submit_rejection` and diagnostics while keeping the work unit `claimed`. It SHALL NOT complete queue demand, append ledger, or mark the attempt `failed` automatically.

#### Scenario: corrected submit may retry same attempt

- **WHEN** submit is rejected for a missing output file
- **AND** the result bundle is corrected for the same claimed `work_id`
- **THEN** a later submit MAY succeed for that same attempt

## REMOVED Requirements

### Requirement: Collect validated result.json from all slots

**Reason**: Slot collection is replaced by per-work-unit submit.

**Migration**: Submit each returned work unit by `work_id`; aggregate success is gate coverage, not a collect-all command.

#### Scenario: collect-all slots is not production return

- **WHEN** multiple delegated attempts are in flight
- **THEN** the Engine SHALL accept returns through individual `submit --work-id` commands

### Requirement: Collect after all results or timeout

**Reason**: Timeout is now an explicit per-attempt terminal transition.

**Migration**: Use `operate-work-unit timeout` for attempts that exceed their lease.

#### Scenario: timeout is per work unit

- **WHEN** one work unit times out while another is still running
- **THEN** the Main Agent SHALL close the timed-out attempt by `work-id`

### Requirement: Merge results into workflow state

**Reason**: Work-unit submit and ledger append are the deterministic merge boundary for delegated outputs.

**Migration**: Gate aggregation reads submitted ledger rows.

#### Scenario: merge does not bypass submit

- **WHEN** a result file exists but submit has not succeeded
- **THEN** workflow state SHALL NOT treat the delegated output as complete

### Requirement: Per-slot collect during batch sub-agent execution

**Reason**: Batch execution now uses in-flight work units with arbitrary submit order.

**Migration**: Submit each work unit independently by `work_id`.

#### Scenario: batch return uses work_id

- **WHEN** a batch has three in-flight attempts
- **THEN** each return SHALL name its own `work_id`

### Requirement: Artifact verification bridges relay result to queue receipt

**Reason**: Artifact verification now bridges work-unit result to queue demand completion and output ledger.

**Migration**: `operate-work-unit submit` validates artifacts and queue binding in one transaction.

#### Scenario: artifact verification is submit-bound

- **WHEN** artifact verification passes during submit
- **THEN** queue completion and ledger append SHALL happen atomically
