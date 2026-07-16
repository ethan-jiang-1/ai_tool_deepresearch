# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-07-16 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [repair-friendly-framework](repair-friendly-framework.md) — **设计阶段**：假设数据一定会出问题，在关键节点预先埋 provenance marker、gap check、repair journal（`_repairs/` + `repair_*` trace events + `produced_by` 字段），让问题可发现、可定位、可修补。源自 pragmatic-summit-2026-ai-impact 迁移的实战教训。
- [codex-playbook-runner](codex-playbook-runner.md) — **P0 实验基础设施**：用 codex/claude code 独立进程实现 coding-Agent runner 与 subject Agent 的真正分离。Runner 进程只做 setup 和 observation，subject Agent 步骤通过 `codex exec` spawn 独立进程，transcript 存档证明独立性。case-318 的首个完整自动化路径。
- [agent-output-linter](agent-output-linter.md) — **实现计划**：Agent 手写结构化内容不可靠，MD controller 在离产出最近的地方让 Agent 自检——JS 做两层确定性检查（语法 + 当时需要的 schema），Agent 根据报告修复，通过后才允许退出。含 format contract registry、CLI 设计、task.md 集成、hint-quality 测试覆盖审计。

---

## 最近关闭 (2026-07-15)

| Plan | 关闭依据 |
|------|----------|
| `tests-e2e-layer` | plan 自标 Superseded；`formalize-verification-routing` archive 落地 canonical 四类 taxonomy（CLS-024） |
| `seed-backfill-round-continuity` | OpenSpec change tasks 全勾 + 实现 commit `2d8625f01` / v0.29（CLS-025）；原文 token re-injection 方案被 authority-driven rebuild 取代 |
