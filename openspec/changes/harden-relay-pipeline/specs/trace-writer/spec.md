# Trace Writer (delta)

> req: TRW-001, TRW-002, TRW-003, TRW-004, TRW-005

## Purpose

Enrich gate-time trace entries with `diagnostic_path` and `phase` context so failures are diagnosable without reading chat transcripts. Add `relay_bypass_suspected` trace events for automatic bypass detection. Gate pass attempts also write lightweight diagnostic artifacts for before/after comparison. Unify trace writing through `writeGateAttempt()` and `traceEntry()`.

## ADDED Requirements

### Requirement: Gate attempt trace entries SHALL include diagnostic path reference

When `writeGateAttempt()` writes a `gate_attempt` event to `rb_trace.jsonl`, the entry SHALL include a `diagnostic_path` field when the gate fails (pointing to `_diagnostics/gates/<iso>-<gate>.json`). When the gate passes, the entry SHALL include `diagnostic_path` because this change requires a lightweight pass diagnostic artifact.

The `diagnostic_path` SHALL be a bundle-relative path, enabling debuggers to navigate from trace overview to detailed diagnostic without reading chat transcripts.

#### Scenario: Failed gate attempt carries diagnostic path in trace

- **WHEN** a gate fails and `writeGateAttempt()` is called
- **THEN** the `rb_trace.jsonl` `gate_attempt` entry SHALL include `diagnostic_path`
- **AND** the path SHALL point to the corresponding `_diagnostics/gates/<iso>-<gate>.json` file

#### Scenario: Passed gate attempt carries diagnostic path when available

- **WHEN** a gate passes and the lightweight diagnostic is written
- **THEN** the `rb_trace.jsonl` `gate_attempt` entry SHALL include `diagnostic_path`

### Requirement: Gate attempt trace entries SHALL include phase context

When `writeGateAttempt()` writes a `gate_attempt` event to `rb_trace.jsonl`, the entry SHALL include a `phase` field derived from the gate name (e.g., `wave0-complete` → `wave0`, `wave1-complete` → `wave1`).

This enables trace readers to filter and correlate events by research phase without external context.

#### Scenario: Gate attempt trace includes phase

- **WHEN** `writeGateAttempt()` writes a `gate_attempt` for `wave1-complete`
- **THEN** the trace entry SHALL include `"phase": "wave1"`

### Requirement: Trace SHALL capture relay bypass suspicion

The system SHALL define a `relay_bypass_suspected` trace event. This event SHALL be written automatically by gate CLI when phase artifacts indicate evidence/search work but matching phase-scoped relay provenance markers are absent.

The event SHALL include: `artifacts_found` (list of artifact paths that exist), `provenance_missing` (which markers are absent), `phase`, and the gate that triggered detection.

Detection SHALL be phase-aware:

- Wave0/Wave1: current-wave artifact/source/reference files without current-wave output declaration coverage or successful current-wave subagent slot binding SHALL trigger suspicion.
- Wave2: pure synthesis/backfill artifacts SHALL NOT trigger suspicion. Pure synthesis/backfill artifacts are defined as `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, and seed-topic backfill edits (consistent with the `relay-provenance-gate` capability's Wave2 safe set). Suspicion SHALL be limited to `reference/00-cross-*.md`, search/gap-fill evidence, or finding-index search claims (`decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`) without matching Wave2 output declaration coverage and successful slot binding.

This event SHALL be diagnostic only. It SHALL NOT cause filesystem-only artifacts to count toward gate pass, and it SHALL NOT replace `output_declaration_ledger_exists` / `output_declaration_coverage` / `subagent_slot_presence` as deterministic provenance checks. When the corresponding provenance rule is configured and triggered, the rule result remains the blocking pass/fail authority.

#### Scenario: Relay bypass suspicion recorded in trace

- **WHEN** gate evaluation detects artifacts without relay provenance
- **THEN** a `relay_bypass_suspected` event SHALL be appended to `rb_trace.jsonl`
- **AND** the event SHALL include what was found and what was missing

#### Scenario: Wave2 pure synthesis does not record bypass suspicion

- **WHEN** Wave2 synthesis/backfill artifacts exist
- **AND** no `reference/00-cross-*.md` or search/gap-fill evidence exists
- **AND** no finding has `decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`
- **THEN** gate evaluation SHALL NOT write `relay_bypass_suspected` merely because `_subagents/wave_02/` is absent

### Requirement: Gate diagnostic SHALL be written on pass as well as fail

The gate diagnostic writer SHALL write a lightweight diagnostic artifact for passed gates, not only failed ones. The pass diagnostic SHALL be a minimal JSON file at `_diagnostics/gates/<iso>-<gate>.json` containing `schema_version`, `created_at`, `bundle`, `gate`, `passed: true`, and a summary of rules evaluated.

This enables comparison between pass and fail attempts to understand what was repaired.

#### Scenario: Pass diagnostic written alongside failure diagnostics

- **WHEN** a gate passes on the third attempt
- **THEN** `_diagnostics/gates/` SHALL contain three files: two failure diagnostics (attempts 1-2) and one pass diagnostic (attempt 3)
- **AND** the pass diagnostic SHALL clearly indicate `passed: true`

## MODIFIED Requirements

### Requirement: Trace entries include bundle field

All modules writing to `rb_trace.jsonl` SHALL include `bundle` where the existing trace contract requires it. The value SHALL be derived from active bundle state, normally `rb_status.json`, not from chat memory.

**变更**: Gate CLI 的 `writeGateAttempt()` SHALL 继续使用统一的 trace 写入路径。Gate CLI SHALL NOT 直接 `appendFileSync` 到 `rb_trace.jsonl`——所有 trace 写入 SHALL 通过 `writeGateAttempt()` 或 `traceEntry()` 完成，确保 timestamp、bundle、phase、diagnostic_path 等字段的一致注入。

#### Scenario: Queue trace includes bundle

（同 main spec，不变）

#### Scenario: Gate CLI uses unified trace path

- **WHEN** a gate CLI writes a `gate_attempt` trace event
- **THEN** the write SHALL go through `writeGateAttempt()`
- **AND** SHALL NOT use inline `appendFileSync` to `rb_trace.jsonl`
- **AND** the trace entry SHALL include `ts`, `bundle`, `event`, `phase`, and `diagnostic_path` for gate attempts covered by this change
