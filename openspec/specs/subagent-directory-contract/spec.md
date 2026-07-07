# Subagent Directory Contract

> req: SDC-001, SDC-002, SDC-003

## Purpose

Formalize `_subagents/` as the canonical directory for **relay-managed sub-agent slot artifacts** within the run bundle. The `_subagents/wave_NN/slot_MM/` convention is the relay communication directory between the main Phase Agent and sub-agents.

**Scope boundary:** SDC governs the relay slot channel only (`task.md`, beacon, receipts, dispatch, result, status, agent metadata). Sub-agent writes to `_cache/`, `reference/`, and `artifacts/` remain governed by WDC / task-card / output-declaration contracts — they are **not** relay slot artifacts and are outside SDC.

Experiments SHALL use the standard `_subagents/wave_NN/slot_MM/` structure so provenance evidence is at a predictable location.
## Requirements
### Requirement: Work units SHALL be the sole production delegated runtime directory

Production delegated work SHALL write one directory per `work_id` under `_work_units/waveN/{work_id}/`. The `waveN` segment SHALL match the encoded wave in `work_id`, the manifest `wave`, and the submitted ledger row.

#### Scenario: work-unit directory path matches encoded wave

- **WHEN** the Engine creates `wu-w1-b000-deep-i0001`
- **THEN** the production directory SHALL be `_work_units/wave1/wu-w1-b000-deep-i0001/`
- **AND** malformed work-unit paths or non-work-unit delegated paths SHALL NOT be accepted as the canonical production path

### Requirement: Work-unit directory SHALL contain binding surfaces

Each work-unit directory SHALL contain the binding surfaces needed for submit and gate cross-checks: `manifest.json`, `task.md`, `result.schema.json`, `_beacon.json`, `runtime-receipt.jsonl`, `result.json` when submitted, `result.md` when produced, `_status.json`, and `_agent.json`.

#### Scenario: missing beacon blocks submit

- **WHEN** a work-unit result is submitted but `_beacon.json` is missing
- **THEN** `operate-work-unit submit` SHALL reject the result
- **AND** no ledger row SHALL be appended

