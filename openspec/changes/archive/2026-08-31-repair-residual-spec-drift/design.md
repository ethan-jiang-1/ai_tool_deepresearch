# Design: repair-residual-spec-drift

## Context

见 proposal.md——Why。四个 delta 的目标 requirement 均已整体提取为 delta 文件并做定点重写（house 规则：MODIFIED delta = requirement 整块替换，scenario 标题为 delta-sync key 不可删除，保留标题需带 retention 注记）。本 change 零代码；所有修正的"行为真相"侧证据在 propose 期逐行复核过（下表）。

## Goals / Non-Goals

- Goals：消除 14 处 spec 侧 Agent 误导（A1–A14 + catalog C1）；为 C2 的 zod 词汇锁与 `check-spec-enum-restatements.mjs` 提供被守护的枚举句（disposition 五值、恢复词汇导出指针）。
- Non-Goals：不改任何 engine/CLI/schema 行为；不做 registry 账本手术（RRM-008/CTS-012/RWP-005/008 归 C3）；不填 CHI-004 决策表占位测试（独立债务，`tests/engine/work-unit-recovery-decision-table.test.mjs` 为 1 行 placeholder 的事实已登记 plan §2.6）。

## Decisions

| # | 决策 | 理由 / 备选 |
|---|---|---|
| D1 | 恢复词汇（CHI-004）以**导出指针**取代枚举清单：值集 = `WORK_UNIT_RECOVERY_ACTIONS`（10 值），动词映射 = `RECOVERY_ACTION_CLI_VERB`，无动词边界显式保留 | 真相源唯一（同 spec :334-348 的既有 requirement 与 `RUN.md:78` 已确立此姿态）；5 值枚举与全域下划线拼写禁令会错杀 `claim_successor`/`inspect_current_lineage_leaf` 合法发射。备选：把 10 值全部列进 spec——违反 code-only-truth 指针纪律，且与 checker 的等值守护冲突 |
| D2 | disposition 五值在 requirement 内**列举 + owner 指针**（`work-unit-attempt-disposition.mjs`，唯一发射 choke point） | 该集合现状"spec 说封闭但谁都没锁"；C2 落 zod 锁后此句成为 checker 可守护句。备选：维持不列举——checker 永远无法守护它（Q4 审计明确） |
| D3 | DEW-012 两条宽容条款改为**严格拒绝口径**，scenario 标题保留 + retention 注记 | 代码现状即严格拒绝（`assertCompleteCurrentWorkUnitProfile` 入口硬拒 + Zod 必填，双重不可达）；与 DEW-004 :293-298 对齐消除同 spec 双代真相。备选：恢复代码宽容——违背 strict-binding 代际决定，改动面大 |
| D4 | AGQ-027 措辞对齐代码（`drained:true` + `passed:false` + exit 非零），前置条件按代码现状写（refill 保证窗口空则池空） | 代码注释自证 distinct-verdict 设计意图；可达状态无行为差异。备选：改代码先查 refill_pool——为措辞问题引入守卫代码不成比例 |
| D5 | AGQ-007 以 `kind: 'wave0_source_intake'` 为主表述，`source_intake_fan_in` 标注为同族历史命名（open string 仍接受） | 保留历史可检索性，零行为变化；heading 按规则不改（delta-sync key）。备选：删字面量——丢失历史线索且 heading 本身仍含旧名 |
| D6 | A13 归一措辞：把 `final_delivery` 明确表述为"保留的 stop-authorization 状态（`schema/enums.mjs`），不是 trace event 名" | 消除与保留枚举值的同名相撞；禁止语义（不得写 satisfaction/stop-authorization 事件）不变 |
| D7 | Purpose/catalog/guidance 修正走 apply 期直接编辑（无 delta） | 它们不是 requirement（delta 机制不覆盖）；CLS-079 C1 头部修正先例 |
| D8 | A7（spec:532 `write_to` 边界点名 vs 代码 :540 文案）**改代码文案**，归 C2 | 意图已达标（禁止手改 authority），字面未达；改一行代码文案比扩 spec 便宜（plan §7 OQ1 建议） |

### Open questions 处置（plan §7 → 本 change 裁定）

- OQ1 A7 方向：改代码文案（D8），C1 不动 spec。
- OQ2 A12：历史别名注记（D5）。
- OQ3 RRM-008/CTS-012：注册新 ID，归 C3（本 change 不触碰 registry）。
- OQ4 RWP-005/008：C3 期做 git 考古后定 `[DEPRECATED]` 或恢复锚点（本 change 不触碰）。
- OQ5 元层面治理（Charter 级新词表硬门槛）：**本轮不吸收**，保持独立登记——C1–C4 已是四个有界 change，Charter 级门槛值得单独立项。

## Risks / Trade-offs

- 整块替换 delta 的誊写风险：四块 delta 均由 main spec 程序化提取后定点替换，非手抄；apply 后以文本锁测试 + `git diff` 逐块复核。
- CHI-004 块内 "decision-table regression" 相关 SHALL 的回归测试仍是占位符（CHI-004 债务）：本 change 只把规则改成导出派生口径，不实现该测试；C2 的 checker 会覆盖"值在集合内"的守卫，行级 RUN.md 表锁定仍留独立任务。
- 文档级回退风险：新增 `tests/engine/residual-spec-drift-text-locks.test.mjs` 锚定关键修正句。
