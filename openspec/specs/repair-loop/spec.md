# Repair Loop
> req: REL-001

## Purpose

Gate 失败 -> repair checkpoint 更新结构化状态 -> 重回 Gate 重判。含防无限循环机制。Repair loop 逻辑实现在 `subagent-relay.mjs` 的 `convergeRepair()` 中；`gate-loop.mjs` 和 `gate-fork.mjs` 是单一函数导出（`checkGate` / `forkGate`），不包含 repair loop。

## Requirements

### Requirement: Repair checkpoint updates state and loops back to gate

After repair checkpoint execution via `convergeRepair()` in `subagent-relay.mjs`, the workflow state SHALL re-enter the gate for deterministic re-evaluation. The repair checkpoint MAY apply the currently accepted deterministic state transform, but it SHALL NOT execute an Agent-facing workflow node body or own semantic repair strategy.

#### Scenario: Repair checkpoint fixes the issue on first attempt

- **WHEN** gate fails due to missing references
- **AND** repair checkpoint updates structured state so references meet the required floor
- **THEN** gate re-evaluates and returns `pass`

#### Scenario: Repair checkpoint returns to gate

- **WHEN** repair checkpoint completes
- **THEN** the next deterministic checkpoint is gate re-evaluation
- **AND** the workflow SHALL NOT directly advance past the gate without re-evaluation

### Requirement: Repair checkpoint loop terminates deterministically

`convergeRepair()` SHALL enforce a `maxIterations` limit (default 3) and SHALL detect when state stops changing by comparing state hashes across iterations. The loop SHALL terminate with an explicit outcome rather than hiding another repair attempt or relying on chat/prose escalation.

#### Scenario: Max iterations exhausted

- **WHEN** repair has been attempted `maxIterations` times and gate still does not pass
- **THEN** `convergeRepair()` returns an explicit non-pass outcome for caller inspection instead of attempting another repair

#### Scenario: State unchanged across iterations

- **WHEN** repair produces the same state hash as a previous iteration
- **THEN** `convergeRepair()` returns an explicit stalled outcome and terminates early
