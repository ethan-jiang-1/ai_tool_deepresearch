# Conditional Nodes
> req: COS-001

## Purpose

每个分支独立执行不同逻辑。分支间互不干扰。每分支可独立测试。包含动态节点加载能力。

## Requirements

### Requirement: Each branch node has independent execution logic
Each branch SHALL implement its own `Step.execute()` with distinct behavior and side effects.

#### Scenario: Pass branch advances to next wave
- **WHEN** `pass` branch executes
- **THEN** state advances `current_gate` to `'wave_next'`

#### Scenario: Fail-A branch records topic repair attempt
- **WHEN** `fail_a` branch executes
- **THEN** state records `topicRepairAttempted: true` without changing `ref_count`

#### Scenario: Fail-B branch supplements one reference
- **WHEN** `fail_b` branch executes
- **THEN** state increments `ref_count` by 1 without changing `topicReadiness`

#### Scenario: Blocked branch halts to HITL
- **WHEN** `blocked` branch executes
- **THEN** state sets `current_gate` to `'blocked_hitl'`

#### Scenario: Shared repair node handles both failure types
- **WHEN** `shared_repair` node executes
- **AND** state has `ref_count < ref_floor`, `shared_repair` increases `ref_count` by 2 (capped at `ref_floor`)
- **AND** state has `topicReadiness === 'not_ready'`, `shared_repair` sets `topicReadiness` to `'ready'`
- **AND** state has `topicReadiness === 'blocked'`, `shared_repair` does NOT change it (blocked = human required)
- **THEN** a single repair pass can fix both reference and topic issues simultaneously

### Requirement: Branches are independently testable
Each branch node SHALL be testable in isolation with mock state input.

#### Scenario: Test a single branch without loading full workflow
- **WHEN** a test creates mock state and calls `failAStep.execute(mockState)`
- **THEN** the branch executes correctly without depending on other branches or the full router

### Requirement: Nodes are dynamically loadable from a runtime registry
A `forkMap` (in `subagent-relay.mjs`) SHALL allow resolving workflow nodes by branch key at runtime, using the same pattern as gate-loop's dynamic node loading. The `forkRouter()` function performs the key-to-Step resolution.

#### Scenario: Known node key resolves to Step
- **WHEN** `forkRouter(state)` is called for a `pass` branch
- **THEN** it returns `{ branch, step }` with the branch identifier and the resolved Step instance

#### Scenario: Unknown node key throws
- **WHEN** an unrecognized branch identifier is encountered
- **THEN** an error is thrown with the message containing the unknown branch key
