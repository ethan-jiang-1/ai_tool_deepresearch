# TODO: rerun-incremental-node

> 状态: 待设计 | 优先级: 中 | 创建: 2026-06-24

## Why

HITL2 `user_decision: rerun` 现在是"Agent 读 profile，自己从 seed-topics 全量重跑"。这条路径有两个问题：

1. **没有"增量"语义**——rerun 现在等于从 seed-topics 全量重做，不保留 wave0 reference、不区分"只重跑受影响的 wave"。用户调整方向后往往只想改一部分，而不是把三波全推翻。
2. **rerun-prep 逻辑散落**——"该更新什么、该作废什么、回到哪个 wave"现在是 Agent 临时判断，没有单一归属。违反 SOLID（没有单一职责 owner）和 SSOT（rerun 到底动哪些 state 没有一处定义）。

## Idea：一个专职的 rerun Node

HITL2 决定 `rerun` 后，**先进一个新 node（暂称 `phase-rerun` / rerun-orchestrator）**，再回到 wave 链。

这个 node 的**单一职责**：把"rerun decision + 用户反馈"翻译成对 bundle state 的具体调整（更新什么、保留什么、作废什么），然后把控制权交回 `wave0`，按 `wave0 → wave1 → wave2` 一路**增量**跑下来。

```
HITL2 (user_decision: rerun)
        │
        ▼
  phase-rerun node   ← 单一职责：rerun-prep
   • 读 rerun 反馈 + rationale
   • 决定更新什么（profile / plan / 哪些 topic）
   • 决定保留什么 / 作废什么（增量语义的源头）
   • 把 bundle 调整到"可从 wave0 增量重跑"的状态
        │
        ▼
   wave0 → wave1 → wave2 → ...（增量重跑）
```

**为什么是 node 而不是 Agent 临时判断：**
- **SOLID**：rerun-prep 有单一 owner，不和 wave0 的 source intake、wave1 的 deepening 职责混在一起。
- **SSOT**：一个 node 定义"rerun 到底动哪些 state"，而不是散在 `phase-hitl2.md` 的 prose + Agent 脑补 + 各 wave 的隐式假设里。
- **可测**：node 可挂自己的 gate（deterministic check：rerun 调整是否合法、是否真的进入了增量态），而不是黑盒 Agent 决策。
- **逻辑干净**：HITL2 只管"记录用户 decision"，rerun node 管"把 decision 落成可执行的增量重跑准备"，wave 链管"重跑"。三者分离。

## 关键设计问题（parked，待 `opsx:explore` 再解）

1. **rerun 目标怎么表达**——rerun node 从哪读"回到 wave0 / 哪些 topic 要改"？新增 profile 字段（如 `hitl2.rerun_target` / `rerun_feedback`），还是复用 `rationale`？
2. **增量语义的边界**——"增量"具体保留什么？候选：保留 wave0 reference、只重跑 wave1/2；或按 topic 粒度保留；或清空 seed topic 的 backfill token 让各 wave 重填。**这是整个 idea 的核心未决点。**
3. **rerun node 的 gate 检查什么**——它是 deterministic check（"调整后 bundle 合法、确实进入增量态"）还是只做 state mutation？它自己有没有 `stop`？
4. **和 chain 的关系（必须先回答）**——chain 至今**刻意不编码 rerun 分支**（见下方 Prior Art）：rerun 是 Agent-level authority。引入 rerun node 是否意味着要加一条显式 rerun edge？还是 rerun node 仍由 Agent 层路由进入、chain 保持只编码 `passed`？transition memo 当时明确警告过"别为了填表硬造 branch"，这点要想清楚再动 chain。
5. **多轮 rerun / rerun 计数**——rerun 不是一次性的，要不要追踪 rerun 次数、防止无限 rerun 循环（类比 repair 的 3 次 retry limit）？

## Prior Art（已存在，别重复造）

- **rerun 不进 chain 的定调**：`_backlog/_trainsistion/review_and_suggestion.md`（+ `cx_transition_boundary_review.md`、`cc_transition_systemic_analysis.md`）。rerun node 的设计必须先回答它和这条定调的关系（见 §4）。
- **rerun 边界测试**：`experiments_playbook/exp_workflow-foundation/test-simple-hitl2-rerun-branch.md`——证明 gate pass + chain 照常给正常 next，rerun 是 Agent 路由。rerun node 引入后这个测试的语义要更新。
- **HITL2 5 个 decision + enum**：`DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md` + `schema/gate_definitions/gate-hitl2-recorded.definition.json`。其中 `request_view_revision`（回到某 phase、不 restart）语义上最接近，rerun node 要厘清和它的边界。
- **"增量"的现成 primitive**：`_backlog/todo-prototype-explore-exploit.md` 的 `deltaStats(waveN, waveN+1)` 是 wave 间增量趋势判断——概念相邻，可借鉴"增量"如何被计算和表达（但那是 explore/exploit track，不是 HITL2 rerun，别混）。

## 下一步

1. `/opsx:explore rerun-incremental-node` — 先解 §4（chain 关系）和 §2（增量语义边界），这两个定了才写得动 proposal
2. `/opsx:propose rerun-incremental-node` — 出 design + specs + tasks
3. 按决定更新 `manifest.json` / `transitions.chain.json`（如决定加 rerun edge）+ `phase-rerun.md` node + gate definition
