# Subagent Relay Driver (delta)

> req: SRD-001

## MODIFIED Requirements

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
