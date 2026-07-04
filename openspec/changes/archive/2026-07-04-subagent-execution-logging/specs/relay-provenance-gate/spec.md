# Relay Provenance Gate (delta)

> req: RPG-007, RPG-008, RPG-009, RPG-010, RPG-011, RPG-012, RPG-013

## Purpose

为 `relay-provenance-gate` 增加 forensic 诊断、判断指南与诊断归位（本轮 **diagnostic-only**，不改变现有 pass/fail）。**抗手糊是频谱**（第 4 轮修正）：单个文件（`dispatch.json`/`_beacon.json`/`_agent.json`/`runtime-receipt.jsonl`）可被直接伪造，engine 经 `traceEntry` 写进 `rb_trace.jsonl` 的事件链才更难伪造（须 append 且跨文件自洽）。据此：RPG-007（nonce 非 UUID / 不在 dispatch.json，**懒手糊筛查**）、RPG-008（`relay_commit_missing`，commit trace 缺）、RPG-009（`agent_timestamp_span_suspicious`，**单独不足判伪造**）、RPG-011（`lifecycle_events_missing`，辅助）、**RPG-012（`provenance_chain_inconsistency`，跨文件交叉引用矛盾——认真手糊的主判据）**；**RPG-013** 要求所有诊断带 `slotKey`+`wave` 以便按 slot 聚合；**RPG-010** ship 框架自带判断指南（S0–S5 信号 + 6-tier 矩阵 + write-back，内容来自 plan §10），使下一个 coding agent 只拿框架就能判决。RPG-003（presence-based slot binding）本轮**保持不变**；升级为 execution-based 阻断是未来 change，依 plan §10 判决。

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
- **WHEN** `_subagents/wave_NN/dispatch.json` does not exist at all (staging never ran, e.g. hand-faked slots with no engine involvement)
- **THEN** the gate SHALL emit `provenance_nonce_mismatch` for every evidence-producing slot (no staged nonce can match)
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: Diagnostic reason distinguishes absent from malformed nonce
- **WHEN** a slot has no nonce material at all (no `_beacon.json`, no `runtime-receipt.jsonl` nonce — e.g. a pre-instrumentation bundle or a slot with no provenance left behind)
- **THEN** the emitted `provenance_nonce_mismatch` reason SHALL indicate the nonce is **absent** (pointing the judge to the guide's instrumentation prerequisite check)
- **AND WHEN** a nonce is present but not UUID-shaped
- **THEN** the reason SHALL indicate the nonce is **malformed** (sloppy-forgery signal)
- **AND** neither case SHALL be silenced — both remain advisory diagnostics

### Requirement: Gate SHALL emit a relay_commit_missing diagnostic

The gate SHALL check, for each evidence-producing slot, that the engine's commit path (`commitSlotResult`) actually ran. Commit is proven by either the commit trace events (`agent_result_received` / `result_schema_validated`) in `rb_trace.jsonl`, or the production `relay_commit_done` marker in `_logs/run.log` (emitted by `commitSlotResult` via the run logger — `relay_commit_done` is a run.log marker, not an `rb_trace.jsonl` event). Absence of all commit proof SHALL emit a `relay_commit_missing` diagnostic via existing logging surfaces. In this change the diagnostic is advisory only.

#### Scenario: Slot files present without commit proof
- **WHEN** a slot has `result.json` / `_status.json` but no commit trace events in `rb_trace.jsonl` and no `relay_commit_done` marker in `_logs/run.log`
- **THEN** the gate SHALL emit `relay_commit_missing`
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: Commit proof present emits no diagnostic
- **WHEN** the slot's commit trace events exist in `rb_trace.jsonl` (or the production `relay_commit_done` marker exists in `_logs/run.log`)
- **THEN** no `relay_commit_missing` diagnostic SHALL be emitted

### Requirement: Gate SHALL emit an agent_timestamp_span_suspicious diagnostic

The gate SHALL read each slot's `_agent.json` and emit `agent_timestamp_span_suspicious` when `spawnedAt` and `completedAt` are equal or within a sub-second span (configurable threshold, default 1s), since a real sub-agent cannot start and finish at the same millisecond. **This diagnostic alone is insufficient to conclude forgery** — a legitimately fast (trivial) slot may trigger it; a forgery verdict requires this to co-occur with an RPG-012 cross-reference inconsistency. In this change the diagnostic is advisory only.

#### Scenario: Identical spawn/complete timestamps flagged
- **WHEN** `_agent.json.spawnedAt === _agent.json.completedAt`
- **THEN** the gate SHALL emit `agent_timestamp_span_suspicious`

#### Scenario: Reasonable span emits no diagnostic
- **WHEN** the span between `spawnedAt` and `completedAt` exceeds the threshold
- **THEN** no `agent_timestamp_span_suspicious` diagnostic SHALL be emitted

### Requirement: Framework SHALL ship a provenance-forensics judgment guide

The framework SHALL ship a durable provenance-forensics judgment guide (e.g. `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`) that a coding agent can read post-run to decide whether evidence provenance is real or hand-faked. The guide SHALL contain: (a) the signals S0–S5 with exact file paths to inspect — S0 the engine trace chain (`slot_create`/`dispatch_create`/`agent_runtime_started`/`agent_result_ready`/`agent_result_received`/`result_schema_validated` in `rb_trace.jsonl`, all nonce-anchored per SUD-007), S1 `dispatch.json` existence, S2 nonce UUID-shape and ∈ `dispatch.json`, S3 commit trace chain present, S4 `_agent.json` spawnedAt→completedAt span, S5 lifecycle events with nonce in `_logs/run.log`; (b) **forge-resistance as a spectrum** — single files (dispatch.json, _beacon.json, _agent.json, runtime-receipt.jsonl) are trivially forged; the engine trace chain is the primary hard-to-forge signal; S1/S2 are a sloppy-forgery screen only; no single signal is crypto-unforgeable (signing out-of-scope); (c) the 6-tier decision matrix mapping signal patterns (per evidence-producing slot) to a conclusion and the hand-faking-remedy implication; (d) the write-back procedure (update the hand-faking bug's remedy section under `_backlog/bugs/` + the change's confidence section). The guide SHALL name the `_agent.json` fields that must be present and self-consistent (`platform`, `runtimeMode`, `runtimeAgentId`, `completedAt`, `validationOk`). The guide SHALL state that RPG-009 (timestamp span) alone is insufficient to conclude forgery (a legitimately fast slot may trigger it) and that a forgery verdict requires an RPG-012 cross-reference contradiction plus review. The guide content derives from `_backlog/plans/subagent-logging-come-alive-plan.md` §10 but lives in the shipped framework so a future agent need not read the plan.

#### Scenario: Coding agent decides from landed evidence using the guide
- **WHEN** a coding agent inspects a completed run's bundle after this change is applied
- **THEN** it SHALL be able to open the shipped provenance-forensics judgment guide
- **AND** follow S0–S5 + the 6-tier matrix to reach a documented conclusion without reading the original plan

#### Scenario: Guide covers real-run, sloppy-forgery, and staged-not-committed patterns
- **WHEN** the guide is read
- **THEN** it SHALL include the matrix tier for a fully driven slot (tier 1: S0✓ S3✓ status=done) and the tier for sloppy forgery (tier 5: S1✗ or S2✗)
- **AND** SHALL distinguish staged-not-committed (tier 4) from forgery
- **AND** SHALL state that a determined forger writing `dispatch.json`+UUID+appended trace lines is caught, if at all, only by RPG-012 cross-reference contradiction — not by S1/S2/S3 individually

#### Scenario: Guide instructs cross-artifact consistency reading before any forgery verdict
- **WHEN** the guide is read
- **THEN** it SHALL instruct the agent to perform cross-artifact consistency reading (RPG-012) before concluding forgery
- **AND** SHALL state that RPG-009 alone (fast span) is not sufficient to conclude forgery

### Requirement: Gate SHALL emit a lifecycle_events_missing diagnostic

The gate SHALL check, for each evidence-producing slot, that `_logs/run.log` / `rb_trace.jsonl` contain at least one lifecycle event carrying the slot's beacon nonce (the Layer-2 execution-proof signal from `subagent-runtime-logging`). Absence SHALL emit a `lifecycle_events_missing` diagnostic via existing logging surfaces. In this change the diagnostic is advisory only and SHALL NOT change pass/fail. This diagnostic is the read-side for SRL-004 and is auxiliary (S1–S4 suffice to judge whether the relay was driven).

#### Scenario: Slot produced evidence without lifecycle events
- **WHEN** an evidence-producing slot has no lifecycle event carrying its nonce in `_logs/run.log` / `rb_trace.jsonl`
- **THEN** the gate SHALL emit `lifecycle_events_missing`
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: Lifecycle events present emits no diagnostic
- **WHEN** at least one lifecycle event carrying the slot's nonce exists
- **THEN** no `lifecycle_events_missing` diagnostic SHALL be emitted

### Requirement: Gate SHALL emit a provenance_chain_inconsistency diagnostic

The gate SHALL cross-check the engine-emitted artifact set per evidence-producing slot and emit a `provenance_chain_inconsistency` diagnostic (trace event + run.log WARN) when **intra-chain references contradict** — specifically: (a) `result_schema_validated` absent but `agent_result_received` present for the slot; (b) `agent_result_ready` present but `agent_runtime_started` absent; (c) the nonce carried by the slot's trace events / `_beacon.json` / `dispatch.json` / lifecycle events disagree (only checkable end-to-end once SUD-007 nonce-anchors the staging+commit trace events); (d) the slot is listed in `dispatch.json` but has no `slot_create`/`dispatch_create` trace. The "`_status.json=done` without commit trace" condition is **owned by RPG-008** (`relay_commit_missing`); RPG-012 SHALL NOT duplicate that trigger, but MAY cite a co-occurring RPG-008 as corroboration. In this change the diagnostic is advisory only and SHALL NOT change pass/fail. This diagnostic operationalizes the cross-artifact consistency that distinguishes a determined forgery attempt (or corruption) from a real run.

#### Scenario: Commit trace present without schema validation flagged
- **WHEN** a slot has `agent_result_received` in `rb_trace.jsonl` but no `result_schema_validated`
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`
- **AND** SHALL NOT fail the gate solely on this diagnostic (this change)

#### Scenario: Nonce mismatch across chain artifacts flagged
- **WHEN** the nonce in the slot's staging/commit trace events differs from `_beacon.json` or `dispatch.json` or a lifecycle event
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`

#### Scenario: Slot in dispatch.json without staging trace flagged
- **WHEN** a slot is listed in `dispatch.json` but has no `slot_create`/`dispatch_create` trace in `rb_trace.jsonl`
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`

#### Scenario: Consistent chain emits no diagnostic
- **WHEN** the slot's full trace chain is present, nonce-anchored, and cross-consistent
- **THEN** no `provenance_chain_inconsistency` diagnostic SHALL be emitted

#### Scenario: _status=done without commit trace emits RPG-008, not RPG-012
- **WHEN** a slot has `_status.json=done` but no commit trace
- **THEN** the gate SHALL emit `relay_commit_missing` (RPG-008)
- **AND** SHALL NOT emit `provenance_chain_inconsistency` for that condition alone (RPG-012 may cite it as corroboration, not as its own trigger)

### Requirement: All gate provenance diagnostics SHALL carry slotKey and wave

Every diagnostic emitted under RPG-007 through RPG-012 SHALL include `slotKey` and `wave` (wave = the slot's `wave_NN` directory) in the event detail, so a future coding agent can aggregate diagnostics per slot/wave. Wave-level conditions (e.g. `dispatch.json` absent for the whole wave) SHALL emit one diagnostic per affected evidence-producing slot, each carrying that slot's key + wave; where no slot can be identified, the diagnostic SHALL use `slotKey: "__wave__"` and the wave.

#### Scenario: Slot-level diagnostic carries slotKey and wave
- **WHEN** the gate emits `provenance_nonce_mismatch` for slot_01 in wave_00
- **THEN** the diagnostic detail SHALL include the slot's `slotKey` and `wave: "wave_00"`

#### Scenario: Wave-level condition emits one diagnostic per affected slot
- **WHEN** `_subagents/wave_00/dispatch.json` is absent and three slots produced evidence
- **THEN** the gate SHALL emit three `provenance_nonce_mismatch` diagnostics, one per slot, each carrying that slot's `slotKey` + `wave: "wave_00"`
