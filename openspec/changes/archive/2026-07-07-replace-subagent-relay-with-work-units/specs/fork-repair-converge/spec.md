> req: FOR-001

## MODIFIED Requirements

### Requirement: Multiple fail branches can converge to a shared repair checkpoint

When any fail branch is selected, the state SHALL be routable into a shared deterministic repair checkpoint. The shared checkpoint MAY apply the currently accepted deterministic state transform for reference shortage and topic readiness, but it SHALL NOT execute Markdown workflow node bodies or substitute for Agent semantic repair reasoning.

Current shared repair checkpoint naming SHALL be read as a deterministic transform record, not as an Agent-facing repair node or delegated-work transport.

#### Scenario: Two fail branches share one repair checkpoint

- **WHEN** both `fail_a` and `fail_b` converge into a shared repair checkpoint
- **THEN** the repair checkpoint handles both deterministic state dimensions by inspecting structured state
- **AND** it does not execute Markdown workflow nodes or perform semantic evidence repair

#### Scenario: Shared checkpoint fixes both reference and topic state in one iteration

- **WHEN** state has both `ref_count < ref_floor` AND `topicReadiness === 'not_ready'`
- **AND** the deterministic repair loop invokes the shared repair checkpoint
- **THEN** after one repair iteration, `ref_count` has increased AND `topicReadiness` is set to `'ready'`

### Requirement: convergeRepair guards deterministic repair loop termination

`convergeRepair()` SHALL enforce a `maxIterations` limit (default 3). It SHALL detect stall when state hash is unchanged across iterations. It SHALL exit immediately for terminal branches (`pass`, `blocked`). When maxIterations is exhausted, it SHALL return the actual final branch name (e.g. `"fail_a"`) so callers can inspect which branch the state is stuck on.

#### Scenario: Max iterations exhausted

- **WHEN** repair has been attempted `maxIterations` times and state still evaluates to a fail branch (`fail_a` or `fail_b`)
- **THEN** `convergeRepair()` returns `{ outcome: finalBranch, iterations: maxIterations }` where `finalBranch` is the actual branch name, NOT a generic sentinel like `'escalated'`

#### Scenario: Stall detected when state unchanges

- **WHEN** repair produces the same state hash as a previous iteration
- **THEN** `convergeRepair()` returns `{ outcome: 'stalled', iterations: N }` and terminates early

#### Scenario: Blocked state exits converge immediately

- **WHEN** state has `topicReadiness === 'blocked'`
- **AND** `convergeRepair()` is called
- **THEN** it returns `{ outcome: 'blocked', iterations: 0 }` with zero repair attempts and unchanged state
