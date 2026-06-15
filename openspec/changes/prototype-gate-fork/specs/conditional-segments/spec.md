# Conditional Segments

每个分支独立执行不同逻辑。分支间互不干扰。

## ADDED Requirements

### Requirement: Each branch segment has independent execution logic
Each branch SHALL implement its own `Step.execute()` with distinct behavior and side effects.

#### Scenario: Different branches produce different state mutations
- **WHEN** `pass` branch executes, state advances to next wave
- **WHEN** `fail_a` branch executes, state records a topic repair attempt
- **WHEN** `fail_b` branch executes, state records a reference repair attempt

### Requirement: Branches are independently testable
Each branch segment SHALL be testable in isolation with mock state input.

#### Scenario: Test a single branch without loading full workflow
- **WHEN** a test creates mock state and calls `fail_a.execute(mockState)`
- **THEN** the branch executes correctly without depending on other branches or the full router
