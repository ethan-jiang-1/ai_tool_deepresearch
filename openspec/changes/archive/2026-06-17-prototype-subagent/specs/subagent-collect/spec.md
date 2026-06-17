# Subagent Collect

> req: SUC-001

Engine collection reads Parent Relay outputs from each slot. `result.json` is the primary machine-readable contract. `result.md` is optional and human-readable only.

## ADDED Requirements

### Requirement: Collect validated result.json from all slots
The system SHALL read each declared slot's `_status.json` and `result.json` to produce a `SlotResult`. Collection SHALL attempt all declared slots regardless of individual slot status. A slot with missing or schema-invalid `result.json` SHALL be collected as failed.

#### Scenario: Parse valid result.json to SlotResult
- **WHEN** `readSlotResult(slot, baseDir)` is called and `_status.json` is `done` with valid `result.json`
- **THEN** the returned `SlotResult` has `status: 'done'`, the parsed summary, evidence count, references, confidence, and notes

#### Scenario: Return failed when status indicates failure
- **WHEN** `readSlotResult(slot, baseDir)` is called and `_status.json` contains `{ "status": "failed" }`
- **THEN** the returned `SlotResult` has `status: 'failed'` and `evidenceCount: 0`

#### Scenario: Missing result.json downgrades done slot to failed
- **WHEN** `_status.json` says `done` but `result.json` is missing
- **THEN** collection returns a failed `SlotResult`

#### Scenario: Schema-invalid result.json downgrades slot to failed
- **WHEN** `result.json` fails the slot's `result.schema.json`
- **THEN** collection returns a failed `SlotResult` and records validation failure

#### Scenario: Optional result.md is ignored for machine collection
- **WHEN** `result.md` is present but `result.json` is missing
- **THEN** collection treats the slot as failed

### Requirement: Collect after all results or timeout
The parent/Engine collection boundary SHALL wait until all declared slots are terminal (`done` or `failed`) or until their configured timeout is reached. Timed-out slots SHALL be marked failed before merge.

#### Scenario: Collect waits for terminal slots
- **WHEN** one slot is still `running`
- **THEN** collect does not merge until the slot reaches a terminal status or times out

#### Scenario: Timed-out slot becomes failed
- **WHEN** a slot exceeds its configured timeout
- **THEN** `_status.json` is updated to `failed` and collect proceeds with a failed `SlotResult`

### Requirement: Merge results into workflow state
The merge SHALL include successful slot results, record failed slots, increment `subagent_wave`, and set `subagent_all_failed` only when all declared slots failed. Empty result arrays SHALL NOT set `subagent_all_failed`.

#### Scenario: Successful merge increments ref_count
- **WHEN** `mergeResults(results, state)` receives successful results with evidence counts `[2, 3, 1]`
- **THEN** the returned state has `ref_count` increased by 6

#### Scenario: All slots failed sets subagent_all_failed flag
- **WHEN** `mergeResults(results, state)` receives only failed results
- **THEN** the returned state has `subagent_all_failed: true` and `ref_count` unchanged

#### Scenario: Partial failure does not set all_failed flag
- **WHEN** `mergeResults(results, state)` receives at least one successful result and at least one failed result
- **THEN** the returned state has `subagent_all_failed: false` and includes evidence from successful slots

#### Scenario: Merge increments subagent wave counter
- **WHEN** `mergeResults(results, state)` is called with `state.subagent_wave = 1`
- **THEN** the returned state has `subagent_wave: 2`
