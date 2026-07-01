# logger Delta Spec

> req: LOG-004, LOG-006, LOG-007

## MODIFIED Requirements

### Requirement: Run-scoped logger creation at bundle initialization (LOG-004)

`createRunLogger()` SHALL write a `logger_ready` heartbeat line at INFO level with `{ pid: <process.pid> }` upon successful initialization. The heartbeat proves the logger is alive, the file path is correct, and write permissions are valid. If `logger_ready` is absent from `run.log`, no run-scoped logger successfully initialized for that process.

#### Scenario: Heartbeat proves logger is alive
- **WHEN** `createRunLogger(bundlePath)` is called
- **THEN** `_logs/run.log` SHALL contain a `logger_ready` line with `pid`
- **AND** the heartbeat SHALL NOT be required to be the first line, because bundle instantiation may have written `run_start` first

## ADDED Requirements

### Requirement: Engine hot-path SHALL emit accident-grade diagnostics (LOG-006)

Public functions in `queue-manager.mjs` and `subagent-relay.mjs` SHALL emit `logEvent()` for accident-grade attempt/outcome diagnostics. Non-success exits SHALL include a reason before returning or throwing when a run-scoped logger is available.

Queue functions covered: `enqueue`, `claim`, `complete`, `fail`, `preempt`, `saveQueue`, `loadQueue`.
Relay functions covered: `stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`, `forkRouter`, `convergeRepair`.

#### Scenario: Queue operations log entry and outcome
- **WHEN** any public queue function is called
- **THEN** attempt SHALL be logged with work_id (or queue_id for save/load)
- **AND** success SHALL log the outcome
- **AND** non-success exits SHALL include the reason

#### Scenario: complete() logs all three paths
- **WHEN** `complete()` is called
- **THEN** attempt SHALL log `queue_complete_attempt`
- **AND** delegated validation failure SHALL log `queue_complete_reject` with reason
- **AND** receipt check failure SHALL log `queue_complete_receipt_fail`
- **AND** success SHALL log `queue_complete` and delegated ledger append SHALL log `ledger_append`

#### Scenario: Relay operations log slot lifecycle
- **WHEN** any relay function is called
- **THEN** attempt SHALL be logged with slotKey, waveIndex, or slotCount as applicable
- **AND** schema validation failure, path escape, missing receipt/result, or all-subagents-failed SHALL log the specific failure reason

#### Scenario: Fork and repair log branch decisions
- **WHEN** `forkRouter()` or `convergeRepair()` is called
- **THEN** the branch, ref_count, and outcome SHALL be logged

### Requirement: Sub-agent spawn prompt SHALL include diagnostic logging CLI instructions (LOG-007)

`buildSpawnPrompt()` SHALL include a "Diagnostic logging" section with concrete event types, `log-event.mjs` command examples, and level conventions — not vague suggestions. Sub-agents are not required to log but SHALL receive clear, actionable instructions that use the existing Agent log CLI instead of hand-written log envelope strings.

#### Scenario: Spawn prompt lists concrete events
- **WHEN** `buildSpawnPrompt()` generates the spawn prompt
- **THEN** the prompt SHALL name 6 event types: search_start, search_done, fetch_done, file_written, error, work_done
- **AND** each SHALL include a `log-event.mjs` command example
- **AND** the prompt SHALL specify INFO for progress, WARN for degraded, ERROR for failure
- **AND** the prompt SHALL state what NOT to log (raw page content, full search bodies, private reasoning)

#### Scenario: Sub-agent can follow logging instructions
- **WHEN** a sub-agent reads the spawn prompt
- **THEN** it SHALL know exactly which CLI command shape to use for each event type
- **AND** it SHALL know the target path (`_logs/run.log` in bundle root)
