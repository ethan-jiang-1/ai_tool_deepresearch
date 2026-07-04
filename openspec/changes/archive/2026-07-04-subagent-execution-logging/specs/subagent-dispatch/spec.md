# Subagent Dispatch (delta)

> req: SUD-002, SUD-003, SUD-004, SUD-005, SUD-006, SUD-007

## Purpose

为 `subagent-dispatch` 增加 beacon 模式与 nonce 持久化：staging 写 `_beacon.json`（bundle 路径 + logger 路径 + slot key + UUID nonce）、把 nonce 持久化进 `dispatch.json`、spawn prompt 只传 slot 目录 + beacon 指针。解决"sub-agent 怎么知道 bundle/logger 在哪"，并把 engine 生成的 nonce 落盘为 Layer-1 取证锚。

同时 MODIFY 既有 SUD-002/SUD-003（SSOT 去噪）：accepted 措辞指示 Phase Agent 直调 `stageSubagentSlots`/`ingestAgentReceipt`/`commitSlotResult`/`collectAndMergeSubagentResults`（inline JS）。driver CLI（SRD-001）落地并被 SNC-003 强制后，保留直调措辞会让 accepted spec set 同时存在两条互相矛盾的 normative 指令——这正是历史"引擎函数无 runtime 调用者"的供需分叉病根。引擎函数契约不变，只改调用者：Phase Agent 经 `drive-relay-slot` 驱动，driver 内部调用引擎函数。

## ADDED Requirements

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

The `slot_create`, `dispatch_create`, `agent_result_received`, and `result_schema_validated` trace events (emitted via `traceEntry` to `rb_trace.jsonl` by `createDispatchManifest`/`stageSubagentSlots` and `commitSlotResult` in `DPT_FRAMEWORK/engine/subagent-relay.mjs`) SHALL include the slot's `receiptNonce` in their detail. Today only the ingest events (`agent_runtime_started`/`agent_result_ready`) carry the nonce; this requirement extends nonce-anchoring across the **entire** engine trace chain (staging → ingest → commit) so the chain is cross-checkable end-to-end by provenance forensics (RPG-012). Without it, a hand-faker can append staging/commit trace lines without keeping nonces consistent, making "staging chain present" no harder to forge than a plain file.

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

## MODIFIED Requirements

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
