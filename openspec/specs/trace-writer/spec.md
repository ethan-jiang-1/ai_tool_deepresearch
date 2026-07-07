# Trace Writer

> req: TRW-001, TRW-002, TRW-003, TRW-004, TRW-005

## Purpose

Define a unified append-only JSONL trace writer at `DPT_FRAMEWORK/engine/trace.mjs` that serves as the single implementation for writing `rb_trace.jsonl` events. It pairs with `DPT_FRAMEWORK/schema/contracts/trace.mjs` — the former writes trace events, the latter validates their format.
## Requirements
### Requirement: Unified trace writer with configurable behavior

The unified trace writer SHALL continue to append JSONL events with configurable behavior. Examples for delegated work SHALL use queue and work-unit lifecycle events as the diagnostic vocabulary.

#### Scenario: work-unit trace example is appended

- **WHEN** `traceEntry('work_unit_submit', { passed: true, detail: 'submitted work unit' })` is called
- **THEN** a JSON line SHALL be appended with the event, pass state, detail, timestamp, and configured trace fields

### Requirement: Trace writer paired with schema validation

The trace writer at `DPT_FRAMEWORK/engine/trace.mjs` SHALL be the sole mechanism for writing `rb_trace.jsonl` events. The Zod schema at `DPT_FRAMEWORK/schema/contracts/trace.mjs` SHALL validate event format. The writer produces events; the schema validates them — both SHALL be used together for a complete trace audit trail.

#### Scenario: Writer produces output validatable by schema

- **WHEN** the trace writer appends events to a JSONL file
- **THEN** each line SHALL conform to `TraceEntrySchema` from `DPT_FRAMEWORK/schema/contracts/trace.mjs`
- **AND** the full file SHALL pass `TraceSchema` validation

### Requirement: Gate attempt trace entries SHALL include diagnostic path and phase context

When `writeGateAttempt()` writes a `gate_attempt` event to `rb_trace.jsonl`, the entry SHALL include a `diagnostic_path` field pointing to `_diagnostics/gates/<iso>-<gate>.json` and a `phase` field derived from the gate name (e.g., `wave0-complete` → `wave0`). Gate pass also writes a lightweight diagnostic artifact at the same path.

#### Scenario: Failed gate attempt carries diagnostic path in trace

- **WHEN** a gate fails and `writeGateAttempt()` is called
- **THEN** the `rb_trace.jsonl` `gate_attempt` entry SHALL include `diagnostic_path` and `phase`

### Requirement: Trace entries include bundle field

All modules writing to `rb_trace.jsonl` SHALL include `bundle` where the existing trace contract requires it. The value SHALL be derived from active bundle state, normally `rb_status.json`, not from chat memory.

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

### Requirement: Trace SHALL capture delegated bypass suspicion

The system SHALL define delegated bypass trace diagnostics written by gate or inspect CLIs when phase artifacts indicate evidence/search work but matching submitted work-unit coverage is absent. The diagnostic event name SHALL be `delegated_bypass_suspected`. Detection SHALL be phase-aware and SHALL remain diagnostic only; filesystem-only artifacts SHALL NOT count toward gate pass.

#### Scenario: delegated bypass suspicion recorded in trace

- **WHEN** gate evaluation detects delegated artifacts without submitted work-unit coverage
- **THEN** a `delegated_bypass_suspected` event SHALL be appended to `rb_trace.jsonl`
- **AND** the event SHALL include what was found and what work-unit coverage was missing

