# logging-conventions Delta Spec

> req: LOC-006, LOC-010

## MODIFIED Requirements

### Requirement: Logger activation in engines (LOC-006)

Engine modules `queue-manager.mjs` and `subagent-relay.mjs` SHALL activate `createRunLogger` at entry to every public function, not only at module initialization. Every function entry SHALL emit a log event. Every return path SHALL emit a log event with the outcome and, on non-success, the reason.

Gate CLIs SHALL log each gate attempt result (pass or fail) with inspect and advice counts.

#### Scenario: Queue operations log at function granularity
- **WHEN** any public queue function is called
- **THEN** the function entry SHALL be logged with work_id and relevant parameters
- **AND** the function exit SHALL be logged with outcome and reason

#### Scenario: Gate attempts are logged
- **WHEN** a gate CLI executes and produces a result
- **THEN** the result SHALL be logged as a `gate_attempt` event with gate name, passed status, and inspect/advice counts

### Requirement: Long-running phases emit stable diagnostics (LOC-010)

Sub-agent execution SHALL be included in the long-running phase diagnostic scope. The sub-agent spawn prompt SHALL contain explicit logging instructions naming specific events to log (search start, search done, fetch done, file written, error, work complete) with concrete format examples. Sub-agents are not required to log but strongly encouraged with clear, actionable instructions.

#### Scenario: Sub-agent spawn prompt includes logging instructions
- **WHEN** a sub-agent is spawned via `buildSpawnPrompt()`
- **THEN** the spawn prompt SHALL include a "Diagnostic logging" section with 6 event types and format examples
- **AND** the instructions SHALL specify level conventions and what not to log
