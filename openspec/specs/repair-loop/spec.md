# Repair Loop
> req: REL-001

## Purpose

Define deterministic repair checkpoint loopback: after a gate failure, repair updates structured state, returns to the gate for re-evaluation, and terminates through explicit max-iteration or stalled-state outcomes.
## Requirements
### Requirement: Repair checkpoint updates state and loops back to gate

After repair checkpoint execution, the workflow state SHALL re-enter the gate for deterministic re-evaluation. The repair checkpoint MAY apply the currently accepted deterministic state transform, but it SHALL NOT execute an Agent-facing workflow node body, own semantic repair strategy, or act as delegated-work transport.

Current repair-loop specs and docs SHALL describe the deterministic repair checkpoint behavior without naming retired delegated implementation modules as the production anchor.

#### Scenario: Repair checkpoint fixes the issue on first attempt

- **WHEN** gate fails due to missing references
- **AND** repair checkpoint updates structured state so references meet the required floor
- **THEN** gate re-evaluates and returns `pass`

#### Scenario: Repair checkpoint returns to gate

- **WHEN** repair checkpoint completes
- **THEN** the next deterministic checkpoint is gate re-evaluation
- **AND** the workflow SHALL NOT directly advance past the gate without re-evaluation

#### Scenario: repair loop wording avoids retired delegated transport

- **WHEN** current specs or docs explain deterministic repair checkpoint behavior
- **THEN** they SHALL describe state repair and gate re-evaluation
- **AND** they SHALL NOT describe a retired delegated module as the production repair-loop implementation

### Requirement: Repair checkpoint loop terminates deterministically

The repair checkpoint loop SHALL enforce a `maxIterations` limit and SHALL detect when state stops changing by comparing state hashes across iterations. The loop SHALL terminate with an explicit outcome rather than hiding another repair attempt or relying on chat/prose escalation.

Implementation names MAY vary, but current specs SHALL anchor the behavior in deterministic checkpoint semantics rather than retired delegated-work transport modules.

#### Scenario: Max iterations exhausted

- **WHEN** repair has been attempted `maxIterations` times and gate still does not pass
- **THEN** the repair loop returns an explicit non-pass outcome for caller inspection instead of attempting another repair

#### Scenario: State unchanged across iterations

- **WHEN** repair produces the same state hash as a previous iteration
- **THEN** the repair loop returns an explicit stalled outcome and terminates early
