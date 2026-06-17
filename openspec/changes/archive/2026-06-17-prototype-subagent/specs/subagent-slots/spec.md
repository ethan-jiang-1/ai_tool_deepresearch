# Subagent Slots

> req: SUS-001

Slot lifecycle and file contract for native LLM subagent work. A slot is declared by the Engine, executed through Parent Relay, and collected by the Engine after validation.

## ADDED Requirements

### Requirement: Slot lifecycle with four states
The system SHALL track each subagent slot through `_status.json` with states `pending`, `running`, `done`, and `failed`. Status transitions SHALL be validated by an explicit transition table: `pending -> running|failed`, `running -> done|failed`, and terminal states `done` and `failed` SHALL NOT transition to a different state. Rewriting the same status SHALL be idempotent.

#### Scenario: Slot starts in pending state
- **WHEN** a new slot is created
- **THEN** `_status.json` is written with `{ "status": "pending", "updated": "<ISO>" }`

#### Scenario: Status transitions from pending to running to done
- **WHEN** Parent Relay starts a native subagent and later validates its result
- **THEN** the slot may transition from `pending` to `running` to `done`

#### Scenario: Status transitions from running to failed
- **WHEN** a native subagent times out, fails, returns non-JSON, or returns schema-invalid JSON
- **THEN** the slot transitions from `running` to `failed`

#### Scenario: Terminal done state rejects rollback
- **WHEN** a slot status is `done`
- **THEN** a later transition to `running` or `failed` is rejected unless a future retry design explicitly creates a new slot

#### Scenario: Terminal failed state rejects later success
- **WHEN** a slot status is `failed`
- **THEN** a later transition to `done` is rejected unless a future retry design explicitly creates a new slot

### Requirement: Slot paths include task, schema, result, status, and agent metadata
Each slot's file paths SHALL be deterministically derived from `waveIndex` and `slotIndex`. Required paths are `task.md`, `result.schema.json`, `result.json`, `_status.json`, and `_agent.json`. `result.md` MAY be written as an optional human-readable summary and SHALL NOT be the primary collection contract.

#### Scenario: Slot index 0 maps to slot_00 directory
- **WHEN** a slot is created with `waveIndex = 1` and `slotIndex = 0`
- **THEN** its paths are under `_subagents/wave_01/slot_00/`

#### Scenario: Slot contract includes result.json and schema
- **WHEN** a slot is created before runtime spawn
- **THEN** it has paths for `task.md`, `result.schema.json`, `result.json`, `_status.json`, and `_agent.json`

#### Scenario: result.md is optional only
- **WHEN** Parent Relay writes a validated slot result
- **THEN** `result.json` is required for Engine collection
- **AND** `result.md` may be absent without causing collection failure

### Requirement: Agent metadata records native runtime usage
Parent Relay SHALL write `_agent.json` for each slot after a spawn attempt. The metadata SHALL record platform, role agent key, runtime agent type/name where available, spawn timestamp, completion timestamp when available, and validation outcome.

#### Scenario: Successful runtime spawn records metadata
- **WHEN** a native subagent is spawned for a slot
- **THEN** `_agent.json` records the platform and role agent key

#### Scenario: Failed runtime spawn records metadata
- **WHEN** a spawn request fails before result validation
- **THEN** `_agent.json` still records the attempted platform, role agent key, and failure status
