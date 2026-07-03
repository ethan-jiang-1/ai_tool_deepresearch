# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-03 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1 closed）

---

## 活跃列表

- [subagent-logging-come-alive-plan.md](subagent-logging-come-alive-plan.md) — 让 sub-agent logging 活过来 + provenance 取证；用证据先于 BUG-019 对策判决（已实验验证 logging 管线可用、bundle provenance 系手糊）
- [self-documenting-phase-role-nodes-plan.md](self-documenting-phase-role-nodes-plan.md) — Self-Documenting Phase + Relay Role Nodes
- [simplify-relay-pipeline.md](simplify-relay-pipeline.md) — 化簡 Relay Pipeline — 讓正道比捷徑更容易
