## Why

`_subagents/wave_NN/` 目录命名有两套不一致的约定：

- **Canonical（`shared-schemas.md` 第 167 行 + 所有 wave-complete gate 定义）**：0-based —— Wave0→`wave_00/`、Wave1→`wave_01/`、Wave2→`wave_02/`。`check-gate-wave{0,1,2}-complete.mjs` 的 `subagent_slot_presence` 规则和 ledger scope 过滤都按这个 0-based 规则查 `_subagents/wave_{NN}/`（wave0 gate 查 `wave_00`，wave1 查 `wave_01`，wave2 查 `wave_02`）。
- **`stageSubagentSlots` 实际行为**：用 `nextWaveIndex(state) = subagent_wave+1` 推导 wave 目录。首次 stage 时 `subagent_wave=0`（schema `min(0)` 禁止更小）→ `nextWaveIndex=1` → **wave0 落到 `wave_01/`**，违反 canonical 约定。

后果：wave0-complete gate 的 `subagent_slot_presence`（查 `wave_00`）和 ledger scope（查 `slot_result_ref` 含 `wave_00`）**永远不满足**——无论怎么跑。这阻塞了 case-211/212（wave0 heavy playbook），并解释了所有 wave0 run 的 "Subagent wave directory missing: _subagents/wave_00/" 和 "no scoped ledger records" 报错。（wave1/wave2 不受影响：`--wave 1`→wave_01、`--wave 2`→wave_02 都与 gate 一致；只有 wave0 full-stage 偏 1。）

注：`stageReplacementSlot`、`commit`、`merge` 都用**显式** waveIndex（→ `wave_{N}`，正确），只有 `stageSubagentSlots` 的 full-stage 路径用推导的 `nextWaveIndex`（→ `wave_{N+1}` for wave0）。所以偏差是局部的、可精确修复的。

## What Changes

- `stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex?)`：新增可选 `explicitWaveIndex` 参数。提供时用 `waveDirName(explicitWaveIndex)`，否则保持现有 `nextWaveIndex(state)` 行为（legacy 直调者/单测不变）。
- `drive-relay-slot stage`（full mode）：把 `--wave` 值作为 `explicitWaveIndex` 传入 → wave0 落 `wave_00`、wave1 落 `wave_01`、wave2 落 `wave_02`，与 canonical 约定 + gate 一致。
- `inferWaveFromBundle`：`maxWave` 初值 `0`→`-1`，使 fresh bundle 推断为 `0`（→ `wave_00`）而非 `1`，与 0-based 约定一致（仅在 `--wave` 缺省时生效）。
- **Version bump v0.2 → v0.3**（`DPT_FRAMEWORK/` 行为变化：drive-relay-slot wave0 staging 目录由 `wave_01` 改为 `wave_00`，影响生产 relay 入口）。

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `subagent-directory-contract`：新增 SDC-003 —— relay staging SHALL 把 logical wave N 的 slot 放到 `_subagents/wave_{NN}/`（0-based，与 `shared-schemas.md` canonical 约定和 wave-complete gate 的 `wave` 字段一致）。runtime driver（`drive-relay-slot`）SHALL 按显式 `--wave N` staging；`stageSubagentSlots` SHALL 接受可选 `explicitWaveIndex` 以支持此路径。

## Impact

- **`DPT_FRAMEWORK/` 行为变化（version bump v0.3）**：
  - `engine/subagent-relay-stage.mjs`（`stageSubagentSlots` 新增 `explicitWaveIndex` 参数）
  - `cli/drive-relay-slot.mjs`（full-stage 传 `waveIndex`；`inferWaveFromBundle` 初值 `-1`）
  - `CHANGELOG.md` + `RUN.md` 横幅更新到 v0.3
- **不受影响（兼容性）**：legacy 直调 `stageSubagentSlots`（case-61 等）不传 `explicitWaveIndex` → 行为不变；`tests/engine/subagent-relay-stage.test.mjs` 等编码 `wave_01` 的单测仍 PASS（它们测的是 `nextWaveIndex` 默认行为，本 change 不改默认）；`stageReplacementSlot`/`commit`/`merge` 已用显式 waveIndex，行为不变。
- **验证**：`drive-relay-slot stage --wave 0` 落 `wave_00`（grep dispatch.json 路径）；wave0 gate `subagent_slot_presence` + ledger scope 在 staged+committed 后可满足；现有 `tests/` 全 PASS。
- **后续**：case-211/212 还有 stale-path / 00-shared / playbook-completeness blocker（Change B）；case-221/222/223/234 不受本 off-by-one 影响（wave1/wave2 已对齐），其 blocker 全在 Change B。
