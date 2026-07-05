## ADDED Requirements

> req: GSK-009

### Requirement: Gate CLI exit-code behavior aligns with framework convention

Gate CLI wrappers SHALL align their documented exit-code behavior with the framework-wide CLI exit-code convention while preserving existing runtime semantics.

For gate CLIs, structured stdout `{ check, routing, inspect, advice }` SHALL be the primary Agent decision surface. Numeric exit code SHALL remain a coarse control-flow signal:

- `0` when the gate passes and no routing/config/invocation error overrides the result;
- `1` for normal gate failure, handoff preflight failure, status-window failure, or content/rule failure that the Agent can inspect and repair; and
- `2` for routing contract, configuration, binding, or invocation errors such as invalid input, config error, missing required flags, or caller misuse.

Gate CLIs SHALL NOT encode morale, fatigue, reassurance, or continuation encouragement in the numeric exit code. High-friction pass/fail guidance, repair strategy, final-delivery reassurance, and autonomous-continuation reminders SHALL be expressed through `advice[]`, diagnostic artifacts, or Agent-readable Markdown without changing the numeric code for the underlying condition.

#### Scenario: Gate caller reads stdout before deciding

- **WHEN** a gate CLI exits with any code
- **THEN** the Agent caller SHALL treat stdout JSON as the actionable contract
- **AND** it SHALL inspect `check.passed`, `check.next`, `routing.kind`, `inspect[]`, and `advice[]` before deciding the next action

#### Scenario: Handoff preflight failure remains normal repairable failure

- **WHEN** a lifecycle gate fails because a required entry witness is missing
- **THEN** the gate SHALL use the normal gate failure class and emit repair advice naming `enter-phase`
- **AND** it SHALL NOT use exit code to express frustration, reassurance, or encouragement

#### Scenario: High-friction pass keeps pass code

- **WHEN** a gate passes after many attempts and emits autonomous-continuation advice
- **THEN** the process exit code SHALL remain the normal pass code
- **AND** advice SHALL carry the continuation reminder that `check.next` must be consumed through the accepted handoff path
