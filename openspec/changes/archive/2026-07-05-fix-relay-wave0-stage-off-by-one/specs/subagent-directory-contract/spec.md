## ADDED Requirements

### Requirement: Relay staging places logical wave N slots in _subagents/wave_{NN}/ (0-based, matching canonical convention and gate wave field)

relay staging SHALL 把 logical wave N（gate `wave{N}-complete` 的 wave 字段）的 slot 放到 `_subagents/wave_{NN}/`（`NN = String(N).padStart(2,'0')`，0-based），与 `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md` 第 167 行文档化的 canonical 约定（Wave0→`wave_00/`、Wave1→`wave_01/`、Wave2→`wave_02/`）以及 wave-complete gate 的 `subagent_slot_presence`/ledger scope 检查一致（requirement ID SDC-003）。

runtime driver `drive-relay-slot stage --wave N` SHALL 按显式 N staging 到 `wave_{NN}/`。`stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex?)` SHALL 接受可选 `explicitWaveIndex`：提供时用 `waveDirName(explicitWaveIndex)`，否则保留现有 `nextWaveIndex(state)` 默认行为（legacy 直调兼容）。`stageReplacementSlot`/`commit`/`merge` 已用显式 waveIndex，行为不变。

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
