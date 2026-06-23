---
guideline_id: subagent-boundary
suite: deep-research-guidelines
title: Sub-Agent Boundary
status: draft
created: 2026-06-24
role: architectural principle (exploratory, not fully settled) governing when and why work goes into sub-agents
scope: all sub-agent usage across the deep research workflow
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/framework-runtime-boundary.md
---

# Sub-Agent Boundary

> 状态: 草案 | 创建: 2026-06-24 | 适用: 所有涉及 sub-agent 派发的设计与实现。核心原则方向正确，但 queue 与 relay 的集成尚未实现（待 Change 2）。

---

## 一句话

**主 Agent 的上下文是稀缺资源。** Sub-agent 的首要职责是把高噪声、低判断密度的 I/O 工作从主 Agent 上下文中剥离，保主 Agent 上下文的高信噪比。

---

## 三层编排模型：Chain、Queue、Relay 如何共存

这是理解 sub-agent 边界的前提。系统里有三个确定性引擎，各管一层，主 Agent（读 MD）是唯一的编排者，在它们之间传递状态。三层嵌套，从不交叉：

```
外层 — Chain (transitions.chain.json + ask-next.mjs / transition-chain.mjs)
       管 phase 间路由。gate pass → chain 查 next phase node → 加载下一个 MD。
       权威 = gate verdict + chain 路由表。不进 queue，不碰 relay。
  │
  └─ 中层 — Queue (queue-manager.mjs, AGQ-001~010)
            管 phase 内 task 编排。灌料 → claim 一个 task → 执行 → complete(receipt) → 领下一个 → queue 空 → 跑 gate。
            权威 = rb_queue.agq.json + receipt check。串行 claim，一个 task 一个 task 做。
            queue 不知道 relay 的存在——它只管 claim/complete。
            > Queue 的完整架构（两层 loop、派发规则、结构四规则、stop authorization）见 [Agentic Queue Mechanism](agentic-queue-mechanism.md)。本 guideline 只描述三层之间的关系，不重复 queue 的定调。
     │
     └─ 内层 — Relay (subagent-relay.mjs, SUD-001)
               管单个 task 内的 sub-agent dispatch。stage slot dirs → spawn role sub-agent(s) → collect result → 写产出文件。
               权威 = result.schema.json + runtime-receipt.jsonl。可并行（v1 上限 4 role slot；计划支持 -1 全量并行）。
               relay 不知道 queue 的存在——它只管 stage/collect。
```

**三层为什么不冲突：** 它们管不同粒度的确定性。Chain 管"哪个 phase"（单步静态路由），Queue 管"一个 phase 内哪个 task"（串行 receipt 链），Relay 管"一个 task 内哪些 sub-agent"（并行 role dispatch）。每层只跟相邻层通过产出文件交接，不越级。

**主 Agent 是唯一编排者。** 三个引擎互相不感知——Chain 不调 Queue，Queue 不调 Relay。是主 Agent 读 MD，按序调用引擎，把它们的输出拼接成完整的执行流。当前只有 Queue 有 CLI 封装（`operate-queue.mjs`）；Chain 和 Relay 是纯引擎模块（无 CLI 包装），主 Agent 需通过内联 JS 脚本调用它们的 API。这跟 project charter 一致：MD controls Agent Flow，JS controls deterministic checkpoints，LLM 在中间做判断和协调。

### 一个 task 的完整执行流

以 wave0 的一个 source-intake task 为例，完整经过三层：

```
[外层已就位] Agent 加载 phase-wave0.md（chain 已路由到这个 phase）

[中层 — Queue]     operate-queue claim <bundle> --actor main-agent
                   → 返回 task card { work_id: "wave0-source-claude-code", target: "sub-agent", ... }
                   → task 进入 running 状态

[Agent 判断]       task.target == sub-agent → 这件工作委托给 relay
                   task.target == main-agent → 自己做（如 seed-topics 纯写文件）

[内层 — Relay]     stageSubagentSlots(state, baseDir) → 写 slot 目录
                   → _subagents/wave_XX/source_intake/{task.md, result.schema.json, _status.json(=pending)}
                   → Agent spawn native sub-agent（dpt-source-intake role）
                   → sub-agent 读 task.md，执行 WebSearch + WebFetch，按 result.schema.json 返回 JSON
                   → sub-agent 写 runtime-receipt.jsonl（自证执行）
                   → Agent 验证 JSON（Parent Relay），写入 result.json + 更新 _status.json
                   → collectResults(slots, baseDir) → 读回 result.json
                   → Agent 基于 result 写产出文件 reference/<topic>/source.yaml

[中层 — Queue]     operate-queue complete <bundle> --result result.json
                   → queue 检查 receipt：reference/<topic>/source.yaml 存在 + schema 通过？
                   → PASS → promote 下一个 task → refill → render projection
                   → 回到 claim（串行领下一个 task）

[中层 — Queue]     queue 空 (claim 返回 item: null) → 出内层 loop

[外层 — Chain]     operate-queue 退场 → 跑 gate CLI → pass → chain 查 next → 加载 phase-wave1.md
```

**关键交接点：** Relay collect 完结果后，是主 Agent 基于 result 写产出文件，然后调 Queue complete 做 receipt。Relay 和 Queue 之间不直接通信——主 Agent 是桥梁。产出文件（`reference/<topic>/source.yaml`）是两者的唯一共享契约：Relay 的 result 提供"搜到了什么"，主 Agent 把它结构化成产出文件，Queue 的 receipt 检查"产出文件在不在、对不对"。

### 各层的接口边界

| 层 | 引擎接口 | 主 Agent 调它做什么 | 它不管什么 |
|---|---------|--------------------|-----------|
| **Chain** | `resolveNodeTransitionDetailed()` (`ask-next.mjs`) | gate pass 后查下一个 phase | 不编排 phase 内 task、不碰 sub-agent |
| **Queue** | `claim()` / `complete()` / `fail()` | 领 task、校验 receipt、推进下一个 | 不 spawn sub-agent、不路由 phase |
| **Relay** | `stageSubagentSlots()` / `collectResults()` | 给 sub-agent 准备 slot、收集结果 | 不校验 task receipt、不编排 task 顺序 |

**并发性分配：** Chain 是单步串行（一步一个 phase）。Queue 是 task 级串行（一次一个 task，因为 receipt 要逐个校验）。Relay 是 role 级并行（一个 task 内可同时 spawn 多个 role sub-agent）。当前 v1 引擎并发上限为 `MAX_CONCURRENT_SUBAGENTS = 4`（硬编码常量，超过会被拒绝）；设计计划是支持 `= -1` 哨兵值，代表全量并行——所有可能的 sub-agent 同时打开，无并发上限。`-1` 语义尚未实现。三层各有各的并发粒度，互不干涉。

### 当前实现状态

| 组件 | 状态 | 说明 |
|-----|------|------|
| Chain 路由 | ✅ 已实现 | gate + transitions.chain.json，所有 phase 过渡走这里 |
| Queue engine | ✅ 已实现 | AGQ-001~006，enqueue/claim/complete/fail/preempt/render |
| Queue 接入 phase | ✅ 部分实现 | seed-topics + wave0 已接入 queue-driven 三阶段（AGQ-007~010）。wave1+ 待 Change 2 |
| Relay engine | ✅ 已实现 | SUD-001，stageSubagentSlots/collectResults/mergeResults |
| **Queue × Relay 集成** | **❌ 未实现** | 上面的完整执行流是**目标模型**，但 queue 和 relay 目前互不感知。Change 2 要定义 task card → relay slot 映射、collect → complete 交接协议。详见文末开放问题 |

---

## 核心原则

### 原则一：噪声隔离是最高优先级

什么时候必须用 sub-agent？

> **凡是会往主 Agent 上下文灌入大量低密度信息的工作——尤其是 WebSearch、WebFetch、大段页面抓取——一律进 sub-agent。**

这不是"推荐"。这是结构性要求。主 Agent 的上下文承载着 workflow state、phase 目标、topic 全景、gate 反馈、前面 task 的产出——这个上下文的每一寸空间都应该留给**判断、综合、决策**。把几千字的网页 dump 或搜索结果摘要灌进主上下文，等于在主 Agent 的决策桌面上倒垃圾。

Sub-agent 返回的东西必须被 `result.schema.json` 严格约束形状——结构化 JSON，不是自由文本。大段搜索 trail 和页面 dump 不在 schema 允许的字段里。噪声在源头就被截断了。

**当前已识别的高噪声工作（必须 sub-agent）：**

| 工作 | 噪声来源 | Sub-agent 角色 |
|------|---------|---------------|
| Foundation reference 搜索 | WebSearch + WebFetch 页面内容 | `dpt-source-intake` |
| Topic-specific deepening 搜索 | 同上，搜索更深入 | `dpt-evidence-extractor` |
| Source quality 评估 | 页面内容分析 | `dpt-source-diagnostic` |
| Claim 验证 | 跨源对比 | `dpt-claim-verifier` |

以上四角色是 v1 已注册的高噪声角色。`roles.md` 共定义六角色——另有 `dpt-topic-scout`（v1.5）和 `dpt-synthesis-reviewer`（v1.5）已定义但不在上表，因为它们做的是探索性/审查性判断，不是 I/O 剥离。完整六角色见 `DPT_FRAMEWORK/command_playbook/subagent_templates/roles.md`。

### 原则二：主 Agent Flow 不可控的，丢进 sub-agent

什么时候可以考虑用 sub-agent？

> **凡是主 Agent Flow 里不好控制、或者会打断主 Agent 判断节奏的工作，都是 sub-agent 的候选。**

"不好控制"指什么：
- 时间不可控——一个网页可能 10 秒返回也可能超时，主 Agent 不应该干等着
- 信息量不可控——你不知道这次搜索会返回 2 条还是 200 条结果
- 内容质量不可控——你不知道抓回来的页面是学术论文还是营销软文
- 需要独立判断但不想污染主上下文的——比如评估一个 source 是否可信，这个判断本身有价值，但评估过程中读到的噪音不值得留在主上下文

**实操口诀：**

```
这份工作...
  ├── 需要 WebSearch 或 WebFetch？                     → sub-agent（原则一）
  ├── 会产生大量中间信息、但最终结论很短？                → sub-agent
  ├── 纯粹的结构化写入或判断（从已有数据派生）？          → main-agent 自己做
  └── 需要综合多个 topic 的上下文做 cross-topic 判断？   → main-agent 自己做
```

### 原则三：Sub-agent 不给全貌，只给结论

Sub-agent 不是"另一个 Agent"——它是主 Agent 的**工具**。它收到的上下文是 deliberately bounded 的：只看自己 slot 的 `task.md` 和 `result.schema.json`。它不接触 WorkflowState、gate 内部状态、其他 topic 的结果、queue 内容。

它的输出是**结构化结论**，不是**过程记录**：

```json
{
  "status": "done",
  "summary": "找到 2 条可信来源。来源 A 是官方文档...",
  "evidenceCount": 2,
  "references": [{"title": "...", "url": "...", "quote": "...", "relevance": "..."}],
  "confidence": 0.8,
  "notes": ["来源 B 需要交叉验证"]
}
```

这个 JSON 是主 Agent 的**决策输入**——短、结构化、可验证。主 Agent 不需要读 sub-agent 的搜索过程，只需要读这个结论然后做判断。

---

## 反面教材

**不要做的事：**

- **不要让 main-agent 自己调 WebSearch/WebFetch**——噪声直接进主上下文，污染后续所有判断。wave0 的 Change 1 实现就是反面教材：task card 写 `target: sub-agent`，实际执行时 main-agent 自己搜了。
- **不要给 sub-agent 完整 WorkflowState**——它不需要知道其他 topic 在做什么、gate 状态是什么、queue 里还有什么。只给 bounded task。
- **不要让 sub-agent 写 workflow 文件**——sub-agent 只写自己的 `runtime-receipt.jsonl`（自证"真的跑了"）。`result.json` 由 parent（主 Agent）验证 sub-agent 返回的 JSON 后写入；`_status.json` 由 relay engine 在 staging 时创建（=pending）、由 parent 在验证后更新。Sub-agent 自身不碰这些文件，也不碰 artifact 正式路径。
- **不要让 sub-agent 调 queue 或 gate**——queue claim/complete 和 gate 检查是主 Agent 的职责。Sub-agent 只做自己的 bounded task，返回结构化 result。

---

## 未来扩展方向

本 guideline 当前聚焦于"噪声隔离"这一核心用例。sub-agent 的潜力不止于此：

- **多视角并行判断**：同一个 claim，派 3 个不同 sub-agent 从 correctness/security/reproducibility 三个视角独立评估，主 Agent 综合投票
- **对抗性验证**：spawn 一个 sub-agent 专门尝试驳斥主 Agent 当前的结论
- **自动补搜**：synthesis 过程中发现 gap，直接 spawn sub-agent 定向补搜，结果回来后更新 synthesis

这些方向尚未纳入当前实现，但设计时应预留接口（`role_key` 参数化、relay dispatchMap 可扩展、slot 目录结构化）。

---

## 开放问题：Queue × Relay 集成

三层编排模型（上文）描述的是**目标架构**。目前 Queue 和 Relay 是两套各自独立、互不感知的引擎，主 Agent 桥接它们的完整执行流尚未实现。Change 2（`wfq-wave1-intake-subagent`）需要解决以下集成问题：

1. **task card → relay 映射协议**：当一个 queue task 的 `target: sub-agent` 被执行时，MD 怎么知道该 spawn 哪个 role sub-agent？当前 relay 的 dispatchMap 是固定分支（pass → 4 role slots），需要改成从 task card 的 `producer_rule` 或新的 `role_key` 字段派生。`target: sub-agent` 是 advisory text（MD 层约束），`producer_rule → role_key` 的映射是 Change 2 要定义的。

2. **collect → complete 的交接**：relay `collectResults` 收集完 sub-agent 结果后，谁来写产出文件（`reference/<topic>/source.yaml`）？谁来调 queue `complete()`？当前 relay 的 `mergeResults` 是把 evidence count 写进 workflow state（一个聚合数字），而 queue `complete` 需要的是单个产出文件 + receipt。需要一个 bridge：relay collect 后写结构化产出文件，然后 MD 调 queue complete 做 receipt 检查。
   **附带问题：relay 没有 CLI 封装。** Queue 有 `operate-queue.mjs` CLI，但 relay 的 `stageSubagentSlots` / `collectResults` 是纯引擎 API，主 Agent 无法通过 bash 命令调用。Change 2 需要创建 `operate-relay.mjs`（或等效 CLI 封装），否则主 Agent 无法在 queue claim 和 queue complete 之间编排 relay 操作。

3. **task 级串行 vs role 级并行的边界**：单个 task 内的 role sub-agent 可以并行（relay 天然支持），但 task 之间的 complete 仍然是串行的（queue receipt 需要逐个校验）。这意味着一次只能有一个 task 在"执行中"（`slot_1_current.status = running`），但这个 task 内部的 sub-agent 可以并行跑。这是正确的——receipt 检查的确定性要求 task 级串行。

这些不是本文档的定调范围，留待 Change 2 设计阶段通过 OpenSpec proposal 解决。

---

## 关联文档

- [Project Charter](project-charter.md) — 四层分工和权威边界
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — 外层 loop（MD → execute → gate → chain → next MD）。本 guideline 的三层模型中"外层 Chain"由其定义；sub-agent 在单个 phase 内部执行，不跨 phase
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — queue engine 和两层 loop 定调。本 guideline 的三层模型中"中层 Queue"由其定义；queue 的 target separation（§6.2）和 context sustainability（§7.3）直接依赖 sub-agent 噪声隔离
- [Framework Runtime Boundary](framework-runtime-boundary.md) — framework 与 bundle 的边界
- `DPT_FRAMEWORK/engine/subagent-relay.mjs` — Relay engine 实现（1066 行）
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — Queue engine 实现（619 行）
- `DPT_FRAMEWORK/engine/ask-next.mjs` — Chain 路由引擎（`resolveNodeTransitionDetailed`）
- `DPT_FRAMEWORK/engine/transition-chain.mjs` — Chain 路由表加载 + 查询（`resolveTransition`）
- `DPT_FRAMEWORK/engine/workflow-chain.mjs` — workflow node 加载器和依赖解析（不是路由引擎）
- `DPT_FRAMEWORK/command_playbook/subagent_templates/roles.md` — 六角色定义
