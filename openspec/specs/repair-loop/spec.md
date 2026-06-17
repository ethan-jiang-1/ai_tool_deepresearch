# Repair Loop
> req: REL-001

## Purpose

Gate 失败 → Repair 段修复状态 → 重回 Gate 重判。含防无限循环机制。

## Requirements

### Requirement: Repair segment modifies state and loops back to gate
After repair execution, the workflow SHALL re-enter the gate for re-evaluation with the repaired state.

#### Scenario: Repair fixes the issue on first attempt
- **WHEN** gate fails due to missing references, repair segment adds references, and state is updated
- **THEN** gate re-evaluates and returns `pass`

#### Scenario: Repair returns to gate
- **WHEN** repair segment completes
- **THEN** the next action is always gate re-evaluation, never direct advancement

### Requirement: Max iterations prevents infinite repair loops
The repair loop SHALL enforce a `maxIterations` limit (default 3) and SHALL detect when state stops changing (state hash unchanged across iterations).

#### Scenario: Max iterations exhausted
- **WHEN** repair has been attempted `maxIterations` times and gate still does not pass
- **THEN** the workflow escalates to a terminal escalation step instead of attempting another repair

#### Scenario: State unchanged across iterations
- **WHEN** repair produces the same state hash as the previous iteration
- **THEN** the loop terminates early with a stall-detection escalation
