# Fork Repair Converge
> req: FOR-001

多个 fail 分支汇聚到共享 repair，修好后重回 Gate 重判。含 stall 检测、maxIterations 保护、terminal 分支立即退出。maxIterations 耗尽后返回最终 branch 名（非哨兵值）。

## ADDED Requirements

### Requirement: Multiple fail branches can converge to a shared repair segment
When any fail branch executes, the state SHALL be routable to a shared repair segment. The shared repair SHALL handle all failure types (reference shortage, topic readiness) in a single pass.

#### Scenario: Two fail branches share one repair
- **WHEN** both `fail_a` and `fail_b` route to `sharedRepairStep`
- **THEN** the repair segment handles both failure types, inspecting state to determine what to fix

#### Scenario: Shared repair fixes both reference and topic issues in one iteration
- **WHEN** state has both `ref_count < ref_floor` AND `topicReadiness === 'not_ready'`
- **AND** `convergeRepair()` invokes `sharedRepairStep`
- **THEN** after one repair iteration, `ref_count` has increased AND `topicReadiness` is set to `'ready'`

### Requirement: After repair, state re-enters Gate for re-evaluation
After repair completes, the state SHALL re-enter the gate. The gate MAY route to a different branch than the original failure.

#### Scenario: Repair changes the routing outcome
- **WHEN** state entered Gate as `fail_a` (missing references), repair added references, and state re-enters Gate
- **THEN** Gate now returns `pass` (references now meet floor)

#### Scenario: Repair reveals a different branch (theoretical)
- **WHEN** state entered Gate as `fail_a` (ref_count < floor, topicReady = 'ready')
- **AND** repair adds references to meet floor, but another issue surfaces during re-evaluation
- **THEN** Gate MAY return `fail_b` instead of pass
- **NOTE:** 当前 `sharedRepairStep` 是单调修复（同时修 ref 和 topic），此场景在当前实现中不可达。保留此 scenario 作为架构能力的声明——`convergeRepair` 的合约允许重新路由到不同分支。

### Requirement: convergeRepair guards against infinite loops
The converge repair loop SHALL enforce a `maxIterations` limit (default 3). It SHALL detect stall (state hash unchanged across iterations). It SHALL exit immediately for terminal branches (`pass`, `blocked`). When maxIterations is exhausted, it SHALL return the actual final branch name (e.g., `"fail_a"`) — NOT a generic sentinel — so callers can inspect which branch the state is stuck on.

#### Scenario: Max iterations exhausted
- **WHEN** repair has been attempted `maxIterations` times and state still evaluates to a fail branch (`fail_a` or `fail_b`)
- **THEN** `convergeRepair()` returns `{ outcome: finalBranch, iterations: maxIterations }` where `finalBranch` is the actual branch name (e.g., `'fail_a'`), NOT a sentinel like `'escalated'`
- **NOTE:** 与 gate-loop 的 `repairLoop` 不同——gate-loop 返回 `"escalated"` 哨兵值，gate-fork 返回具体 branch 名以保持路由语义透明。

#### Scenario: Stall detected when state unchanges (defensive guard)
- **WHEN** repair produces the same state hash as a previous iteration (no progress)
- **THEN** `convergeRepair()` returns `{ outcome: 'stalled', iterations: N }` and terminates early
- **NOTE:** 当前 `sharedRepairStep` 是单调的（ref_count 只增，topic 只进不退），故此场景在正常使用中不可达。保留此检测作为防御性护栏——若将来替换为非单调 repair 或状态被外部修改，stall 检测能防止死循环。

#### Scenario: Blocked state exits converge immediately
- **WHEN** state has `topicReadiness === 'blocked'`
- **AND** `convergeRepair()` is called
- **THEN** it returns `{ outcome: 'blocked', iterations: 0 }` — zero repair attempts, state unchanged

#### Scenario: Already-passing state exits converge immediately
- **WHEN** state already satisfies all pass criteria (ref_count >= floor, topic ready)
- **AND** `convergeRepair()` is called
- **THEN** it returns `{ outcome: 'pass', iterations: 0 }` — zero repair attempts
