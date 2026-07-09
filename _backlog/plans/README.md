# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-09 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
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
| [delegated-attempt-timeout-and-redo-postmortem](delegated-attempt-timeout-and-redo-postmortem.md) | Delegated work-unit 的 timeout/REDO 机制复盘（pragmatic-summit run 触发）。fetch 降级链部分已由 v0.14 落地；**核心 timeout 修复（心跳续期 / late-accept / 产出继承 / pause-aware）未实施，待另起独立 change**。 |
