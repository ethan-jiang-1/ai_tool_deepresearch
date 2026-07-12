# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-12 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
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
| [breakpoint-recovery-persistence-model](breakpoint-recovery-persistence-model.md) | Partial — v0.21 已落 `materialize-before-work`/helper-oriented 指导基础；P1 crash-safe write+sweep、P2 topic×wave 进度面、P3 用户意图即时物化仍待独立 change。 |
| [human-override-and-state-mutability](human-override-and-state-mutability.md) | Partial — v0.21 已澄清 ordinary helper action 与 human-directed context；单一真相源、原子 `rename-topic`、audited override/state-seed、`audit-bundle-integrity` runtime 能力仍未落地。 |
