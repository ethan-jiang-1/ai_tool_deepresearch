# Trace Writer

> req: TRW-001, TRW-002, TRW-003, TRW-004, TRW-005, TRW-006

## Purpose

Define a unified append-only JSONL trace writer at `DEEP_RESEARCH_HARNESS/engine/trace.mjs` that serves as the single implementation for writing `rb_trace.jsonl` events. It pairs with `DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs` — the former writes trace events, the latter validates their format.
## Requirements
### Requirement: Unified trace writer with configurable behavior

The unified trace writer SHALL continue to append JSONL events with configurable behavior. Examples for delegated work SHALL use queue and work-unit lifecycle events as the diagnostic vocabulary.

#### Scenario: work-unit trace example is appended

- **WHEN** `traceEntry('work_unit_submit', { passed: true, detail: 'submitted work unit' })` is called
- **THEN** a JSON line SHALL be appended with the event, pass state, detail, timestamp, and configured trace fields

### Requirement: Trace writer paired with schema validation

The trace writer at `DEEP_RESEARCH_HARNESS/engine/trace.mjs` SHALL be the sole mechanism for writing `rb_trace.jsonl` events. The Zod schema at `DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs` SHALL validate event format. The writer produces events; the schema validates them — both SHALL be used together for a complete trace audit trail.

#### Scenario: Writer produces output validatable by schema

- **WHEN** the trace writer appends events to a JSONL file
- **THEN** each line SHALL conform to `TraceEntrySchema` from `DEEP_RESEARCH_HARNESS/schema/contracts/trace.mjs`
- **AND** the full file SHALL pass `TraceSchema` validation

### Requirement: Gate attempt trace entries SHALL include diagnostic path and phase context

When `writeGateAttempt()` writes a `gate_attempt` event to `rb_trace.jsonl`, the entry SHALL include a `diagnostic_path` field pointing to `_diagnostics/gates/<iso>-<gate>.json` and a `phase` field derived from the gate name (e.g., `wave0-complete` → `wave0`). Gate pass also writes a lightweight diagnostic artifact at the same path.

#### Scenario: Failed gate attempt carries diagnostic path in trace

- **WHEN** a gate fails and `writeGateAttempt()` is called
- **THEN** the `rb_trace.jsonl` `gate_attempt` entry SHALL include `diagnostic_path` and `phase`

### Requirement: Trace entries include bundle field

All modules writing to `rb_trace.jsonl` SHALL include `bundle` where the existing trace contract requires it. The value SHALL be derived from current run bundle state, normally `rb_status.json`, not from chat memory.

#### Scenario: Queue trace includes bundle

- **WHEN** queue Engine code writes a queue lifecycle event
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Work-unit trace includes bundle

- **WHEN** work-unit lifecycle code writes claim, submit, terminal, inspect, or provenance events
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Independent CLI processes agree on bundle

- **WHEN** multiple CLIs append events to the same bundle trace
- **THEN** their `bundle` field values SHALL match active `rb_status.json`

### Requirement: Run start trace marker

系统 SHALL 在 run 生命周期起点写入 trace marker 事件：bundle 实例化时，`instantiate-run-bundle.mjs` 调用 `createTrace(...).traceInit('deep_research_run', { bundle })`，写入 `run_start` 事件到 `rb_trace.jsonl` 首行。

`run_start` SHALL 始终是 `rb_trace.jsonl` 的第一行。

> 终态 `run_end` marker 不在本 change 范围——Phase 1 无写 `rb_trace.jsonl` 的终态钩子（final phase 无 gate、Agent 仅能写 `_logs/run.log`）。`run_end` 连同"run_end 后无 gate_attempt"不变量留待 Phase 2，见 design Open Question #4。

#### Scenario: run_start is first line of trace file

- **WHEN** `instantiate-run-bundle.mjs` 创建新 bundle
- **THEN** `rb_trace.jsonl` 的第一行 SHALL 为 `{"ts":"...","event":"run_start","label":"deep_research_run","bundle":"my-research"}`

### Requirement: rb_trace.jsonl SHALL be the only trace sink

System SHALL use bundle root `rb_trace.jsonl` as the only trace JSONL sink for runtime audit events and command experiment verdict check events.

All trace writers SHALL append to `rb_trace.jsonl`, including bundle creation, gate attempt writing, Agent log events that also need trace, status advancement, queue lifecycle, work-unit lifecycle, provenance diagnostics, and playbook check/verdict utilities.

#### Scenario: Work-unit events use bundle trace

- **WHEN** a work-unit claim or submit event is recorded
- **THEN** it SHALL be appended to bundle-root `rb_trace.jsonl`

### Requirement: Trace SHALL capture delegated bypass suspicion

The system SHALL define delegated bypass trace diagnostics written by gate or inspect CLIs when phase artifacts indicate evidence/search work but matching submitted work-unit coverage is absent. The diagnostic event name SHALL be `delegated_bypass_suspected`. Detection SHALL be phase-aware and SHALL remain diagnostic only; filesystem-only artifacts SHALL NOT count toward gate pass.

#### Scenario: delegated bypass suspicion recorded in trace

- **WHEN** gate evaluation detects delegated artifacts without submitted work-unit coverage
- **THEN** a `delegated_bypass_suspected` event SHALL be appended to `rb_trace.jsonl`
- **AND** the event SHALL include what was found and what work-unit coverage was missing

### Requirement: Trace path unification SHALL update current Agent Autorun surfaces

Trace unification SHALL update implementation files, accepted specs, playbook schema/tests, `PLAYBOOK_MANIFEST.md`, `RUN_AGENT_AUTORUN_EXPS.md`, `RUN_INTERACTIVE_EXPS.md`, experiment README, workflow shared docs, bundle log templates, and playbook utility docs so they describe only bundle-root `rb_trace.jsonl` as the trace surface.

Command experiment verdict-affecting events SHALL be written to `rb_trace.jsonl` by the playbook thin driver or accepted helper as strict `event: check`, `source: playbook` rows with stable gate ID and explicit boolean passed/expected. Gate CLI stdout SHALL remain the machine-readable gate result, and Engine/gate attempts SHALL also be recorded in the same root trace without automatically becoming verdict rows. The deterministic Agent Experiment finalizer SHALL bind every declared bundle's verdict-boundary raw trace through byte length and `sha256`, and SHALL additionally bind parse status/event count. Verdict and required-health bundles SHALL be valid JSONL; a non-health fault-injection auxiliary MAY intentionally be invalid or missing. Completion JSON SHALL NOT become a second trace sink. A later accepted health diagnostic append SHALL not retroactively invalidate the recorded prefix or alter native outcome.

Updated trace readers and summaries SHALL count only accepted verdict check events for their owned calculation. The Autorun Supervisor SHALL validate native completion and SHALL NOT reinterpret the existence of arbitrary trace checks as completed-case PASS.

#### Scenario: Active knowledge surfaces name one trace

- **WHEN** current manifest, Agent Autorun/Interactive instructions, schema/tests, README, or playbook utilities describe experiment evidence
- **THEN** they point to bundle-root `rb_trace.jsonl`
- **AND** they do not name `RUN_EXPS.md` or a legacy experiment-specific trace as current authority

#### Scenario: Native completion binds rather than replaces trace

- **WHEN** a playbook writes native completion
- **THEN** completion includes the validated root-trace byte length/digest, parse/event summary and native verdict summary
- **AND** runtime verdict facts remain auditable from the declared bundle trace

#### Scenario: Accepted specs no longer require separate experiment verdict trace

- **WHEN** accepted specs describe command-experiment verdict evidence
- **THEN** they point to bundle-root `rb_trace.jsonl`
- **AND** they do not require another trace JSONL

#### Scenario: Playbook tests validate unified trace path

- **WHEN** playbook schema or tests validate trace-path references
- **THEN** they expect `rb_trace.jsonl`
- **AND** they reject another trace JSONL in current playbooks


### Requirement: Routed Wave1 gate attempt SHALL carry its normalized target receipt

The shared Gate trace writer SHALL explicitly validate and project one `carried_target_receipt` only for a successful routed Wave1 Gate attempt. Its exact shape is `{ contract_version: "wave1-carried-targets/v1", receipt_sha256, targets[] }`; every target is `{ topic_uid, intent_sha256, target_id, target_revision }`, targets are strictly ordered by unique `(topic_uid,target_id)` pairs, and the receipt digest SHALL match canonical JSON `{contract_version,targets}` excluding `receipt_sha256` itself. It SHALL not copy question-list/depth-review bytes, become generic `extraCheck` serialization, or be written by the Wave1 CLI directly.

If receipt projection cannot be durably appended with the successful Wave1 attempt, that pass SHALL not be reported as a consumable routed handoff. The repair is the same Wave1 Gate/trace persistence boundary; no direct second trace writer or second passed-receipt authority is created. Existing shared failed-attempt diagnostics remain diagnostic rather than a replacement handoff.

#### Scenario: successful Wave1 handoff records a receipt
- **WHEN** a current Wave1 Gate passes with a valid carried-target declaration
- **THEN** its routed `gate_attempt` contains a complete contract-versioned receipt, including an empty selected set when applicable
- **AND** the subsequent Wave2 entry can select that exact trace event through existing handoff/load binding

#### Scenario: versioned trace diagnostic is not a receipt
- **WHEN** a diagnostic or Gate result exposes selected targets and the routed trace event presents the contract version but lacks the validated receipt
- **THEN** Wave2 SHALL reject the current handoff as missing contract
- **AND** it SHALL not treat diagnostic content as a replacement authority

#### Scenario: receipt persistence failure emits one failed envelope
- **WHEN** a successful Wave1 candidate cannot durably append its receipt-bearing gate attempt
- **THEN** the CLI emits one failed Gate envelope with `check.passed: false` and no consumable `check.next`
- **AND** it SHALL not subsequently emit the original passed result from the same invocation
