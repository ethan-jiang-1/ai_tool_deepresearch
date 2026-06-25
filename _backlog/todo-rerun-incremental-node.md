# TODO: rerun-incremental-node

> 状态: 设计定调，准备 propose | 优先级: 中→高（当前优先） | 创建: 2026-06-24 | 更新: 2026-06-25
>
> 阻塞条件: ✅ §4（chain 关系）和 §2（增量语义边界）已解（2026-06-25 讨论）

## Why

HITL2 `user_decision: rerun` 现在是"Agent 读 profile，自己从 seed-topics 全量重跑"。这条路径有两个问题：

1. **没有"增量"语义**——rerun 现在等于从 seed-topics 全量重做，不保留 wave0 reference、不区分"只重跑受影响的 wave"。用户调整方向后往往只想改一部分，而不是把三波全推翻。
2. **rerun-prep 逻辑散落**——"该更新什么、该作废什么、回到哪个 wave"现在是 Agent 临时判断，没有单一归属。违反 SOLID（没有单一职责 owner）和 SSOT（rerun 到底动哪些 state 没有一处定义）。

## 架构（2026-06-25 讨论定调）

```
                        manifest.json (inventory — 所有 phase 注册)
    ┌──────────────────────────────────────────────────────────────────┐
    │ instantiation → hitl1 → setup → seed-topics → wave0 → wave1 →   │
    │ wave2 → hitl2 → [rerun] → readiness → final                     │
    │                   ↑                                             │
    │            不在正常 forward path，但是 manifest 的一员             │
    └──────────────────────────────────────────────────────────────────┘

                        transitions.chain.json
    ┌──────────────────────────────────────────────────────────────────┐
    │ ... existing entries unchanged ...                               │
    │ "phase-hitl2.md":     { "passed": "phase-readiness.md" }   ← 不变 │
    │ "phase-rerun.md":     { "passed": "phase-seed-topics.md" } ← 新增 │
    │ ... readiness/final unchanged ...                                │
    └──────────────────────────────────────────────────────────────────┘

                        Agent 路由（不进 chain）
    ┌──────────────────────────────────────────────────────────────────┐
    │ hitl2 gate pass → 读 user_decision                               │
    │   ├── proceed_to_readiness → chain: hitl2 → readiness            │
    │   ├── request_view_revision → Agent 选 phase，改 view（不 restart）│
    │   ├── repair → Agent 修，rerun hitl2 gate                        │
    │   ├── rerun → Agent 进 phase-rerun → chain: rerun → seed-topics  │
    │   │                                        → wave0 → wave1 →     │
    │   │                                        wave2 → hitl2          │
    │   └── stop_blocked → 终止                                        │
    └──────────────────────────────────────────────────────────────────┘

                        phase-rerun.md（薄层）
    ┌──────────────────────────────────────────────────────────────────┐
    │ 输入: rb_profile.yaml (user_decision=rerun, rationale)            │
    │                                ㇑                                │
    │ Agent:                                                           │
    │   1. 读 rationale → 理解 rerun 目标                               │
    │   2. 更新 profile: rerun_count++, 记录 rerun_feedback             │
    │   3. 更新 rb_status.json（current_gate 等）                       │
    │   4. 可选: 标记哪些 topic/artifact 受 rerun 影响（给下游 phase 用） │
    │                                ㇑                                │
    │ Gate (rerun-ready):                                              │
    │   - rationale 非空                                               │
    │   - rerun_count < max (3)                                        │
    │   - bundle 结构合法                                               │
    │   - status 一致                                                  │
    │                                ㇑                                │
    │ 输出: bundle 处于"可从 seed-topics 增量重跑"的状态                  │
    │       chain 接管: rerun → seed-topics → wave0 → wave1 → wave2     │
    └──────────────────────────────────────────────────────────────────┘

                        下游 phase 的 rerun 感知（通过 profile）
    ┌──────────────────────────────────────────────────────────────────┐
    │ seed-topics:                                                     │
    │   读到 rerun_count > 0 → 调整 topic（非从零发现）                   │
    │   - 保留原有 topic，按 rationale 调整深度/方向                      │
    │   - 添加新 topic（如果 rationale 要求）                            │
    │   - 移除被否定 topic（如果 rationale 明确排除）                     │
    │                                                                  │
    │ wave0:                                                           │
    │   读调整后的 topic 集合 → 已有 reference 保留，只搜索新增/变更部分    │
    │                                                                  │
    │ wave1:                                                           │
    │   读调整后的 topic + 增量 reference → 补充 deepening，不重做已有     │
    │                                                                  │
    │ wave2:                                                           │
    │   读增量 findings → 补充 synthesis，merge 而非 replace              │
    └──────────────────────────────────────────────────────────────────┘
```

**关键洞察**：rerun node 是薄层——它不集中决策"保留/清除什么"。那条逻辑分布在各个 phase 的 rerun-aware 行为里，通过 `rb_profile.yaml` 中的 `rerun_count`、`rerun_feedback`、`rationale` 传递上下文。如果用户觉得全错了→开新的 Deep Research，不在这里死磕。

## 关键设计问题（2026-06-25 讨论已解）

### §2: 增量语义边界 ✅ RESOLVED

**决定：Agent 自主判断，delta/incremental 补充模式。各 phase 通过读 profile 中的 rerun 上下文自然以"补充"模式运行。**

核心哲学：
- Rerun = delta，增量补充。不是全量重做。
- 默认保留已有的 reference/ 和 artifacts/，Agent 在 rationale 指导下判断哪些需要补充、哪些需要作废。
- 每个 phase（seed-topics, wave0, wave1, wave2）通过读 `rb_profile.yaml` 中的 `rerun_count`、`rerun_feedback` 感知这是 rerun，自然地以 supplement（而非 replace）模式运行。
- **rerun node 本身是薄层**——只做 profile 更新和上下文设置。真正的"增量"行为分布在 seed-topics（调整 topic）、wave0（补充 references）、wave1（补充 deepening）、wave2（补充 synthesis）各层。
- **如果全错了，用户开新的 Deep Research**。不要在这里死磕。Rerun 不承载"全量 restart"的语义。

### §4: chain 关系 ✅ RESOLVED

**决定：`rerun → passed → seed-topics`（走 B，经过 seed-topics）。**

理由（用户反馈）：
- Rerun 总是要调整 seed topic（数量、深度、方向），seed-topics 是重新锚定的自然位置。
- 即使 topic 本身对，用户可能想调整深度/力度——这也是 seed-topics 的职责。
- Rerun node 的 `passed → seed-topics` 是它自己的 normal forward edge，**不违反 anti-cheating rule**——anti-cheating rule 禁止的是在 HITL2 的 chain entry 里编码 `rerun` 分支。Rerun node 作为独立 node，它的 forward transition 是正常 chain 语义。

HITL2 的 chain entry **不变**：`phase-hitl2.md → passed → phase-readiness.md`（只有一条 `passed` 边）。
Agent 在 HITL2 gate pass 后读到 `user_decision: rerun` → 路由进 phase-rerun.md（Agent 层路由，不进 chain）→ rerun gate pass → chain 接管：`rerun → seed-topics → wave0 → wave1 → wave2 → hitl2`。

### §1: rerun 目标怎么表达 ✅ RESOLVED

**决定：先复用 `rationale`，不新增结构化字段。**

- `rationale` 已是自由文本，Agent 在 rerun node 和各 phase 中读取它来理解 rerun 目标。
- 不新增 `rerun_target` 结构化字段——避免过度设计。如果后续发现 Agent 提取不稳定，再考虑。
- 新增的 profile 字段仅限于机械追踪：`rerun_count`（计数）、`rerun_feedback`（可选，Agent 从 rationale 提炼的结构化摘要）。

### §3: rerun node 的 gate ✅ RESOLVED

**决定：有 gate，确定性检查。`stop: "no"`（不等用户，用户已在 HITL2 给了反馈）。**

Gate rule set：
| Rule | Type | What |
|------|------|------|
| `rerun_rationale_present` | field_value | `hitl2.rationale` 非空 |
| `rerun_count_valid` | field_value | `rerun_count < max_reruns`（默认 3） |
| `bundle_structure_valid` | structural | wave0/seed-topics 需要的目录和文件存在 |
| `status_consistent` | field_value | `rb_status.json` 反映 rerun 状态 |

### §5: 多轮 rerun ✅ RESOLVED

**决定：复用 `convergeRepair` 模式。**
- `maxIterations=3`
- Stall detection: `serializeState()` → JSON.stringify → Set.has()
- 3 轮后 → 正常 chain 走到 HITL2，用户可以选择 `stop_blocked` 或其他 decision
- 新增 profile 字段：`hitl2.rerun_count`（integer，默认 0，每次 rerun +1）

## Prior Art（已验证，更新于 2026-06-25）

- ✅ **rerun 不进 chain 的定调**：`_backlog/_trainsistion/review_and_suggestion.md` 统一 API 建议中明确了 chain 不应编码分支决策的总原则——transition memo 当时明确警告过"别为了填表硬造 branch"。该文件的核心论点是 `currentNodeRef + outcome -> nextNodeRef`，chain 只承载 `passed` 边。
  - ⚠️ `_backlog/_trainsistion/cc_transition_systemic_analysis.md` 和 `cx_transition_boundary_review.md` **不讨论 HITL2 rerun**，仅作为 transition 层背景参考（之前版本错误引用了它们）。
- ✅ **rerun 实验验证**：`experiments_playbook/exp_wff_delivery/case-133-standard-hitl2-rerun.md`——证明 gate pass + chain 照常给正常 next（passed → readiness），rerun 由 Agent 层路由（chain 不参与）。rerun node 引入后这个实验的语义要更新。
- ✅ **HITL2 5 个 decision + enum**：`DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md`（line 46-52）定义 5 个 `user_decision`（proceed_to_readiness / request_view_revision / repair / rerun / stop_blocked），`DPT_FRAMEWORK/schema/gate_definitions/gate-hitl2-recorded.definition.json` 验证这 5 个 enum 值。
- ✅ **`request_view_revision` 已完整实现**：defined in `DPT_FRAMEWORK/schema/enums.mjs:56`（`HITL2UserDecision` enum）和 `phase-hitl2.md` §6（"Agent 读取 rationale，决定回到哪个 phase 修改 view，不 restart"）。它与 rerun 的语义不同——`request_view_revision` 回到某个 phase 但不 restart，rerun 是 restart 但保留部分 state。rerun node 的设计需要阐明 vs `request_view_revision` 的边界。
- ✅ **"增量"的现成 primitive**：`_backlog/todo-explore-exploit.md` 的 `deltaStats(waveN, waveN+1)` 是 wave 间增量趋势判断——概念相邻，可借鉴"增量"如何被计算和表达（但那是 explore/exploit track，不是 HITL2 rerun，别混）。
- ✅ **防止无限循环的现成模式**：`subagent-relay.mjs:929` 的 `convergeRepair` 用了 `maxIterations=3` + stall detection（`serializeState()` → JSON stringify → Set 查重）。`shared-repair-guidance.md:29` 也确认了 3 次 retry limit。rerun 可以直接套用此模式（回答设计问题 5）。

## 下一步

1. ~~`/opsx:explore rerun-incremental-node`~~ ✅ 已完成（2026-06-25 讨论，5 个设计问题全解）
2. `/opsx:propose rerun-incremental-node` — 出 proposal + design + specs + tasks
3. 实施：
   - **新增 `phase-rerun.md`** — phase node（薄层：读 rationale、更新 profile、设 rerun 上下文）
   - **新增 gate definition + CLI** — `gate-rerun-ready`（4 rules: rationale 非空、rerun_count < max、bundle 结构合法、status 一致）
   - **`manifest.json`** — 加 rerun phase 条目
   - **`transitions.chain.json`** — 加 `phase-rerun.md → passed → phase-seed-topics.md`
   - **`phase-hitl2.md`** §6 — `rerun` 行为从"Agent 从 seed-topics 重新跑"改为"Agent 进入 phase-rerun.md"
   - **`shared-profile.md`** — 文档化新字段：`rerun_count`、`rerun_feedback`
   - **`enums.mjs`** — 可能新增 `RerunScope` enum（如果需要）
   - **各 wave phase MD** — 加 rerun-aware 行为指引（读 `rerun_count > 0` → supplement 模式）
   - **不更新 `transitions.chain.json` 的 hitl2 entry**（服从 anti-cheating rule）
4. 回归测试：`tests/engine/` 下新增 transition chain 测试（验证 rerun → seed-topics edge）
5. Playbook 实验：更新 `case-133-standard-hitl2-rerun.md` 语义 or 新增 case 验证 rerun node 行为
