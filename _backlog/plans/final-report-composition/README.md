# Final Report Composition

> 本文件只提供索引。本目录是 backlog plan，不是 accepted spec、runtime contract 或实现许可。

## Start Here

| File | Role | Status |
|---|---|---|
| [progressive-plan.md](progressive-plan.md) | Progressive checklist、当前步骤、阶段出口和整体 Definition of Done | Tracking owner |
| [hitl2-final-composition-handoff.md](hitl2-final-composition-handoff.md) | HITL2 收集/解析流程、durable handoff schema、Gate invariants 和 Final 消费规则 | 当前待审 contract |
| [recommended-final-composition-design.md](recommended-final-composition-design.md) | 当前 executor 路径、Composition Pass、ownership、verification 和 OpenSpec scope | 当前选择 |
| [composition-logic-feasibility.md](composition-logic-feasibility.md) | Artifact join、Answer Inventory、materiality、view transformation 和 backing 推敲 | 支撑当前选择 |
| [view-contract-sketch.md](view-contract-sketch.md) | 各 `final_report_view` 的 reader question、spine、selection 和 failure modes | Proposal input；待按 handoff contract 对齐 |
| [subagent-composition-seam.md](subagent-composition-seam.md) | Formal Composer、ad-hoc spawn、staging 和 fallback 的备选分析 | 当前暂不考虑，保留 |

## Reading Routes

| Need | Read |
|---|---|
| 看当前做到哪、下一步是什么 | `progressive-plan.md` |
| 审 HITL2 到 Final 的交接是否说清楚 | `hitl2-final-composition-handoff.md` |
| 看当前选择的完整 Final 设计 | `recommended-final-composition-design.md` |
| 追溯 composition 算法为什么可行 | `composition-logic-feasibility.md` |
| 细化不同 report view | `view-contract-sketch.md` |
| 重新评估 Sub-agent | `subagent-composition-seam.md` |
