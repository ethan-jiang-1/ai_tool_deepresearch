# TODO: rerun-incremental-node

> 状态: 待设计 | 优先级: 中 | 创建: 2026-06-24 | 更新: 2026-06-25
>
> 阻塞条件: 设计问题 §4（chain 关系）和 §2（增量语义边界）必须先解

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
4. **和 chain 的关系（必须先回答）**——chain 至今**刻意不编码 rerun 分支**（见下方 Prior Art）：rerun 是 Agent-level authority。引入 rerun node 是否意味着要加一条显式 rerun edge？还是 rerun node 仍由 Agent 层路由进入、chain 保持只编码 `passed`？

   **关键约束**：`phase-hitl2.md` §9 Anti-Cheating Rules（line 106）明确写 **"MUST NOT 将 branch routing 编码进 transition chain"**（只有 `proceed_to_readiness` 是 chain 的 normal next，其余 decision 归 Agent）。这个规则直接约束任何向 chain 加 rerun edge 的设计。

   **建议方向**：rerun node 不加 chain edge。Agent 在 HITL2 读到 `rerun` decision 后路由进 rerun node（不通过 chain），rerun node 完成后 chain 照常路由到 wave0。`phase-hitl2.md:77-83` 的当前行为（"Agent 从 phase-seed-topics.md 重新跑"）改为 "Agent 进入 phase-rerun.md"。

5. **多轮 rerun / rerun 计数**——rerun 不是一次性的，要不要追踪 rerun 次数、防止无限 rerun 循环？

   **可参考**：`subagent-relay.mjs:929` 的 `convergeRepair` 已有 `maxIterations=3` + stall detection by state hash comparison。rerun 可以用相同模式：限制 N 轮 rerun，连续 rerun 无变化 → escalate 到 HITL2。

## Prior Art（已验证，更新于 2026-06-25）

- ✅ **rerun 不进 chain 的定调**：`_backlog/_trainsistion/review_and_suggestion.md` 统一 API 建议中明确了 chain 不应编码分支决策的总原则——transition memo 当时明确警告过"别为了填表硬造 branch"。该文件的核心论点是 `currentNodeRef + outcome -> nextNodeRef`，chain 只承载 `passed` 边。
  - ⚠️ `_backlog/_trainsistion/cc_transition_systemic_analysis.md` 和 `cx_transition_boundary_review.md` **不讨论 HITL2 rerun**，仅作为 transition 层背景参考（之前版本错误引用了它们）。
- ✅ **rerun 实验验证**：`experiments_playbook/exp_wff_delivery/case-133-standard-hitl2-rerun.md`——证明 gate pass + chain 照常给正常 next（passed → readiness），rerun 由 Agent 层路由（chain 不参与）。rerun node 引入后这个实验的语义要更新。
- ✅ **HITL2 5 个 decision + enum**：`DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md`（line 46-52）定义 5 个 `user_decision`（proceed_to_readiness / request_view_revision / repair / rerun / stop_blocked），`DPT_FRAMEWORK/schema/gate_definitions/gate-hitl2-recorded.definition.json` 验证这 5 个 enum 值。
- ✅ **`request_view_revision` 已完整实现**：defined in `DPT_FRAMEWORK/schema/enums.mjs:56`（`HITL2UserDecision` enum）和 `phase-hitl2.md` §6（"Agent 读取 rationale，决定回到哪个 phase 修改 view，不 restart"）。它与 rerun 的语义不同——`request_view_revision` 回到某个 phase 但不 restart，rerun 是 restart 但保留部分 state。rerun node 的设计需要阐明 vs `request_view_revision` 的边界。
- ✅ **"增量"的现成 primitive**：`_backlog/todo-explore-exploit.md` 的 `deltaStats(waveN, waveN+1)` 是 wave 间增量趋势判断——概念相邻，可借鉴"增量"如何被计算和表达（但那是 explore/exploit track，不是 HITL2 rerun，别混）。
- ✅ **防止无限循环的现成模式**：`subagent-relay.mjs:929` 的 `convergeRepair` 用了 `maxIterations=3` + stall detection（`serializeState()` → JSON stringify → Set 查重）。`shared-repair-guidance.md:29` 也确认了 3 次 retry limit。rerun 可以直接套用此模式（回答设计问题 5）。

## 下一步

1. `/opsx:explore rerun-incremental-node` — 先解 §4（chain 关系——建议方向：Agent 路由，不加 chain edge）和 §2（增量语义边界），这两个定了才写得动 proposal
2. `/opsx:propose rerun-incremental-node` — 出 design + specs + tasks
3. 按决定更新：
   - `phase-hitl2.md`（§6 "rerun" 行为改为 "Agent 进入 phase-rerun.md"）
   - 新增 `phase-rerun.md` node + gate definition
   - 可能更新 `manifest.json`（加 phase-rerun 条目）
   - **不更新 `transitions.chain.json`**（不加 rerun edge，服从 anti-cheating rule）
