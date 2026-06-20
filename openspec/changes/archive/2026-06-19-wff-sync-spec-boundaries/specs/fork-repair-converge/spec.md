## RENAMED Requirements

- FROM: `### Requirement: Multiple fail branches can converge to a shared repair node`
- TO: `### Requirement: Multiple fail branches can converge to a shared repair checkpoint`

- FROM: `### Requirement: After repair, state re-enters Gate for re-evaluation`
- TO: `### Requirement: After repair checkpoint, state re-enters Gate for re-evaluation`

- FROM: `### Requirement: convergeRepair guards against infinite loops`
- TO: `### Requirement: convergeRepair guards deterministic repair loop termination`

## MODIFIED Requirements

### Requirement: Multiple fail branches can converge to a shared repair checkpoint

When any fail branch is selected, the state SHALL be routable into a shared deterministic repair checkpoint. The shared checkpoint MAY apply the currently accepted deterministic state transform for reference shortage and topic readiness, but it SHALL NOT execute Markdown workflow node bodies or substitute for Agent semantic repair reasoning.

Current `sharedRepairStep` naming in `subagent-relay.mjs` is accepted as an implementation name for this checkpoint. It SHALL be read as a deterministic transform record, not as an Agent-facing repair node.

#### Scenario: Two fail branches share one repair checkpoint

- **WHEN** both `fail_a` and `fail_b` converge into `sharedRepairStep`
- **THEN** the repair checkpoint handles both deterministic state dimensions by inspecting structured state
- **AND** it does not execute Markdown workflow nodes or perform semantic evidence repair

#### Scenario: Shared checkpoint fixes both reference and topic state in one iteration

- **WHEN** state has both `ref_count < ref_floor` AND `topicReadiness === 'not_ready'`
- **AND** `convergeRepair()` invokes `sharedRepairStep`
- **THEN** after one repair iteration, `ref_count` has increased AND `topicReadiness` is set to `'ready'`

### Requirement: After repair checkpoint, state re-enters Gate for re-evaluation

After the repair checkpoint completes, the state SHALL re-enter the gate for deterministic re-evaluation. The gate MAY classify the repaired state into a different branch than the original failure.

#### Scenario: Repair checkpoint changes the branch outcome

- **WHEN** state entered Gate as `fail_a` because references were below floor
- **AND** repair checkpoint increased references to meet floor
- **THEN** Gate now returns `pass`

#### Scenario: Repair checkpoint reveals a different branch

- **WHEN** state entered Gate as `fail_a`
- **AND** repair checkpoint fixes references, but another deterministic condition remains during re-evaluation
- **THEN** Gate MAY return `fail_b` instead of `pass`
- **NOTE:** 当前 `sharedRepairStep` 是单调修复（同时修 ref 和 topic），此场景在当前实现中不可达。保留此 scenario 作为架构能力声明：`convergeRepair` 的合约允许重新分类到不同分支。

### Requirement: convergeRepair guards deterministic repair loop termination

`convergeRepair()` (in `subagent-relay.mjs`) SHALL enforce a `maxIterations` limit (default 3). It SHALL detect stall when state hash is unchanged across iterations. It SHALL exit immediately for terminal branches (`pass`, `blocked`). When maxIterations is exhausted, it SHALL return the actual final branch name (e.g., `"fail_a"`) so callers can inspect which branch the state is stuck on.

#### Scenario: Max iterations exhausted

- **WHEN** repair has been attempted `maxIterations` times and state still evaluates to a fail branch (`fail_a` or `fail_b`)
- **THEN** `convergeRepair()` returns `{ outcome: finalBranch, iterations: maxIterations }` where `finalBranch` is the actual branch name, NOT a generic sentinel like `'escalated'`
- **NOTE:** 与 gate-loop 的 `repairLoop` 不同，gate-fork 返回具体 branch 名以保持分支语义透明。

#### Scenario: Stall detected when state unchanges

- **WHEN** repair produces the same state hash as a previous iteration
- **THEN** `convergeRepair()` returns `{ outcome: 'stalled', iterations: N }` and terminates early
- **NOTE:** 当前 `sharedRepairStep` 是单调的（ref_count 只增，topic 只进不退），故此场景在正常使用中不可达。保留此检测作为防御性护栏。

#### Scenario: Blocked state exits converge immediately

- **WHEN** state has `topicReadiness === 'blocked'`
- **AND** `convergeRepair()` is called
- **THEN** it returns `{ outcome: 'blocked', iterations: 0 }` with zero repair attempts and unchanged state

#### Scenario: Already-passing state exits converge immediately

- **WHEN** state already satisfies all pass criteria
- **AND** `convergeRepair()` is called
- **THEN** it returns `{ outcome: 'pass', iterations: 0 }` with zero repair attempts
