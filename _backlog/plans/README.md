# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-13 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1 closed）

---

## 活跃列表

| Plan | 简述 |
|------|------|
| [OVERALL: recovery-canonical-state-and-delegation](overall-recovery-canonical-state-and-delegation-roadmap.md) | **总控计划。** C1–C4均已归档；C5 v0.27 apply与case-317 controlled proof完成、待归档。BUG-078已关闭；BUG-079和两个来源plan只保留明确未覆盖的历史adoption、persist前host write与generic maintenance/state-seed边界。 |
| [breakpoint-recovery-persistence-model](breakpoint-recovery-persistence-model.md) | Partial — crash-safe sanctioned content、canonical intent/progress/layout和post-final request materialization已落地；persist调用前host write、任意旧tmp识别与generic maintenance input仍未覆盖。 |
| [human-override-and-state-mutability](human-override-and-state-mutability.md) | Partial — single registry、layout mutation、integrity/reentry safety net与狭窄post-final rerun已落地；generic override/state-seed与可信permission signal仍不可用。 |
