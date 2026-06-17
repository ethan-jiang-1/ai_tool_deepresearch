# Subagent Dispatch

> req: SUD-001

Gate pass declares bounded slots for native LLM subagents. Dispatch is Engine-owned: it writes the wave manifest, slot task, and result schema. The parent agent later maps each slot to the active Codex / Claude Code runtime.

## ADDED Requirements

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
The v1 dispatch contract SHALL allow at most 3 active subagent slots in a wave. A dispatch configuration that would require more than 3 concurrent native subagents SHALL be rejected or split by a later design.

#### Scenario: Three slots are accepted
- **WHEN** dispatchMap maps a pass branch to 3 slots
- **THEN** dispatch succeeds

#### Scenario: Four slots are rejected
- **WHEN** dispatchMap maps a pass branch to 4 slots under v1
- **THEN** dispatch fails before spawning any runtime subagent

### Requirement: Dispatch manifest is schema-validated
The dispatch manifest SHALL be validated at write time. Invalid manifests SHALL be rejected before any parent relay spawn is requested.

#### Scenario: Valid manifest passes validation
- **WHEN** the manifest has a numeric `waveIndex`, timestamp, and valid slot entries
- **THEN** validation succeeds

#### Scenario: Invalid manifest fails validation
- **WHEN** the manifest has wrong field types or missing role agent keys
- **THEN** validation fails
