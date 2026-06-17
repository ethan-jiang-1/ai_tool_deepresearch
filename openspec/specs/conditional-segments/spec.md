# Conditional Segments
> req: COS-001

## Purpose

每个分支独立执行不同逻辑。分支间互不干扰。每分支可独立测试。包含动态段加载能力。

## Requirements

### Requirement: Each branch segment has independent execution logic
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

#### Scenario: Shared repair segment handles both failure types
- **WHEN** `shared_repair` segment executes
- **AND** state has `ref_count < ref_floor`, `shared_repair` increases `ref_count` by 2 (capped at `ref_floor`)
- **AND** state has `topicReadiness === 'not_ready'`, `shared_repair` sets `topicReadiness` to `'ready'`
- **AND** state has `topicReadiness === 'blocked'`, `shared_repair` does NOT change it (blocked = human required)
- **THEN** a single repair pass can fix both reference and topic issues simultaneously

### Requirement: Branches are independently testable
Each branch segment SHALL be testable in isolation with mock state input.

#### Scenario: Test a single branch without loading full workflow
- **WHEN** a test creates mock state and calls `failAStep.execute(mockState)`
- **THEN** the branch executes correctly without depending on other branches or the full router

### Requirement: Segments are dynamically loadable from a runtime registry
A `segmentRegistry` SHALL allow loading workflow segments by key at runtime, using the same pattern as gate-loop's dynamic segment loading.

#### Scenario: Known segment key resolves to Step
- **WHEN** `loadNextSegment('pass_next_wave')` is called
- **THEN** it returns the Step instance with `name: 'pass_next_wave'` and an executable `execute` function

#### Scenario: Unknown segment key throws
- **WHEN** `loadNextSegment('nonexistent_fork_segment')` is called
- **THEN** an error is thrown with the message containing the unknown segment key
