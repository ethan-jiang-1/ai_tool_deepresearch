# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-17 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [agent-output-linter](agent-output-linter.md) — **实现计划**：Agent 手写结构化内容不可靠，MD controller 在离产出最近的地方让 Agent 自检——JS 做两层确定性检查（语法 + 当时需要的 schema），Agent 根据报告修复，通过后才允许退出。含 format contract registry、CLI 设计、task.md 集成、hint-quality 测试覆盖审计。

---

## 最近关闭 (2026-07-17)

| Plan | 关闭依据 |
|------|----------|
| `deep-research-iterative-refinement-positioning` | `simplify-iterative-research-interaction` change 完整周期（propose→apply→archive），commit `a081e4bc6`；HITL1/silent/HITL2 协作节奏落地（CLS-029） |
| `codex-playbook-runner` | `codex`/`claude` CLI 已原生支持独立进程 spawn，plan 核心机制诉求由平台满足（CLS-030） |
| `repair-friendly-framework` | 原 manifest/consistency/repair-controller 方案被 direct-fact、root-first、same-check helper posture 取代；v0.31 落地 normalized Wave2 pair facts、global queue quiescence 与 receipt repair tolerance（CLS-027） |
| `subagent-output-contract-enforcement` | dry-submit repair matrix、Phase-owned reference materialization、current-round authority、receipt detail tolerance 与 receipt/log guidance 已由 v0.14–v0.16、v0.29、v0.31 等 changes 吸收（CLS-028） |
| `tests-e2e-layer` | plan 自标 Superseded；`formalize-verification-routing` archive 落地 canonical 四类 taxonomy（CLS-024） |
| `seed-backfill-round-continuity` | OpenSpec change tasks 全勾 + 实现 commit `2d8625f01` / v0.29（CLS-025）；原文 token re-injection 方案被 authority-driven rebuild 取代 |
