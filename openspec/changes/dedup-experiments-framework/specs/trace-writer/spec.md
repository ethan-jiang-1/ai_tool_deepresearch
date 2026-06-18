> req: TRW-001, TRW-002

## Purpose

Define a unified append-only JSONL trace writer at `DPT_FRAMEWORK/trace/trace.mjs` that serves as the single implementation for writing `rb_trace.jsonl` events. It pairs with `DPT_FRAMEWORK/schema/contracts/trace.mjs` — the former writes trace events, the latter validates their format.

## Requirements

### Requirement: Unified trace writer with configurable behavior

The system SHALL provide a single trace writer module at `DPT_FRAMEWORK/trace/trace.mjs` that replaces all per-prototype copies. It SHALL expose a `createTrace(options?)` factory accepting:

- `consoleEcho` (boolean, default `true`): whether `traceEntry()` echoes colored output to console
- `icons` (object, optional): custom icon set for log prefix formatting; if omitted, a default set SHALL be used

The returned trace object SHALL expose the API:
- `setTraceFile(path)` — set the JSONL output path
- `getTraceFile()` — return the current path or undefined
- `traceInit()` — clear/create the trace file and write a `run_start` event
- `traceEntry(event, detail?)` — append a JSONL line with `ts`, `source` (derived from trace file basename), `event`, and optional `detail`
- `traceSummary()` — return `{ events: number, passed: number, failed: number }`
- `traceCleanup()` — delete the trace file

#### Scenario: Create trace with default options

- **WHEN** calling `createTrace()` without arguments
- **THEN** `traceEntry()` SHALL echo colored `[trace]` output to console
- **AND** a default icon set SHALL be used for log prefix formatting

#### Scenario: Create trace with console echo disabled

- **WHEN** calling `createTrace({ consoleEcho: false })`
- **THEN** `traceEntry()` SHALL silently append to the JSONL file without console output

#### Scenario: Create trace with custom icons

- **WHEN** calling `createTrace({ icons: { node_start: '▶', node_complete: '✓' } })`
- **THEN** `traceEntry()` SHALL use the custom icons for log prefix formatting

#### Scenario: traceInit writes run_start event

- **WHEN** `traceInit()` is called after `setTraceFile(path)`
- **THEN** the trace file SHALL be created/cleared
- **AND** a `run_start` event SHALL be written as the first line

#### Scenario: traceEntry appends valid JSONL

- **WHEN** `traceEntry('check', { passed: true, detail: 'slot_2 promoted' })` is called
- **THEN** a JSON line SHALL be appended containing `{"ts":"...","source":"...","event":"check","passed":true,"detail":"slot_2 promoted"}`

#### Scenario: traceSummary aggregates check events

- **WHEN** `traceSummary()` is called after writing multiple `check` events (some passed, some failed)
- **THEN** it SHALL return `{ events: <total>, passed: <count of passed=true>, failed: <count of passed=false> }`

### Requirement: Trace writer paired with schema validation

The trace writer at `DPT_FRAMEWORK/trace/trace.mjs` SHALL be the sole mechanism for writing `rb_trace.jsonl` events. The Zod schema at `DPT_FRAMEWORK/schema/contracts/trace.mjs` SHALL validate event format. The writer produces events; the schema validates them — both SHALL be used together for a complete trace audit trail.

#### Scenario: Writer produces output validatable by schema

- **WHEN** the trace writer appends events to a JSONL file
- **THEN** each line SHALL conform to `TraceEntrySchema` from `DPT_FRAMEWORK/schema/contracts/trace.mjs`
- **AND** the full file SHALL pass `TraceSchema` validation
