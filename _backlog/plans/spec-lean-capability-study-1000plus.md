# >1000 行 spec 的 capability 拆分研究（三份合一）

> 日期: 2026-09-01 | 性质: 参照资料（按 `spec-lean-capability-split-dwu.md` 样板逐 spec 研究）
> 范围: 用户划定的 >1000 行 spec 三个（800–1000 行组按用户指示"别贪心"不入 capability 拆分研究；其中的 ≥190 行块仍按 F4 深挖在 R2 以 requirement 级处置）。
> 结论先行: **三个都不做 capability 级拆分**——它们的体量来自"并行实例的固有广度"（三个 wave / 整台 queue 机器），不是 DWU 那种"多个生命周期问题挤在一个 capability"。巨无霸已在 C3b/C3c/C3d 清零，最大块均 ≤160。

---

## 研究 1: research/research-wave-gate-implementation（1380 行）

| 维度 | 事实 |
|---|---|
| requirement 块 | 28（header 21 IDs，无内联行惯例） |
| 最大块 | 146 / 133 / 132（C3c 拆分后，全部 ≤160 ✓） |
| 引用网 | 5 个外部文件 |
| catalog Purpose | "Deterministic gate rules for wave0, wave1, and wave2 completion." |
| 任务问题 | **一个**：wave0/1/2 完成如何被确定性 gate 判定——三个 wave 是同一判定模式的三实例 |
| engine 缝 | schema/gate_definitions/*.json、wave-contract-evaluators、wave0/1-reference-convergence、gate-helpers-* |

**判定: 不拆。** 按 wave 拆会产出三个同构 capability（gate-wave0/gate-wave1/gate-wave2），违背发现经济（做 wave gate 的 agent 需要同族规则，拆后要读三处）；catalog Purpose 精确覆盖现内容；巨无霸已清零。结构治理已由 C3c 完成（3 巨无霸→7）。
**重开触发条件**: 若未来某 wave 的 gate 模式与其他 wave 实质分叉（不再共享规则骨架），再议。

---

## 研究 2: research/research-wave-phase-content（1165 行）

| 维度 | 事实 |
|---|---|
| requirement 块 | 22（header 21 IDs，1 内联行） |
| 最大块 | 234 / 176 / 115（234 = Wave1 body completeness 残留，**F4 深挖已定稿 3-way 分割设计**，归 R2 执行） |
| 引用网 | 3 个外部文件 |
| catalog Purpose | "Complete Agent-readable bodies for the wave0, wave1, and wave2 phase nodes." |
| 任务问题 | **一个**：wave0/1/2 phase 节点的 Agent 可读 body 契约——phase 节点本身就是三个文件，本 spec 是它们的共同契约权威 |
| owner 对应 | `workflows/nodes/phases/phase-wave{0,1,2}.md`（指针化/引用的天然目标） |

**判定: 不拆。** 按 wave 拆 = 3 个 per-wave capability 与 3 个 per-wave phase 节点 1:1 镜像——capability 层重复 workflows/nodes 的既有组织，且 wave 间共享的契约模式（batch-poll-submit 循环、receipt-bound 路由）会变成三处复述。体量的固有部分 = 三个 phase 的 body 契约；吸积部分（234 行块）已在 F4 深挖定稿处置。
**重开触发条件**: 若 per-wave body 契约实质分叉到共享模式消失（目前 batch-poll-submit、receipt-bound 路由、anti-cheating 结构三族共享模式稳固），再议。

---

## 研究 3: agent/agentic-queue（1059 行）

| 维度 | 事实 |
|---|---|
| requirement 块 | 30（header 28 IDs，C3d 后；1 内联行） |
| 最大块 | 135 / 120 / 90（C3d 拆分后，全部 ≤160 ✓） |
| 引用网 | **20 个外部文件**（三者中最宽——queue 是被引用最多的机器面） |
| catalog Purpose | "Structured queue state, task-card production, claim, completion, and refill behavior." |
| 任务问题 | **一个**：queue 机器的完整生命周期——schema、四个 producer rule（实例）、claim/complete、repair、stop authorization |
| engine 缝 | queue-manager-core/lifecycle/window/render、queue-demand-admission、queue-terminal-failure、phase-queue-drain |

**判定: 不拆。** producer rules 是同一 queue 机器的四个实例（同一 schema、同一 claim/complete/repair 面）；按 producer 拆会把**最宽的引用网（20 文件）**撕成四份，且 queue 机器的"只增不删"式生命周期语义（active_window/terminal_history/StopAuthorizationState）跨 producer 共享。结构治理已由 C3d 完成（295 行 producer 巨无霸→3）。
**重开触发条件**: 若 queue v3 引入全新的机器面（如持久化调度器、跨 bundle 队列），使"queue 生命周期"不再是单一任务问题时，再议。

---

## 汇总与遗留

| spec | 行数 | 拆分判定 | 实际处置去向 |
|---|---|---|---|
| research-wave-gate-implementation | 1380 | 不拆（三 wave = 同模式三实例） | 无遗留（C3c 已完成结构治理） |
| research-wave-phase-content | 1165 | 不拆（三 phase 节点的共同契约权威） | 234 行块 3-way 分割 → R2（F4 深挖已定稿） |
| agentic-queue | 1059 | 不拆（一台 queue 机器的完整生命周期） | 无遗留（C3d 已完成结构治理） |

三条重开触发条件已登记；800–1000 行组不入 capability 拆分研究（用户指示），其中 content-delivery-phase-content 的 257 行块已由 F4 深挖定稿 3-way 分割（R2 执行）。
