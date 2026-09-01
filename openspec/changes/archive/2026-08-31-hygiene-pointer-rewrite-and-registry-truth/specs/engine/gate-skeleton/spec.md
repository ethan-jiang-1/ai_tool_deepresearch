> req: GSK-009

## MODIFIED Requirements

### Requirement: Gate CLI exit-code behavior aligns with framework convention

Gate CLI wrappers SHALL align their documented exit-code behavior with the framework-wide CLI exit-code convention while preserving existing runtime semantics.

For gate CLIs, structured stdout `{ check, routing, inspect, advice }` SHALL be the primary Agent decision surface. Numeric exit code SHALL remain a coarse control-flow signal:

- `0` when the gate passes and no routing/config/invocation error overrides the result;
- `1` for normal gate failure, handoff preflight failure, status-window failure, or content/rule failure that the Agent can inspect and repair; and
- `2` for routing contract, configuration, binding, or invocation errors such as invalid input, config error, missing required flags, or caller misuse.

The morale/fatigue/continuation-encouragement prohibition for exit codes is owned by the framework-wide CLI exit-code convention (`engine/cli-exit-code-conventions`) and applies to gate CLIs as-is; this requirement SHALL NOT restate it beyond the alignment statement above. Gate-specific repair strategy, final-delivery reassurance, and autonomous-continuation reminders SHALL be expressed through `advice[]`, diagnostic artifacts, or Agent-readable Markdown without changing the numeric code for the underlying condition.

Advice SHALL NOT tell the Agent to hand-edit runtime authority files such as `rb_status.json`, `rb_output_declarations.jsonl`, `_work_units/_index.json`, or hash-bound work-unit result surfaces.

#### Scenario: High-friction pass keeps pass code

- **WHEN** a gate passes after many attempts and emits autonomous-continuation advice
- **THEN** the process exit code SHALL follow the framework-wide CLI exit-code convention for a pass condition
- **AND** advice SHALL carry the continuation reminder that `check.next` must be consumed through the accepted handoff path
- **AND** the scenario title is retained only as the OpenSpec delta-sync key; the prohibition content is owned by `engine/cli-exit-code-conventions`

#### Scenario: Gate caller reads stdout before deciding

- **WHEN** a gate CLI exits with any code
- **THEN** the Agent caller SHALL treat stdout JSON as the actionable contract
- **AND** it SHALL inspect `check.passed`, `check.next`, `routing.kind`, `inspect[]`, and `advice[]` before deciding the next action

#### Scenario: Handoff preflight failure remains normal repairable failure

- **WHEN** a lifecycle gate fails because a required entry witness is missing
- **THEN** the gate SHALL use the normal gate failure class and emit repair advice naming `enter-phase`
- **AND** it SHALL NOT use exit code to express frustration, reassurance, or encouragement

#### Scenario: Advice does not recommend manual authority edits

- **WHEN** a gate detects status drift, ledger drift, hash drift, or provenance mismatch
- **THEN** advice SHALL direct the Agent to valid Engine repair, retry, rollback, terminal/retry, or resubmit paths
- **AND** advice SHALL NOT instruct the Agent to edit authority files by hand

