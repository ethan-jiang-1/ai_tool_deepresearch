> req: LOC-001, LOC-002, LOC-006, LOC-010

## MODIFIED Requirements

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
