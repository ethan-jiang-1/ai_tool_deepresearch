## REMOVED Requirements

### Requirement: All-slots-failed triggers Engine repair

**Reason**: Repair is no longer derived from aggregate delegated return slots.

**Migration**: Use work-unit terminal attempts, timeout retry, queue refill, and repair-loop checkpoint behavior.

#### Scenario: all-return failure is not a production trigger

- **WHEN** delegated attempts fail
- **THEN** repair SHALL be driven by work-unit and queue state

### Requirement: Single slot failure is non-fatal

**Reason**: Partial delegated failure is now represented through individual work-unit attempt state and queue retry/refill behavior.

**Migration**: Use work-unit `fail`, `timeout`, `abandon`, retry, and submitted ledger coverage.

#### Scenario: partial attempt failure uses work-unit state

- **WHEN** one delegated attempt fails
- **THEN** the Engine SHALL reason over that work unit and its bound queue demand

### Requirement: SubagentWorkflowState validates after merge

**Reason**: Merged delegated workflow state is replaced by queue v2, work-unit index, and submitted ledger coverage.

**Migration**: Validate queue v2, work-unit index, and gate coverage instead.

#### Scenario: merged state validation is replaced

- **WHEN** delegated work returns
- **THEN** validation SHALL inspect submitted work-unit and queue state, not merged delegated workflow state
