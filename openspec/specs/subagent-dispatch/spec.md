# Subagent Dispatch

> req: SUD-001, SUD-002, SUD-003

## Purpose

Gate pass declares bounded slots for native LLM subagents. Dispatch is Engine-owned: it writes the wave manifest, slot task, and result schema. The parent agent later maps each slot to the active Codex / Claude Code runtime.

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

### Requirement: V1 dispatch enforces concurrency cap
The v1 dispatch contract SHALL allow at most 4 active subagent slots in a wave (matching `MAX_CONCURRENT_SUBAGENTS = 4` in `subagent-relay.mjs`). A dispatch configuration that would require more than 4 concurrent native subagents SHALL be rejected.

#### Scenario: Four slots are accepted
- **WHEN** dispatchMap maps a pass branch to 4 slots
- **THEN** dispatch succeeds

#### Scenario: Five slots are rejected
- **WHEN** dispatchMap maps a pass branch to 5 slots under v1
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

In addition to gate-pass-triggered dispatch (SUD-001), the system SHALL support queue-driven dynamic sub-agent dispatch via `subagent-relay.mjs`. When a phase MD executes the batch sub-agent protocol (defined in `shared-subagent-protocol.md`), it SHALL read pending task cards from the queue, map them to relay `SlotConfig` entries, construct a custom dispatchMap, and call `stageSubagentSlots(state, bundleDir, dispatchMap)` to create slot directories under `_subagents/wave_NN/slot_MM/`.

#### Scenario: Queue task cards mapped to relay SlotConfig

- **WHEN** a phase MD has N pending task cards with `targets.delegates`
- **THEN** each task card SHALL be mapped to a SlotConfig entry:
  - `task.work_id` → `slot.key`
  - `task.action` → `slot.taskDescription`
  - `task.targets.delegates.role_key` → `slot.roleAgentKey`
  - `task.targets.delegates.timeout_ms` (or default 600000) → `slot.timeoutMs`
- **AND** a custom dispatchMap SHALL be constructed: `new Map([['pass', slotConfigs]])`
- **AND** `stageSubagentSlots(state, bundleDir, dispatchMap)` SHALL create N slot directories

#### Scenario: Relay-based dispatch respects MAX_CONCURRENT_SUBAGENTS

- **WHEN** the queue has more pending task cards than `MAX_CONCURRENT_SUBAGENTS` (default 4)
- **THEN** the phase MD SHALL stage at most `MAX_CONCURRENT_SUBAGENTS` slots in the first batch
- **AND** remaining task cards SHALL be dispatched as slots become free (collect-as-return + refill)

#### Scenario: MAX_CONCURRENT_SUBAGENTS = -1 means unlimited

- **WHEN** `MAX_CONCURRENT_SUBAGENTS` is `-1`
- **THEN** all pending task cards SHALL be dispatched in a single batch
- **AND** the concurrency cap check SHALL be bypassed

#### Scenario: Sub-agent task description is bounded

- **WHEN** a sub-agent is spawned for a queue task via relay
- **THEN** the sub-agent SHALL receive only: its slot's `task.md` and `result.schema.json`
- **AND** the sub-agent SHALL NOT receive the full WorkflowState, gate internals, other topic results, or queue contents

### Requirement: Batch sub-agent protocol defines collect-as-return loop

The phase MD SHALL execute a collect-as-return loop after parallel spawn: as each sub-agent returns, the main-agent SHALL call `ingestAgentReceipt(slot, bundleDir)` to verify the `runtime-receipt.jsonl`, call `commitSlotResult(slot, bundleDir, candidateResult)` to validate and write `result.json`, verify the artifact output against the task's `done_condition`, call `complete()` on the corresponding queue task, perform inline backfill, and if more pending tasks remain in the queue, dispatch a replacement sub-agent to the freed slot.

#### Scenario: Collect-as-return processes sub-agent results independently

- **WHEN** sub-agent in slot_01 returns before slot_00
- **THEN** main-agent SHALL collect slot_01 first (ingest receipt → commit result → verify artifact → complete queue task → backfill)
- **AND** SHALL NOT wait for slot_00 before processing slot_01

#### Scenario: Replacement sub-agent dispatched to freed slot

- **WHEN** a sub-agent returns and its slot is freed
- **AND** the queue still has pending task cards
- **THEN** main-agent SHALL take the next pending task card, map it to a SlotConfig for the freed slotIndex, call `stageSubagentSlots()` to update dispatch.json, and spawn a replacement sub-agent
- **AND** the number of in-flight sub-agents SHALL remain at ≤ MAX_CONCURRENT_SUBAGENTS

#### Scenario: All sub-agents collected triggers merge

- **WHEN** all sub-agents have returned and been collected
- **AND** the queue has no more pending task cards with `targets.delegates`
- **THEN** main-agent SHALL call `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** proceed to the phase gate
