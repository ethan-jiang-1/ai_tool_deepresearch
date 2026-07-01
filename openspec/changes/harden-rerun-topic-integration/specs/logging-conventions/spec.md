# Logging Conventions (delta)

> req: LOC-010

## ADDED Requirements

### Requirement: Long-running phases SHALL leave enough log and diagnostic evidence for post-mortem debugging

Long-running Agentic phases SHALL emit sufficient runtime diagnostics to reconstruct process state without chat memory.

At minimum, logging/diagnostics SHALL cover:
- phase START and END
- queue enqueue/refill/claim/complete/fail/preempt summaries
- delegated provenance failures
- receipt checks for delegated tasks
- ledger append events
- rerun action summaries
- file observability diagnostics
- failed gate diagnostic artifact paths

Structured diagnostic events SHOULD use stable `kind` values so tests and post-mortem tooling can find them without parsing prose. Required kinds for this change include:
- `phase_start`
- `phase_end`
- `queue_enqueue`
- `queue_claim`
- `queue_complete`
- `queue_fail`
- `receipt_check`
- `ledger_append`
- `rerun_action_summary`
- `file_observability_finding`
- `file_explanation`
- `gate_failure_detail`

`_logs/run.log` remains human-readable diagnostics and SHALL NOT become verdict authority. Structured reentry facts SHALL be recorded in `rb_trace.jsonl`, `_checkpoints/`, `_diagnostics/`, and `rb_output_declarations.jsonl`.

#### Scenario: Failed gate preserves debug path

- **WHEN** a gate fails
- **THEN** `_logs/run.log` SHALL include a WARN diagnostic line
- **AND** `rb_trace.jsonl` SHALL include a non-verdict diagnostic event pointing to the detailed artifact

#### Scenario: Ledger append is visible

- **WHEN** delegated `complete()` appends `rb_output_declarations.jsonl`
- **THEN** `_logs/run.log` SHALL include a ledger append summary with work id and slot result ref

#### Scenario: File observability finding is discoverable

- **WHEN** Engine records a file observability finding
- **THEN** `rb_trace.jsonl` SHALL include a non-verdict diagnostic event with `kind: "file_observability_finding"`
- **AND** `_logs/run.log` SHALL include the finding classification and path
