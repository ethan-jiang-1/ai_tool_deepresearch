> req: REL-001

## MODIFIED Requirements

### Requirement: Repair checkpoint updates state and loops back to gate

After repair checkpoint execution via `convergeRepair()`, the workflow state SHALL re-enter the gate for deterministic re-evaluation. The repair checkpoint MAY apply the currently accepted deterministic state transform, but it SHALL NOT execute an Agent-facing workflow node body, own semantic repair strategy, or act as delegated-work transport.

#### Scenario: Repair checkpoint fixes the issue on first attempt

- **WHEN** gate fails due to missing references
- **AND** repair checkpoint updates structured state so references meet the required floor
- **THEN** gate re-evaluates and returns `pass`

#### Scenario: Repair checkpoint returns to gate

- **WHEN** repair checkpoint completes
- **THEN** the next deterministic checkpoint is gate re-evaluation
- **AND** the workflow SHALL NOT directly advance past the gate without re-evaluation
