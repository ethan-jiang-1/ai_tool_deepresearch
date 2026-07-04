## Context

`_subagents/wave_NN/` 命名有两套约定冲突：

- Canonical（`shared-schemas.md:167` + 三个 wave-complete gate 定义 + `checkSubagentSlotPresence`/ledger scope）：0-based，wave0→`wave_00`。
- `stageSubagentSlots` full-stage 实际：`nextWaveIndex(state)=subagent_wave+1`，wave0（subagent_wave=0）→ `wave_01`。`subagent_wave` schema `min(0)` 禁止 -1，所以无法通过 `passBranchState` 让 wave0 落 wave_00。

`stageReplacementSlot`/`commit`/`merge` 都用显式 waveIndex（正确）；只有 `stageSubagentSlots` full-stage 用推导的 nextWaveIndex（wave0 偏 1）。所以 wave0 gate 的 slot_presence + ledger scope 永远失败。wave1/wave2 不受影响（`--wave 1`→wave_01、`--wave 2`→wave_02 都与 gate 一致）。

约束：`tests/engine/subagent-relay-stage.test.mjs` 等编码了 `wave_01`（测 nextWaveIndex 默认行为）；改默认会牵连大量单测。需最小风险修复。

## Goals / Non-Goals

**Goals:**
- 让 `drive-relay-slot --wave 0` 把 slot 落到 `wave_00`，与 canonical 约定 + wave0 gate 一致。
- 不破坏 legacy 直调 `stageSubagentSlots`（case-61 等）和现有单测（它们用 `nextWaveIndex` 默认行为）。
- version bump v0.3，更新 CHANGELOG + RUN.md 横幅。

**Non-Goals:**
- 不重构 `nextWaveIndex`/`subagent_wave` 的 counter 模型（那会牵连 collect-pipeline + 所有单测，风险大）。本 change 只在 driver 入口加显式 override，legacy 默认行为保留。
- 不修 case-211/212 的其它 blocker（stale path / 00-shared）——Change B。
- 不改 wave1/wave2 行为（已对齐）。

## Decisions

**Decision 1: 用可选 `explicitWaveIndex` 参数，不改默认 `nextWaveIndex`。**

- 选择：`stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex?)`。提供时 `waveDirName(explicitWaveIndex)`，否则 `nextWaveIndex(state)`（不变）。
- 理由：最小风险。driver（`drive-relay-slot`，protocol 规定的唯一 runtime 入口）传 `--wave` 值 → wave0 落 wave_00。legacy 直调者/单测不传该参数 → 行为不变 → 单测仍 PASS。
- 替代方案 A（否决）：改 `nextWaveIndex` 公式或 `subagent_wave` schema 允许 -1。否决理由：牵连 collect-pipeline 的 counter 递增语义 + 所有编码 wave_01 的单测，风险大、回归面广。
- 替代方案 B（否决）：改 wave0 gate 查 `wave_01`。否决理由：违反 `shared-schemas.md:167` canonical 0-based 约定，且要改 gate 定义 + gate-helper wave 推导，把"正确方"改成"错误方"。

**Decision 2: `inferWaveFromBundle` 初值 `0`→`-1`。**

- 选择：fresh bundle（无 wave_ 目录）推断为 `0`（→ wave_00），与 0-based 约定一致。
- 理由：仅 `--wave` 缺省时生效；playbook 都显式传 `--wave`，所以这是 correctness 兜底，不影响 playbook 路径。

**Decision 3: version bump v0.2→v0.3。**

- 理由：drive-relay-slot wave0 staging 目录变化（wave_01→wave_00）是 framework 行为变化，按 OpenSpec 规则需 version bump + CHANGELOG + RUN.md 横幅。

## Risks / Trade-offs

- [Risk] 残留约定不一致：直调 `stageSubagentSlots`（legacy/单测）仍 wave0→wave_01，driver →wave_00。→ Mitigation：两种行为不交叉（driver 走 explicitWaveIndex，直调走 nextWaveIndex）；documented 为 legacy。后续如需统一约定，另开 change 重构 counter 模型。
- [Risk] 生产 relay 若有别处假设 wave0→wave_01。→ Mitigation：生产用 drive-relay-slot（protocol 规定），fix 后生产 wave0 也落 wave_00，gate 才能过——本 fix 修复生产同 bug。apply 时跑全量 `tests/` 回归确认无破坏。
- [Trade-off] 加一个可选参数 vs 重构。→ 选可选参数：低风险、聚焦、可验证。

## Migration Plan

- 无数据迁移。production run bundle 的 `_subagents/wave_01/`（旧 wave0 slot）会在下次 stage 时落 wave_00；in-flight bundle 不受影响（state 不持久化）。
- Apply：改 2 个文件 + version bump → 跑 `node --test tests/` 全回归 → 验证 `drive-relay-slot stage --wave 0` 落 wave_00 → 更新 CHANGELOG/RUN.md。
- 回滚：revert 2 文件 + version。

## Open Questions

- 无。fix 方向由 `shared-schemas.md:167` canonical 约定 + gate wave 字段 + `stageReplacementSlot`/`commit`/`merge` 已用显式 waveIndex 共同确认。
