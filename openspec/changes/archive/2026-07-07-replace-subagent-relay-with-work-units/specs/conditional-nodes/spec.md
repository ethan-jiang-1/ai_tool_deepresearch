> req: COS-001

## MODIFIED Requirements

### Requirement: Branch checkpoints apply deterministic state transforms

Each branch checkpoint SHALL represent a deterministic state transform or feedback outcome. Branch logic MAY update structured state fields needed for checkpoint repair or dispatch, but SHALL NOT execute Agent-facing workflow node bodies or own multi-stage Agent Flow.

Current fork/repair checkpoint helper names are accepted implementation names for this deterministic checkpoint layer. They SHALL NOT be interpreted as workflow node bodies, Markdown node execution, delegated-work transport, or semantic repair strategy authority.

#### Scenario: Pass branch records next gate state

- **WHEN** `pass` branch transform is applied
- **THEN** state records the deterministic transition marker required by the branch contract, such as `current_gate: 'wave_next'`

#### Scenario: Fail-A branch records topic repair attempt

- **WHEN** `fail_a` branch transform is applied
- **THEN** state records `topicRepairAttempted: true` without changing `ref_count`

#### Scenario: Fail-B branch supplements one reference count

- **WHEN** `fail_b` branch transform is applied
- **THEN** state increments `ref_count` by 1 without changing `topicReadiness`
