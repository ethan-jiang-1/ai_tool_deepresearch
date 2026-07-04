# Subagent Collect (delta)

> req: SUC-002

## Purpose

SSOT de-noise: the accepted SUC-002 wording directed the Phase Agent to call the relay engine
functions (`ingestAgentReceipt` / `commitSlotResult` / `collectAndMergeSubagentResults`) directly
as inline JS. This change ships the runtime driver CLI (`drive-relay-slot`, SRD-001) and mandates
driver-first orchestration (SNC-003); leaving the direct-call wording in the main spec would put
two contradictory normative instructions in the accepted spec set — the exact supply/demand split
that produced the original dead-code failure (engine functions with no runtime caller). The engine
function contracts themselves are unchanged; only the caller changes: the Phase Agent drives the
lifecycle through `drive-relay-slot`, and the driver invokes the engine functions.

## MODIFIED Requirements

### Requirement: Per-slot collect during batch sub-agent execution

In addition to wave-level collection (SUC-001), the system SHALL support per-slot collection during batch Sub-agent execution. After a Sub-agent spawned via relay returns, the Phase Agent SHALL drive per-slot collection through the runtime driver CLI — `drive-relay-slot commit <bundle> --wave <N> --slot <slotKey> --result '<json>' --runtime-agent-id <id>` (SNC-003 / SRD-001) — which invokes `ingestAgentReceipt(slot, bundleDir)` to validate the `runtime-receipt.jsonl` and `commitSlotResult(slot, bundleDir, candidateResult)` to validate the returned JSON against `result.schema.json` and write `result.json`. The Phase Agent SHALL NOT hand-orchestrate these engine functions as inline JS and SHALL NOT hand-write slot result files. Per-slot collection SHALL NOT wait for other Sub-agents — each slot's result is collected independently as it returns.

#### Scenario: Single slot result collected immediately on return

- **WHEN** a Sub-agent in slot_01 completes and returns JSON matching `result.schema.json`
- **THEN** Phase Agent SHALL invoke `drive-relay-slot commit` for slot_01, whose engine path (`ingestAgentReceipt`) verifies two JSONL events (`agent_runtime_started`, `agent_result_ready`)
- **AND** the engine path (`commitSlotResult`) SHALL validate the result and write `result.json`
- **AND** Phase Agent SHALL NOT wait for slot_00 to finish before processing slot_01

#### Scenario: Per-slot failure does not block other slots

- **WHEN** a Sub-agent returns `status: "failed"` in its result JSON
- **THEN** the driver-invoked `commitSlotResult()` SHALL write `_status.json` as `failed`
- **AND** Phase Agent SHALL call `fail()` on the corresponding queue task
- **AND** the queue SHALL auto-generate a repair task via `failure_route: queue_repair`
- **AND** other in-flight Sub-agents SHALL continue unaffected

#### Scenario: Wave merge via driver after all slots terminal

- **WHEN** all Sub-agents have been collected (all slots terminal: `done` or `failed`)
- **AND** no pending task cards remain in queue
- **THEN** Phase Agent SHALL invoke `drive-relay-slot merge <bundle> --wave <N>`, which calls `collectAndMergeSubagentResults(state, slots, bundleDir)`
- **AND** the merge SHALL include evidence counts from all successful slots
- **AND** if all slots failed, `forkRouter(state)` SHALL trigger converge repair

### Requirement: Artifact verification bridges relay result to queue receipt

After a `drive-relay-slot commit` succeeds (engine `commitSlotResult` validation passed), the Phase Agent SHALL verify the task's `done_condition` against the artifact file (e.g., `reference/{topic.slug}/source.yaml` exists and passes schema). If the artifact satisfies `done_condition`, the Phase Agent SHALL call `complete()` on the corresponding queue task. If not, the Phase Agent SHALL call `fail()`.

#### Scenario: Artifact satisfies done_condition triggers complete

- **WHEN** Sub-agent result is committed via the driver and `reference/{topic}/source.yaml` exists
- **AND** the file passes `ReferenceMetadata` schema validation
- **THEN** Phase Agent SHALL call `complete()` on the queue task
- **AND** the receipt check SHALL pass

#### Scenario: Missing artifact triggers fail

- **WHEN** Sub-agent result is committed but the expected artifact file is missing
- **THEN** Phase Agent SHALL call `fail()` on the queue task
- **AND** the queue SHALL auto-generate a repair task
