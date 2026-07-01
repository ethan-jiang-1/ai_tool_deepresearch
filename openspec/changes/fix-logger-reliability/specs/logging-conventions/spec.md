# logging-conventions Delta Spec

> req: LOC-006, LOC-010

## MODIFIED Requirements

### Requirement: Logger activation in engines (LOC-006)

Engine modules `queue-manager.mjs` and `subagent-relay.mjs` SHALL activate `createRunLogger` at bundle-aware entrypoints and SHALL emit accident-grade attempt/outcome diagnostics for public hot-path functions. Non-success paths SHALL include the reason before returning or throwing when a run-scoped logger is available.

This requirement replaces the previous LOC-006 engine closed-set summary. The new closed-set is the accident-grade event set in LOG-006. Engine trace points not named in LOG-006 still SHALL NOT automatically create log lines.

The historical `guidelines/logging-conventions.md` principles remain in force, but its old LOC-006 summary event list SHALL be considered superseded once this change is accepted. Any later guideline update SHALL preserve the trace/log authority boundary while replacing the old summary event names with the accepted LOG-006 accident-grade set.

Gate CLIs SHALL use `writeGateAttempt()` as the only gate logging entrypoint for pass/fail results. Early invalid input/config errors SHALL also be logged when a bundle path is available. Failure diagnostic artifact paths SHALL be discoverable from run.log detail.

#### Scenario: Queue operations log at function granularity
- **WHEN** any LOG-006-covered public queue hot-path function is called
- **THEN** attempt SHALL be logged with work_id and relevant parameters when a run-scoped logger is available
- **AND** success/reject/empty/exception outcomes SHALL be logged with reason where applicable
- **AND** unexpected validation or IO failures SHALL log function-specific `*_exception` events before rethrowing when a run-scoped logger is available

#### Scenario: Gate attempts are logged
- **WHEN** a gate CLI executes and produces a result
- **THEN** the result SHALL be logged as a `gate_attempt` event with gate name, passed status, and inspect/advice counts
- **AND** failed gate log detail SHALL include `diagnostic_path` only when the diagnostic artifact write succeeds
- **AND** the same `diagnostic_path` SHALL be used by the detailed diagnostic artifact and trace diagnostic pointer
- **AND** if the diagnostic artifact write fails, failed gate log detail SHALL include `diagnostic_write_failed: true` and SHALL NOT include `diagnostic_path`

#### Scenario: Early gate errors are logged when bundle is known
- **WHEN** a gate CLI detects missing `--bundle`
- **THEN** no run.log write SHALL be required because the target bundle is unknown
- **WHEN** a gate CLI detects missing `--current-node`, config error, or node/gate binding error after `--bundle` is known
- **THEN** `emitGateResult(result, { bundlePath })` SHALL call `writeGateAttempt()` before exiting
- **AND** `parseGateCliArgs()` error returns SHALL preserve the provided bundle path when one was supplied

### Requirement: Long-running phases emit stable diagnostics (LOC-010)

Sub-agent execution and Agent-side repair loops SHALL be included in the long-running phase diagnostic scope. The sub-agent spawn prompt SHALL contain explicit logging instructions naming specific events to log (search start, search done, fetch done, file written, error, work complete) with concrete, copyable `log-event.mjs` examples. Sub-agents are not required to log but strongly encouraged with clear, actionable instructions.

#### Scenario: Sub-agent spawn prompt includes logging instructions
- **WHEN** a sub-agent is spawned via `buildSpawnPrompt()`
- **THEN** the spawn prompt SHALL include a "Diagnostic logging" section with 6 event types and `log-event.mjs` examples
- **AND** the instructions SHALL specify level conventions and what not to log
- **AND** command examples SHALL use lowercase `--level info|warn|error` values accepted by `log-event.mjs`
- **AND** command examples SHALL use `--msg <event>` and `--detail` JSON containing `kind`, `slotKey`, and `roleAgentKey`
- **AND** command examples SHALL use the absolute path to `DPT_FRAMEWORK/cli/log-event.mjs`

#### Scenario: Repair loops leave reconstructable log evidence
- **WHEN** any phase enters an autonomous repair, retry, or supplementary loop after a gate failure
- **THEN** the phase instructions SHALL require `repair_loop_start`, `repair_action`, and `repair_loop_done` log events
- **AND** escalation or degradation SHALL log `repair_escalated` or `repair_degraded` with reason
- **AND** terminal gate failures that do not enter a repair loop SHALL still log `repair_escalated` or `repair_degraded` before stopping when a bundle path is available
- **AND** the affected phase set SHALL include every phase node with autonomous repair/retry behavior, at minimum instantiation, setup, hitl1, hitl2 repair branch, seed-topics, wave0, wave1, wave2, readiness, and terminal/degraded rerun handling
