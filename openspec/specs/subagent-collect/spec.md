# Subagent Collect

> req: SUC-001, SUC-002

## Purpose

Engine collection reads Parent Relay outputs from each slot. `result.json` is the primary machine-readable contract. `result.md` is optional and human-readable only.

## Requirements

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

### Requirement: Per-slot collect during batch sub-agent execution

In addition to wave-level collection (SUC-001), the system SHALL support per-slot collection during batch Sub-agent execution. After a Sub-agent spawned via relay returns, the Phase Agent SHALL call `ingestAgentReceipt(slot, bundleDir)` to validate the `runtime-receipt.jsonl`, then call `commitSlotResult(slot, bundleDir, candidateResult)` to validate the returned JSON against `result.schema.json` and write `result.json`. Per-slot collection SHALL NOT wait for other Sub-agents — each slot's result is collected independently as it returns.

#### Scenario: Single slot result collected immediately on return

- **WHEN** a Sub-agent in slot_01 completes and returns JSON matching `result.schema.json`
- **THEN** Phase Agent SHALL call `ingestAgentReceipt(slot_01, bundleDir)` and verify two JSONL events (`agent_runtime_started`, `agent_result_ready`)
- **AND** Phase Agent SHALL call `commitSlotResult(slot_01, bundleDir, result)` and verify `result.json` is written
- **AND** Phase Agent SHALL NOT wait for slot_00 to finish before processing slot_01

#### Scenario: Per-slot failure does not block other slots

- **WHEN** a Sub-agent returns `status: "failed"` in its result JSON
- **THEN** `commitSlotResult()` SHALL write `_status.json` as `failed`
- **AND** Phase Agent SHALL call `fail()` on the corresponding queue task
- **AND** the queue SHALL auto-generate a repair task via `failure_route: queue_repair`
- **AND** other in-flight Sub-agents SHALL continue unaffected

#### Scenario: collectAndMergeSubagentResults after all slots terminal

- **WHEN** all Sub-agents have been collected (all slots terminal: `done` or `failed`)
- **AND** no pending task cards remain in queue
- **THEN** Phase Agent SHALL call `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** the merge SHALL include evidence counts from all successful slots
- **AND** if all slots failed, `forkRouter(state)` SHALL trigger converge repair

### Requirement: Artifact verification bridges relay result to queue receipt

After `commitSlotResult()` succeeds, the Phase Agent SHALL verify the task's `done_condition` against the artifact file (e.g., `reference/{topic.slug}/source.yaml` exists and passes schema). If the artifact satisfies `done_condition`, the Phase Agent SHALL call `complete()` on the corresponding queue task. If not, the Phase Agent SHALL call `fail()`.

#### Scenario: Artifact satisfies done_condition triggers complete

- **WHEN** Sub-agent result is committed and `reference/{topic}/source.yaml` exists
- **AND** the file passes `ReferenceMetadata` schema validation
- **THEN** Phase Agent SHALL call `complete()` on the queue task
- **AND** the receipt check SHALL pass

#### Scenario: Missing artifact triggers fail

- **WHEN** Sub-agent result is committed but the expected artifact file is missing
- **THEN** Phase Agent SHALL call `fail()` on the queue task
- **AND** the queue SHALL auto-generate a repair task
