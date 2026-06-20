## RENAMED Requirements

- FROM: `### Requirement: Each branch node has independent execution logic`
- TO: `### Requirement: Branch checkpoints apply deterministic state transforms`

- FROM: `### Requirement: Branches are independently testable`
- TO: `### Requirement: Branch transforms are independently testable`

- FROM: `### Requirement: Nodes are dynamically loadable from a runtime registry`
- TO: `### Requirement: Branch keys resolve through an explicit map`

## MODIFIED Requirements

### Requirement: Branch checkpoints apply deterministic state transforms

Each branch checkpoint SHALL represent a deterministic state transform or feedback outcome. Branch logic MAY update structured state fields needed for checkpoint repair or dispatch, but SHALL NOT execute Agent-facing workflow node bodies or own multi-stage Agent Flow.

Current `ForkStep` / `sharedRepairStep` names in `subagent-relay.mjs` are accepted implementation names for this deterministic checkpoint layer. They SHALL NOT be interpreted as workflow node bodies, Markdown node execution, or semantic repair strategy authority.

#### Scenario: Pass branch records next gate state

- **WHEN** `pass` branch transform is applied
- **THEN** state records the deterministic transition marker required by the branch contract, such as `current_gate: 'wave_next'`

#### Scenario: Fail-A branch records topic repair attempt

- **WHEN** `fail_a` branch transform is applied
- **THEN** state records `topicRepairAttempted: true` without changing `ref_count`

#### Scenario: Fail-B branch supplements one reference count

- **WHEN** `fail_b` branch transform is applied
- **THEN** state increments `ref_count` by 1 without changing `topicReadiness`

#### Scenario: Blocked branch records HITL boundary

- **WHEN** `blocked` branch transform is applied
- **THEN** state records the blocked/HITL marker required by the branch contract, such as `current_gate: 'blocked_hitl'`

#### Scenario: Shared repair transform handles both failure types

- **WHEN** shared repair transform is applied
- **AND** state has `ref_count < ref_floor`
- **THEN** shared repair increases `ref_count` toward `ref_floor`
- **AND** when state has `topicReadiness === 'not_ready'`, shared repair sets `topicReadiness` to `'ready'`
- **AND** when state has `topicReadiness === 'blocked'`, shared repair does not override the human-required boundary

### Requirement: Branch transforms are independently testable

Each branch transform SHALL be testable in isolation with structured state input. Tests SHALL verify deterministic state changes without requiring Agent Flow execution or Markdown node execution.

#### Scenario: Test a single branch transform without loading full workflow

- **WHEN** a test invokes the fail-A branch transform with valid structured state
- **THEN** the transform returns the expected updated state without depending on a full workflow runner

### Requirement: Branch keys resolve through an explicit map

A branch map in the deterministic Engine layer SHALL allow resolving branch identifiers to branch handlers or transform records at runtime. The resolver SHALL expose the branch identifier and resolved handler for inspection. The handler is a checkpoint transform, not an Agent-facing workflow node body.

#### Scenario: Known branch key resolves to handler

- **WHEN** `forkRouter(state)` is called for a `pass` branch
- **THEN** it returns the branch identifier and resolved handler or transform record

#### Scenario: Unknown branch key throws

- **WHEN** an unrecognized branch identifier is encountered
- **THEN** an error is thrown with the message containing the unknown branch key
