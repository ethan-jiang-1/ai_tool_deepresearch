# Relay Provenance Gate

> req: RPG-001, RPG-002, RPG-003, RPG-004, RPG-005, RPG-006, RPG-007, RPG-008, RPG-009, RPG-010, RPG-011, RPG-012, RPG-013

## Purpose

Gate-level phase-aware relay provenance checks that verify evidence/search outputs went through the Sub-agent relay pipeline, not Phase Agent direct search and hand-written artifacts.

Provenance is stronger than mere existence. A current-wave ledger entry proves delegated `complete()` appended a record; coverage proves the files being evaluated are declared in that Engine-written ledger; slot binding proves the declared files came from a successful current-wave relay slot. Filesystem scans may expose orphan/direct-written files for diagnostics, but they do not satisfy pass authority.

Wave0/Wave1 evidence-producing outputs require hard relay provenance. Wave2 synthesis/backfill remains Phase-Agent work; only Wave2 new search/evidence/reference outputs require Wave2 relay provenance.

Forensic diagnostics (RPG-007..013) are **diagnostic-only** — advisory, never changing pass/fail. **抗手糊是频谱**：单个文件（`dispatch.json`/`_beacon.json`/`_agent.json`/`runtime-receipt.jsonl`）可被直接伪造，engine 经 `traceEntry` 写进 `rb_trace.jsonl` 的事件链才更难伪造（须 append 且跨文件自洽）。RPG-007（懒手糊筛查）、RPG-008（commit proof 缺失）、RPG-009（timestamp span，单独不足判伪造）、RPG-011（lifecycle 辅助）、RPG-012（跨文件交叉引用矛盾——认真手糊的主判据）、RPG-013（诊断带 slotKey+wave）；RPG-010 ship 框架自带判断指南。RPG-003（presence-based slot binding）保持不变；升级为 execution-based 阻断是未来 change。

## Requirements

### Requirement: Gate SHALL verify scoped output declaration ledger entries

Gate CLI SHALL support an `output_declaration_ledger_exists` check type that verifies bundle root `rb_output_declarations.jsonl` exists and contains at least one valid Engine-written output declaration record matching the rule scope.

The check SHALL read JSONL records from bundle root and support rule scoping by `wave`, `producer_rule`, `role`, `work_id_pattern`, and/or `output_path_pattern`. A matching record SHALL include delegated completion provenance fields such as `work_id`, `producer_rule`, `slot_result_ref`, `runtime_receipt_ref`, and `output_files[]`.

This check proves that delegated relay completion happened in the scoped phase. It SHALL NOT by itself prove that every expected artifact/reference is covered, and it SHALL NOT replace accepted `count_floor`, `reference_ledger_coverage`, `content_dedup`, or `cache_coverage` semantics.

#### Scenario: Wave0 scoped ledger entry exists

- **WHEN** `rb_output_declarations.jsonl` contains a valid record whose lineage identifies Wave0 relay completion
- **AND** the gate rule defines `check: "output_declaration_ledger_exists"` and `wave: "wave0"`
- **THEN** the check SHALL pass
- **AND** downstream `output_declaration_coverage` and `subagent_slot_presence` checks SHALL still run when configured

#### Scenario: Ledger entries for another wave do not satisfy current wave

- **WHEN** `rb_output_declarations.jsonl` contains only Wave0 scoped records
- **AND** Wave1 gate rule requires `wave: "wave1"`
- **THEN** `output_declaration_ledger_exists` SHALL fail for Wave1
- **AND** inspect SHALL state the scoped count and missing wave

### Requirement: Gate SHALL verify scoped output declaration coverage for current phase outputs

Gate CLI SHALL support an `output_declaration_coverage` check type as the coverage extension of scoped output declaration ledger verification. It verifies phase-scoped artifact/reference outputs being evaluated by the gate are declared in Engine-written `rb_output_declarations.jsonl` records matching the rule scope.

The check SHALL compare expected or discovered current-phase output paths against scoped ledger `output_files[].path` declarations. Rule configuration SHALL identify both:

- a ledger scope selector, such as `wave`, `producer_rule`, `role`, `work_id_pattern`, or `output_path_pattern`
- an output set selector, using deterministic selectors such as:
  - `expected_from_topic_registry` for per-topic Wave0/Wave1 outputs
  - `glob` for optional promoted references such as `reference/00-cross-*.md`
  - `roles` for `source_yaml`, `evidence_summary`, `question_list`, or `reference`
  - `producer_rule` / `wave` / `work_id_pattern` for current-wave scoping

If the selector is missing, ambiguous, or unsupported, the gate SHALL fail the rule configuration with inspect output rather than silently falling back to filesystem authority.

Coverage SHALL pass only when required current-phase outputs are declared by matching ledger records. Files found on disk but absent from matching ledger records SHALL be reported as orphan/direct-written outputs and SHALL NOT satisfy this check.

#### Scenario: Wave1 evidence artifacts are ledger-covered

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` and `artifacts/wave1/topic-a/question-list.md` exist
- **AND** matching Wave1 ledger records declare both paths in `output_files[]`
- **AND** the rule scope is `wave: "wave1"`
- **THEN** `output_declaration_coverage` SHALL pass for those paths

#### Scenario: Filesystem-only Wave1 artifact fails coverage

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` exists on disk
- **AND** no Wave1 ledger record declares that path
- **THEN** `output_declaration_coverage` SHALL fail
- **AND** inspect SHALL list the path as an orphan/direct-written output

#### Scenario: Coverage does not replace countability

- **WHEN** a reference path is covered by a ledger record
- **THEN** accepted reference countability, format, URL quality, dedup, and cache coverage checks SHALL still apply according to their own specs

#### Scenario: Ledger file does not exist

- **WHEN** `rb_output_declarations.jsonl` does not exist at the bundle root
- **AND** an `output_declaration_coverage` rule is configured
- **THEN** the check SHALL fail
- **AND** inspect SHALL report all expected output paths as orphan/direct-written
- **AND** inspect SHALL state that the output declaration ledger is missing entirely

### Requirement: Gate SHALL verify successful current-wave subagent slot binding

Gate CLI SHALL support a `subagent_slot_presence` check type that verifies current-wave ledger-covered outputs bind back to successful terminal relay slot evidence for the same wave.

The check SHALL scan only the configured wave directory:

- `wave0` -> `_subagents/wave_00/slot_MM/`
- `wave1` -> `_subagents/wave_01/slot_MM/`
- `wave2` -> `_subagents/wave_02/slot_MM/`

A slot SHALL count only when it has a successful terminal marker. With the accepted slot lifecycle, `_status.json.status` SHALL be exactly `done`; `failed` is terminal but not successful. `result.json` SHALL exist, parse, have `status: "done"`, and SHALL match the ledger record's `slot_result_ref` where that field is available. A failed, pending, running, empty, schema-invalid, or other-wave slot SHALL NOT count.

When the gate also evaluates `output_declaration_coverage`, `subagent_slot_presence` SHALL bind slot evidence to covered ledger records where possible by `slot_result_ref`, `work_id`, `producer_rule`, and/or current wave. A generic non-empty `_subagents/<wave>/` directory is insufficient.

#### Scenario: Wave1 slot binding passes with successful Wave1 result

- **WHEN** a Wave1 ledger record declares `slot_result_ref: "_subagents/wave_01/slot_00/result.json"`
- **AND** that result file exists, parses, and represents a successful completed slot
- **THEN** `subagent_slot_presence` SHALL pass for that record

#### Scenario: Wave1 does not pass from Wave0 slots

- **WHEN** `_subagents/wave_00/slot_00/result.json` exists
- **AND** `_subagents/wave_01/` is missing or has no successful terminal slot bound to Wave1 records
- **THEN** `subagent_slot_presence` SHALL fail for a Wave1 rule

#### Scenario: Failed or pending slot does not satisfy provenance

- **WHEN** `_subagents/wave_01/slot_00/_status.json` exists with a failed or pending state
- **THEN** `subagent_slot_presence` SHALL fail
- **AND** inspect SHALL explain that the slot is present but not a successful terminal relay result

### Requirement: Wave2 relay provenance SHALL be conditional on search evidence

Wave2 gate SHALL NOT require unconditional `output_declaration_ledger_exists`, `output_declaration_coverage`, or `subagent_slot_presence` solely because the phase produced `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, or seed-topic backfill edits.

Note: `finding-index.yaml` appears in both roles. As a file product, it does not by itself require Wave2 relay provenance. As a signal source, its entries declare search intent and trigger conditional provenance for the corresponding search/evidence outputs. The file existing without search-signaling entries does not trigger provenance; the file existing with `decision: exploit_search` entries triggers provenance for those entries' outputs, not for the finding-index file itself.

Wave2 SHALL require blocking relay provenance for Wave2 new search/evidence/reference outputs or search claims. **Any one** of the following conditions SHALL trigger Wave2 provenance requirements for the corresponding outputs (logical OR):

- `reference/00-cross-*.md` exists (glob-based detection)
- `artifacts/wave2/finding-index.yaml` entries with `decision: exploit_search` or `decision: explore_search` (signal-based detection)
- finding-index entries with `search_required: true`
- finding-index entries with non-empty or expected `subagent_receipt_refs`
- supplementary backing/cross-topic/emergent gap-fill outputs

When multiple conditions match, provenance is required for each matched output independently. The absence of one condition does not excuse another — e.g., a `reference/00-cross-*.md` file without a matching finding-index entry still requires provenance via the glob path.

For those outputs, Wave2 rules SHALL use current-wave output declaration coverage and successful slot binding. Missing Wave2 provenance SHALL fail the conditional provenance rule and MAY also write `relay_bypass_suspected` as a diagnostic side effect.

#### Scenario: Wave2 pure synthesis does not require Wave2 subagent slots

- **WHEN** Wave2 produced `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml`
- **AND** no `reference/00-cross-*.md` files exist
- **AND** no finding has `decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`
- **THEN** Wave2 gate SHALL NOT fail solely because `_subagents/wave_02/` is missing

#### Scenario: Wave2 promoted cross reference requires relay provenance

- **WHEN** `reference/00-cross-market-shift.md` exists
- **AND** no Wave2 scoped output declaration coverage and successful slot binding exists for that reference
- **THEN** Wave2 gate SHALL fail the conditional provenance rule
- **AND** the gate MAY write `relay_bypass_suspected` identifying the orphan promoted reference

#### Scenario: Wave2 mixed safe and search outputs — provenance applies per-output

- **WHEN** Wave2 produced `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` (safe set)
- **AND** Wave2 also produced `reference/00-cross-market-shift.md` without Wave2 output declaration coverage and successful slot binding
- **THEN** the safe set SHALL NOT cause the gate to fail
- **AND** the conditional provenance rule targeting `reference/00-cross-*.md` SHALL fail independently for that reference
- **AND** the overall gate result SHALL be fail because the conditional provenance rule failed
- **AND** safe artifacts SHALL NOT be flagged as orphan or bypass-suspected

### Requirement: Gate SHALL detect suspected relay bypass by phase

Gate CLI SHALL automatically write a `relay_bypass_suspected` trace event to `rb_trace.jsonl` and a WARN entry to `_logs/run.log` when phase artifacts indicate evidence/search work but matching phase-scoped relay provenance is absent.

For Wave0/Wave1, current-wave artifact/source/reference files without current-wave output declaration coverage or successful current-wave slot binding SHALL trigger suspicion.

For Wave2, pure synthesis/backfill artifacts SHALL NOT trigger suspicion. Wave2 suspicion SHALL be limited to search/evidence outputs such as `reference/00-cross-*.md`, gap-fill search artifacts, or finding-index search claims (`decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`) without matching Wave2 relay markers.

This detection SHALL run regardless of whether the gate definition includes provenance rules. It is always-on diagnostic instrumentation that runs before emitting the gate result. It SHALL NOT cause filesystem-only artifacts to count toward gate pass. It is diagnostic evidence, not an alternative authority source.

#### Scenario: Wave1 artifacts present but only Wave0 provenance triggers suspicion

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` exists
- **AND** matching Wave1 ledger coverage or Wave1 successful slot binding is missing
- **THEN** gate CLI SHALL write `relay_bypass_suspected`
- **AND** the event SHALL include the gate, phase, artifacts found, and missing current-wave provenance markers

#### Scenario: Wave2 synthesis artifacts alone do not trigger bypass suspicion

- **WHEN** `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, and `artifacts/wave2/finding-index.yaml` exist
- **AND** `_subagents/wave_02/` is missing
- **AND** no Wave2 search/reference outputs are present
- **THEN** gate CLI SHALL NOT write `relay_bypass_suspected` for relay absence alone

### Requirement: Provenance checks SHALL coexist with structural checks in gate definitions

Provenance check types (`output_declaration_ledger_exists`, `output_declaration_coverage`, `subagent_slot_presence`) SHALL be standard `check` values in gate definition JSON files using the same rule structure as existing check types.

Gate CLI rule evaluation SHALL dispatch to provenance checks through the same `rule.check` switch as all other check types. Provenance checks SHALL NOT require a separate CLI or a separate gate pass.

Provenance checks SHALL NOT change the authority source of existing `count_floor` or content checks. Engine-written `rb_output_declarations.jsonl` remains the authoritative index of Agent-produced reference outputs; filesystem scans MAY support orphan diagnostics but SHALL NOT satisfy ledger-authoritative pass conditions.

#### Scenario: Provenance rule in gate definition

- **WHEN** `gate-wave0-complete.definition.json` contains a rule with `"check": "output_declaration_coverage"`
- **THEN** the gate CLI SHALL evaluate it in the rule evaluation loop
- **AND** the rule SHALL contribute to the overall pass/fail determination

#### Scenario: Provenance check uses standard gate result shape

- **WHEN** an `output_declaration_coverage` check fails
- **THEN** the failure SHALL appear in `inspect` with the rule's `failure_message`
- **AND** the `advice` SHALL contain actionable guidance
- **AND** the output JSON SHALL use the standard `{ check, routing, inspect, advice }` shape

### Requirement: Gate SHALL emit a provenance_nonce_mismatch diagnostic

The gate CLI SHALL, when evaluating subagent provenance, compare each slot's `receipt_nonce` (from `runtime-receipt.jsonl` / `_beacon.json` / ledger) against the UUID `receipt_nonce` recorded in `dispatch.json`. A non-UUID nonce, or a nonce absent from `dispatch.json`, SHALL emit a `provenance_nonce_mismatch` diagnostic (trace event + run.log WARN via existing logging surfaces). The diagnostic is advisory only and SHALL NOT change pass/fail.

#### Scenario: Hand-shaped nonce is flagged
- **WHEN** a slot's `receipt_nonce` is not a UUID (e.g. `nonce-{slotkey}-{ms}`)
- **THEN** the gate SHALL emit `provenance_nonce_mismatch`
- **AND** SHALL NOT fail the gate solely on this diagnostic

#### Scenario: Matching UUID nonce emits no diagnostic
- **WHEN** a slot's nonce is UUID-shaped and matches `dispatch.json`
- **THEN** no `provenance_nonce_mismatch` diagnostic SHALL be emitted for that slot

### Requirement: Gate SHALL emit a relay_commit_missing diagnostic

The gate SHALL check, for each evidence-producing slot, that the engine's commit path (`commitSlotResult`) actually ran. Commit is proven by either the commit trace events (`agent_result_received` / `result_schema_validated`) in `rb_trace.jsonl`, or the production `relay_commit_done` marker in `_logs/run.log` (emitted by `commitSlotResult` via the run logger — `relay_commit_done` is a run.log marker, not an `rb_trace.jsonl` event). Absence of all commit proof SHALL emit a `relay_commit_missing` diagnostic via existing logging surfaces. The diagnostic is advisory only.

#### Scenario: Slot files present without commit proof
- **WHEN** a slot has `result.json` / `_status.json` but no commit trace events and no `relay_commit_done` marker
- **THEN** the gate SHALL emit `relay_commit_missing`
- **AND** SHALL NOT fail the gate solely on this diagnostic

### Requirement: Gate SHALL emit an agent_timestamp_span_suspicious diagnostic

The gate SHALL read each slot's `_agent.json` and emit `agent_timestamp_span_suspicious` when `spawnedAt` and `completedAt` are equal or within a sub-second span (configurable threshold, default 1s), since a real sub-agent cannot start and finish at the same millisecond. **This diagnostic alone is insufficient to conclude forgery** — a legitimately fast (trivial) slot may trigger it; a forgery verdict requires this to co-occur with an RPG-012 cross-reference inconsistency. The diagnostic is advisory only.

#### Scenario: Reasonable span emits no diagnostic
- **WHEN** the span between `spawnedAt` and `completedAt` exceeds the threshold
- **THEN** no `agent_timestamp_span_suspicious` diagnostic SHALL be emitted

### Requirement: Framework SHALL ship a provenance-forensics judgment guide

The framework SHALL ship a durable provenance-forensics judgment guide (e.g. `DPT_FRAMEWORK/command_playbook/provenance-forensics-guide.md`) that a coding agent can read post-run to decide whether evidence provenance is real or hand-faked. The guide SHALL contain: (a) the signals S0–S5 with exact file paths to inspect — S0 the engine trace chain (`slot_create`/`dispatch_create`/`agent_runtime_started`/`agent_result_ready`/`agent_result_received`/`result_schema_validated` in `rb_trace.jsonl`, all nonce-anchored per SUD-007), S1 `dispatch.json` existence, S2 nonce UUID-shape and ∈ `dispatch.json`, S3 commit trace chain present, S4 `_agent.json` spawnedAt→completedAt span, S5 lifecycle events with nonce in `_logs/run.log`; (b) **forge-resistance as a spectrum** — single files (dispatch.json, _beacon.json, _agent.json, runtime-receipt.jsonl) are trivially forged; the engine trace chain is the primary hard-to-forge signal; S1/S2 are a sloppy-forgery screen only; no single signal is crypto-unforgeable (signing out-of-scope); (c) the 6-tier decision matrix mapping signal patterns (per evidence-producing slot) to a conclusion and the hand-faking-remedy implication; (d) the write-back procedure (update the hand-faking bug's remedy section under `_backlog/bugs/` + the change's confidence section). The guide SHALL name the `_agent.json` fields that must be present and self-consistent (`platform`, `runtimeMode`, `runtimeAgentId`, `completedAt`, `validationOk`). The guide SHALL state that RPG-009 (timestamp span) alone is insufficient to conclude forgery (a legitimately fast slot may trigger it) and that a forgery verdict requires an RPG-012 cross-reference contradiction plus review. The guide content derives from `_backlog/plans/subagent-logging-come-alive-plan.md` §10 but lives in the shipped framework so a future agent need not read the plan.

#### Scenario: Coding agent decides from landed evidence using the guide
- **WHEN** a coding agent inspects a completed run's bundle
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

The gate SHALL check, for each evidence-producing slot, that `_logs/run.log` / `rb_trace.jsonl` contain at least one lifecycle event carrying the slot's beacon nonce (the Layer-2 execution-proof signal from `subagent-runtime-logging`). Absence SHALL emit a `lifecycle_events_missing` diagnostic via existing logging surfaces. The diagnostic is advisory only and SHALL NOT change pass/fail. This diagnostic is the read-side for SRL-004 and is auxiliary (S1–S4 suffice to judge whether the relay was driven).

#### Scenario: Slot produced evidence without lifecycle events
- **WHEN** an evidence-producing slot has no lifecycle event carrying its nonce in `_logs/run.log` / `rb_trace.jsonl`
- **THEN** the gate SHALL emit `lifecycle_events_missing`
- **AND** SHALL NOT fail the gate solely on this diagnostic

#### Scenario: Lifecycle events present emits no diagnostic
- **WHEN** at least one lifecycle event carrying the slot's nonce exists
- **THEN** no `lifecycle_events_missing` diagnostic SHALL be emitted

### Requirement: Gate SHALL emit a provenance_chain_inconsistency diagnostic

The gate SHALL cross-check the engine-emitted artifact set per evidence-producing slot and emit a `provenance_chain_inconsistency` diagnostic (trace event + run.log WARN) when **intra-chain references contradict** — specifically: (a) `result_schema_validated` absent but `agent_result_received` present for the slot; (b) `agent_result_ready` present but `agent_runtime_started` absent; (c) the nonce carried by the slot's trace events / `_beacon.json` / `dispatch.json` / lifecycle events disagree (only checkable end-to-end once SUD-007 nonce-anchors the staging+commit trace events); (d) the slot is listed in `dispatch.json` but has no `slot_create`/`dispatch_create` trace. The "`_status.json=done` without commit trace" condition is **owned by RPG-008** (`relay_commit_missing`); RPG-012 SHALL NOT duplicate that trigger, but MAY cite a co-occurring RPG-008 as corroboration. The diagnostic is advisory only and SHALL NOT change pass/fail.

#### Scenario: Commit trace present without schema validation flagged
- **WHEN** a slot has `agent_result_received` in `rb_trace.jsonl` but no `result_schema_validated`
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`
- **AND** SHALL NOT fail the gate solely on this diagnostic

#### Scenario: Nonce mismatch across chain artifacts flagged
- **WHEN** the nonce in the slot's staging/commit trace events differs from `_beacon.json` or `dispatch.json` or a lifecycle event
- **THEN** the gate SHALL emit `provenance_chain_inconsistency`

#### Scenario: Consistent chain emits no diagnostic
- **WHEN** the slot's full trace chain is present, nonce-anchored, and cross-consistent
- **THEN** no `provenance_chain_inconsistency` diagnostic SHALL be emitted

### Requirement: All gate provenance diagnostics SHALL carry slotKey and wave

Every diagnostic emitted under RPG-007 through RPG-012 SHALL include `slotKey` and `wave` (wave = the slot's `wave_NN` directory) in the event detail, so a future coding agent can aggregate diagnostics per slot/wave. Wave-level conditions (e.g. `dispatch.json` absent for the whole wave) SHALL emit one diagnostic per affected evidence-producing slot, each carrying that slot's key + wave; where no slot can be identified, the diagnostic SHALL use `slotKey: "__wave__"` and the wave.

#### Scenario: Slot-level diagnostic carries slotKey and wave
- **WHEN** the gate emits `provenance_nonce_mismatch` for slot_01 in wave_00
- **THEN** the diagnostic detail SHALL include the slot's `slotKey` and `wave: "wave_00"`

#### Scenario: Wave-level condition emits one diagnostic per affected slot
- **WHEN** `_subagents/wave_00/dispatch.json` is absent and three slots produced evidence
- **THEN** the gate SHALL emit three `provenance_nonce_mismatch` diagnostics, one per slot, each carrying that slot's `slotKey` + `wave: "wave_00"`
