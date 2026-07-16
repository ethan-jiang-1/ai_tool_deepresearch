# Deep Research with Iterative Refinement — Positioning the HITL2→Rerun Loop

> 状态：定位文档 | 创建：2026-07-16 | 来源：aiewf-2026-community-pulse 3 轮 rerun 实操反思

---

## 一句话

**大多数 Deep Research 是一次性的——你问，它搜，你拿到结果。不满意就重新来。我们这个不一样：HITL2 不是一个"最终审批" checkpoint，它是一个**故意的 rerun 入口**。你可以反复打磨研究方向，topic 选错了可以调、深度不够可以加、视角偏了可以修——所有已有工作保留，增量叠加。**

---

## 问题：市面上的 Deep Research 有什么毛病

### 主流模式：一问一答

用户提一个问题 → Agent 搜索 → Agent 写报告 → 交付。流程结束。

这个模式有三个结构性缺陷：

| 缺陷 | 后果 |
|------|------|
| **seed topic 一次性锁定** | 用户一开始选的 topic 方向决定了整个研究的质量上限。选错了，只能全部重来。 |
| **无中间审查** | 用户在最终报告出来之前看不到任何中间产物——不知道 Agent 搜了什么、怎么判断的、有没有遗漏。 |
| **无增量调整** | 用户看了报告说"这个方向不够，我想加 X"——只能重新跑一轮，旧的产出全部浪费。 |

### 为什么会这样

因为大多数 Deep Research 的架构是**线性管道**：`问题 → 搜索 → 综合 → 交付`。没有回路。

这个架构假设：用户一开始就知道自己想要什么。但实际研究中，用户往往是在**看到第一批结果之后**才真正理解自己需要什么。

---

## 我们的答案：HITL2 作为 Rerun Gateway

### 结构

DPT Framework 的 phase 流程里，HITL2 有一个特殊设计：

```
phase-wave2 → phase-hitl2 ──(passed)──→ phase-readiness → phase-final
                              │
                              └──(rerun)──→ phase-rerun → phase-seed-topics
                                               │
                                               └── wave0 → wave1 → wave2 → hitl2 (again)
```

这不是一个 bug fix 路径。这是**故意的回路**。

### 为什么这个设计更好

| 场景 | 一次性 Deep Research | DPT + HITL2 Rerun |
|------|-------------------|-------------------|
| Topic 选错了 | 全部重来 | rerun：保留已有 topic，加新 topic |
| 深度不够 | 重新搜 | rerun：`action: supplement`，在现有证据上加深 |
| 视角偏了 | 换方向重跑 | rerun：调整 topic intent，已有证据保留 |
| 发现了新的重要方向 | 单独再跑一个研究 | rerun：`action: add_topic`，融入同一个 bundle |
| 出口管制等外部冲击 | 研究窗口关闭 | rerun：全量 refresh，利用新的时间窗口 |

**关键差异**：一次性工具里，"不满意"的代价是抛弃所有产出。DPT 里，"不满意"触发的是**增量改进**——所有已有 evidence、reference、artifact 全部保留。

### 实际体验：aiewf-2026-community-pulse 3 轮 Rerun

| 轮次 | 时间窗口 | 变化 | 累积 |
|------|---------|------|------|
| 初始 | Fair 后 8 天 | 5 topics, ~98 sources | 基础 |
| Rerun 1 | Fair 后 8 天 | +2 deep-dive topics (06, 07) | 7 topics |
| Rerun 2 | Fair 后 13 天 | +2 topics (08 资本, 09 影响力) | 9 topics |
| Rerun 3 | Fair 后 14 天 | 全量 refresh, 增强 wave2 交叉分析 | 9 topics, ~194 sources, 26 findings |

**每一轮都在前一轮的基础上叠加，没有丢失任何已有工作。** 最终交付的 195KB final 产出是 3 轮迭代累积的结果，不是某一次"完美提问"的产物。

---

## HITL2 的五个决策如何支撑迭代

| 决策 | 干什么用 | 什么时候用 |
|------|---------|----------|
| **A: proceed_to_readiness** | 满意了，交付 | 研究达到用户期望 |
| **B: request_view_revision** | 改报告视角/格式 | 内容 OK，但呈现方式不对 |
| **C: rerun** | 增量改进方向 | 加 topic、加深、调整方向 |
| **D: repair** | 修具体问题 | 某个 artifact 格式问题 |
| **E: stop_blocked** | 终止 | 研究前提不再成立 |

C（rerun）是五个决策里**最体现设计哲学**的一个。它不是"修 bug"——它是"我觉得方向还可以更好，让我再跑一轮"。

---

## seed topic 选择的高风险 + HITL2 作为安全网

### seed topic 为什么重要

seed topic 是 `topic_registry` 里的 topic 集合——它决定了 wave0 搜什么、wave1 深化什么、wave2 综合什么。**seed topic 选错了，整个研究的方向就偏了。**

但 seed topic 选择发生在 **HITL1**——用户刚开始研究，对领域可能还不够了解。这时候做出的 topic 选择，有很高的概率在后面被证明不够好。

### HITL2 怎么兜底

HITL2 在 wave2 合成完成之后——用户已经看到了第一批完整的跨 topic 分析。这时候：

- 如果发现某个重要维度没覆盖 → C: rerun, add topic
- 如果发现某个 topic 深度不够 → C: rerun, supplement
- 如果发现新的事件改变了研究格局 → C: rerun, full refresh

**HITL2 的核心价值不是"审批通过"，而是"看了结果之后，给你一个重新调整的机会，而且不需要从头再来"。**

---

## seed topic 的生命周期风险：add 容易，remove 危险

Rerun 中 seed topic 有三种操作，风险完全不同：

| 操作 | 风险 | 框架支持 | 实际建议 |
|------|------|---------|---------|
| **add_topic** | 低——新增 topic，已有 topic 不受影响 | `operate-topic-state apply` 直接支持 | 放心用 |
| **update_intent** | 低——更新 title/must_answer/scope_role，UID 不变，已有证据保留 | 直接支持 | 放心用 |
| **remove_topic** | **高**——删掉 topic 意味着它下面的所有 evidence、reference、artifact 变成孤儿 | `mutate_layout` 有严格 guard：需要无 queue history、无 work unit history、无 artifact 残留、无其他 topic 依赖 | 几乎不该用 |

### remove 为什么危险

删一个 topic 不是删一个名字——它下面已经积累了：

- `seed_topics/{slug}.md`（决策文件）
- `artifacts/wave0/{slug}/source.yaml`（来源列表）
- `artifacts/wave1/{slug}/`（evidence-summary、question-list、depth-review）
- `reference/{slug}-*.md`（per-source reference 文件）
- `_cache/wave{0,1}/primary/{slug}/`（cache trails）
- `rb_output_declarations.jsonl` 中的 work-unit 提交记录
- 可能在 `finding-index.yaml` 中有相关 findings

框架的 `safeRemoveBlocker` 会检查这些——如果有任何历史痕迹，remove 被拒绝。这个设计是故意的：**一旦 topic 被跑过，它的证据已经融入了 bundle 的 provenance 链，删掉会破坏完整性。**

### 正确的做法：deprecate，不 delete

如果某个 seed topic 的方向不再合适，比起删掉它，更好的做法是：

1. **update_intent**：修改它的 must_answer 和 scope_role，让它覆盖你真正关心的方向
2. **add_topic**：新增一个更准确的 topic，让两个 topic 的证据互补
3. 如果原 topic 的证据完全无用（极少见），保留它作为历史记录，在 wave2 synthesis 中不给它权重

**框架的设计哲学是累进式的（cumulative）——topic 只增不减，证据只多不少。** 这也解释了为什么 `rerun_guard` 限制 rerun 次数：如果无限 rerun 允许无限 add，topic 集合会膨胀到不可管理。3 次 rerun × 每次最多加几个 topic = 研究仍然聚焦。

### 这次实操的教训

aiewf-2026-community-pulse 的 3 轮 rerun 中，我们只做了 add（+topics 06,07,08,09），没做 remove。每个新增 topic 都填补了前一轮发现的盲区。最终 9 个 topic 的集合是 3 轮迭代**有机生长**出来的，不是一次性设计出来的。

这也验证了框架的设计：**seed topic 的有机生长比一次性完美设计更可行。** HITL1 不需要把 topic 选对——HITL1 只需要选一个差不多的起点，HITL2+rerun 会把缺的补上。但前提是：只增不减，让证据累积，不要推倒重来。

---

## 这和其他 Deep Research 的本质区别

### 别人的思路

```
用户输入 → [黑盒] → 最终输出
           ↑
    你不满意？
    → 重新输入，重新跑
```

### 我们的思路

```
用户输入 → wave0 → wave1 → wave2 → HITL2 ──→ final
                                        │
                                        └── rerun → 保留所有证据 → 增量调整 → 再来一遍
```

**差异不在"多轮"——很多工具也支持追问。差异在于：我们的 rerun 是一个架构级的设计，不是 ad-hoc 的"再问一次"。** Rerun 保留了 work-unit provenance、hash chain、reference files、gate history——它是同一个 bundle 内的、可追溯的、有审计痕迹的迭代。

这也是 trace/degraded gate/bug backlog 重要的原因：**迭代过程留下了痕迹，后续的人能看清楚每一步做了什么、哪里打了补丁、哪里还有坑。**

---

## 对外的定位语（建议）

> **DPT Deep Research**：不是一次性的 Q&A 研究，而是**支持 HITL 迭代的深度研究引擎**。
> 在 HITL2 你可以审阅全部证据和 synthesis，然后决定：交付、调整、加深、还是加新方向。
> 每次调整保留所有已有工作——你的研究会越来越深，而不是推倒重来。

或者更短：

> **Iterative Deep Research, not one-shot Q&A.**
> HITL2 + rerun = you refine, evidence accumulates.

---

## 和现有框架文档的关系

这个定位目前只在 RUN.md 的 line 22 有一句话：

> "它们通用、一次性、无 gate、无证据包。`DPT_FRAMEWORK` 是本项目的 Deep Research 引擎：证据可追溯、多轮、gate 门控、产出可校验的 bundle。"

`多轮` 这个词提到了，但没有展开为什么多轮更好。`HITL2` 被描述为"审 synthesis"的 checkpoint，但没有被定位为"rerun gateway"。

如果要把这个定位融入框架：
- RUN.md line 22 可以扩展：加上 "HITL2 支持增量 rerun，不满意就再跑一轮"
- phase-hitl2.md 的 brief 可以加一行："C 选项（rerun）是本框架区别于一次性 Deep Research 的核心特性"
- README.md 可以加一段 "Why Iterative" 的说明

但这个文档的目的不是提议改框架——是**记录这次 3 轮 rerun 实操带来的认识**。改不改框架是后续治理的事。

---

## 不做的事

- **不把 rerun 变成"无限循环"的承诺**：`rerun_guard` 有限制（rerun_count < 3），这是有意的
- **不把 HITL2 变成"用户必须做很多决策"的负担**：5 个选项已足够，stop: yes 只在这里
- **不在 phase-rerun 里加搜索**：rerun 是分析层，不搜不写 reference——保持 phase 边界清晰

---

## 相关

- BUG-090, BUG-091: rerun 中暴露的 sub-agent 产出和 gate 兼容问题
- `subagent-output-contract-enforcement.md`: 从这些问题中提炼的实施计划
- `DPT_FRAMEWORK/workflows/transitions.chain.json`: HITL2→rerun→seed-topics 的 chain 编码
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md`: HITL2 phase controller
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md`: Rerun phase controller
- `DPT_FRAMEWORK/RUN.md`: 当前唯一的 competitive positioning 语句
