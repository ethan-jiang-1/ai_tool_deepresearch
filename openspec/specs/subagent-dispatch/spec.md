# Subagent Dispatch

> req: SUD-001, SUD-002, SUD-003, SUD-004, SUD-005, SUD-006, SUD-007

## Purpose

Gate pass declares bounded slots for native LLM subagents. Dispatch is Engine-owned: it writes the wave manifest, slot task, and result schema. The Phase Agent later maps each slot to the active Codex / Claude Code runtime.

## Requirements

### Requirement: Gate pass declares real subagent slots
When `evaluateBranch` returns `pass`, the system SHALL dispatch subagent slots according to the Engine-owned `dispatchMap`. Each slot SHALL include a stable `roleAgentKey`, deterministic `slotIndex`, bounded `taskDescription`, and paths for `task.md` and `result.schema.json`.

#### Scenario: Pass branch dispatches bounded role-agent slots
- **WHEN** `evaluateBranch(state)` returns `'pass'`
- **THEN** `subagentDispatch(state, baseDir)` creates slots with role agent keys such as `dpt-source-intake`, `dpt-source-diagnostic`, `dpt-claim-verifier`, or `dpt-evidence-extractor`

#### Scenario: Non-pass branches do not dispatch
- **WHEN** `evaluateBranch(state)` returns `'fail_a'`, `'fail_b'`, or `'blocked'`
- **THEN** no subagent slots are dispatched

### Requirement: Dispatch uses wave-specific file system contract
The dispatch SHALL write `dispatch.json` under `_subagents/wave_NN/`. Each slot directory SHALL contain `task.md`, `result.schema.json`, and `_status.json` before the parent attempts to spawn a runtime subagent. `waveIndex` SHALL be derived from `(state.subagent_wave || 0) + 1`.

#### Scenario: dispatch.json records real-agent slot metadata
- **WHEN** `subagentDispatch(state, baseDir)` is called on a pass branch
- **THEN** `baseDir/_subagents/wave_01/dispatch.json` exists and contains a valid manifest with `waveIndex === 1`, slot keys, slot indexes, and role agent keys

#### Scenario: next wave dispatch does not overwrite prior wave
- **WHEN** `subagentDispatch(state, baseDir)` is called with `state.subagent_wave = 1`
- **THEN** `baseDir/_subagents/wave_02/dispatch.json` is written and existing files under `baseDir/_subagents/wave_01/` are unchanged

#### Scenario: Each slot gets a bounded task and schema
- **WHEN** `createDispatchManifest(slotConfigs, state, baseDir)` is called
- **THEN** each slot directory contains `task.md` and `result.schema.json`
- **AND** `task.md` does not include raw WorkflowState, gate internals, repair queue contents, or unrelated slot output

### Requirement: V1 dispatch enforces MAX_CONCURRENT_SUBAGENTS concurrency cap
The v1 dispatch contract SHALL enforce `MAX_CONCURRENT_SUBAGENTS` from `DPT_FRAMEWORK/engine/subagent-relay.mjs` as the Relay concurrency source of truth. Documentation SHALL reference that symbol instead of hardcoding stale values. Queue active-window length SHALL NOT be used as the Relay concurrency cap or work pool.

#### Scenario: Slots within cap are accepted
- **WHEN** dispatchMap maps a branch to a slot count within `MAX_CONCURRENT_SUBAGENTS`
- **THEN** dispatch succeeds

#### Scenario: Slots exceeding cap are rejected
- **WHEN** dispatchMap maps a branch to a slot count exceeding `MAX_CONCURRENT_SUBAGENTS`
- **THEN** dispatch fails before spawning any runtime subagent

### Requirement: Dispatch manifest is schema-validated
The dispatch manifest SHALL be validated at write time. Invalid manifests SHALL be rejected before any parent relay spawn is requested.

#### Scenario: Valid manifest passes validation
- **WHEN** the manifest has a numeric `waveIndex`, timestamp, and valid slot entries
- **THEN** validation succeeds

#### Scenario: Invalid manifest fails validation
- **WHEN** the manifest has wrong field types or missing role agent keys
- **THEN** validation fails

### Requirement: Queue task card targets.delegates triggers relay-based dispatch

In addition to gate-pass-triggered dispatch (SUD-001), the system SHALL support queue-driven dynamic Sub-agent dispatch via `subagent-relay.mjs`. When a phase MD executes the batch Sub-agent protocol (defined in `shared-subagent-protocol.md`), it SHALL claim the current Queue task, map that task's delegated or batch payload items to relay `SlotConfig` entries, and drive staging through the runtime driver CLI — `drive-relay-slot stage` (SNC-003 / SRD-001), which constructs the dispatchMap and calls `stageSubagentSlots(state, bundleDir, dispatchMap)` to create slot directories under `_subagents/wave_NN/slot_MM/`. The Phase Agent SHALL NOT hand-orchestrate `stageSubagentSlots` as inline JS and SHALL NOT hand-write slot files.

Queue active window is not the Relay work pool. Pending Queue slots SHALL remain preview/depth only and SHALL NOT be executed by Relay before becoming `slot_1_current`.

#### Scenario: Current Queue task payload mapped to relay SlotConfig

- **WHEN** the current Queue task has `targets.delegates` and a batch payload with N sub-agent work items
- **THEN** each batch payload item SHALL be mapped to a SlotConfig entry:
  - current task/batch item identity → `slot.key`
  - batch item action → `slot.taskDescription`
  - `task.targets.delegates.role_key` or batch role key → `slot.roleAgentKey`
  - `task.targets.delegates.timeout_ms` (or default 600000) → `slot.timeoutMs`
- **AND** the Phase Agent SHALL invoke `drive-relay-slot stage` (per-item replacement form: `--slot-index M --role <roleKey> --key <slotKey> --task <desc>`), whose engine path (`stageSubagentSlots`) SHALL create the slot directories
- **AND** pending Queue slots SHALL remain unclaimed

#### Scenario: Relay-based dispatch respects MAX_CONCURRENT_SUBAGENTS

- **WHEN** the current Queue task's batch payload contains more work items than `MAX_CONCURRENT_SUBAGENTS`
- **THEN** the phase MD SHALL stage at most `MAX_CONCURRENT_SUBAGENTS` slots in the first batch
- **AND** remaining batch payload items SHALL be dispatched as Relay slots become free within the same current Queue task

#### Scenario: MAX_CONCURRENT_SUBAGENTS = -1 means unlimited

- **WHEN** `MAX_CONCURRENT_SUBAGENTS` is `-1`
- **THEN** all current-task batch payload items SHALL be dispatched in a single batch
- **AND** the concurrency cap check SHALL be bypassed

#### Scenario: Sub-agent task description is bounded

- **WHEN** a Sub-agent is spawned for a queue task via relay
- **THEN** the Sub-agent SHALL receive only: its slot's `task.md` and `result.schema.json`
- **AND** the Sub-agent SHALL NOT receive the full WorkflowState, gate internals, other topic results, or queue contents

### Requirement: Batch sub-agent protocol defines collect-as-return loop

The phase MD SHALL execute a collect-as-return loop after parallel spawn: as each Sub-agent returns, the Phase Agent SHALL invoke `drive-relay-slot commit <bundle> --wave <N> --slot <slotKey> --result '<json>' --runtime-agent-id <id>` (SNC-003 / SRD-001) — whose engine path calls `ingestAgentReceipt(slot, bundleDir)` to verify the `runtime-receipt.jsonl` and `commitSlotResult(slot, bundleDir, candidateResult)` to validate and write `result.json` — and verify the artifact output against the current Queue task's batch item requirements. The Phase Agent SHALL NOT hand-orchestrate these engine functions as inline JS. After the current delegated or batch Queue task's required Relay results and receipts are satisfied, the Phase Agent SHALL call `complete()` on the current Queue task.

#### Scenario: Collect-as-return processes Sub-agent results independently

- **WHEN** Sub-agent in slot_01 returns before slot_00
- **THEN** Phase Agent SHALL collect slot_01 first (`drive-relay-slot commit` → verify artifact)
- **AND** SHALL NOT wait for slot_00 before processing slot_01

#### Scenario: Replacement Sub-agent dispatched to freed slot

- **WHEN** a Sub-agent returns and its slot is freed
- **AND** the current Queue task still has undispatched batch payload items
- **THEN** Phase Agent SHALL take the next batch payload item and invoke `drive-relay-slot stage` with the replacement SlotConfig for the freed slotIndex (`--slot-index M --role <roleKey> --key <slotKey> --task <desc>`), which updates dispatch.json, then spawn a replacement Sub-agent from the emitted spawn prompt
- **AND** the number of in-flight Sub-agents SHALL remain at ≤ MAX_CONCURRENT_SUBAGENTS

#### Scenario: All Sub-agents collected triggers merge

- **WHEN** all Sub-agents have returned and been collected
- **AND** the current Queue task has no remaining batch payload items
- **THEN** Phase Agent SHALL invoke `drive-relay-slot merge <bundle> --wave <N>`, which calls `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** complete the current Queue task through the normal Queue `complete()` contract before proceeding

### Requirement: Staging SHALL write a per-slot beacon with runtime coordinates

When `stageSubagentSlots` / `createDispatchManifest` creates a slot directory, it SHALL also write `_beacon.json` containing `bundle_dir` (absolute), `log_cli` (absolute path to `log-event.mjs`), `slot_key`, and `receipt_nonce` (the `createSlot` UUID). The beacon is the single source of truth the sub-agent reads to locate the bundle and logger.

#### Scenario: Beacon written at staging
- **WHEN** a slot is staged under `_subagents/wave_NN/slot_MM/`
- **THEN** `_beacon.json` SHALL exist with `bundle_dir`, `log_cli`, `slot_key`, and a UUID `receipt_nonce`
- **AND** `receipt_nonce` SHALL equal the in-memory slot's `createSlot()` nonce

#### Scenario: Beacon carries absolute paths
- **WHEN** the bundle lives at an arbitrary absolute location
- **THEN** `_beacon.json.bundle_dir` and `_beacon.json.log_cli` SHALL be absolute paths usable by a sub-agent in an isolated context

### Requirement: dispatch.json SHALL persist each slot's engine-generated receipt nonce

`dispatch.json` SHALL record each slot's `receipt_nonce` (UUID) alongside its key, slotIndex, and roleAgentKey. This persists the engine-generated nonce to disk so provenance forensics can bind receipts/ledger entries back to a staged slot without relying on the in-memory slot object.

#### Scenario: dispatch.json records nonces
- **WHEN** `createDispatchManifest` writes `dispatch.json`
- **THEN** each slot entry SHALL include a UUID `receipt_nonce`
- **AND** the nonce SHALL match the corresponding `_beacon.json` `receipt_nonce`

#### Scenario: Forensics can read nonce from dispatch.json
- **WHEN** a forensic check needs to verify a slot's nonce
- **THEN** it SHALL read `dispatch.json` as the on-disk record of staged nonces

### Requirement: Spawn prompt SHALL hand the sub-agent only its slot directory plus a beacon pointer

`buildSpawnPrompt` SHALL embed the slot directory absolute path and an instruction to read `_beacon.json` for `bundle_dir` / `log_cli` / `receipt_nonce`. It SHALL NOT rely on inlining the bundle path as the sole channel, and SHALL instruct the sub-agent to carry the nonce in every lifecycle event.

#### Scenario: Spawn prompt is beacon-driven
- **WHEN** `recordAgentSpawnRequested` builds the spawn prompt
- **THEN** the prompt SHALL contain the slot directory absolute path and a directive to read `<slot>/_beacon.json`
- **AND** SHALL instruct the sub-agent to emit lifecycle events carrying the beacon `receipt_nonce`

### Requirement: Staging and commit trace events SHALL carry the slot receipt nonce

The `slot_create`, `dispatch_create`, `agent_result_received`, and `result_schema_validated` trace events (emitted via `traceEntry` to `rb_trace.jsonl` by `createDispatchManifest`/`stageSubagentSlots` and `commitSlotResult` in `DPT_FRAMEWORK/engine/subagent-relay.mjs`) SHALL include the slot's `receiptNonce` in their detail. This extends nonce-anchoring across the **entire** engine trace chain (staging → ingest → commit) so the chain is cross-checkable end-to-end by provenance forensics (RPG-012). Without it, a hand-faker can append staging/commit trace lines without keeping nonces consistent, making "staging chain present" no harder to forge than a plain file.

#### Scenario: Staging trace events carry the nonce
- **WHEN** `stageSubagentSlots`/`createDispatchManifest` emits `slot_create` and `dispatch_create` trace events for a slot
- **THEN** each event's detail SHALL include that slot's `receiptNonce`

#### Scenario: Commit trace events carry the nonce
- **WHEN** `commitSlotResult` emits `agent_result_received` and `result_schema_validated` trace events for a slot
- **THEN** each event's detail SHALL include that slot's `receiptNonce`

#### Scenario: Forensics can cross-check the nonce across the chain
- **WHEN** a provenance forensic check (RPG-012) reads any of the four trace events for a slot
- **THEN** it SHALL be able to read the `receiptNonce` and cross-check it against `_beacon.json` / `dispatch.json` / lifecycle events
- **AND** the nonce SHALL be identical across staging → ingest → commit events for the same slot
