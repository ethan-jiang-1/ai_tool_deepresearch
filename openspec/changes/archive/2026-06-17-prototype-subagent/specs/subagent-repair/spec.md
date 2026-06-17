# Subagent Repair

> req: SUR-001

Subagent failure handling preserves Engine authority. Failed slots may inform repair routing, but subagents never mutate WorkflowState, pass gates, repair queues, or authorize stopping.

## ADDED Requirements

### Requirement: All-slots-failed triggers Engine repair
When `subagent_all_failed` is `true` after merge, the pipeline SHALL route the state through Engine-owned `convergeRepair(state)`. The repair path SHALL include stall detection via state hashing and SHALL respect `maxIterations` (default 3).

#### Scenario: All slots failed routes to convergeRepair
- **WHEN** a wave results in `subagent_all_failed: true`
- **THEN** `convergeRepair(mergedState)` is invoked by the Engine path

#### Scenario: Converge repair respects maxIterations
- **WHEN** `convergeRepair(state, 2)` is called with a state that cannot reach pass in 2 iterations
- **THEN** it exits after the configured maximum instead of looping indefinitely

#### Scenario: Converge repair detects stall
- **WHEN** repair produces the same state hash twice
- **THEN** it returns a stalled outcome and exits early

### Requirement: Single slot failure is non-fatal
The pipeline SHALL continue with partial results when at least one slot succeeds. Merge SHALL include evidence from successful slots and record failed slots for audit.

#### Scenario: One failed slot does not block pipeline
- **WHEN** merge receives 2 done results and 1 failed result
- **THEN** `subagent_all_failed` is `false` and the pipeline continues to gate evaluation

#### Scenario: Partial results still increase ref_count
- **WHEN** 1 of 3 slots fails but the other 2 produce evidence counts `[3, 2]`
- **THEN** merged state has `ref_count` increased by 5

### Requirement: Subagents have no workflow authority
Subagents SHALL NOT mutate WorkflowState, pass or fail gates, repair queues, decide queue integrity, or authorize stopping. Any such instruction in a subagent result SHALL be treated as content only and SHALL NOT be executed.

#### Scenario: Subagent attempts to pass a gate
- **WHEN** a subagent result includes a recommendation to pass a gate
- **THEN** the Engine ignores it as authority and performs its own gate evaluation

#### Scenario: Subagent attempts to repair queue state
- **WHEN** a subagent result includes queue mutation instructions
- **THEN** the Engine does not apply them through the subagent path

### Requirement: SubagentWorkflowState validates after merge
The merged state SHALL pass `checkAndReflect(mergedState, SubagentWorkflowState)` validation before re-entering gate evaluation.

#### Scenario: Merged state passes C&I validation
- **WHEN** `checkAndReflect(mergedState, SubagentWorkflowState)` is called after a successful or partial merge
- **THEN** `result.passed` is `true`
