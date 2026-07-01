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

Public functions in `queue-manager.mjs` and `subagent-relay.mjs` SHALL emit `logEvent()` for the stable accident-grade diagnostic event set defined below. Non-success exits SHALL include a reason before returning or throwing when a run-scoped logger is available.

Queue functions covered: `enqueue`, `claim`, `complete`, `fail`, `preempt`, `saveQueue`, `loadQueue`.
Relay functions covered: `stageSubagentSlots`, `recordAgentSpawnRequested`, `ingestAgentReceipt`, `commitSlotResult`, `collectAndMergeSubagentResults`, and bundle-aware callers of `forkRouter` / `convergeRepair`.

Log message/event name SHALL be the fine-grained event name, such as `queue_enqueue_attempt`. `detail.kind` SHALL be the broad diagnostic kind from `DIAGNOSTIC_KINDS` when one exists, such as `queue_enqueue`; if no broad diagnostic kind exists, `detail.kind` SHALL equal the fine-grained event name.

Implementations SHALL keep the fine-grained event name and broad `detail.kind` distinct where a broad kind exists. Tests SHALL assert representative mappings, for example `queue_enqueue_attempt` with `kind:"queue_enqueue"` and `queue_complete_receipt_fail` with `kind:"receipt_check"` or another documented broad compatibility kind.

Exception events SHALL be emitted before rethrowing unexpected validation or IO failures when a run-scoped logger is available. Because exceptions may occur before schema parsing succeeds, identifiers such as `work_id`, `queue_id`, `slotKey`, and `roleAgentKey` MAY be omitted on exception events, but a sanitized `reason` SHALL be included.

Queue functions that do not receive `bundleDir` (`enqueue`, `claim`, `preempt`) SHALL emit these events when a run-scoped logger has already been initialized through a bundle-aware entrypoint. Pure in-memory calls without an initialized logger SHALL NOT be required to write `run.log`.

Queue event set:

| Event | Level | Required detail |
|-------|-------|-----------------|
| `queue_enqueue_attempt`, `queue_enqueue_done`, `queue_enqueue_exception` | INFO/ERROR | `kind`, `work_id?`, `slot?`, `target?`, `reason?` |
| `queue_claim_attempt`, `queue_claim_done`, `queue_claim_empty`, `queue_claim_exception` | INFO/WARN/ERROR | `kind`, `actor?`, `work_id?`, `queue_health?`, `stop_authorization_state?`, `reason?` |
| `queue_complete_attempt`, `queue_complete_reject`, `queue_complete_receipt_fail`, `queue_complete_done`, `queue_complete_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `delegated?`, `receipt?`, `reason?` |
| `queue_fail_attempt`, `queue_fail_reject`, `queue_fail_done`, `queue_fail_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `reason?` |
| `queue_preempt_attempt`, `queue_preempt_reject`, `queue_preempt_done`, `queue_preempt_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `slot?`, `reason?`, `unsafeCurrent?` |
| `queue_save_attempt`, `queue_save_done`, `queue_save_exception` | INFO/ERROR | `kind`, `queue_id?`, `queue_health?`, `reason?` |
| `queue_load_attempt`, `queue_load_done`, `queue_load_exception` | INFO/ERROR | `kind`, `queue_id?`, `existed?`, `reason?` |
| `ledger_append_attempt`, `ledger_append_done`, `ledger_append_exception` | INFO/ERROR | `kind`, `work_id?`, `slot_result_ref?`, `reason?` |

Relay event set:

| Event | Level | Required detail |
|-------|-------|-----------------|
| `relay_stage_attempt`, `relay_stage_empty`, `relay_stage_done`, `relay_stage_exception` | INFO/WARN/ERROR | `kind`, `branch?`, `slotCount?`, `waveIndex?`, `reason?` |
| `relay_spawn_attempt`, `relay_spawn_requested`, `relay_spawn_exception` | INFO/ERROR | `kind`, `slotKey?`, `roleAgentKey?`, `platform?`, `runtimeMode?`, `reason?` |
| `relay_receipt_ingest_attempt`, `relay_receipt_ingest_done`, `relay_receipt_ingest_failed`, `relay_receipt_ingest_exception` | INFO/WARN/ERROR | `kind`, `slotKey?`, `roleAgentKey?`, `receiptPath?`, `reason?` |
| `relay_commit_attempt`, `relay_commit_schema_fail`, `relay_commit_path_escape`, `relay_commit_done`, `relay_commit_exception` | INFO/WARN/ERROR | `kind`, `slotKey?`, `roleAgentKey?`, `status?`, `reason?`, `path?` |
| `relay_collect_attempt`, `relay_collect_empty`, `relay_all_failed`, `relay_merge_done`, `relay_refork_done`, `relay_collect_exception` | INFO/WARN/ERROR | `kind`, `slotCount?`, `ref_count?`, `branch?`, `reason?` |
| `relay_fork_attempt`, `relay_fork_done`, `relay_fork_exception` | INFO/ERROR | `kind`, `branch?`, `ref_count?`, `ref_floor?`, `reason?` |
| `repair_attempt`, `repair_stalled`, `repair_done`, `repair_exception` | INFO/WARN/ERROR | `kind`, `outcome?`, `iterations?`, `reason?` |

`forkRouter()` and `convergeRepair()` SHALL remain pure unless a future change explicitly modifies their APIs. This change SHALL log their decisions from bundle-aware relay callers rather than making pure functions discover bundle state.

#### Scenario: Queue operations log entry and outcome
- **WHEN** any LOG-006-covered public queue hot-path function is called after a run-scoped logger has been initialized
- **THEN** attempt SHALL be logged with work_id (or queue_id for save/load)
- **AND** success SHALL log the outcome
- **AND** non-success exits SHALL include the reason
- **AND** representative events SHALL preserve fine-grained message names while using the documented broad `detail.kind`

#### Scenario: Pure in-memory queue calls are not forced to log
- **WHEN** `enqueue`, `claim`, or `preempt` is called before any bundle-aware entrypoint initializes a run-scoped logger
- **THEN** the function SHALL preserve existing no-throw/no-log behavior
- **AND** lack of a run.log entry SHALL NOT be a contract failure for that pure in-memory call

#### Scenario: complete() logs all three paths
- **WHEN** `complete()` is called
- **THEN** attempt SHALL log `queue_complete_attempt`
- **AND** delegated validation failure SHALL log `queue_complete_reject` with reason
- **AND** receipt check failure SHALL log `queue_complete_receipt_fail`
- **AND** success SHALL log `queue_complete_done` and delegated ledger append SHALL log `ledger_append_done`
- **AND** unexpected parse or IO failure SHALL log `queue_complete_exception` before rethrowing

#### Scenario: Relay operations log slot lifecycle
- **WHEN** any relay function is called
- **THEN** attempt SHALL be logged with slotKey, waveIndex, or slotCount as applicable
- **AND** schema validation failure, path escape, missing receipt/result, or all-subagents-failed SHALL log the specific failure reason
- **AND** unexpected validation or IO failure SHALL log the function-specific `*_exception` event before rethrowing

#### Scenario: Fork and repair log branch decisions
- **WHEN** bundle-aware relay callers invoke `forkRouter()` or `convergeRepair()`
- **THEN** the branch, ref_count, and repair outcome SHALL be logged
- **AND** pure `forkRouter()` / `convergeRepair()` calls without bundle context SHALL NOT be required to write run.log

### Requirement: Sub-agent spawn prompt SHALL include diagnostic logging CLI instructions (LOG-007)

`buildSpawnPrompt()` SHALL include a "Diagnostic logging" section with concrete event types, absolute `log-event.mjs` command examples, and level conventions — not vague suggestions. Sub-agents are not required to log but SHALL receive clear, actionable instructions that use the existing Agent log CLI instead of hand-written log envelope strings.

#### Scenario: Spawn prompt lists concrete events
- **WHEN** `buildSpawnPrompt()` generates the spawn prompt
- **THEN** the prompt SHALL name 6 event types: search_start, search_done, fetch_done, file_written, error, work_done
- **AND** each SHALL include a `log-event.mjs` command example
- **AND** command examples SHALL use the absolute bundle root and the absolute path to `DPT_FRAMEWORK/cli/log-event.mjs`
- **AND** command examples SHALL use lowercase `--level info|warn|error` values accepted by `log-event.mjs`
- **AND** each `--detail` JSON example SHALL include `kind`, `slotKey`, and `roleAgentKey`
- **AND** the prompt SHALL specify `info` for progress, `warn` for degraded, and `error` for failure
- **AND** the prompt SHALL state what NOT to log (raw page content, full search bodies, private reasoning)

#### Scenario: Sub-agent can follow logging instructions
- **WHEN** a sub-agent reads the spawn prompt
- **THEN** it SHALL know exactly which CLI command shape to use for each event type
- **AND** it SHALL know the target path (`_logs/run.log` in bundle root)
