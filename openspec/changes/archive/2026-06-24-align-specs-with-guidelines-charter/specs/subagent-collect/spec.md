# subagent-collect

> req: SUC-002

## MODIFIED Requirements

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
