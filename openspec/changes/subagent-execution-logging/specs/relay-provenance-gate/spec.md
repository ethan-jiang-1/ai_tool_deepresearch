# Relay Provenance Gate (delta)

> req: RPG-007, RPG-008, RPG-009, RPG-010, RPG-011

## Purpose

为 `relay-provenance-gate` 增加 forensic 诊断与判断指南（本轮 **diagnostic-only**，不改变现有 pass/fail）：检测手糊 provenance 的四个信号——nonce 非 UUID 或不在 dispatch.json（`provenance_nonce_mismatch`，RPG-007）、slot 缺 `relay_commit_done` trace（`relay_commit_missing`，RPG-008）、`_agent.json` 启停同毫秒（`agent_timestamp_span_suspicious`，RPG-009）、slot 无带 nonce 的 lifecycle 事件（`lifecycle_events_missing`，RPG-011，作为 `subagent-runtime-logging` SRL-004 的读取侧）。另新增 RPG-010：框架 ship 一份 durable 的 provenance 取证判断指南（5 信号 + 判决矩阵 + write-back，内容来自 plan §10），使下一个 coding agent 只拿框架就能判决。RPG-003（presence-based slot binding）本轮**保持不变**；升级为 execution-based 阻断是未来 change，依 plan §10 判决。

## ADDED Requirements

### Requirement: Gate SHALL emit a provenance_nonce_mismatch diagnostic

The gate CLI SHALL, when evaluating subagent provenance, compare each slot's `receipt_nonce` (from `runtime-receipt.jsonl` / `_beacon.json` / ledger) against the UUID `receipt_nonce` recorded in `dispatch.json`. A non-UUID nonce, or a nonce absent from `dispatch.json`, SHALL emit a `provenance_nonce_mismatch` diagnostic (trace event + run.log WARN via existing logging surfaces). In this change the diagnostic is advisory only and SHALL NOT change pass/fail.

#### Scenario: Hand-shaped nonce is flagged
- **WHEN** a slot's `receipt_nonce` is not a UUID (e.g. `nonce-{slotkey}-{ms}`)
- **THEN** the gate SHALL emit `provenance_nonce_mismatch`
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: UUID nonce absent from dispatch.json is flagged
- **WHEN** a slot's nonce is UUID-shaped but not present in `dispatch.json`
- **THEN** the gate SHALL emit `provenance_nonce_mismatch` noting the dispatch record is missing

#### Scenario: Matching UUID nonce emits no diagnostic
- **WHEN** a slot's nonce is UUID-shaped and matches `dispatch.json`
- **THEN** no `provenance_nonce_mismatch` diagnostic SHALL be emitted for that slot

#### Scenario: Absent dispatch.json is flagged for every slot
- **WHEN** `_subagents/wave_NN/dispatch.json` does not exist at all (staging never ran, e.g. hand-faked slots as in BUG-019)
- **THEN** the gate SHALL emit `provenance_nonce_mismatch` for every evidence-producing slot (no staged nonce can match)
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

### Requirement: Gate SHALL emit a relay_commit_missing diagnostic

The gate SHALL check, for each evidence-producing slot, that `rb_trace.jsonl` contains a `relay_commit_done` event for that slot. Absence indicates the engine's `commitSlotResult` did not run (the slot files may be hand-written). Absence SHALL emit a `relay_commit_missing` diagnostic via existing logging surfaces. In this change the diagnostic is advisory only.

#### Scenario: Slot files present without commit trace
- **WHEN** a slot has `result.json` / `_status.json` but no `relay_commit_done` in `rb_trace.jsonl`
- **THEN** the gate SHALL emit `relay_commit_missing`
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: Commit trace present emits no diagnostic
- **WHEN** `rb_trace.jsonl` contains `relay_commit_done` for the slot
- **THEN** no `relay_commit_missing` diagnostic SHALL be emitted

### Requirement: Gate SHALL emit an agent_timestamp_span_suspicious diagnostic

The gate SHALL read each slot's `_agent.json` and emit `agent_timestamp_span_suspicious` when `spawnedAt` and `completedAt` are equal or within a sub-second span (configurable threshold, default 1s), since a real sub-agent cannot start and finish at the same millisecond. In this change the diagnostic is advisory only.

#### Scenario: Identical spawn/complete timestamps flagged
- **WHEN** `_agent.json.spawnedAt === _agent.json.completedAt`
- **THEN** the gate SHALL emit `agent_timestamp_span_suspicious`

#### Scenario: Reasonable span emits no diagnostic
- **WHEN** the span between `spawnedAt` and `completedAt` exceeds the threshold
- **THEN** no `agent_timestamp_span_suspicious` diagnostic SHALL be emitted

### Requirement: Framework SHALL ship a provenance-forensics judgment guide

The framework SHALL ship a durable provenance-forensics judgment guide (e.g. `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`) that a coding agent can read post-run to decide whether evidence provenance is real or hand-faked. The guide SHALL contain: (a) the 5 signals S1–S5 with exact file paths to inspect — S1 `dispatch.json` existence, S2 nonce UUID-shape and ∈ `dispatch.json`, S3 `relay_commit_done` in `rb_trace.jsonl`, S4 `_agent.json` spawnedAt→completedAt span, S5 lifecycle events with nonce in `_logs/run.log`; (b) the decision matrix mapping signal patterns to a conclusion and to the BUG-019 remedy implication (S1–S4 all ✓ → relay sound, fallback wrong; any of S1/S2/S3 ✗ → hand-faked, fix driver not fallback); (c) the write-back procedure (update BUG-019 + the change's confidence section). The guide content derives from `_backlog/plans/subagent-logging-come-alive-plan.md` §10 but lives in the shipped framework so a future agent need not read the plan.

#### Scenario: Coding agent decides from landed evidence using the guide
- **WHEN** a coding agent inspects a completed run's bundle after this change is applied
- **THEN** it SHALL be able to open the shipped provenance-forensics judgment guide
- **AND** follow S1–S5 + the matrix to reach a documented conclusion without reading the original plan

#### Scenario: Guide covers both real-run and hand-fake patterns
- **WHEN** the guide is read
- **THEN** it SHALL include the matrix row for a fully driven slot (S1–S4 ✓) and the row for a hand-faked slot (S1/S2/S3 ✗)
- **AND** SHALL state the BUG-019 remedy implication for each

### Requirement: Gate SHALL emit a lifecycle_events_missing diagnostic

The gate SHALL check, for each evidence-producing slot, that `_logs/run.log` / `rb_trace.jsonl` contain at least one lifecycle event carrying the slot's beacon nonce (the Layer-2 execution-proof signal from `subagent-runtime-logging`). Absence SHALL emit a `lifecycle_events_missing` diagnostic via existing logging surfaces. In this change the diagnostic is advisory only and SHALL NOT change pass/fail. This diagnostic is the read-side for SRL-004 and is auxiliary (S1–S4 suffice to judge whether the relay was driven).

#### Scenario: Slot produced evidence without lifecycle events
- **WHEN** an evidence-producing slot has no lifecycle event carrying its nonce in `_logs/run.log` / `rb_trace.jsonl`
- **THEN** the gate SHALL emit `lifecycle_events_missing`
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: Lifecycle events present emits no diagnostic
- **WHEN** at least one lifecycle event carrying the slot's nonce exists
- **THEN** no `lifecycle_events_missing` diagnostic SHALL be emitted
