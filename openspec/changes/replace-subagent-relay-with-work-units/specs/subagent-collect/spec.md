## REMOVED Requirements

### Requirement: Collect validated result.json from all slots

**Reason**: Slot collection is replaced by per-work-unit submit.

**Migration**: Use `delegated-work-units` requirement `Submit SHALL be the only successful delegated completion transition`; aggregate success is gate coverage, not a collect-all command.

#### Scenario: collect-all slots is not production return

- **WHEN** multiple delegated attempts are in flight
- **THEN** the Engine SHALL accept returns through individual `submit --work-id` commands

### Requirement: Collect after all results or timeout

**Reason**: Timeout is now an explicit per-attempt terminal transition.

**Migration**: Use `delegated-work-units` requirement `Terminal attempt transitions SHALL fail closed`.

#### Scenario: timeout is per work unit

- **WHEN** one work unit times out while another is still running
- **THEN** the Main Agent SHALL close the timed-out attempt by `work-id`

### Requirement: Merge results into workflow state

**Reason**: Work-unit submit and ledger append are the deterministic merge boundary for delegated outputs.

**Migration**: Use `delegated-work-units` requirement `Gates SHALL read submitted work-unit ledger coverage`.

#### Scenario: merge does not bypass submit

- **WHEN** a result file exists but submit has not succeeded
- **THEN** workflow state SHALL NOT treat the delegated output as complete

### Requirement: Per-slot collect during batch sub-agent execution

**Reason**: Batch execution now uses in-flight work units with arbitrary submit order.

**Migration**: Use `agentic-queue` requirement `Delegated submit completes queue demand by work-id binding`.

#### Scenario: batch return uses work_id

- **WHEN** a batch has three in-flight attempts
- **THEN** each return SHALL name its own `work_id`

### Requirement: Artifact verification bridges relay result to queue receipt

**Reason**: Artifact verification now bridges work-unit result to queue demand completion and output ledger.

**Migration**: Use `agentic-queue` requirement `Work-unit submit SHALL validate declared output files`.

#### Scenario: artifact verification is submit-bound

- **WHEN** artifact verification passes during submit
- **THEN** queue completion and ledger append SHALL happen atomically
