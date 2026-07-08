# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-08 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
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
| [martin-fowler-run-bugfix-change-split](martin-fowler-run-bugfix-change-split.md) | 将 BUG-066 至 BUG-070 切成 2 个 OpenSpec change：先修 Agent-facing work-unit contract，再集中修 gate/reference navigation 对齐。 |
