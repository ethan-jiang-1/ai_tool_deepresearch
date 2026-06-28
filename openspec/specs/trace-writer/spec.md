# Trace Writer

> req: TRW-001, TRW-002, TRW-003, TRW-004, TRW-005

## Purpose

Define a unified append-only JSONL trace writer at `DPT_FRAMEWORK/engine/trace.mjs` that serves as the single implementation for writing `rb_trace.jsonl` events. It pairs with `DPT_FRAMEWORK/schema/contracts/trace.mjs` — the former writes trace events, the latter validates their format.
## Requirements
### Requirement: Unified trace writer with configurable behavior

The system SHALL provide a single trace writer module at `DPT_FRAMEWORK/engine/trace.mjs` that replaces all per-prototype copies. It SHALL expose a `createTrace(filePath, options?)` factory accepting:

- `consoleEcho` (boolean, default `true`): whether `traceEntry()` echoes colored output to console
- `icons` (object, optional): custom icon set for log prefix formatting; if omitted, a default set SHALL be used

The returned trace object SHALL expose the API:
- `traceFilePath()` — return the bound file path (set at creation time)
- `traceInit(label, detail?)` — create/clear the trace file and write a `run_start` event
- `traceEntry(event, detail?)` — append a JSONL line with `ts`, `event`, and optional `detail`; may echo colored output to console (controlled by `consoleEcho` option)
- `traceSummary()` — read the file and return `{ events: Array, passed: number, failed: number }`
- `traceCleanup()` — delete the trace file

#### Scenario: Create trace with default options

- **WHEN** calling `createTrace(path)` without options
- **THEN** `traceEntry()` SHALL echo colored `[trace]` output to console
- **AND** a default icon set SHALL be used for log prefix formatting

#### Scenario: Create trace with console echo disabled

- **WHEN** calling `createTrace(path, { consoleEcho: false })`
- **THEN** `traceEntry()` SHALL silently append to the JSONL file without console output

#### Scenario: Create trace with custom icons

- **WHEN** calling `createTrace(path, { icons: { node_start: '▶', node_complete: '✓' } })`
- **THEN** `traceEntry()` SHALL use the custom icons for log prefix formatting

#### Scenario: traceInit writes run_start event

- **WHEN** `traceInit(label, detail?)` is called on a trace instance created via `createTrace(path)`
- **THEN** the trace file SHALL be created/cleared
- **AND** a `run_start` event SHALL be written as the first line, with the given label and detail

#### Scenario: traceEntry appends valid JSONL

- **WHEN** `traceEntry('check', { passed: true, detail: 'slot_2 promoted' })` is called
- **THEN** a JSON line SHALL be appended containing `{"ts":"...","event":"check","passed":true,"detail":"slot_2 promoted"}` (plus any extra fields from `detail`)

#### Scenario: traceSummary aggregates check events

- **WHEN** `traceSummary()` is called after writing multiple `check` events (some passed, some failed)
- **THEN** it SHALL return `{ events: <all trace entries as Array>, passed: <count of passed=true>, failed: <count of passed=false> }`

### Requirement: Trace writer paired with schema validation

The trace writer at `DPT_FRAMEWORK/engine/trace.mjs` SHALL be the sole mechanism for writing `rb_trace.jsonl` events. The Zod schema at `DPT_FRAMEWORK/schema/contracts/trace.mjs` SHALL validate event format. The writer produces events; the schema validates them — both SHALL be used together for a complete trace audit trail.

#### Scenario: Writer produces output validatable by schema

- **WHEN** the trace writer appends events to a JSONL file
- **THEN** each line SHALL conform to `TraceEntrySchema` from `DPT_FRAMEWORK/schema/contracts/trace.mjs`
- **AND** the full file SHALL pass `TraceSchema` validation

### Requirement: Trace entries include bundle field

All modules writing to `rb_trace.jsonl` SHALL include `bundle` where the existing trace contract requires it. The value SHALL be derived from active bundle state, normally `rb_status.json`, not from chat memory.

#### Scenario: Queue trace includes bundle

- **WHEN** `queue-manager.mjs` writes a queue lifecycle event
- **THEN** the JSONL entry SHALL include the bundle identifier

#### Scenario: Subagent trace includes bundle

- **WHEN** `subagent-relay.mjs` writes a relay lifecycle event
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

All trace writers SHALL append to `rb_trace.jsonl`:

- bundle creation `traceInit()`
- gate attempt writing
- `log-event.mjs`
- `advance-status.mjs`
- `queue-manager.mjs`
- `subagent-relay.mjs`
- `wff-playbook-utils.mjs` `recordCheck()` / `verdict()`

No code path SHALL write, read, require, or document another trace JSONL as trace truth. `inspect-bundle.mjs --timeline` SHALL read trace events only from `rb_trace.jsonl`; it MAY read `_logs/run.log` as process log context, but not as trace truth.

#### Scenario: All touched writers append to rb_trace.jsonl

- **WHEN** a bundle executes queue operations, relay operations, gate checks, and playbook verdict checks
- **THEN** updated trace events SHALL appear in bundle root `rb_trace.jsonl`
- **AND** updated code SHALL NOT create any other trace JSONL

#### Scenario: inspect-bundle timeline uses rb_trace as trace truth

- **WHEN** `inspect-bundle.mjs --timeline` runs
- **THEN** trace events SHALL come from `rb_trace.jsonl`
- **AND** `_logs/run.log` MAY provide process log context only
- **AND** no trace sink labels such as `[queue]` or `[subagent]` SHALL be required

### Requirement: Trace path unification SHALL update specs and playbook infrastructure

Trace unification SHALL update not only implementation files, but also accepted specs, playbook schema/tests, experiment README/RUN_EXPS references, workflow shared docs, bundle log templates, and playbook utility docs so they describe only `rb_trace.jsonl` as the trace surface.

After this change, command experiment verdict `check` events SHALL be written to `rb_trace.jsonl` by the playbook thin driver. Gate CLI stdout SHALL remain the machine-readable gate result, and gate attempt entries SHALL also be recorded in `rb_trace.jsonl`.

Command experiment verdict events SHALL use `event: "check"` with boolean `passed`. Updated trace readers, summaries, and playbook verdict logic SHALL NOT count any other event name as a verdict check.

#### Scenario: Accepted specs no longer require separate experiment verdict trace

- **WHEN** accepted specs describe command experiment verdict evidence
- **THEN** they SHALL point to `rb_trace.jsonl`
- **AND** they SHALL NOT require any other trace JSONL

#### Scenario: Playbook tests validate unified trace path

- **WHEN** playbook schema/tests validate trace path references
- **THEN** they SHALL expect `rb_trace.jsonl`
- **AND** they SHALL reject any other trace JSONL references in updated playbooks
