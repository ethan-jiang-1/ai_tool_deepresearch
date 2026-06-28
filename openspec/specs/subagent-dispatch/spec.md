# Subagent Dispatch

> req: SUD-001, SUD-002, SUD-003

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

In addition to gate-pass-triggered dispatch (SUD-001), the system SHALL support queue-driven dynamic Sub-agent dispatch via `subagent-relay.mjs`. When a phase MD executes the batch Sub-agent protocol (defined in `shared-subagent-protocol.md`), it SHALL claim the current Queue task, map that task's delegated or batch payload items to relay `SlotConfig` entries, construct a custom dispatchMap, and call `stageSubagentSlots(state, bundleDir, dispatchMap)` to create slot directories under `_subagents/wave_NN/slot_MM/`.

Queue active window is not the Relay work pool. Pending Queue slots SHALL remain preview/depth only and SHALL NOT be executed by Relay before becoming `slot_1_current`.

#### Scenario: Current Queue task payload mapped to relay SlotConfig

- **WHEN** the current Queue task has `targets.delegates` and a batch payload with N sub-agent work items
- **THEN** each batch payload item SHALL be mapped to a SlotConfig entry:
  - current task/batch item identity → `slot.key`
  - batch item action → `slot.taskDescription`
  - `task.targets.delegates.role_key` or batch role key → `slot.roleAgentKey`
  - `task.targets.delegates.timeout_ms` (or default 600000) → `slot.timeoutMs`
- **AND** a custom dispatchMap SHALL be constructed: `new Map([['pass', slotConfigs]])`
- **AND** `stageSubagentSlots(state, bundleDir, dispatchMap)` SHALL create N slot directories
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

The phase MD SHALL execute a collect-as-return loop after parallel spawn: as each Sub-agent returns, the Phase Agent SHALL call `ingestAgentReceipt(slot, bundleDir)` to verify the `runtime-receipt.jsonl`, call `commitSlotResult(slot, bundleDir, candidateResult)` to validate and write `result.json`, and verify the artifact output against the current Queue task's batch item requirements. After the current delegated or batch Queue task's required Relay results and receipts are satisfied, the Phase Agent SHALL call `complete()` on the current Queue task.

#### Scenario: Collect-as-return processes Sub-agent results independently

- **WHEN** Sub-agent in slot_01 returns before slot_00
- **THEN** Phase Agent SHALL collect slot_01 first (ingest receipt → commit result → verify artifact)
- **AND** SHALL NOT wait for slot_00 before processing slot_01

#### Scenario: Replacement Sub-agent dispatched to freed slot

- **WHEN** a Sub-agent returns and its slot is freed
- **AND** the current Queue task still has undispatched batch payload items
- **THEN** Phase Agent SHALL take the next batch payload item, map it to a SlotConfig for the freed slotIndex, call `stageSubagentSlots()` to update dispatch.json, and spawn a replacement Sub-agent
- **AND** the number of in-flight Sub-agents SHALL remain at ≤ MAX_CONCURRENT_SUBAGENTS

#### Scenario: All Sub-agents collected triggers merge

- **WHEN** all Sub-agents have returned and been collected
- **AND** the current Queue task has no remaining batch payload items
- **THEN** Phase Agent SHALL call `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** complete the current Queue task through the normal Queue `complete()` contract before proceeding
