> req: LOC-001, LOC-002, LOC-003, LOC-006, LOC-007, LOC-009, LOC-010

## MODIFIED Requirements

### Requirement: Log level conventions

Log levels SHALL preserve their existing meanings for runtime diagnostics. Examples SHALL use work-unit, queue, gate, cache, and file-observability events when describing delegated work. Delegated examples SHALL identify `work_id`, `queue_item_id`, `kind`, or `receipt_nonce` instead of non-work-unit channel fields.

#### Scenario: delegated debug example uses work-unit context

- **WHEN** a delegated diagnostic is logged at DEBUG
- **THEN** the example detail SHALL name work-unit binding context

### Requirement: One-shot log API

`logToRun(bundlePath, level, msg, detail?)` SHALL remain the one-shot bundle log helper. Delegated examples SHALL use work-unit detail fields and SHALL NOT teach non-work-unit delegated channels as production logging context.

#### Scenario: one-shot log records work-unit detail

- **WHEN** `logToRun()` is used for delegated repair or submit diagnostics
- **THEN** the detail object SHALL carry work-unit identity where available

### Requirement: Agent log CLI

The Agent-facing log CLI SHALL allow Phase Agents and sub-agents to write bundle diagnostic records without inline JavaScript. Delegated examples SHALL bind work-unit identity and accepted log levels.

#### Scenario: sub-agent log CLI uses work-unit fields

- **WHEN** a sub-agent writes a diagnostic event
- **THEN** the CLI detail JSON SHALL include assigned work-unit identity and receipt nonce where available

### Requirement: Run ID generation and propagation

The system SHALL use the bundle name as `bundle`, persisted in `rb_status.json`. All entries written to `rb_trace.jsonl` and `_logs/run.log` SHALL include the bundle field so diagnostic sinks can be stitched into a single timeline by `bundle` and `ts`.

`bundle` SHALL be read from active bundle state, normally `rb_status.json`, not from chat memory, process memory, environment variables, or implicit shell state.

#### Scenario: Run ID is the bundle name

- **WHEN** `instantiate-run-bundle.mjs my-research` creates a new bundle
- **THEN** `rb_status.json` SHALL contain `"bundle": "my-research"`
- **AND** bundle directory naming SHALL remain consistent with that bundle identifier

#### Scenario: Engine trace entries include bundle

- **WHEN** queue, work-unit, or gate Engine code writes trace entries
- **THEN** each JSONL row SHALL include the bundle identifier

### Requirement: Single diagnostic log file per bundle

Each run bundle SHALL have one diagnostic log file at `<bundle>/_logs/run.log`. All `.mjs` and `.md` diagnostic records SHALL append to that file in timestamp order.

The file SHALL be free-text with a machine-parseable envelope. It SHALL NOT be a pass/fail verdict source; verdicts come from `rb_trace.jsonl`, gate output, or accepted verdict artifacts.

#### Scenario: All gate attempts appear in one log file

- **WHEN** multiple gate CLIs run in one bundle
- **THEN** all gate attempt log lines SHALL appear in the same `_logs/run.log`

#### Scenario: Engine and Agent log entries coexist

- **WHEN** queue, work-unit, gate, and phase-doc logging all occur in one run
- **THEN** their diagnostic log lines SHALL append to the same bundle log file

### Requirement: Logger activation in engines

Engine modules for queue, work-unit lifecycle, ledger append, gate provenance, and file observability SHALL activate `createRunLogger` at bundle-aware entrypoints and SHALL emit accident-grade attempt/outcome diagnostics for public hot-path functions. Non-success paths SHALL include the reason before returning or throwing when a run-scoped logger is available.

Gate CLIs SHALL use `writeGateAttempt()` as the only gate logging entrypoint for pass/fail results. Early invalid input/config errors SHALL also be logged when a bundle path is available. Failure diagnostic artifact paths SHALL be discoverable from run.log detail.

#### Scenario: Work-unit operations log at function granularity

- **WHEN** a work-unit claim, submit, fail, timeout, abandon, retry, inspect, or late-submit rejection occurs
- **THEN** run log diagnostics SHALL identify the operation, result, and available work-unit binding context

### Requirement: Long-running phases SHALL leave enough log and diagnostic evidence for post-mortem debugging

Sub-agent execution and Agent-side repair loops SHALL be included in the long-running phase diagnostic scope. Work-unit task and spawn prompts SHALL contain explicit logging instructions naming specific events to log, including search start, search done, fetch done, file written, error, and work complete. Delegated logging examples SHALL bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: Sub-agent spawn prompt includes logging instructions

- **WHEN** a work-unit prompt is generated
- **THEN** the prompt SHALL include diagnostic logging examples that bind the assigned work unit
- **AND** command examples SHALL use accepted log levels and the bundle's log-event CLI path
