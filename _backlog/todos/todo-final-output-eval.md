# TODO: final-output-eval（最终产物评估 → 自动 rerun）

> 状态: 待设计 | 优先级: 中 | 创建: 2026-06-25
>
> 直接依赖: `prototype-subagent` ✅ | `prototype-gate-fork` ✅
> 概念依赖: `todo-evidence-extraction` + `todo-evidence-quality`（可信的 reference 计数和质量信号是本 eval 的输入）
> 相关 but distinct: `todo-explore-exploit`（wave 级收敛），`todo-rerun-incremental-node`（rerun 怎么执行）

## 三个 eval 的区别

| 层级 | TODO | 问什么问题 | 决策 |
|------|------|-----------|------|
| Per-source | `todo-evidence-quality` | 这条材料**好不好**？ | **放弃** or 保留 |
| Wave 级 | `todo-explore-exploit` | 搜索**饱和**了吗？ | 继续 / 换向 / 结束 |
| **Run 级** | **本 TODO** | 最终产物**够不够格**？ | 交付 / **自动 rerun** |

**本 TODO 的位置**：全部 wave 跑完以后、HITL2 或交付之前，系统自己评估最终产物的整体质量——不够格就自动 rerun，不每次都等用户判断。

## Why

现在的流程是：
```
wave0 → wave1 → wave2 → gate check → HITL2（用户决定：rerun / repair / proceed / stop）
```

问题：**每次 rerun 都需要用户介入**。用户说"重跑"，系统才重跑。但如果系统自己能判断"这次跑出来的东西明显不行"——比如 synthesis 空洞、evidence 全是弱来源、核心问题没回答——那就不应该交付到用户面前，应该**自动重跑**一轮。

这不替代 HITL2——用户仍然有最终决定权。但在用户看到之前，系统应该做过基本的质量自检。类似 CI pipeline 里的 auto-retry：build 失败了不会让人手动点 retry，自动重跑。

**final-output-eval 验证"该不该交付"**：整体产物质量评估 → 不够格 → 自动 rerun（不用等用户）。

## 现在缺什么

当前流程中，wave2 完成后直接进 HITL2。`phase-hitl2.md` 列了 5 个 `user_decision`：`proceed_to_readiness` / `request_view_revision` / `repair` / `rerun` / `stop_blocked`。这些全部是**用户决策**——系统不会自己做。

缺失的是：**系统自评**。在 HITL2 记录 user_decision 之前，加一步系统级的 final output 评估——产出一个 `auto_eval` 信号，建议 `deliver` / `auto_rerun` / `escalate_to_hitl2`（不确定，让人看）。

```
wave0 → wave1 → wave2 → gate check
                              │
                              ▼
                      final-output-eval（系统自评）
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           deliver        auto_rerun      escalate
         (够格，进HITL2)  (不够，自动重跑)  (不确定，交用户)
              │               │               │
              ▼               ▼               ▼
           HITL2          rerun node       HITL2
        (用户正常review)  (增量重跑)     (用户必须看)
```

## 评估什么

final-output eval 不评估单条 reference（那是 evidence-quality 的事），也不评估搜索是否饱和（那是 explore-exploit 的事）。它评估**最终产物的整体质量**：

| 维度 | 检查对象（wave2 实际产出） | 信号 |
|------|---------------------------|------|
| Evidence 深度 | `synthesis.md` 中引用的 reference tier 分布 | >50% Tier 4 → 太弱 |
| 覆盖完整性 | `finding-index.yaml` 中 must_answer 条目的回答覆盖率 | < 70% → 不完整 |
| Synthesis 实质 | `synthesis.md` 是否超过最低长度 / 是否含硬发现 | 空洞的 synthesis → 没东西可交付 |
| P0/P1 声明支撑 | `finding-index.yaml` 中关键声明的 source 数量 | 单来源 P0 → 不可交付 |
| Counterexample 覆盖 | `finding-index.yaml` 中是否有 counterexample_search 标记 | 未做 → 不完整 |
| 跨 topic 一致性 | `cross-topic-ledger.md` 是否有实质性发现 | 空 ledger → 各 topic 没交叉验证 |

**不评估**（属于 explore-exploit 的范畴）：
- 是否还该继续搜索（收敛信号）
- 是否该换方向（新概念涌现）

**不评估**（属于 evidence-quality 的范畴）：
- 单条 reference 的 substance / commercial_intent 判定

## 实验范围

**Goals:**
- 定义 `FinalOutputEval` schema——整体产物质量信号（~5-6 维度，不逐条）
- 实现 `evaluateFinalOutput(bundleState) → AutoEvalDecision`：读 bundle 的最终产出文件，输出 deliver / auto_rerun / escalate_to_hitl2
- 集成点：HITL2 gate check 通过后、phase-hitl2.md 记录 user_decision 前
  - 如果是 `auto_rerun` → 自动进入 rerun node（跳过 HITL2 用户交互）
  - 如果是 `escalate_to_hitl2` → 正常进入 HITL2（用户必须看）
  - 如果是 `deliver` → 可以进入 HITL2（用户正常 review，但系统认为够格了）
- auto_rerun 有次数限制——不能无限自动重跑（复用 `convergeRepair` 的 `maxIterations=3` 模式）
- 自动 rerun 的反馈写入 profile（让下一轮知道上一轮哪不行）

**Non-Goals:**
- 不替代 HITL2（用户仍有最终决定权，尤其 `escalate_to_hitl2` 强制交用户）
- 不替代 evidence-quality 的 per-source 评估
- 不替代 explore-exploit 的 wave 级收敛判断
- 不要求所有维度 100% 通过才 deliver——阈值可调

## 关键设计问题

### 1. final-output eval 放哪个 phase？

**选项 A：HITL2 的前置步骤**（推荐）。在 HITL2 gate check 通过后、用户交互之前，系统先跑 final-output eval。`auto_rerun` → 跳过 HITL2 交互，直接进 rerun node。`escalate_to_hitl2` / `deliver` → 正常进 HITL2。

**选项 B：独立 phase**（`phase-final-eval`）。在 wave2 和 HITL2 之间加一个 phase，有自己的 gate。更干净但加一个 phase 成本高。

**选项 C：HITL2 内部逻辑**。不新增 phase，在 `phase-hitl2.md` 的 prose 中增加一段 "before asking user, evaluate output" 的 Agent 指令。最简单但不 deterministic——依赖 Agent 自觉。

建议先走选项 A（HITL2 前置步骤），如果发现需要独立 gate 再升级到选项 B。

### 2. auto_rerun vs 用户 rerun 的区别

| | auto_rerun（系统） | user_rerun（HITL2） |
|---|---|---|
| 触发者 | Engine 评估 | 用户 decision |
| 依据 | FinalOutputEval 信号 | 用户看 artifact 后的判断 |
| 反馈 | 系统生成的 eval report | 用户写的 rationale + feedback |
| 次数限制 | 有（max N 次，超过 → escalate） | 无硬限制（人类决定） |
| 增量语义 | 自动保留可用的 wave 产出 | 按 rerun node 的增量规则 |

### 3. final-output eval 怎么和 explore-exploit 不重叠

| 场景 | explore-exploit 判断 | final-output eval 判断 |
|------|---------------------|----------------------|
| 搜索明显未饱和 | `continue`（继续 dispatch） | 不触发（还没到 final） |
| 搜索已饱和 | `complete`（停止 dispatch） | 看最终的 synthesis 质量 |
| 饱和但 synthesis 空洞 | 说 complete（搜索层面正确） | 说 auto_rerun（交付层面不合格） |
| 饱和 + synthesis 充实 | 说 complete | 说 deliver |

explore-exploit 判断**搜索**够不够。final-output eval 判断**产物**够不够。一个探索充分的 search 可能产出很烂的 synthesis（Agent 没好好写）。

## 现有基础设施

| 基础设施 | 位置 | 如何用 |
|---------|------|--------|
| HITL2 5 个 decision | `phase-hitl2.md:46-52` | auto_rerun 复用 `rerun` decision 的语义（增量重跑），但触发者从用户切到系统 |
| HITL2 enum | `DPT_FRAMEWORK/schema/enums.mjs:53` | `HITL2UserDecision`（6 值，含 sentinel `not_started`）已有 `rerun`——auto_rerun 复用它，只是触发者从用户切到系统 |
| rerun-incremental-node 概念 | `todo-rerun-incremental-node.md` | auto_rerun 触发后进入 rerun node——final-output eval 是 rerun 的**上游决策者** |
| bounded retry limit | existing repair/rerun guard patterns | maxIterations-style hard cap——auto_rerun 轮数上限的直接模板 |
| wave2 最终产出文件 | `artifacts/wave2/synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml` | final-output eval 的检查对象（注意：`question-list.md` 是 wave1 产物，不在 wave2） |
| evidence-quality 的 QualityReport | `todo-evidence-quality.md` | per-source quality 的聚合统计是 final-output eval 的输入之一 |

## 下一步

1. `/opsx:explore final-output-eval` — 定：
   - 评估维度（5-6 个，不要太细）和阈值
   - 放 HITL2 前置步骤还是独立 phase
   - auto_rerun 和 explore-exploit 的 complete signal 之间是什么关系
   - auto_rerun 次数上限、stall detection
2. `/opsx:propose final-output-eval` — 出 proposal + design + specs + tasks
3. 实现：
   - 定义 `FinalOutputEval` schema
   - 实现 `evaluateFinalOutput()`
   - 集成到 HITL2 流程（前置步骤）
   - auto_rerun → rerun node 的自动路由
   - auto_rerun 的轮数限制 + stall detection
