# logger Delta Spec

> req: LOG-004, LOG-006, LOG-007

## MODIFIED Requirements

### Requirement: Run-scoped logger creation at bundle initialization (LOG-004)

`createRunLogger()` SHALL write a `logger_ready` heartbeat line at INFO level with `{ pid: <process.pid> }` upon successful initialization. The heartbeat proves the logger is alive, the file path is correct, and write permissions are valid. If `logger_ready` is absent from `run.log`, the logger never successfully initialized for that process.

#### Scenario: Heartbeat proves logger is alive
- **WHEN** `createRunLogger(bundlePath)` is called
- **THEN** the first log line SHALL be `logger_ready` with `pid`

## ADDED Requirements

### Requirement: Engine hot-path SHALL log all entry and exit paths (LOG-006)

Public functions in `queue-manager.mjs` and `subagent-relay.mjs` SHALL emit `logEvent()` at function entry and at every return path. Non-success exits SHALL include the reason.

Queue functions covered: `enqueue`, `claim`, `complete`, `fail`, `preempt`, `saveQueue`, `loadQueue`.
Relay functions covered: `stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`, `forkRouter`, `convergeRepair`.

#### Scenario: Queue operations log entry and outcome
- **WHEN** any public queue function is called
- **THEN** entry SHALL be logged with work_id (or queue_id for save/load)
- **AND** each return path SHALL log the outcome
- **AND** non-success exits SHALL include the reason

#### Scenario: complete() logs all three paths
- **WHEN** `complete()` is called
- **THEN** entry SHALL log `complete_attempt`
- **AND** delegated validation failure SHALL log `complete_reject` with reason
- **AND** receipt check failure SHALL log `complete_receipt_fail`
- **AND** success SHALL log `complete` (existing behavior preserved)

#### Scenario: Relay operations log slot lifecycle
- **WHEN** any relay function is called
- **THEN** entry SHALL be logged with slotKey or waveIndex
- **AND** schema validation failure, path escape, or all-subagents-failed SHALL log the specific failure reason

#### Scenario: Fork and repair log branch decisions
- **WHEN** `forkRouter()` or `convergeRepair()` is called
- **THEN** the branch, ref_count, and outcome SHALL be logged

### Requirement: Sub-agent spawn prompt SHALL include diagnostic logging instructions (LOG-007)

`buildSpawnPrompt()` SHALL include a "Diagnostic logging" section with concrete event types, format examples, and level conventions — not vague suggestions. Sub-agents are not required to log but SHALL receive clear, actionable instructions.

#### Scenario: Spawn prompt lists concrete events
- **WHEN** `buildSpawnPrompt()` generates the spawn prompt
- **THEN** the prompt SHALL name 6 event types: search_start, search_done, fetch_done, file_written, error, work_done
- **AND** each SHALL include a format example
- **AND** the prompt SHALL specify INFO for progress, WARN for degraded, ERROR for failure
- **AND** the prompt SHALL state what NOT to log (raw page content, full search bodies, private reasoning)

#### Scenario: Sub-agent can follow logging instructions
- **WHEN** a sub-agent reads the spawn prompt
- **THEN** it SHALL know exactly what format to use for each event type
- **AND** it SHALL know the target path (`_logs/run.log` in bundle root)
