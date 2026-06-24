# subagent-dispatch

> req: SUD-003

## MODIFIED Requirements

### Requirement: Batch sub-agent protocol defines collect-as-return loop

The phase MD SHALL execute a collect-as-return loop after parallel spawn: as each Sub-agent returns, the Phase Agent SHALL call `ingestAgentReceipt(slot, bundleDir)` to verify the `runtime-receipt.jsonl`, call `commitSlotResult(slot, bundleDir, candidateResult)` to validate and write `result.json`, verify the artifact output against the task's `done_condition`, call `complete()` on the corresponding queue task, perform inline backfill, and if more pending tasks remain in the queue, dispatch a replacement Sub-agent to the freed slot.

#### Scenario: Collect-as-return processes sub-agent results independently

- **WHEN** Sub-agent in slot_01 returns before slot_00
- **THEN** Phase Agent SHALL collect slot_01 first (ingest receipt → commit result → verify artifact → complete queue task → backfill)
- **AND** SHALL NOT wait for slot_00 before processing slot_01

#### Scenario: Replacement sub-agent dispatched to freed slot

- **WHEN** a Sub-agent returns and its slot is freed
- **AND** the queue still has pending task cards
- **THEN** Phase Agent SHALL take the next pending task card, map it to a SlotConfig for the freed slotIndex, call `stageSubagentSlots()` to update dispatch.json, and spawn a replacement Sub-agent
- **AND** the number of in-flight Sub-agents SHALL remain at ≤ MAX_CONCURRENT_SUBAGENTS

#### Scenario: All sub-agents collected triggers merge

- **WHEN** all Sub-agents have returned and been collected
- **AND** the queue has no more pending task cards with `targets.delegates`
- **THEN** Phase Agent SHALL call `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** proceed to the phase gate
