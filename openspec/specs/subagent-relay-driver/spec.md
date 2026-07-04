# Subagent Relay Driver

> req: SRD-001, SRD-002, SRD-003, SRD-004

## Purpose

Runtime driver command contract. Provides an Agent-callable CLI (`DPT_FRAMEWORK/cli/drive-relay-slot.mjs`) that drives the relay slot lifecycle end-to-end at runtime (`stageSubagentSlots -> recordAgentSpawnRequested -> output spawn prompt -> ingestAgentReceipt -> commitSlotResult`). The driver orchestrates the slot lifecycle only; it does not perform search, judgment, or routing on behalf of the Agent.

## Requirements

### Requirement: A driver CLI SHALL orchestrate the relay slot lifecycle end-to-end

The framework SHALL provide `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` that invokes the relay engine functions at runtime. The driver SHALL expose subcommands `stage`, `commit`, `merge`.

#### Scenario: stage subcommand stages slots and emits spawn prompts
- **WHEN** the Phase Agent invokes `drive-relay-slot stage <bundle> [--wave <N>]` (full stage), or replacement form `--slot-index <M> --role <roleKey> --key <slotKey> --task <desc> [--cache-dir <dir>] [--platform <p>]`
- **THEN** the driver SHALL call `stageSubagentSlots` / `recordAgentSpawnRequested`, write slot directories including `_beacon.json`, write `dispatch.json`, and print each slot's spawn prompt

#### Scenario: commit subcommand validates and commits a returned result
- **WHEN** the Phase Agent invokes `drive-relay-slot commit <bundle> --wave <N> --slot <slotKey> --result '<json>' --runtime-agent-id <id> [--platform <p>] [--runtime-mode <mode>]`
- **THEN** the driver SHALL call `ingestAgentReceipt` and `commitSlotResult`, emit commit trace events and `relay_commit_done` marker

#### Scenario: merge subcommand collects and merges slot results
- **WHEN** the Phase Agent invokes `drive-relay-slot merge <bundle> --wave <N>`
- **THEN** the driver SHALL call `collectAndMergeSubagentResults`

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

Because the driver calls the real engine functions, a driver-driven slot SHALL produce the engine's own execution signals: the trace events `slot_create`, `dispatch_create`, `agent_result_received`, and `result_schema_validated` in `rb_trace.jsonl` (nonce-anchored per SUD-007), the `relay_commit_done` marker in `_logs/run.log` (emitted by `commitSlotResult` via the run logger), and a real UUID `receipt_nonce` persisted in `dispatch.json` / `_beacon.json`. These are the signals that distinguish a driven slot from a hand-faked one.

#### Scenario: Driven slot leaves engine trace
- **WHEN** a slot is staged and committed via the driver
- **THEN** `rb_trace.jsonl` SHALL contain `agent_result_received` and `result_schema_validated` for that slot
- **AND** `_logs/run.log` SHALL contain the `relay_commit_done` marker for that slot
- **AND** `dispatch.json` SHALL record the slot's UUID `receipt_nonce`
- **AND** `_beacon.json` SHALL exist with a matching nonce
