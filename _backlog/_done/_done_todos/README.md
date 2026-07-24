# Archived Todos Index — 已完成 todo 与已吸收设计输入

> 最后更新: 2026-07-24 | `_backlog/_done/_done_todos/` — 已完成 todo 与已吸收 standalone TODO 的归档目录。
> 接收来自 [`../../todos/`](../../todos/) 的 todo。`_` 前缀 = coding agent 默认忽略。
>
> **实施完成的 todo** 移入时分配 `DONE-NNN` 序号，按完成时间递增。被活跃 plan 吸收的 standalone TODO 也可在此保留历史原文，但不占 DONE 编号，也不代表能力已实现。

## 接收一个实施完成的 todo

todo 完成后从 `_backlog/todos/` 通过 `git mv` 移入本目录：
1. 在本文件表格加一行（DONE-NNN + 日期 + 文件名 + 简述），编号 = 当前最大 + 1
2. 更新最后的 "Next available DONE ID" 行
3. 更新 `../../todos/README.md`（移除该 todo 的行）
4. 更新 `../README.md`（计数 +1）

## 接收一个被活跃 plan 吸收的 TODO

1. 从 `_backlog/todos/` 用 `git mv` 移入本目录，保留原文。
2. 在“已吸收的 Standalone TODO（非已实现）”表加一行，写 active replacement 和 closure reason。
3. 更新 `../../todos/README.md`，从活跃列表移除并说明吸收关系。
4. 更新 `../README.md` 的已吸收输入数量；不分配 `DONE-NNN`，不改变 Next available DONE ID。

---

## 已完成列表

| ID | Date | File | Summary |
|----|------|------|---------|
| DONE-001 | 2026-06-16 | DONE-prototype-loop-engineering-queue.md | Gate-loop 原型工程 |
| DONE-002 | 2026-06-16 | DONE-prototype-subagent.md | Subagent 原型 |
| DONE-003 | 2026-06-17 | DONE-feedback-cc-real-subagent.md | Subagent feedback：CC 真实运行 |
| DONE-004 | 2026-06-17 | DONE-feedback-cx-real-subagent.md | Subagent feedback：CX 真实运行 |
| DONE-005 | 2026-06-17 | DONE-feedback-final-real-subagent.md | Subagent feedback：Final 真实运行 |
| DONE-006 | 2026-06-17 | DONE-prototype-workflow-next.md | Workflow next 原型 |
| DONE-007 | 2026-06-18 | DONE-dedup-experiments-and-framework.md | 实验与框架去重 |
| DONE-008 | 2026-06-23 | DONE-agentic-queue-landing-analysis.md | Queue loop 设计分析（59KB，最详细） |
| DONE-009 | 2026-06-24 | DONE-emergent-phenomena-in-cross-topic-synthesis.md | 跨 topic 合成中的涌现现象 |
| DONE-010 | 2026-06-24 | DONE-rerun-incremental-node.md | HITL2 增量重跑节点 |
| DONE-011 | 2026-06-24 | DONE-wave2-engine-feedback-rails.md | Wave2 Engine feedback rails |
| DONE-012 | 2026-06-25 | DONE-plan-hostfile-sections.md | rb_plan.md Section 化 |
| DONE-013 | 2026-06-26 | DONE-wave1-sufficiency-gates.md | 研究充分性标准（4 style JSON + CLI + 动态阈值） |
| DONE-014 | 2026-06-27 | DONE-hitl-ux.md | HITL 环机制：3 浮出水面点 + 静默契约 + prompt 模板 |
| DONE-015 | 2026-07-09 | todo-evidence-extraction.md | Evidence extraction 核心：ledger + `countReferences`/`isCountable` + CCC/cache；CandidateCard 路径废弃；语义层并入 evidence-quality |
| DONE-016 | 2026-07-22 | todo-phase-recover.md | BUNDLE_MAP/status/trace reload、`check-reentry` root findings 与 narrow recovery owners 已提供 Agent-facing bundle-truth recovery |

## 已吸收的 Standalone TODO（非已实现）

| Date | File | Active replacement | Closure reason |
|------|------|--------------------|----------------|
| 2026-07-22 | todo-evidence-quality.md | [`research-question-closure-and-evidence-judgment`（已关闭, CLS-034）](../_closed_plans/research-question-closure-and-evidence-judgment/research-question-closure-and-evidence-judgment.md) | The source-score / semantic-countability proposal was folded into question-level model judgment; no standalone capability was implemented. |
| 2026-07-22 | todo-explore-exploit.md | [`research-question-closure-and-evidence-judgment`（已关闭, CLS-034）](../_closed_plans/research-question-closure-and-evidence-judgment/research-question-closure-and-evidence-judgment.md) | The WaveStats/strategy-projection proposal was folded into the same question-closure plan; no standalone capability was implemented. |
| 2026-07-22 | todo-user-knowledge-hang.md | [`research-question-closure-and-evidence-judgment`（已关闭, CLS-034）](../_closed_plans/research-question-closure-and-evidence-judgment/research-question-closure-and-evidence-judgment.md) | Per-run user controls were folded into the same plan as a host-file snapshot, replacing the proposed external live knowledge-pack contract; no standalone capability was implemented. |

**Next available DONE ID: DONE-017**
