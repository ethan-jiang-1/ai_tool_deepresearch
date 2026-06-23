# Subagent Collect

> req: SUC-002

## ADDED Requirements

### Requirement: Per-slot collect during batch sub-agent execution

In addition to wave-level collection (SUC-001), the system SHALL support per-slot collection during batch sub-agent execution. After a sub-agent spawned via relay returns, the main-agent SHALL call `ingestAgentReceipt(slot, bundleDir)` to validate the `runtime-receipt.jsonl`, then call `commitSlotResult(slot, bundleDir, candidateResult)` to validate the returned JSON against `result.schema.json` and write `result.json`. Per-slot collection SHALL NOT wait for other sub-agents — each slot's result is collected independently as it returns.

#### Scenario: Single slot result collected immediately on return

- **WHEN** a sub-agent in slot_01 completes and returns JSON matching `result.schema.json`
- **THEN** main-agent SHALL call `ingestAgentReceipt(slot_01, bundleDir)` and verify two JSONL events (`agent_runtime_started`, `agent_result_ready`)
- **AND** main-agent SHALL call `commitSlotResult(slot_01, bundleDir, result)` and verify `result.json` is written
- **AND** main-agent SHALL NOT wait for slot_00 to finish before processing slot_01

#### Scenario: Per-slot failure does not block other slots

- **WHEN** a sub-agent returns `status: "failed"` in its result JSON
- **THEN** `commitSlotResult()` SHALL write `_status.json` as `failed`
- **AND** main-agent SHALL call `fail()` on the corresponding queue task
- **AND** the queue SHALL auto-generate a repair task via `failure_route: queue_repair`
- **AND** other in-flight sub-agents SHALL continue unaffected

#### Scenario: collectAndMergeSubagentResults after all slots terminal

- **WHEN** all sub-agents have been collected (all slots terminal: `done` or `failed`)
- **AND** no pending task cards remain in queue
- **THEN** main-agent SHALL call `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** the merge SHALL include evidence counts from all successful slots
- **AND** if all slots failed, `forkRouter(state)` SHALL trigger converge repair

### Requirement: Artifact verification bridges relay result to queue receipt

After `commitSlotResult()` succeeds, main-agent SHALL verify the task's `done_condition` against the artifact file (e.g., `reference/{topic.slug}/source.yaml` exists and passes schema). If the artifact satisfies `done_condition`, main-agent SHALL call `complete()` on the corresponding queue task. If not, main-agent SHALL call `fail()`.

#### Scenario: Artifact satisfies done_condition triggers complete

- **WHEN** sub-agent result is committed and `reference/{topic}/source.yaml` exists
- **AND** the file passes `ReferenceMetadata` schema validation
- **THEN** main-agent SHALL call `complete()` on the queue task
- **AND** the receipt check SHALL pass

#### Scenario: Missing artifact triggers fail

- **WHEN** sub-agent result is committed but the expected artifact file is missing
- **THEN** main-agent SHALL call `fail()` on the queue task
- **AND** the queue SHALL auto-generate a repair task
