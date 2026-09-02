# >1000 行 spec 的 capability 拆分研究（压缩版）

> 日期: 2026-09-01（压缩自同日初版） | 性质: 参照资料 | 范围: 用户划定 >1000 行三份（800–1000 行组不入 capability 研究，其 ≥190 行块走 R2 requirement 级处置）
> 样板: `spec-lean-capability-split-dwu.md`（DWU，唯一拆分案例）。

---

## 三轴复核（全局视角判定标准，2026-09-01 用户给定）

**任何 requirement（乃至任何 spec）的留否三轴**：
1. **多个 requirement**——粒度是否回到常态（≤~160 行/条），主题是否单一；
2. **落地的代码**——是否映射到真实实现面（engine 模块 / gate 定义 / CLI / phase 节点等 prompt 面）；
3. **更加清楚全局了**——它的存在是否让导航更清楚，而不是复述或遮蔽。

三轴全过 = 留；缺任一轴 = 候选噪声（复述→指针化；空转→删）。

**三轴对照实测**：

| spec | spec 行 | 落地面（实现/节点/CLI） | 轴1 粒度 | 轴2 代码映射 | 轴3 全局清晰 |
|---|---|---|---|---|---|
| research-wave-gate-implementation | 1380 | 1168 行（3 gate 定义 JSON + 6 wave 模块 + 3 gate CLI） | ✅ max 146 | ✅ 28 块全部映射到 definition/evaluator | ✅ 一个问题：wave 完成如何被判定 |
| research-wave-phase-content | 1165 | 1743 行（3 phase 节点 + evidence-extractor + 3 inspect CLI） | ⚠️ max 234（F4 已定稿 3-way，R2 执行） | ✅ body 契约映射 phase 节点；12 行复述候选待甄别 | ✅ 一个问题：wave phase 的 Agent 可读契约 |
| agentic-queue | 1059 | 2596 行（5 个 queue-manager 模块 + admission/terminal/drain + queue schema + operate-queue） | ✅ max 135 | ✅ 30 块全部映射 queue 机器 | ✅ 一个问题：queue 生命周期 |

三轴复核结论与判定一致：**三者皆留、皆不拆 capability**；唯一待清项 = RWP 的 12 行复述候选（轴 3 局部失分），已并入 R2。

---



## 判别式（四份研究共有的结论）

**拆 capability ⟺ capability 内含 ≥2 个互不重叠的任务问题**（不同 agent 在不同时刻分别消费，且各自可独立评审）。

- DWU ✅ 拆：标识/briefing ‖ 完成记录 ‖ 无副作用预测 ‖ 纠正——四个问题、四组消费时刻、engine 模块缝一一对应。
- 三个 >1000 ✗ 不拆：体积全部来自**单一任务问题的并行实例或组成面**，拆开只会把一次查询变成 N 次。

**体量分解式**（复核用）：`spec 体积 = 声明广度 × 契约密度 + 复述噪声`。声明广度是 catalog 认可的（Purpose 逐字覆盖）；契约密度是仓库的刻意严格；**只有复述噪声是可清理项**。

---

## 三份判定（每份一段）

**research-wave-gate-implementation（1380 行，28 块，max 146）——不拆。**
三个 wave = 同一 gate 判定模式的三实例；复述噪声 0（grep 生成/prompt 类关键词零命中）→ 体积 = 声明广度 × 契约密度，无可清理项。拆则产出三个同构 capability，违背发现经济。C3c 已完成结构治理。

**research/research-wave-phase-content（1165 行，22 块，max 234）——不拆，但 R2 带一件活。**
三个 phase 节点的共同 body 契约权威；拆 = 与 workflows/nodes 的 per-wave 组织 1:1 镜像，且 batch-poll-submit / receipt-bound 路由等共享模式变三处复述。**复述噪声 12 行命中**（generated task / task.md 类）——R2 执行 234 行块 3-way 分割（F4 深挖已定稿）时一并甄别：真复述 → 指向 phase 节点；normative → 保留。

**agent/agentic-queue（1059 行，30 块，max 135）——不拆。**
一台 queue 机器的完整生命周期（schema / 四个 producer rule 实例 / claim-complete / repair / stop）；复述噪声 1 行。引用网三者最宽（20 文件）——拆分把最宽的网撕成四份。C3d 已完成结构治理。

---

## 重开触发条件（登记）

| spec | 触发 |
|---|---|
| research-wave-gate-implementation | 某 wave 的 gate 模式与其他 wave 实质分叉（共享规则骨架消失） |
| research-wave-phase-content | per-wave body 契约分叉到共享模式消失 |
| agentic-queue | queue v3 引入全新机器面（持久化调度器、跨 bundle 队列等） |

## 处置去向（并入既有批次）

- RWP 234 行块 3-way 分割 → R2（设计见 [`spec-lean-f4-megablock-deepdive.md`](spec-lean-f4-megablock-deepdive.md)）
- RWP 12 行复述候选 → R2 指针化甄别（同批）
- DWU → R1 capability 迁移（设计见 [`spec-lean-capability-split-dwu.md`](spec-lean-capability-split-dwu.md)）
- 800–1000 行组（return-map 989 / CTS 903 / gate-skeleton 899 / reference-flat-format 853 / CDP 843）→ 不入 capability 研究；其中 CDP 257 行块 3-way 分割已定稿（R2），其余巨无霸已由 C3 清零
