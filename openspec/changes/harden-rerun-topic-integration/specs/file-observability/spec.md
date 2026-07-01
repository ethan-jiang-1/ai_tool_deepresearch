# File Observability

> req: FIO-001, FIO-002, FIO-003, FIO-004

## Purpose

Allow Agentic Workflow to create new files while ensuring every meaningful runtime file is explainable. File observability discovers unexpected files, asks the Agent to explain them, records diagnostics, and keeps authority decisions bound to deterministic receipts and ledgers.

## Requirements

### Requirement: Engine SHALL audit phase-owned directories against expected file patterns

Engine SHALL provide a file observability helper that audits at least:
- bundle root control files and known runtime directories
- `reference/`
- `seed_topics/`
- `artifacts/wave0/`
- `artifacts/wave1/`
- `artifacts/wave2/`
- `_cache/`

The audit SHALL use directory shape, filename patterns, topic registry, queue `writes_to` / `required_receipts`, declaration ledger paths, and cache leaf structure rather than fixed file counts.

Each finding SHALL include a stable classification:
- `expected`: file matches a known runtime/control/artifact pattern or deterministic receipt
- `declared_authoritative`: file is covered by a ledger declaration or accepted receipt and may participate in relevant gate conditions
- `unplanned_nonblocking`: file is unexpected but does not affect the requested phase/gate pass conditions
- `unplanned_needs_explanation`: file is unexpected and should be explained before reentry is considered clean
- `orphan_authority_blocking`: file matches a pass-condition artifact pattern, such as `reference/*{topic}*.md`, but lacks required ledger/receipt authority
- `explained_non_authoritative`: file has a durable explanation diagnostic but still lacks ledger/receipt authority

Each finding SHALL include at least:
- `path`
- `classification`
- `severity`: `info`, `warning`, or `blocker`
- `phase` when derivable
- `reason`
- `authority_status`
- `required_repair` when severity is `warning` or `blocker`

Only `declared_authoritative` files SHALL be allowed to satisfy ledger-backed gate pass conditions.

#### Scenario: Unexpected wave1 scratch file is detected

- **WHEN** `artifacts/wave1/topic-a/scratch.md` exists
- **AND** it is not an expected artifact, receipt, declared output, or known diagnostic
- **THEN** file observability SHALL report it as `unplanned_needs_explanation` or `unplanned_nonblocking` depending on the requested target

### Requirement: Unplanned files SHALL produce inspect/advice requesting explanation

Unplanned files SHALL produce check/inspect/advice feedback. Files that affect gate pass conditions, such as orphan reference files, SHALL block the relevant gate. Non-blocking files MAY be reported as diagnostics or health issues.

For reentry and gate checks:
- `orphan_authority_blocking` findings SHALL be blockers
- `unplanned_needs_explanation` findings SHALL be warnings or blockers according to the target's required artifact set
- `unplanned_nonblocking` findings SHALL NOT fail the check but SHALL remain visible in inspect output
- `explained_non_authoritative` findings SHALL NOT satisfy gate authority and SHALL remain visible until declared or removed

#### Scenario: Orphan reference blocks authority

- **WHEN** `reference/topic-a-orphan.md` exists
- **AND** it has no `role === "reference"` ledger declaration
- **THEN** the audit SHALL classify it as `orphan_authority_blocking`
- **AND** advice SHALL request delegated completion or an explicit non-authoritative explanation

### Requirement: Agent explanations SHALL be recorded as diagnostic trace/log entries

The system SHALL extend `DPT_FRAMEWORK/cli/log-event.mjs` with an Agent-facing diagnostic mode for file explanations. The command SHALL be invokable without inline JavaScript and SHALL write a non-verdict diagnostic event to `rb_trace.jsonl` plus a human-readable line to `_logs/run.log`.

Each explanation SHALL include `path`, `phase`, `reason`, and `authority_status`. It MAY include `work_id`, `topic_slug`, and `related_rerun_action`.

Allowed `authority_status` values SHALL include:
- `explained_non_authoritative`
- `ignored_with_reason`

`declared_authoritative` is a derived audit classification, not an Agent-written explanation status. The Agent SHALL NOT be able to make a file authoritative through file explanation.

File explanations SHALL be append-only. If multiple explanation diagnostics exist for the same path, audits SHALL use the latest valid explanation by timestamp for current classification while preserving all prior diagnostics in trace/log history.

#### Scenario: File explanation is durable

- **WHEN** Agent records an explanation for an unplanned file through `log-event.mjs`
- **THEN** `rb_trace.jsonl` SHALL contain `event: "diagnostic"` with `kind: "file_explanation"`
- **AND** `_logs/run.log` SHALL contain a human-readable diagnostic line
- **AND** the trace event SHALL contain `authority_status`

#### Scenario: Latest explanation is used for audit classification

- **WHEN** two file explanation diagnostics exist for the same path
- **THEN** file observability SHALL use the latest valid explanation for current classification
- **AND** earlier explanation diagnostics SHALL remain in `rb_trace.jsonl` and `_logs/run.log`

### Requirement: Explained files SHALL remain non-authoritative unless declared through ledger or receipt

An explanation records why a file exists. It SHALL NOT make the file count toward gate pass conditions. Files become authoritative only through the relevant deterministic contract, such as delegated `complete()` appending `rb_output_declarations.jsonl`, queue receipt success, or an accepted phase artifact rule.

#### Scenario: Explained orphan still cannot pass gate

- **WHEN** an orphan reference has a file explanation
- **AND** no ledger declaration covers it
- **THEN** the reference SHALL NOT count as a valid reference input for gate pass
