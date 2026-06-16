# Fork Repair Converge
> req: FOR-001

多个 fail 分支汇聚到共享 repair，修好后重回 Gate 重判。

## ADDED Requirements

### Requirement: Multiple fail branches can converge to a shared repair segment
When any fail branch executes, the state SHALL be routed to a repair segment. Different branches MAY share the same repair segment or use branch-specific repair.

#### Scenario: Two fail branches share one repair
- **WHEN** both `fail_a` and `fail_b` route to `sharedRepair`
- **THEN** the repair segment handles both failure types, inspecting state to determine what to fix

### Requirement: After repair, state re-enters Gate for re-evaluation
After repair completes, the state SHALL re-enter the gate. The gate MAY route to a different branch than the original failure.

#### Scenario: Repair changes the routing outcome
- **WHEN** state entered Gate as `fail_a` (missing references), repair added references, and state re-enters Gate
- **THEN** Gate now returns `pass` (references now meet floor)
