# logging-conventions Delta Spec

> req: LOC-006, LOC-010

## MODIFIED Requirements

### Requirement: Logger activation in engines (LOC-006)

Engine modules `queue-manager.mjs` and `subagent-relay.mjs` SHALL activate `createRunLogger` at bundle-aware entrypoints and SHALL emit accident-grade attempt/outcome diagnostics for public hot-path functions. Non-success paths SHALL include the reason before returning or throwing when a run-scoped logger is available.

Gate CLIs SHALL use `writeGateAttempt()` as the only gate logging entrypoint for pass/fail results. Early invalid input/config errors SHALL also be logged when a bundle path is available. Failure diagnostic artifact paths SHALL be discoverable from run.log detail.

#### Scenario: Queue operations log at function granularity
- **WHEN** any public queue function is called
- **THEN** attempt SHALL be logged with work_id and relevant parameters when a run-scoped logger is available
- **AND** success/reject/empty/exception outcomes SHALL be logged with reason where applicable

#### Scenario: Gate attempts are logged
- **WHEN** a gate CLI executes and produces a result
- **THEN** the result SHALL be logged as a `gate_attempt` event with gate name, passed status, and inspect/advice counts
- **AND** failed gate log detail SHALL include `diagnostic_path` when the diagnostic artifact is written

#### Scenario: Early gate errors are logged when bundle is known
- **WHEN** a gate CLI detects invalid input or config error after `--bundle` is known
- **THEN** `emitGateResult()` SHALL call `writeGateAttempt()` before exiting

### Requirement: Long-running phases emit stable diagnostics (LOC-010)

Sub-agent execution and Agent-side repair loops SHALL be included in the long-running phase diagnostic scope. The sub-agent spawn prompt SHALL contain explicit logging instructions naming specific events to log (search start, search done, fetch done, file written, error, work complete) with concrete `log-event.mjs` examples. Sub-agents are not required to log but strongly encouraged with clear, actionable instructions.

#### Scenario: Sub-agent spawn prompt includes logging instructions
- **WHEN** a sub-agent is spawned via `buildSpawnPrompt()`
- **THEN** the spawn prompt SHALL include a "Diagnostic logging" section with 6 event types and `log-event.mjs` examples
- **AND** the instructions SHALL specify level conventions and what not to log

#### Scenario: Repair loops leave reconstructable log evidence
- **WHEN** a phase enters an autonomous repair or supplementary loop after a gate failure
- **THEN** the phase instructions SHALL require `repair_loop_start`, `repair_action`, and `repair_loop_done` log events
- **AND** escalation or degradation SHALL log `repair_escalated` or `repair_degraded` with reason
