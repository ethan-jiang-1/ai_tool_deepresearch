# Subagent Directory Contract

> req: SDC-001, SDC-002, SDC-003

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

### Requirement: Relay staging places logical wave N slots in _subagents/wave_{NN}/ (0-based, matching canonical convention and gate wave field) (SDC-003)

Relay staging SHALL 把 logical wave N（gate `wave{N}-complete` 的 wave 字段）的 slot 放到 `_subagents/wave_{NN}/`（`NN = String(N).padStart(2,'0')`，0-based），与 `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md` 第 167 行文档化的 canonical 约定（Wave0→`wave_00/`、Wave1→`wave_01/`、Wave2→`wave_02/`）以及 wave-complete gate 的 `subagent_slot_presence`/ledger scope 检查一致。

Runtime driver `drive-relay-slot stage --wave N` SHALL 按显式 N staging 到 `wave_{NN}/`。`stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex?)` SHALL 接受可选 `explicitWaveIndex`：提供时用 `waveDirName(explicitWaveIndex)`，否则保留现有 `nextWaveIndex(state)` 默认行为（legacy 直调兼容）。

历史偏差（修复前）：`stageSubagentSlots` full-stage 用 `nextWaveIndex(state)=subagent_wave+1` 推导，wave0（subagent_wave=0）落到 `wave_01`，违反 canonical 约定，导致 wave0 gate `subagent_slot_presence`（查 `wave_00`）+ ledger scope 永远失败。

#### Scenario: drive-relay-slot stages wave0 into wave_00

- **WHEN** `drive-relay-slot stage --bundle <B> --wave 0` 执行
- **THEN** slot 目录与 dispatch.json SHALL 落在 `_subagents/wave_00/`
- **AND** wave0-complete gate 的 `subagent_slot_presence` SHALL 能在 `_subagents/wave_00/` 找到该 slot

#### Scenario: explicitWaveIndex optional — legacy direct callers unchanged

- **WHEN** `stageSubagentSlots(state, baseDir, customDispatchMap)` 被调用且不传第四个参数
- **THEN** SHALL 继续用 `nextWaveIndex(state)` 推导 wave 目录（legacy 行为）
- **AND** 现有编码 `wave_01` 的单测 SHALL 仍 PASS

#### Scenario: wave1/wave2 staging unchanged

- **WHEN** `drive-relay-slot stage --wave 1`（或 `--wave 2`）执行
- **THEN** SHALL 分别落 `wave_01`（或 `wave_02`），与本 fix 前行为一致
- **AND** wave1/wave2 gate 的 slot_presence SHALL 不受本 change 影响
