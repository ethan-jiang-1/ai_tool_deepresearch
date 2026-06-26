> req: CPT-001, CPT-002

## ADDED Requirements

### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

An `advance-status.mjs` CLI SHALL be provided for the Agent to advance `rb_status.json` `current_gate` and `next_gate` between phases.

Usage: `node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to <gate>`

- `--to <gate>` SHALL be a valid `CurrentGate` snake_case enum value (e.g., `seed_topics_ready`).
- The CLI SHALL set `current_gate` to the `--to` value.
- The CLI SHALL compute `next_gate` by looking up the transition chain: `manifest.json` bridges gate value → node fileRef → `chain.json[node][passed]` → next node fileRef → manifest bridges back to gate value. If the next node is terminal (no `passed` entry in chain.json), `next_gate` SHALL be set to `"none"`.
- The CLI SHALL write a `phase_transition` event to `rb_trace.jsonl` with fields `ts`, `bundle`, `event: "phase_transition"`, `from` (previous `current_gate`), `to` (new `current_gate`), `next` (new `next_gate`).
- On success, the CLI SHALL print `{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }` to stdout and exit 0.
- On failure (unknown gate, chain lookup failure, missing bundle), the CLI SHALL print a JSON error object to stdout and exit 1.

#### Scenario: Advance from setup_ready to seed_topics_ready

- **WHEN** `advance-status.mjs --bundle <bundle> --to seed_topics_ready` is called
- **AND** the bundle's `current_gate` is `setup_ready`
- **THEN** `rb_status.json` SHALL be updated to `current_gate: "seed_topics_ready"`, `next_gate: "wave0_complete"`
- **AND** the computation SHALL use two manifest bridge steps: (1) gate `"seed_topics_ready"` → manifest lookup → node `"phases/phase-seed-topics.md"` → chain lookup `["passed"]` → next node `"phases/phase-wave0.md"` → manifest reverse lookup → gate `"wave0_complete"`
- **AND** a `phase_transition` trace event SHALL be appended to `rb_trace.jsonl`

#### Scenario: Advance to terminal gate sets next_gate to none

- **WHEN** `advance-status.mjs --bundle <bundle> --to readiness_passed` is called
- **AND** the chain maps readiness node's `passed` to `phase-final.md` which has no chain entry (terminal)
- **THEN** `next_gate` SHALL be set to `"none"`

#### Scenario: Unknown gate fails with error

- **WHEN** `advance-status.mjs --bundle <bundle> --to nonexistent_gate` is called
- **THEN** the CLI SHALL print a JSON error to stdout and exit 1

### Requirement: Log event CLI supports phase-completion trace events

The existing `log-event.mjs` CLI SHALL be extended with a `--event` parameter for writing trace events to `rb_trace.jsonl`.

- When `--event` is provided, the CLI SHALL write to `rb_trace.jsonl` (not `_logs/run.log`).
- The JSONL line SHALL contain `ts` (ISO8601), `bundle` (read from `rb_status.json`), `event` (value of `--event`), and optionally `detail` (parsed from `--detail` JSON).
- When `--event` is NOT provided, the CLI SHALL retain its existing behavior: write to `_logs/run.log` with `level`, `msg`, and optional `detail` fields.
- The `--event` and `--msg`/`--level` parameters SHALL be mutually exclusive in practice (callers use one mode or the other). When both `--event` and `--msg`/`--level` are present, `--event` SHALL take precedence: the CLI SHALL write only to `rb_trace.jsonl` with the `event` field, and SHALL ignore `--msg`/`--level`.

#### Scenario: Write phase completion trace event

- **WHEN** `log-event.mjs --bundle <bundle> --event seed_topics_completion` is called
- **THEN** a JSONL line with `"event": "seed_topics_completion"` SHALL be appended to `rb_trace.jsonl`
- **AND** `_logs/run.log` SHALL NOT be modified

#### Scenario: Write trace event with detail

- **WHEN** `log-event.mjs --bundle <bundle> --event seed_topics_completion --detail '{"topic_count":5}'` is called
- **THEN** the JSONL line SHALL include `"detail": {"topic_count": 5}`

#### Scenario: Existing behavior preserved when --event is absent

- **WHEN** `log-event.mjs --bundle <bundle> --level info --msg "phase done"` is called
- **THEN** the line SHALL be written to `_logs/run.log` in the existing format
- **AND** `rb_trace.jsonl` SHALL NOT be modified
