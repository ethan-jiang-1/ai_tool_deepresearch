## ADDED Requirements

> req: TRW-006

### Requirement: Routed Wave1 gate attempt SHALL carry its normalized target receipt

The shared Gate trace writer SHALL explicitly validate and project one `carried_target_receipt` only for a successful routed Wave1 Gate attempt. The receipt SHALL contain an Engine-owned contract version, a digest of its ordered selected target set, and each target's canonical topic UID, intent binding, local target ID, and target revision. It SHALL not copy question-list/depth-review bytes, become generic `extraCheck` serialization, or be written by the Wave1 CLI directly.

If receipt projection cannot be durably appended with the successful Wave1 attempt, that pass SHALL not be reported as a consumable routed handoff. The repair is the same Wave1 Gate/trace persistence boundary; no second trace writer or checkpoint authority is created.

#### Scenario: successful Wave1 handoff records a receipt
- **WHEN** a current Wave1 Gate passes with a valid carried-target declaration
- **THEN** its routed `gate_attempt` contains a complete contract-versioned receipt, including an empty selected set when applicable
- **AND** the subsequent Wave2 entry can select that exact trace event through existing handoff/load binding

#### Scenario: trace diagnostic is not a receipt
- **WHEN** a diagnostic or Gate result exposes selected targets but the routed trace event lacks the validated receipt
- **THEN** Wave2 SHALL reject the current handoff as missing contract
- **AND** it SHALL not treat diagnostic content as a replacement authority
