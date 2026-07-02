# Closed Plans Index

已完成的 plan/分析文档。plan 完成后从 [`../../plans/`](../../plans/) 移入本目录。

**plan 没有编号——文件名本身就是标识。文件名不变，位置即状态。**

## 接收一个完成的 plan

plan 完成后从 `_backlog/plans/` 通过 `git mv` 移入本目录：
1. 在本文件加一行（文件名 + 简述）
2. 更新 `../../plans/README.md`（删掉该 plan）
3. 更新 `../README.md`（计数 +1）

---

## 已完成列表

- experiment-production-convergence.md — Agent 产出声明原则：declaration-ledger + file-observability（harden-rerun-topic-integration 已实现）
- trace-unification-assessment.md — 统一 trace：四份合并为 rb_trace.jsonl（已实现：QUEUE.TRACE、subagent-relay、inspect-bundle 均已迁入）
- ref-integrity-experiment-family.md — Reference 完整性实验家族设计（Engine 层防御全部落地：content_dedup、declaration ledger、cache trail 验证、file-observability；实验 playbook 未创建，controller 字段采用 relay 方案替代）
