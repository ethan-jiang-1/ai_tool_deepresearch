# Subagent Slots (delta)

> req: SUS-001

## MODIFIED Requirements

### Requirement: Slot paths include task, schema, result, status, and agent metadata

Each slot's file paths SHALL be deterministically derived from `waveIndex` and `slotIndex`. Required paths are `task.md`, `result.schema.json`, `result.json`, `_status.json`, `_agent.json`, and `_beacon.json` (written at staging per SUD-004, containing `bundle_dir`, `log_cli`, `slot_key`, `receipt_nonce`). `result.md` MAY be written as an optional human-readable summary and SHALL NOT be the primary collection contract.

#### Scenario: Slot index 0 maps to slot_00 directory

- **WHEN** a slot is created with `waveIndex = 1` and `slotIndex = 0`
- **THEN** its paths are under `_subagents/wave_01/slot_00/`

#### Scenario: Slot contract includes beacon and result files

- **WHEN** a slot is created before runtime spawn
- **THEN** it has paths for `task.md`, `result.schema.json`, `_beacon.json`, `result.json`, `_status.json`, and `_agent.json`

#### Scenario: Beacon written at staging matches dispatch nonce

- **WHEN** `stageSubagentSlots` creates a slot directory
- **THEN** `_beacon.json` SHALL exist with UUID `receipt_nonce` matching `dispatch.json`

#### Scenario: result.md is optional only

- **WHEN** Parent Relay writes a validated slot result
- **THEN** `result.json` is required for Engine collection
- **AND** `result.md` may be absent without causing collection failure
