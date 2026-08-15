# Final Report Composition

> 状态：当前 architecture/executor 路径已选；view contract 仍有少量 proposal-level gap。
>
> 权限边界：本目录是 backlog plan，不是 accepted spec、runtime contract 或实现许可。
>
> 目标 surface：`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md`

## Current Decision

Final 保持唯一 terminal delivery node，其内部执行一次 Report Composition Pass。当前由 Final Phase Agent 直接完成，暂不使用 Sub-agent；Engine 只负责 backing 与 persistence verdict。

## Reading Order

| File | Role | Status |
|---|---|---|
| [recommended-final-composition-design.md](recommended-final-composition-design.md) | 当前执行路径、Module Interface、Composition Pass、ownership、verification 和 OpenSpec scope | 当前选择 |
| [composition-logic-feasibility.md](composition-logic-feasibility.md) | Artifact join、Answer Inventory、materiality、view transformation、backing 与执行可行性推敲 | 支撑当前选择 |
| [view-contract-sketch.md](view-contract-sketch.md) | 各 `final_report_view` 的 reader question、spine、selection、failure modes 和未决语义 | Proposal input |
| [subagent-composition-seam.md](subagent-composition-seam.md) | Formal Composer、ad-hoc spawn、staging、fallback 和 future verification 的备选分析 | 当前暂不考虑，保留 |

正常阅读顺序：

1. 先读 [recommended-final-composition-design.md](recommended-final-composition-design.md)，了解当前准备实施的唯一路径。
2. 需要验证组织算法是否站得住时，读 [composition-logic-feasibility.md](composition-logic-feasibility.md)。
3. 需要细化 report view 时，读 [view-contract-sketch.md](view-contract-sketch.md)。
4. 只有评估 context isolation 或未来 delegation 时，才读 [subagent-composition-seam.md](subagent-composition-seam.md)。

## Path Status

| Path | Current status |
|---|---|
| Final Phase Agent 直接执行完整 Composition Pass | 当前选择 |
| Formal `dpt-report-composer` work unit | 暂不考虑；真实 run 证明 context bottleneck 后可重开 |
| 不走 work unit 的 ad-hoc writing Sub-agent | 暂不考虑；当前没有合法 production contract |
| 新 report phase、Final Gate、第三个 HITL | 不进入当前 topology |

“暂不考虑”不等于删除历史推敲或永久否决。备选路径保留其适用问题、代价、contract 影响和重新打开条件，但不会进入当前 OpenSpec scope。

## Remaining Proposal Decisions

当前只保留两个会影响 accepted behavior 的 view contract gap：

1. `custom` view 的 durable narrative carrier 应复用哪个现有 owner。
2. `not_started` 应由 HITL2 写成 `profile_default`，还是由 Final 透明解析为 `profile_default`。

## Authoritative References

- `openspec/constitution/project-charter.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md`
- `openspec/specs/research/content-delivery-phase-content/spec.md`
- `openspec/specs/research/final-delivery-backing/spec.md`
