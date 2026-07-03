# Subagent Relay Driver

> req: SRD-001, SRD-002, SRD-003, SRD-004

## Purpose

Runtime driver 命令契约。提供一个 Agent 可调用的 CLI（`DPT_FRAMEWORK/cli/drive-relay-slot.mjs`），在 runtime 端到端驱动 relay slot 生命周期（`stageSubagentSlots → recordAgentSpawnRequested → 输出 spawn prompt → ingestAgentReceipt → commitSlotResult`），闭合"引擎函数无 runtime 调用者"缺口（`buildSpawnPrompt` 不再是 dead code）。driver 只编排 slot lifecycle，不替 Agent 做 search/judgment/routing。

## ADDED Requirements

### Requirement: A driver CLI SHALL orchestrate the relay slot lifecycle end-to-end

The framework SHALL provide `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` that invokes the relay engine functions at runtime, closing the gap that `stageSubagentSlots` / `recordAgentSpawnRequested` / `ingestAgentReceipt` / `commitSlotResult` / `collectAndMergeSubagentResults` previously had no runtime caller. The driver SHALL expose granular subcommands — `stage`, `commit`, `merge` — so the Phase Agent can run the full collect-as-return loop (per `subagent-dispatch`), including replacement dispatch into freed slots, rather than a single monolithic run.

#### Scenario: stage subcommand stages slots and emits spawn prompts
- **WHEN** the Phase Agent invokes `drive-relay-slot stage --bundle <dir> --wave <N>` with a dispatch map source
- **THEN** the driver SHALL call `stageSubagentSlots` / `recordAgentSpawnRequested`, write slot directories (`task.md`, `result.schema.json`, `_status.json`, `_beacon.json`), write `dispatch.json`, and print each slot's spawn prompt

#### Scenario: commit subcommand validates and commits a returned result
- **WHEN** the Phase Agent invokes `drive-relay-slot commit --bundle <dir> --slot <key> --result <json>` after a sub-agent returns
- **THEN** the driver SHALL call `ingestAgentReceipt` and `commitSlotResult`, writing `result.json` / `_status.json` / `_agent.json` and emitting `relay_commit_done` trace

#### Scenario: merge subcommand collects and merges slot results
- **WHEN** the Phase Agent invokes `drive-relay-slot merge --bundle <dir> --wave <N>` after all slots have committed
- **THEN** the driver SHALL call `collectAndMergeSubagentResults`, merging evidence counts into workflow state and returning the fork/repair decision

#### Scenario: stage re-stages a replacement slot in a freed index
- **WHEN** a sub-agent returns and frees a slot, and the current queue task still has undispatched batch items (per `subagent-dispatch` SUD-003 replacement dispatch)
- **THEN** the Phase Agent SHALL invoke `stage` with the replacement SlotConfig for the freed slotIndex
- **AND** the driver SHALL update `dispatch.json` and emit a new spawn prompt without clobbering other in-flight slots

#### Scenario: Driver does not spawn the sub-agent itself
- **WHEN** `stage` completes
- **THEN** the driver SHALL output the spawn prompt for the Phase Agent to spawn via its native Agent tool
- **AND** SHALL NOT itself launch a sub-agent process

### Requirement: Driver SHALL not perform search, evidence judgment, or routing

The driver SHALL only orchestrate deterministic slot lifecycle (stage / ingest / commit) and emit the spawn prompt. It SHALL NOT perform WebSearch/WebFetch, judge evidence quality, repair queues, pass/fail gates, or decide transitions.

#### Scenario: Driver refuses semantic work
- **WHEN** the driver is invoked
- **THEN** it SHALL only stage slots, commit results, or report engine errors
- **AND** SHALL return deterministic inspect/error output to the conversation context (no semantic verdicts)

### Requirement: Driver SHALL not bypass engine validation

The driver SHALL pass the sub-agent's returned result through `commitSlotResult` validation unchanged. It SHALL NOT write `result.json` / `_status.json` / `_agent.json` directly, and SHALL NOT mute schema failures.

#### Scenario: Invalid result is surfaced, not silenced
- **WHEN** a sub-agent returns JSON that fails `SlotResult` validation
- **THEN** the driver SHALL report the validation failure from `commitSlotResult`
- **AND** SHALL NOT write a hand-constructed `result.json`

### Requirement: Driver invocation SHALL produce engine-side trace that hand-faking cannot

Because the driver calls the real engine functions, a driver-driven slot SHALL produce the engine's own trace events (`slot_create`, `dispatch_create`, `relay_commit_done`, `result_schema_validated`) and a real UUID `receipt_nonce` persisted in `dispatch.json` / `_beacon.json`. These are the signals that distinguish a driven slot from a hand-faked one.

#### Scenario: Driven slot leaves engine trace
- **WHEN** a slot is staged and committed via the driver
- **THEN** `rb_trace.jsonl` SHALL contain `relay_commit_done` for that slot
- **AND** `dispatch.json` SHALL record the slot's UUID `receipt_nonce`
- **AND** `_beacon.json` SHALL exist with a matching nonce
