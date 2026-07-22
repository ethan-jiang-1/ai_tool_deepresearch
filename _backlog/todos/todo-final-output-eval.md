# TODO: final-output-eval（最终产物评估 → HITL2 recommendation）

> 状态: 待设计（需重述） | 优先级: 低–中 | 更新: 2026-07-22（v0.40 同步）
> 直接依赖: HITL2 + `phase-rerun` ✅；概念依赖: 活跃 [`research-question-closure-and-evidence-judgment`](../plans/research-question-closure-and-evidence-judgment.md) plan 的用户控制、问题闭环与限制信号
> 相关: `DONE-rerun-incremental-node`（rerun 怎么执行）；degraded pass（wave 级，≠ 本 todo）

## 两层判断的区别

| 层级 | Surface | 问什么 | 决策 |
|------|---------|--------|------|
| Per-run controls + question / finding | `research-question-closure-and-evidence-judgment` | 用户要求什么、对这个材料问题证据够不够、该 exploit/explore/延后吗？ | 用户定研究方向；模型判断；既有 work-unit/HITL2 route 记录去向 |
| **Run 级** | **本 TODO** | 最终产物还缺什么？ | HITL2 deliver / rerun recommendation |

## Why

现在 wave2 → HITL2，系统可以提供交付前的 deterministic diagnostic，但 rerun scope、成本与风险仍是 HITL2 用户语义决定。现有 rerun 和 post-Final recovery 都已经把这一决定绑定在 HITL2；本 TODO 不得把它改成自动 state mutation 或 CI-style auto-retry。

## 地基对齐（2026-07-15）

| 假设 | 现状 |
|------|------|
| HITL2 五决策仍纯用户 | ✅ |
| rerun node / post-Final recovery | ✅ 已有，但只消费 HITL2 `rerun` 决定与已接受 recovery contract |
| routed rerun pipeline | ✅ **repair-rerun 已落地** — 新增 topic 走正常 Wave0/Wave1 队列 + work-unit + submit + gate |
| `FinalOutputEval` / `evaluateFinalOutput` | ❌ 无 |
| wave 级 degraded pass = run 级 eval | ❌ **不同层** — degraded 是 gate handoff escape；本 todo 是交付前自评 |
| 静默契约已可靠 | ✅ BUG-069 已修复，gate hints + contract lineage 落地 |

## 评估什么（方向不变）

读 wave2 产出整体质量（是否回应本 run 已记录的用户控制、must-answer 覆盖、synthesis 实质、P0/P1 backing、counterexample、cross-topic ledger）— 不评单条 reference，不评搜索是否饱和，也不把用户自由文本转成新的 Engine score。

## 集成方向（待 explore）

HITL2 前可运行 read-only run-level diagnostic → `deliver_recommended` / `rerun_recommended` / `escalate_with_missing_fact`。它把已记录用户控制、直接事实与建议交给 HITL2，不创建 `auto_rerun`、新的 retry state 或绕过现有 rerun-count authority。

## Non-Goals

- 不替代 HITL2 或统一的问题闭环计划
- 不自动进入 rerun、改变 profile、topic state、queue 或 Final lineage
- 不要求所有维度 100% 才 deliver
- 不把 user-approved HITL2 rerun 改写成无人值守 auto-rerun 环

## Next Step

pipeline 后段再 `/opsx:explore`。先证明现有 Wave2 finding-index、HITL2 recommendation 与 post-Final inspection 缺少哪个 run-level direct fact；设计时显式区分 degraded pass（wave）与 HITL2-owned rerun recommendation（run）。
