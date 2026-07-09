# TODO: final-output-eval（最终产物评估 → 自动 rerun）

> 状态: 待设计 | 优先级: 低–中 | 更新: 2026-07-09  
> 直接依赖: HITL2 + `phase-rerun` ✅；概念依赖: evidence-quality + explore-exploit 信号  
> 相关: `DONE-rerun-incremental-node`（rerun 怎么执行）；degraded pass（wave 级，≠ 本 todo）

## 三个 eval 的区别

| 层级 | TODO | 问什么 | 决策 |
|------|------|--------|------|
| Per-source | `todo-evidence-quality` | 这条材料好不好？ | discard / 保留 |
| Wave 级 | `todo-explore-exploit` | 搜索饱和了吗？ | 继续 / 换向 / 结束 |
| **Run 级** | **本 TODO** | 最终产物够不够格？ | 交付 / **自动 rerun** |

## Why

现在 wave2 → HITL2，rerun 全靠用户。系统若能在用户看到前判断「synthesis 空洞 / 弱源占比过高 / must-answer 未覆盖」，应能 **auto_rerun**，而不是每次都等人点。

不替代 HITL2；类似 CI auto-retry。

## 地基对齐（2026-07-09）

| 假设 | 现状 |
|------|------|
| HITL2 五决策仍纯用户 | ✅ |
| rerun node 可接 auto_rerun | ✅ `phase-rerun.md` |
| `FinalOutputEval` / `evaluateFinalOutput` | ❌ 无 |
| wave 级 degraded pass = run 级 eval | ❌ **不同层** — degraded 是 gate handoff escape；本 todo 是交付前自评 |
| 静默契约已可靠 | ⚠️ BUG-069 — 契约漂移时 auto_rerun 可能空转；需可信 gate 状态作输入 |

## 评估什么（方向不变）

读 wave2 产出整体质量（tier 分布、must-answer 覆盖、synthesis 实质、P0/P1 backing、counterexample、cross-topic ledger）— 不评单条 reference，不评搜索是否饱和。

## 集成方向（仍倾向 Option A）

HITL2 用户交互前跑 eval → `deliver` / `auto_rerun` / `escalate_to_hitl2`；auto_rerun 有次数上限。

## Non-Goals

- 不替代 HITL2 / evidence-quality / explore-exploit
- 不要求所有维度 100% 才 deliver
- 不在 BUG-069 未缓解时强推无人值守 auto_rerun 环

## Next Step

pipeline 后段再 `/opsx:explore`。设计时显式区分 degraded pass（wave）与 auto_rerun（run）。
