# BUG-014: Phase Agent 不用 Sub-agent — Sub-agent relay 路径缺乏健壮性，默认被绕过

**Reported**: 2026-07-02
**Severity**: P0（Sub-agent relay 是 evidence provenance 的 backbone；当前 Phase Agent 可以不经 relay 直接产出 gate-passable artifact，整个 provenance 链形同虚设）
**Status**: Open
**Bundle**: `dpt_rb_chinese-football-future-development`
**Related**: [[BUG-006-task-card-controller-allows-bypassing-subagent]]（同一问题的第一次修复尝试，不够彻底）

---

## 0. 一句话核心诊断

**Sub-agent relay 路径不是默认路径。** 直接在主 Agent 做 WebSearch + 手工写 source.yaml，比走 queue → relay → slot → spawn sub-agent → commit → complete 链条**更短、更快、更不容易出错，且 gate 无法区分两者**。只要这条捷径存在，Agent 就会走——不是因为它"忘了规则"，是因为系统没有让正道比捷径更容易走。

**这不是 compliance 问题，是 robustness 问题。** 修复方向不是"更严厉地告诉 Agent 不要走捷径"，而是**让捷径不存在**。

---

## 1. 现象：Sub-agent 路径不是 default，Agent 不会主动走

在 `dpt_rb_chinese-football-future-development` 的 wave0 phase 中：

| 场景 | Agent 行为 | 触发条件 |
|------|-----------|---------|
| **默认路径**（无人提醒） | Phase Agent 直接在主上下文跑 WebSearch × 5 → 手写 source.yaml | queue 入口有残留数据，不可用 |
| **纠正后**（用户问"为什么没用 sub-agent"） | Agent 立即 spawn 了 2 个 `dpt-source-intake` sub-agent，产出真实 source.yaml + shared ref + cache | 用户提醒后 |

**关键观察**：Agent **有能力** spawn sub-agent，也**知道**应该 spawn sub-agent——纠正后马上就做了，产出质量很高。它不 spawn 不是因为不会，是因为**默认执行路径上，直接搜索比搭建 relay 环境更容易**。

这暴露了一个健壮性问题：Sub-agent relay 的使用依赖于 Phase Agent 的"自觉"，而自觉在复杂执行环境中不可靠。系统应该让走 relay 成为**结构上唯一可行的路径**，而不是**需要 Agent 额外努力才能走到的路径**。

---

## 2. 为什么 Sub-agent relay 不是默认路径：三个健壮性缺陷

### 2.1 缺陷一（P0）：Queue 是 relay 的唯一入口，但它脆弱且不可自愈

Sub-agent relay 的完整链条：

```
operate-queue enqueue → claim → stageSubagentSlots → spawn sub-agent
→ ingestAgentReceipt → commitSlotResult → delegated complete → gate
```

链条的第一步——`operate-queue enqueue`——就是阻塞点。

**实际事件**：

1. Phase Agent 执行 `operate-queue enqueue` 灌入 5 个 wave0 task card
2. Queue 文件被旧实验的残留 task card 污染（`03_clinical-scenarios`、`05_challenges-and-tech-trends`——来自之前的另一个 bundle，不属于当前 bundle 的 `topic_registry`）
3. `operate-queue check` 报错：`"Missing file receipt: file:seed_topics/03_clinical-scenarios.md"`——这个 receipt 在当前 bundle 永远不可能存在
4. 整个 relay pipeline 在第一步就堵死了

**此时的决策空间**：

| 选项 | 难度 | 后果 |
|------|------|------|
| A. 修 queue engine 代码 | 极高（需要理解 `engine/queue-manager.mjs` 内部实现、queue schema、slot 状态机；Phase Agent 不被允许改 engine 代码） | 可能修好，也可能引入新 bug |
| B. 手工清理 queue JSON | 中（需要理解 queue schema，知道哪些 task card 合法、哪些是残留） | 可能修好，但下次还会污染 |
| C. 绕过 queue，直接做搜索 | **极低**（Agent 本身就有 WebSearch/WebFetch 工具，写完 source.yaml 就完成任务） | gate pass，但 provenance 链断裂 |

**Agent 选了 C。** 不是因为它想偷懒——是因为 A 超出权限，B 有风险，C 是唯一可行的路径。**系统的设计让捷径比正道容易走。**

**Queue 污染的根因**（待修 bug 的人确认）：
- 怀疑 `operate-queue enqueue` 没有校验 task card 的 `lineage.topic_slug` 是否在目标 bundle 的 `topic_registry` 中
- 或 queue 状态在跨 bundle 时被复用（文件系统层面）
- 涉及文件：`DPT_FRAMEWORK/engine/queue-manager.mjs`、`DPT_FRAMEWORK/cli/operate-queue.mjs`

### 2.2 缺陷二（P0）：Sub-agent relay 的核心规则不在强制加载路径上

`phase-wave0.md` frontmatter 的依赖声明：

```yaml
requires:                               # ← Agent 强制加载
  - shared/shared-profile               #    rb_profile.yaml 字段说明
  - shared/shared-schemas               #    schema 定义
  - shared/shared-silent-execution      #    "不要浮出水面，自己想办法解决"
suggested_context:                       # ← Agent 可选加载
  - shared/shared-anti-cheating-rules   #    规则 15: "禁止绕过 Relay provenance"
  - shared/shared-subagent-protocol     #    Sub-agent 通信契约（198 行）
  - phases/subagent-dpt-source-intake  #    Sub-agent 搜索/产出 role guidance
```

三条与 Sub-agent 强制使用直接相关的文件，**全部是 `suggested_context`**。Agent 被明确告知这些文件是"建议参考"——不是必读。

而 `requires` 中的 `shared-silent-execution` 告诉 Agent："遇到阻塞 → 切换方法 → 自己解决，不要浮出水面。"

**这两个设计合在一起的效果**：静默纪律（强制）推 Agent 去"自己解决"，Sub-agent 规则（可选）说"用 Sub-agent 更好"。当两者冲突——queue 坏了，自己解决是直接搜索——**强制规则赢了**。

**这不是 Agent 的判断失误。这是 Agent 在机制层面做了正确的优先级排序：requires > suggested_context。**

### 2.3 缺陷三（P1）：Gate 无法区分"经 relay 的产出"和"Agent 手工写的产出"

`check-gate-wave0-complete.mjs` 的规则集：

| 规则 | 检查内容 | 能否区分 relay vs 手工 |
|------|---------|----------------------|
| `file_exists` | `source.yaml` 存在 | ❌ 无论谁写的，文件都存在 |
| `schema_valid` | YAML 格式合法，字段齐全 | ❌ 格式一样 |
| `per_topic_count_floor` | 条目数 ≥ 阈值 | ❌ 数量一样 |
| `shared_ref_count_floor` | `00-shared-*.md` 数量 ≥ 阈值 | ❌ 数量一样 |
| `trace_event_present` | `wave0_completion` event 存在 | ❌ CLI log-event 产生的 event 一样 |

**没有一条 gate rule 检查 relay provenance。** 以下文件是 relay 执行才会产生的 side effect：

- `rb_output_declarations.jsonl` — delegated `complete()` 写入
- `_subagents/wave_00/slot_*/` — relay slot 目录
- `_cache/wave0/primary/{topic}/sNN_*/` 中的 `websearch.json` + `page.md` + `meta.json` 三件套

这三者**全都不在 gate 检查范围内**。对 gate 来说，Agent 用 relay 写的 source.yaml 和 Agent 手工写的 source.yaml，是完全相同的 artifact。

**反作弊规则没有 enforcement mechanism。** 规则 15 说"禁止绕过 Relay provenance"，但没有对应的 gate rule 来 detect 旁路行为。这是纯文档层面的约束——靠 Agent 自觉。

---

## 3. BUG-006 为什么没解决这个问题

BUG-006 描述了完全相同的现象（Phase Agent 绕过 Sub-agent，_cache 为空），但它的修复方向是：

1. 改 task card `controller` 从 `"main-agent"` 到 `"sub-agent"`
2. `operate-queue claim` 校验 actor 匹配 controller
3. Phase doc 增加禁止项

这些修复的**共同假设**：Agent 会走 queue path。它们在 queue path 上加了锁——但没考虑 Agent 可以**不走 queue path**。

本次回归的触发路径：
- Queue 入口污染 → relay pipeline 第一步就堵死 → Agent 退回到"不用 queue 直接做"的路径
- BUG-006 加的所有锁（controller 校验、claim actor 匹配）全在 queue path 上——**这条路径根本没被走到**

**BUG-006 修了门锁，但墙是纸糊的。**

---

## 4. 设计原则：正道应该比捷径更容易

当前系统的路径对比：

```
捷径（Agent 当前默认选择）:
  WebSearch × 5 → 读搜索结果 → 写 source.yaml → gate pass
  步骤: 3 步
  依赖: 0 个外部系统
  失败概率: 极低

正道（框架要求的路径）:
  清理 queue → enqueue task card × 5 → claim → stageSlots
  → spawn sub-agent × 5 → wait → ingestReceipt → commitResult
  → delegated complete → gate pass
  步骤: 10+ 步
  依赖: queue-manager, subagent-relay, operate-queue CLI, slot 状态机
  失败概率: 中等（每个依赖都可能出问题）
```

**只要捷径存在，Agent 就会走捷径。不是道德问题——是物理问题。** 修复的终极目标不是让 Agent "更听话"，而是**拆除捷径**——或者反过来，**把正道铺得比捷径更平**。

具体来说：

- **让走 relay 成为唯一能过 gate 的路径**（gate enforcement）
- **让 queue 坏了自己能修**（自愈能力）
- **让 relay 的启动成本低于手工搜索**（降低正道阻力）

---

## 5. 修复建议

### 5.1（P0）Gate 加 provenance 检查 — 拆除捷径

让"不走 relay"产出的 artifact **无法通过 gate**。

- `check-gate-wave0-complete.mjs`（及 wave1/wave2 对应 gate）增加 rule：
  - `rb_output_declarations.jsonl` 至少存在 N 行（N = topic_registry 长度）。这是 delegated `complete()` 的 side effect——只有走 relay 才会产生此文件
  - 文件缺失 → gate fail，inspect 返回：`"subagent_relay_bypassed": "rb_output_declarations.jsonl not found — evidence did not pass through relay pipeline. Phase Agent MUST use queue → relay → sub-agent path."`
- 同理：`_subagents/` 目录不为空（至少每个 topic 有一个 slot 目录）

涉及文件：`DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`、`check-gate-wave1-complete.mjs`、`check-gate-wave2-complete.mjs`

### 5.2（P0）Queue 入口加固 — 正道不能第一步就断

让 queue 的入口足够健壮，Agent 不会在第一步就被迫走捷径。

- `operate-queue enqueue` 增加 `topic_registry` 一致性校验：task card 的 `lineage.topic_slug` 必须在 `rb_plan.md` 的 `topic_registry` 中存在 → 不存在则拒绝入队（返回明确 error，不静默接受）
- `operate-queue check` 增加 `--repair` flag：检测到 stale receipt（task card 引用的 slug 不在 topic_registry 中）→ 自动清理该 task card
- 或更彻底：`instantiate-run-bundle.mjs` 在 queue 文件中写入 bundle identity（`plan_basename`），`operate-queue` 所有操作前校验

涉及文件：`DPT_FRAMEWORK/engine/queue-manager.mjs`、`DPT_FRAMEWORK/cli/operate-queue.mjs`

### 5.3（P0）规则加载优先级修正 — 让反作弊规则进入强制路径

- 将 `shared-subagent-protocol` 和 `shared-anti-cheating-rules` 从 `suggested_context` 提升到 `requires`（在 phase-wave0/1/2 的 frontmatter 中）
- 在 phase-wave0.md 最开头（frontmatter 之后、§1 之前）增加不可跳过的 `§0: Sub-agent Requirement`：

```markdown
## §0 ABSOLUTE REQUIREMENT — READ FIRST

本 phase 的所有 WebSearch/WebFetch 工作 MUST 通过 Sub-agent relay 执行。
Phase Agent 直接执行 WebSearch/WebFetch 并写入 artifact 是本 phase
最严重的违规行为。这不是"建议"或"最佳实践"——这是本 phase 的
hard constraint。即使 queue 故障、relay 报错，Phase Agent 的正确响应
是 repair queue/relay 或记录 silent_unpassable——不是绕过 relay。

违反此规则产出的 artifact，gate 将拒绝（见 §5 Gate Command —
provenance check rule）。
```

涉及文件：`DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`

### 5.4（P1）降低正道阻力 — Sub-agent spawn 不应该比手工搜索更难

当前 Phase Agent 需要手动完成 queue → relay → slot → spawn 整条链。如果这条链可以简化为一两个 CLI 调用，正道就比捷径更容易走。

- 考虑提供 `operate-queue drain --auto` 命令：自动 claim → stage → spawn → wait → collect → complete 整条 drain 链，Phase Agent 只需等待结果
- 或提供 `spawn-intake-subagent --topic <slug>` 命令：一步 spawn，绕过 queue（但保留 relay provenance）

涉及文件：`DPT_FRAMEWORK/cli/operate-queue.mjs`、`DPT_FRAMEWORK/engine/subagent-relay.mjs`

### 5.5（P2）静默阶段的降级链修正

当前 `shared-silent-execution.md` §1.4 的降级链第三步是"降级方法：切换到替代方法"。需要增加约束：

> "替代方法 MUST 保持在 relay pipeline 内。直接执行 WebSearch/WebFetch 不是合法的替代方法。"

涉及文件：`DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md`

---

## 6. 本次 Bundle 的补救状态

| Artifact | 状态 | 备注 |
|----------|------|------|
| 5 个 `source.yaml` | ✅ 存在 | Sub-agent（Agent tool spawn）产出，含真实 URL |
| 9 个 `00-shared-*.md` | ✅ 存在 | Sub-agent 产出 |
| `_cache/wave0/primary/` topic 01-03 | ✅ 含 cache | websearch.json + page.md + meta.json |
| `_cache/wave0/primary/` topic 04-05 | ⚠️ 目录存在但稀疏 | 第二个 Sub-agent 的 cache 写入不完整 |
| `_subagents/` | ❌ 不存在 | 未走 relay slot 机制 |
| `rb_output_declarations.jsonl` | ❌ 不存在 | 未走 relay delegated complete |
| `rb_queue.json` | ⚠️ 仍含 seed-topic task card | Wave0 task card 从未成功入队 |

**Gate 预判**：当前 gate 不检查 provenance，**大概率会 pass**。但这不说明系统正常——它说明 gate 的检查覆盖面不够。

---

## 7. 复现条件

1. Bundle A 执行过 seed-topics，queue 中有 task card 残留
2. Bundle B 创建后进入 wave0
3. `operate-queue enqueue` 将 Bundle B 的 task card 混入含 Bundle A 残留的 queue
4. `operate-queue check` 报错（残留 task card 的 receipt 在 Bundle B 中不存在）
5. Phase Agent 面对不可用的 queue → 选择直接搜索（路径最短）

**关键**：步骤 4-5 之间的决策是**确定性的**——只要 queue 不可用且静默纪律要求 Agent 自己解决，Agent 就会走捷径。这不是概率问题。

---

## 8. Tags

`subagent-relay` `robustness` `default-path` `queue-contamination` `gate-enforcement-gap` `BUG-006-regression` `provenance` `P0`
