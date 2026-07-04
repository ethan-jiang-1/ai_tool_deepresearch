# Subagent Directory Contract

> req: SDC-001, SDC-002

## Purpose

Formalize `_subagents/` as the canonical directory for **relay-managed sub-agent slot artifacts** within the run bundle. The `_subagents/wave_NN/slot_MM/` convention is the relay communication directory between the main Phase Agent and sub-agents.

**Scope boundary:** SDC governs the relay slot channel only (`task.md`, beacon, receipts, dispatch, result, status, agent metadata). Sub-agent writes to `_cache/`, `reference/`, and `artifacts/` remain governed by WDC / task-card / output-declaration contracts — they are **not** relay slot artifacts and are outside SDC.

Experiments SHALL use the standard `_subagents/wave_NN/slot_MM/` structure so provenance evidence is at a predictable location.

## Requirements

### Requirement: `_subagents/` SHALL be the sole directory for relay-managed slot artifacts

The `_subagents/wave_NN/slot_MM/` path SHALL be the sole directory for relay-managed sub-agent slot artifacts between the main Phase Agent and sub-agents. This includes beacon delivery (`_beacon.json`), task assignment (`task.md`), schema constraint (`result.schema.json`), result collection, runtime receipts, engine-written identity and status, and wave-level dispatch manifests.

Sub-agent authority outputs under `_cache/`, `reference/`, and `artifacts/` remain outside SDC scope — they are governed by task-card and output-declaration contracts.

#### Scenario: Experiment uses the same `_subagents/` convention as production
- **WHEN** an experiment playbook needs sub-agent relay slot directories
- **THEN** it SHALL use disposable bundles with the standard `_subagents/wave_NN/slot_MM/` structure
- **AND** SHALL NOT create ad-hoc directories like `_fixtures/`, `_comm/`, or `/tmp` subdirectories for relay slot artifacts

### Requirement: Relay slot artifacts SHALL NOT reside outside `_subagents/`

Relay-managed sub-agent slot artifacts SHALL reside exclusively under `_subagents/wave_NN/slot_MM/`.
The following SHALL NOT be used for relay slot artifacts:

- `/tmp` or any system temporary directory
- Ad-hoc bundle subdirectories (e.g., `_fixtures/`, `_comm/`, `_slots/`, `_tiers/`)
- Experiment-private directories that bypass the `_subagents/` relay convention
- Any path that is not a valid `_subagents/wave_NN/slot_MM/` under the active run bundle

Gate provenance checks and subagent slot presence checks SHALL only scan `_subagents/` for relay slot artifacts.
Relay slot artifacts placed outside `_subagents/` SHALL be invisible to provenance verification and slot binding.

#### Scenario: External relay path is invisible to provenance forensics
- **WHEN** a would-be slot result is written only to `/tmp/result.json` or `_fixtures/t1/result.json`
- **AND** `_subagents/wave_NN/slot_MM/` contains no corresponding relay slot artifacts
- **THEN** provenance forensics SHALL NOT treat the external file as slot evidence
- **AND** subagent slot presence / provenance checks SHALL report missing relay slot evidence for the expected slot

#### Scenario: Experiment fixture uses proper disposable bundle, not ad-hoc directory
- **WHEN** an experiment needs isolated tier environments for forensic testing
- **THEN** each tier SHALL use its own disposable bundle (`dpt_disp_*`) created via `new-disposable-bundle.mjs`
- **AND** each disposable bundle SHALL contain a standard `_subagents/wave_NN/slot_MM/` structure
- **AND** the experiment SHALL NOT create `_fixtures/`, `/tmp` subdirectories, or other ad-hoc relay paths
