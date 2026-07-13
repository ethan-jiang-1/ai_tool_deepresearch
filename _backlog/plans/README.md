# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-13 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [seed-backfill-round-continuity](seed-backfill-round-continuity.md) — **P0 设计缺陷**：seed topic 回填区是单次消费结构，`__BACKFILL_*__` token 消费后消失，多轮 rerun 没有结构化回填目标。推荐方案：phase-rerun 追溯标记上轮内容+重新注入 fresh token。
