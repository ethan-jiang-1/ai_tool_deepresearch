## Context

当前 HITL2 `rerun` 决策后 Agent 从 seed-topics 全量重跑——没有增量语义，已有 work 全丢弃。rerun-prep 逻辑散落在 Agent 临时判断里（无单一职责 owner，无 gate 验证，无 rerun 计数追踪）。本项目 Agent/Engine 分工原则明确：Agent 管流程编排和语义判断，Engine 管 schema 校验、gate 审计和 transition 查表。

本 change 引入 `phase-rerun` node 作为 HITL2 和 seed-topics 之间的薄层，收拢 rerun-prep 职责。

## Goals / Non-Goals

**Goals:**
- 给 rerun-prep 一个单一职责 owner（`phase-rerun` node）
- Gate 验证 rerun 状态合法性（deterministic check）
- Chain 支持 `rerun → seed-topics` 正常 forward transition
- 下游 phase 通过 profile 感知 rerun 上下文，以 delta 模式运行
- Rerun 计数 + 防无限循环（maxIterations=3 硬上限）

**Non-Goals:**
- 不把不确定的 branch（`request_view_revision`、`repair`、`stop_blocked`）编码进 chain
- 不实现全量 restart（用户觉得全错了→开新 Deep Research）
- 不修改 transition-table 的 API 契约（继续用 node-keyed chain，支持多 outcome）
- gate-skeleton 变更仅限于 `gate-helpers.mjs` 新增 `writeGateAttempt()` helper——不修改 gate CLI 框架、gate definition 格式或 rule evaluation 引擎

## Decisions

### 1. Rerun node 是分析层——对比 rationale 与 seed_topics 现状，推断 topic 调整方案

**选择**: phase-rerun.md 的核心工作是**语义分析**，而非机械操作：

```
        输入                                输出
   ──────────────────────             ──────────────────────
   HITL2 rationale                    seed_topics 变更计划
   ("加经济影响分析")                  ├─ 保留: topic-A, topic-B
                                      ├─ 新增: topic-C (经济影响)
   seed_topics 现状                   ├─ 补充: topic-A 加"成本分析"
   (topic-A ✓, topic-B ✓)             └─ 调整: topic-B quick→deep
```

Agent 读 rationale（用户意图）和 seed_topics 当前状态（已有 topic 清单、各自的 depth/方向），对比推演出具体行动：
- 哪些 topic 保留不动
- 哪些 topic 需要加新维度/换方向
- 需要新增哪些 topic
- 有没有 topic 被用户否定要移除

这是 Agent 擅长的智力工作——理解语义、对比差异、推断行动。不是"薄层"机械操作。

topic 调整方案的产出形式是更新 `rb_profile.yaml`（rerun_count、rerun_feedback）和可能的 seed_topic 标记，下游 phase（seed-topics → wave0 → wave1 → wave2）读这些信号以 delta 模式运行。

**替代方案**: rerun node 只做纯机械操作（增 counter、改 status），不下游不做调整。被拒绝——浪费了 rerun node 存在的意义。如果只是改 counter，HITL2 的 Agent 自己就能做，不需要独立 node。rerun node 的价值正是这个对比分析——把用户模糊的"调整方向"翻译成可执行的具体计划。

### 2. Chain: HITL2 有两个确定性出口

**选择**: HITL2 chain entry 从单项变两项：

```json
"phases/phase-hitl2.md": {
  "passed": "phases/phase-readiness.md",
  "rerun": "phases/phase-rerun.md"
}
```

`passed` = `proceed_to_readiness`（正常交付）。`rerun` = 进 rerun node（增量重跑）。

与 `gate-fork`（`DPT_FRAMEWORK/engine/gate-fork.mjs`）共享关键属性：state 的确定性值 → 固定的 next-node 目标。但 authority 归属不同——gate-fork 由 Engine 评估 state 后自动分叉（Engine 是决策者），chain 多出口由 Agent 根据 `user_decision` 选择 outcome 字符串再查 chain（Agent 是决策者，Engine 只查表）。这不是完全同构，但 chain 模型在安全性上更优：比当前 Agent 读 `user_decision` 后手动加载 seed-topics 多了一层 `gate-rerun-ready` 的确定性验证。

另外三个 decision 不进 chain：
- `request_view_revision`：目标 phase 由 Agent 判断，不确定
- `repair`：留在 HITL2，无 transition
- `stop_blocked`：terminal，无 next

**为什么经过 seed-topics 而非直接 wave0**: 用户反馈——rerun 总要调整 seed topic（数量、深度、方向）。即使 topic 对，深度/力度调整也是 seed-topics 职责。

**为什么不违反 anti-cheating rule**: anti-cheating rule 禁止将"Agent 猜测的 branch routing"编码进 chain。但这里 `passed` 和 `rerun` 都是确定性的——`user_decision` 是用户明确的选择，不是 Agent 判断。Chain 编码的是"用户选 X → 下一步是 Y"这个机械映射。与 gate-fork 的共同点是：state 的确定性值驱动确定性路由。区别是：gate-fork 由 Engine 读 state 分叉，chain 由 Agent 读 state 选 outcome 再查表。但在「确定性映射不进 Agent 猜测范围」这个属性上两者等价。

**`phase-hitl2.md` §9 同步更新**：当前 §9 写"MUST NOT 将 branch routing 编码进 transition chain"是基于旧模型（chain 单出口）。实施时需更新措辞：chain 可编码**确定性**出口（`passed`/`rerun`），不确定 branch（`request_view_revision`/`repair`/`stop_blocked`）仍归 Agent。该 rule 的 spirit 不变——禁止 Agent 猜测进 chain，保护 deterministic authority boundary。

### 3. Agent 通过 chain 查询路由，不手动绕过 chain

**选择**: HITL2 gate pass 后，Agent 读 `user_decision`：
- 若为 `proceed_to_readiness` → 用 outcome `"passed"` 查 chain → 得到 readiness
- 若为 `rerun` → 用 outcome `"rerun"` 查 chain → 得到 rerun node
- 若为 `request_view_revision` / `repair` / `stop_blocked` → 不走 chain（目标不确定或无 transition）

所有确定性路由都经过 chain 查询——Agent 不手动加载 phase MD 绕过 chain。Chain 是唯一的 routing authority。

**替代方案（已拒绝）**: Agent 在 HITL2 gate pass 后绕过 chain，手动加载 phase-rerun.md。被拒绝——chain 沦为单出口 dumb table，Agent 和 chain 各管一半路由，边界模糊。gate-fork 已证明 chain 可以处理多分支确定性路由。

**实施注意**: `ask-next.mjs` 当前硬编码 `VALID_OUTCOMES = ['passed', 'failed']`，`rerun` 会被拒绝为 `invalid_input`（exit code 2）。实施时需扩展 `VALID_OUTCOMES` 数组包含 `'rerun'`。保留输入校验层——不采用「移除硬编码校验」的方案，该方案会让 Agent 拼错 outcome 时静默返回 `no_transition` 而非报 `invalid_input`，丢失 defensive validation。

### 4. Profile 只记 `rerun_count`。方向 hints 落在 `seed_topics/{slug}.md` 里

**选择**: `rb_profile.yaml` HITL2 只新增 `rerun_count`（integer，默认 0）。不再加 `rerun_feedback` string。

Rerun node 的分析产出（topic 调整方案）直接写入 `seed_topics/{slug}.md`——每个受影响的 topic 文件新增 `## 本轮重跑方向` section，包含：

```markdown
## 本轮重跑方向
- **action**: supplement | add | remove
- **new_search_dimensions**: "成本分析"、"就业影响"
- **adjusted_depth**: quick_factual → exploratory_map
- **search_guardrails**: 避开纯理论文献，聚焦实证研究
- **rationale_excerpt**: 来自 HITL2 rationale 的相关摘录
```

为什么不在 profile 里放 hints：profile 是全局状态。但方向指令是 **per-topic** 的——wave0 搜 topic-A 时需要知道 topic-A 的重跑方向，不是读全局 prose。`seed_topics/{slug}.md` 本来就是下游 phase 的输入文件（wave0 读它决定搜什么、wave1 读它决定深挖方向、gate 用它的 backfill 状态判断完成度），hints 放在这里是自然落点。

**替代方案**: 新增 `rerun_feedback` string 字段在 profile 里。被拒绝——prose 无法被下游 phase 机械执行。且 profile 是全局状态，方向指令是 per-topic 的，放 profile 会造成 topic 粒度的信息丢失。

### 5. Gate: 4 rules（phase stop: "no"）

| Rule | Type | Checks |
|------|------|--------|
| `rerun_rationale_present` | field_value | `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` 非空字符串 |
| `rerun_count_valid` | field_value | `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` < 3 |
| `bundle_structure_valid` | structural | `seed_topics/` 目录存在；`reference/` 目录存在 |
| `status_consistent` | field_value | `rb_status.json` 的 `current_gate` = `rerun_ready`、`next_gate` = `seed_topics_ready` |

`stop: "no"` — 不需要等用户（HITL2 已经收集了用户反馈）。

**Gate fail 行为**：与 repair 场景不同——rerun-ready gate fail 不可修（不是"内容不对"，是"路走完了"）。Agent 读到 `no_transition` 后 MUST 停止执行并向用户说明原因（上限已到、目录缺失、status 不一致等），建议用户开新 Deep Research 或接受当前结果。不强行走 chain——与所有其他 phase 一致：gate fail → 就地处理，不进 chain。

### 6. 防无限循环: maxIterations=3

复用 `subagent-relay.mjs:929` 的 `convergeRepair` 模式。`gate-rerun-ready` 的 `rerun_count_valid` rule 检查 `rerun_count < 3`。具体行为：`rerun_count = 0, 1, 2` 时 gate pass（3 轮 rerun 均可执行），`rerun_count = 3` 时 gate fail（第 4 次尝试被 gate 拦截）。用户最多可完成 3 轮完整 rerun 循环（从 HITL2 rerun → seed-topics → wave0/1/2 → 再次 HITL2）。

不做 stall detection。`convergeRepair` 的 stall detection 依赖 Engine 同步循环内跨轮状态比较，但 rerun 是异步多步骤流程（rerun node → seed-topics → ... → HITL2），跨 turn 的 state hash 比较在 Agent 侧不可靠。硬上限已足够安全——3 轮 rerun 后用户自己会发现没变化。

### 7. Audit Infrastructure: Logger 接入 + Trace 收拢

**选择**: 在 `gate-helpers.mjs` 新增 `writeGateAttempt(bundlePath, result)` 函数，统一处理每次 gate attempt 的双路写入：

1. **Logger**（`_logs/run.log`）——全量诊断日志。一切 gate attempt 都记：passed/failed、gate 名、currentNodeRef、next、inspect/advice 摘要。上线后出问题是第一手的诊断来源。
2. **Trace**（`rb_trace.jsonl`）——结构化 evidence。保持现有 `gate_attempt` event 格式，给 playbook 自动化测试裁决用。

当前 9 个 gate CLI 各自复制同一段 trace 写入代码。`writeGateAttempt()` 消除重复，新增的 `check-gate-rerun-ready.mjs` 直接调用。以 `check-gate-hitl2-recorded.mjs` 为范例先迁移，其余 gate CLI 后续渐进跟上。

Logger 之前定义但未接入（`engine/logger.mjs`，0 个 import），此次一并激活。

`writeGateAttempt()` 是消除重复的薄层包装，不是审计架构的重新设计。它不替代 `trace.mjs` 的 `createTrace()` API（playbook thin driver 仍使用它）或 `logger.mjs` 的 `createLogger()` API（其他 Engine 模块可直接使用）。它只是在 gate CLI 的特定场景下统一了两路写入——9 个 gate 共享同一份 trace/logger 写入逻辑。Logger 的「每调用一次 `writeGateAttempt` 创建一个 logger 实例」在此场景下是合理的（每个 gate CLI 进程只调一次），但不是 logger 的唯一使用方式。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 下游 phase 的 rerun-aware 指引不完整，Agent 在 rerun 时行为不稳定 | 先在 phase-seed-topics.md 加明确的 rerun-aware section；wave0/1/2 的 supplement 指引可渐进补全 |
| Rerun node 和 `request_view_revision` 的边界模糊 | `request_view_revision` = 改 view 不 restart；`rerun` = restart with delta。phase-hitl2.md 已有明确区分，rerun node 的 MD body 进一步阐明 |
| Chain 已有 `seed-topics → wave0` 但 rerun→seed-topics 形成回环 | Chain 不区分"正向"和"回环"——对 chain 来说都是 `outcome → next`。HITL2 的两个出口（`passed`/`rerun`）和 rerun node 的出口（`passed → seed-topics`）都是确定性 transition。回环语义由 Agent 和 profile（rerun_count）管理，chain 只查表 |
| Profile schema 变更可能影响现有 bundle | 新增字段全部 optional，向后兼容。旧 bundle 的 `rerun_count` 缺失 → 默认 0 |
| Gate 只验证机械条件（rationale 非空、count<3、目录存在、status 一致），不验证 phase-rerun 的核心智力产出（topic 调整方案质量、方向 hints 是否合理） | 这是 gate 设计原则的体现——gate 只做确定性检查，不做语义判断。下游 phase 的 rerun-aware section 指引 Agent 自检调整方案的合理性；playbook 实验覆盖 topic 调整方案质量场景。语义质量最终由 HITL2 人类审查兜底 |

## Open Questions

- 下游 phase（wave0/1/2）的 rerun-aware supplement 指引具体写什么？建议在 implementation 阶段读各 phase MD 内容后补充，不在 design 阶段穷举。
- rerun 中途用户改变主意（phase-rerun 执行到一半时想改为 `proceed_to_readiness`）如何处理？当前 rerun node 只有 `passed → seed-topics` 出口。若需支持中断，Agent 需在 rerun node 中覆盖 `user_decision` 并重跑 HITL2 gate——但此场景边缘，暂不纳入设计范围。
- `seed_topics/` 为空时如何处理？`bundle_structure_valid` gate rule 只检查目录存在不检查非空。若 seed_topics 被意外清空，rerun 退化为全量重跑。phase-rerun body 应指引 Agent 检查 seed_topics 是否非空并据此调整行为。
