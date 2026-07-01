# Runtime Reentry Debuggability

> req: RRD-001, RRD-002, RRD-003, RRD-004, RRD-005

## Purpose

TBD — see delta spec in change harden-rerun-topic-integration.

## Requirements

### Requirement: Phase boundary SHALL record a reentry checkpoint manifest

After each gate attempt, the Engine SHALL write a lightweight checkpoint manifest under `_checkpoints/<iso>-<gate>.json`.

The manifest SHALL include:
- `schema_version`
- `created_at`
- `bundle`
- `trigger`: `gate_attempt`
- `gate_result_ref`: enough fields to identify the triggering gate result (`gate`, `passed`, `currentNodeRef`, `next`)
- `status_snapshot`: current `rb_status.json` gate fields at checkpoint write time
- `normalized_target` when available
- topic registry summary
- queue summary
- artifact inventory for `seed_topics/`, `reference/`, `artifacts/`, and `final/`
- `cursors`: line counts for `rb_output_declarations.jsonl`, `rb_trace.jsonl`, and `_logs/run.log`
- `hashes`: size, mtime, and sha256 for control files and phase-owned artifacts

The manifest SHALL NOT copy artifact contents.

The checkpoint SHALL represent the runtime state at gate-attempt audit time. It SHALL NOT pretend to describe a later `advance-status` transition unless that transition has already occurred and is visible in bundle files.

When multiple checkpoint manifests exist, reentry tooling SHALL select the latest checkpoint whose `gate_result_ref.gate` or `normalized_target.status_gate` matches the requested target. If no matching checkpoint exists, it MAY fall back to the latest checkpoint for global drift context, but SHALL report the absence of a target-matching checkpoint as inspect/advice.

#### Scenario: Gate attempt records checkpoint

- **WHEN** a gate CLI writes a `gate_attempt`
- **THEN** `_checkpoints/` SHALL contain a new manifest for that gate
- **AND** the manifest SHALL include status, queue summary, artifact inventory, and ledger/trace/log cursors
- **AND** the manifest SHALL include `schema_version`, `trigger`, `gate_result_ref`, `status_snapshot`, `cursors`, and `hashes`

#### Scenario: Reentry selects latest matching checkpoint

- **WHEN** `_checkpoints/` contains multiple checkpoint manifests
- **AND** `check-reentry --at wave1_complete` is executed
- **THEN** reentry tooling SHALL select the newest checkpoint matching `wave1_complete` / `wave1-complete`
- **AND** it SHALL report when only a global fallback checkpoint was available

### Requirement: Reentry check SHALL validate runtime consistency for a target node

The system SHALL provide `DPT_FRAMEWORK/cli/check-reentry.mjs --bundle <path> --at <target>`.

The `--at` target vocabulary SHALL be closed and deterministic. Target normalization SHALL be derived from `DPT_FRAMEWORK/workflows/manifest.json` whenever possible, using each phase entry's `key`, `node`, and `gate`. Implementations SHALL NOT maintain a second hand-written phase/gate mapping that can drift from the manifest.

The checker SHALL normalize targets into one of:
- `kind: "gate"`: a gate or lifecycle checkpoint value comparable to `rb_status.json#/current_gate`, such as `wave1_complete` or `hitl2_recorded`
- `kind: "phase"`: a known phase node alias or node ref, such as `phase-wave1` or `phases/phase-wave1.md`, mapped from the workflow manifest to the gate/checkpoint and required artifact set for reentry

The normalized target object SHALL include:
- `input`
- `kind`
- `status_gate`: underscore lifecycle value used by `rb_status.json#/current_gate`
- `gate_key`: hyphen gate definition key when applicable, such as `wave1-complete`
- `node_ref`: canonical workflow node ref when applicable, such as `phases/phase-wave1.md`
- `phase_key`: phase key when applicable, such as `wave1`

Unknown targets SHALL fail as a configuration error with inspect/advice listing accepted target examples. The checker SHALL include the normalized target in its JSON output when normalization succeeds.

The CLI SHALL emit JSON with at least:
- `schema_version`
- `check`: `{ passed, target, exit_code }`
- `normalized_target` when available
- `blockers`: array of blocker findings
- `warnings`: array of warning findings
- `drift`: array of checkpoint drift findings
- `findings`: array of file observability findings
- `inspect`
- `advice`

Exit codes SHALL be:
- `0`: no blockers; reentry is clean enough to continue, though warnings MAY be present
- `1`: one or more blockers prevent reliable reentry
- `2`: configuration or invocation error, such as unknown target, missing bundle, or unreadable required control file

The CLI SHALL return check/inspect/advice JSON and SHALL validate:
- `rb_status.json` matches the normalized target gate/checkpoint when target kind is `gate`
- phase target aliases map to a known reentry checkpoint and required artifact set
- queue state is compatible with current lifecycle status
- required artifacts for phases up to the target exist
- ledger declarations cover reference files that participate in gate pass conditions
- latest checkpoint manifest is present when available and reports drift against current files
- unresolved blocking unplanned files are reported

The CLI SHALL NOT mutate runtime files.

#### Scenario: Reentry pass at wave1_complete

- **WHEN** a bundle has `rb_status.json#/current_gate = wave1_complete`
- **AND** required wave1 artifacts and ledger-covered references exist
- **THEN** `check-reentry --at wave1_complete` SHALL return `check.passed: true`
- **AND** process exit code SHALL be `0`
- **AND** output SHALL include `normalized_target.status_gate = "wave1_complete"`
- **AND** output SHALL include `normalized_target.gate_key = "wave1-complete"`

#### Scenario: Phase alias normalizes to canonical node

- **WHEN** `check-reentry --at phase-wave1` is executed
- **THEN** output SHALL include `normalized_target.kind = "phase"`
- **AND** output SHALL include `normalized_target.node_ref = "phases/phase-wave1.md"`
- **AND** output SHALL include the mapped reentry gate/checkpoint for wave1
- **AND** the mapping SHALL be derived from `DPT_FRAMEWORK/workflows/manifest.json`

#### Scenario: Unknown target fails closed

- **WHEN** `check-reentry --at arbitrary-chat-node` is executed
- **THEN** the checker SHALL return a configuration failure
- **AND** process exit code SHALL be `2`
- **AND** inspect/advice SHALL list accepted gate/checkpoint and phase target examples

#### Scenario: Reentry detects drift

- **WHEN** a checkpoint manifest records a file hash
- **AND** that file later changes
- **THEN** `check-reentry` SHALL return inspect/advice describing checkpoint drift

Drift severity SHALL be deterministic:
- `info`: append-only cursor advance in `_logs/run.log` or `rb_trace.jsonl` with no control/artifact hash conflict
- `warning`: non-authority artifact or diagnostic file drift that does not affect target pass conditions
- `blocker`: drift in control files, ledger declarations, queue state, status state, or authority artifacts that participate in target pass conditions

#### Scenario: Trace cursor advance is informational

- **WHEN** a checkpoint recorded `rb_trace.jsonl` line count
- **AND** later trace contains additional well-formed append-only diagnostic events
- **THEN** drift SHALL be classified as `info`

#### Scenario: Authority artifact drift blocks reentry

- **WHEN** a checkpoint recorded a reference file hash
- **AND** that reference participates in target gate pass conditions
- **AND** the file hash later changes
- **THEN** drift SHALL be classified as `blocker`

### Requirement: Queue state SHALL NOT conflict with lifecycle status after phase pass

When the lifecycle status has advanced beyond a queued phase, executable queue items from prior phases SHALL either be absent, `done`, `failed`, `blocked`, or explicitly marked with a reentry disposition reason.

If the existing queue item schema has no such field, implementation SHALL add an optional machine-readable field such as `reentry_disposition` with a non-empty `reason`. Adding this field SHALL NOT make ignored work executable and SHALL NOT replace normal queue completion receipts.

Reentry check SHALL report a conflict when lifecycle status is, for example, `hitl2_recorded` but `rb_queue.json` still contains executable `wave0-*` or `wave1-*` work without a disposition reason.

Conflict severity SHALL be deterministic:
- `blocker`: prior-phase work has status `queued` or `running` and the target assumes that phase has passed, or the work can write files participating in the target gate's pass conditions
- `warning`: the work has status `done`, `failed`, or `blocked`, has a `reentry_disposition.reason`, or belongs to a future phase relative to the requested target

Every conflict inspect item SHALL include severity, work id, phase, current queue state, and the reason for the classification.

#### Scenario: Stale wave0 task after HITL2 is reported

- **WHEN** `rb_status.json#/current_gate = hitl2_recorded`
- **AND** `rb_queue.json` contains queued `wave0-source-*` work
- **THEN** `check-reentry` SHALL report a `blocker`
- **AND** inspect SHALL name the stale work id and explain that HITL2 assumes wave0 has passed

#### Scenario: Ignored stale task is a warning

- **WHEN** `rb_status.json#/current_gate = hitl2_recorded`
- **AND** `rb_queue.json` contains a prior-phase work item with status `blocked` and `reentry_disposition.reason`
- **THEN** `check-reentry` SHALL report a warning rather than a blocker

### Requirement: Gate diagnostics SHALL preserve full post-mortem detail

When a gate attempt fails, Engine SHALL preserve full gate diagnostics outside `run.log`.

The diagnostic artifact SHALL include:
- `schema_version`
- `kind`: `gate_failure_detail`
- `created_at`
- `bundle`
- `source_event_ref`
- `gate`
- `currentNodeRef`
- full `check`, `routing`, `inspect`, and `advice` objects

The trace SHALL remain compact but SHALL contain a non-verdict diagnostic event pointing to the diagnostic artifact path.

#### Scenario: Failed gate stores diagnostic artifact

- **WHEN** a gate returns `check.passed: false`
- **THEN** `_diagnostics/gates/` SHALL contain a JSON artifact with full inspect/advice
- **AND** `rb_trace.jsonl` SHALL contain `event: "diagnostic"` with `kind: "gate_failure_detail"`
- **AND** the trace event SHALL include the diagnostic artifact path

### Requirement: Reentry tooling SHALL not rely on chat memory

Reentry tooling SHALL derive all facts from bundle files, framework specs, and deterministic helpers. It SHALL NOT require terminal scrollback, previous chat messages, or free-text run summaries.

#### Scenario: Reentry checker uses bundle truth

- **WHEN** `check-reentry` is run in a fresh process
- **THEN** it SHALL decide pass/fail from `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, ledger, checkpoints, and artifacts only
