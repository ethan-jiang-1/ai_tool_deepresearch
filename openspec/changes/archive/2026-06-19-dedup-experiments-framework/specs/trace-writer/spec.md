> req: TRW-001, TRW-002

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
