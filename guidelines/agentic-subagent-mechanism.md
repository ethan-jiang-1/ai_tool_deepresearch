---
guideline_id: agentic-subagent-mechanism
suite: deep-research-guidelines
title: Agentic Subagent Mechanism
status: effective
created: 2026-06-24
role: architectural constitution for sub-agent dispatch within the three-tier execution model
scope: Agentic Subagent (Relay) — relay engine operations, slot lifecycle, role dispatch, and noise-isolation architectural principles
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-queue-mechanism.md
---

# Agentic Subagent Mechanism

> 状态: 生效 | 创建: 2026-06-24 | 适用: 所有涉及 sub-agent 派发的设计与实现

Agentic Subagent (Relay) 是三层执行模型的内层引擎：在一个 queue task 内部，为 Phase Agent 准备 slot 目录、并行派发 role sub-agent、收集结构化结果——把高噪声 I/O 工作从 Phase Agent 上下文中剥离。

> ## Implementation Status
>
> **这份 guideline 描述的内容有两层：架构原则已定调，Relay engine 已完整实现。Queue × Relay 集成尚未完成。**
>
> | 内容 | 状态 | 说明 |
> |------|------|------|
> | Relay engine (`subagent-relay.mjs`) | **✅ 已实现** | SUD-001, SUS-001, SUC-001, SUR-001 accepted。stageSubagentSlots / collectResults / mergeResults / forkRouter / convergeRepair 完整 pipeline |
> | Relay runtime driver CLI (`drive-relay-slot.mjs`) | **✅ 已实现** | SRD-001..004（subagent-execution-logging）。`stage`/`commit`/`merge` 是 Phase Agent 驱动 relay 的唯一 runtime 路径（SNC-003），禁止 inline JS 直调引擎函数 |
> | Slot 生命周期 + 目录结构 | **✅ 已实现** | `_subagents/wave_NN/slot_MM/` 目录，`task.md` / `result.schema.json` / `_status.json` / `_agent.json` / `runtime-receipt.jsonl` / `result.json` |
> | 并发控制 (`MAX_CONCURRENT_SUBAGENTS`) | **✅ 已实现** | 定义见 `subagent-relay.mjs`（当前为 8）；超过拒绝；`-1` 全量并行哨兵计划但未实现 |
> | 六角色定义 | **✅ 已实现** | `dpt-source-intake`, `dpt-source-diagnostic`, `dpt-claim-verifier`, `dpt-evidence-extractor` (v1) + `dpt-topic-scout`, `dpt-synthesis-reviewer` (v1.5) |
> | Shared subagent protocol | **✅ 已实现** | 通信合约、目录边界、forbidden authority、page-fetching 降级链 |
> | Relay role spec MD (wave0/1/2) | **✅ 已实现** | `subagent-dpt-source-intake.md`, `subagent-dpt-evidence-extractor.md`, `subagent-dpt-topic-scout.md` |
> | **Queue × Relay 集成** | **❌ 未实现** | task card → relay slot 映射、collect → complete 交接协议、`operate-relay.mjs` CLI 封装。详见 §8.3 |
> | Wave2 动态 spawn vs queue-mediated | **⚠️ 设计张力** | Wave2 的 gap-fill sub-agent 直接 spawn（绕过 Queue），与标准 Chain→Queue→Relay 路径不一致。详见 §8.4 |
>
> **这份文件是宪法（constitution），不是运行时事实。** 它告诉你架构怎么设计、边界在哪里、规则是什么。Relay engine 已完整实现，slot 协议已定调，但 Queue × Relay 集成和 Wave2 dispatch 路径是待解决的设计问题。

---

## 1. Purpose

Phase Agent 的上下文是稀缺资源。每一条 WebSearch 结果、每一个 WebFetch 页面、每一段中间分析文本都在消耗这个资源。Sub-agent 的首要职责是**噪声隔离**：把高噪声、低判断密度的 I/O 工作从 Phase Agent 上下文中剥离，保 Phase Agent 上下文的高信噪比。

Relay engine 是这一职责的执行者。它为 sub-agent 准备 bounded context（只有 `task.md` + `result.schema.json`），收集结构化结论（不是过程记录），把几千字的网页 dump 挡在 Phase Agent 的决策桌面之外。

这份文件建立 sub-agent dispatch 的架构宪法：三层执行模型中的 Relay 定位（§3）、核心原则（§4）、Slot 协议（§5）、并发模型（§6）、MUST/MUST NOT（§7）、派生约束（§8）。

---

## 2. File Position

This file can decide:

- The three-tier execution model (Chain → Queue → Relay) and how Relay fits into it.
- Core principles governing when and why work goes to sub-agents: noise isolation, uncontrollable-work delegation, bounded conclusions.
- Slot lifecycle, directory structure, and communication contract between Phase Agent and sub-agent. Current files may still use `main-agent` as a legacy wire/API term.
- Concurrency model: role-level parallel dispatch within a single task.
- Forbidden authority: what sub-agents MUST NOT do.
- Derived constraints: context sustainability, Queue × Relay integration, dynamic spawn vs queue-mediated dispatch.

This file cannot decide:

- Concrete slot file schemas, CLI flags, receipt grammar, or trace event contracts — those are spec territory.
- Current run state, slot contents, sub-agent spawn results, or workflow state.
- Implementation permission for new relay behavior without an OpenSpec change.
- Whether a specific task uses sub-agents — this file gives the decision framework; the Phase Agent decides while operating in MD controller mode.

---

## 3. Tier 3 — Relay in the Three-Tier Execution Model

> 本文件描述 [三层执行模型](agentic-execution-model.md) 中的 **Tier 3 — Relay**（内层）。完整嵌套关系和术语正典见该文档。

Relay 不是孤立机制。它嵌套在 Chain (Tier 1) 和 Queue (Tier 2) 之内，三者各管一层粒度，Phase Agent（以 MD controller mode 读 phase MD）是唯一编排者。

```
外层 — Chain (Tier 1)
       管 phase 间路由。gate pass → chain 查 next phase node → accepted handoff loader/check 渲染下一个 MD。
       权威 = gate verdict + chain 路由表。不进 queue，不碰 relay。
  │
  └─ 中层 — Queue (queue-manager.mjs, AGQ-001~010)
            管 phase 内 task 编排。灌料 → claim 一个 task → 执行 → complete(receipt) → 领下一个 → queue 空 → 跑 gate。
            权威 = queue-manager validated state + receipt check。串行 claim，一个 task 一个 task 做。
            queue 不知道 relay 的存在——它只管 claim/complete。
            > Queue 的完整架构（两层 loop、派发规则、结构四规则、stop authorization）见 [Agentic Queue Mechanism](agentic-queue-mechanism.md)。
     │
     └─ 内层 — Relay (subagent-relay.mjs, SUD-001)
               管单个 task 内的 sub-agent dispatch。stage slot dirs → spawn role sub-agent(s) → collect result → 写产出文件。
               权威 = result.schema.json + runtime-receipt.jsonl。可并行（v1 上限 4 role slot；计划支持 -1 全量并行）。
               relay 不知道 queue 的存在——它只管 stage/collect。
```

**三层为什么不冲突：** 它们管不同粒度的确定性。Chain 管"哪个 phase"（单步静态路由），Queue 管"一个 phase 内哪个 task"（串行 receipt 链），Relay 管"一个 task 内哪些 sub-agent"（并行 role dispatch）。每层只跟相邻层通过产出文件交接，不越级。

**Phase Agent 是唯一编排者。** 三个引擎互相不感知——Chain 不调 Queue，Queue 不调 Relay。是 Phase Agent 以 MD controller mode 读 phase MD，按序调用引擎，把它们的输出拼接成完整的执行流。当前只有 Queue 有 CLI 封装（`operate-queue.mjs`）；Chain 和 Relay 是纯引擎模块（无 CLI 包装），Phase Agent 需通过内联 JS 脚本调用它们的 API。这跟 project charter 一致：MD controls Agent Flow，JS controls deterministic checkpoints，LLM 在中间做判断和协调。

### 3.1 一个 Task 的完整执行流

以 wave0 的一个 source-intake task 为例，完整经过三层：

```
[外层已就位] Phase Agent 已通过 accepted handoff loader/check 进入 phase-wave0.md（chain 已路由到这个 phase）

[中层 — Queue]     operate-queue claim <bundle> --actor main-agent
                   # "main-agent" is the current CLI wire value for the Phase Agent
                   → 返回 task card { work_id: "wave0-source-claude-code", targets: { controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-source-intake" } }, ... }
                   → task 进入 running 状态

[Phase Agent 判断] task.targets.delegates.to == "sub-agent" → 这件工作委托给 relay
                   task.targets.controller == "main-agent" 且无 delegates → Phase Agent 直接执行（如 seed-topics 纯写文件；"main-agent" 为当前 wire value）

[内层 — Relay]     drive-relay-slot stage <bundle> --wave N → 引擎写 slot 目录 + 打印 spawn prompt
                   → _subagents/wave_XX/slot_MM/{task.md, result.schema.json, _status.json(=pending), _beacon.json}
                   → Phase Agent 用 spawn prompt spawn native sub-agent（dpt-source-intake role）
                   → sub-agent 读 task.md + _beacon.json，执行 WebSearch + WebFetch，按 result.schema.json 返回 JSON
                   → sub-agent 写 runtime-receipt.jsonl + lifecycle 事件（自证执行，带 receipt_nonce）
                   → drive-relay-slot commit <bundle> --wave N --slot <key> --result '<json>' --runtime-agent-id <id>
                     （引擎校验 receipt + JSON，写 result.json / _status.json / _agent.json）
                   → drive-relay-slot merge <bundle> --wave N → 读回全部 result.json 并 merge
                   → Phase Agent 基于 result 写产出文件 reference/<topic>/source.yaml

[中层 — Queue]     operate-queue complete <bundle> --result result.json
                   → queue 检查 receipt：reference/<topic>/source.yaml 存在 + schema 通过？
                   → PASS → promote 下一个 task → refill → render projection
                   → 回到 claim（串行领下一个 task）

[中层 — Queue]     queue 空 (claim 返回 item: null) → 出内层 loop

[外层 — Chain]     operate-queue 退场 → 跑 gate CLI → pass → chain 查 next → handoff loader/check 消费 phase-wave1.md
```

**关键交接点：** Relay collect 完结果后，是 Phase Agent 基于 result 写产出文件，然后调 Queue complete 做 receipt。Relay 和 Queue 之间不直接通信——Phase Agent 是桥梁。产出文件（`reference/<topic>/source.yaml`）是两者的唯一共享契约：Relay 的 result 提供"搜到了什么"，Phase Agent 把它结构化成产出文件，Queue 的 receipt 检查"产出文件在不在、对不对"。

### 3.2 各层的接口边界

| 层 | 引擎接口 | Phase Agent 调它做什么 | 它不管什么 |
|---|---------|--------------------|-----------|
| **Chain** | `resolveNodeTransitionDetailed()` (`ask-next.mjs`) | gate pass 后查下一个 phase；Phase Agent 再通过 handoff loader/check 消费该目标 | 不编排 phase 内 task、不碰 sub-agent |
| **Queue** | `claim()` / `complete()` / `fail()` | 领 task、校验 receipt、推进下一个 | 不 spawn sub-agent、不路由 phase |
| **Relay** | `drive-relay-slot` CLI（`stage`/`commit`/`merge`，内部调 `stageSubagentSlots()` 等引擎函数） | 给 sub-agent 准备 slot、收集结果 | 不校验 task receipt、不编排 task 顺序 |

**并发性分配：** Chain 是单步串行（一步一个 phase）。Queue 是 task 级串行（一次一个 task，因为 receipt 要逐个校验）。Relay 是 role 级并行（一个 task 内可同时 spawn 多个 role sub-agent）。三层各有各的并发粒度，互不干涉。

---

## 4. Core Principles

### 原则一：噪声隔离是最高优先级

什么时候必须用 sub-agent？

> **凡是会往 Phase Agent 上下文灌入大量低密度信息的工作——尤其是 WebSearch、WebFetch、大段页面抓取——一律进 sub-agent。**

这不是"推荐"。这是结构性要求。Phase Agent 的上下文承载着 workflow state、phase 目标、topic 全景、gate 反馈、前面 task 的产出——这个上下文的每一寸空间都应该留给**判断、综合、决策**。把几千字的网页 dump 或搜索结果摘要灌进 Phase Agent 上下文，等于在决策桌面上倒垃圾。

Sub-agent 返回的东西必须被 `result.schema.json` 严格约束形状——结构化 JSON，不是自由文本。大段搜索 trail 和页面 dump 不在 schema 允许的字段里。噪声在源头就被截断了。

**当前已识别的高噪声工作（必须 sub-agent）：**

| 工作 | 噪声来源 | Sub-agent 角色 |
|------|---------|---------------|
| Foundation reference 搜索 | WebSearch + WebFetch 页面内容 | `dpt-source-intake` |
| Topic-specific deepening 搜索 | 同上，搜索更深入 | `dpt-evidence-extractor` |
| Source quality 评估 | 页面内容分析 | `dpt-source-diagnostic` |
| Claim 验证 | 跨源对比 | `dpt-claim-verifier` |

以上四角色是 v1 已注册的高噪声角色。六角色中另有 `dpt-topic-scout`（v1.5）和 `dpt-synthesis-reviewer`（v1.5）已定义但不在上表——它们做的是探索性/审查性判断，不是纯 I/O 剥离，但仍适用原则二。

### 原则二：Phase Agent context / judgment flow 不可控的，丢进 sub-agent

什么时候可以考虑用 sub-agent？

> **凡是会污染 Phase Agent context、或者会打断 Phase Agent 判断节奏的工作，都是 sub-agent 的候选。**

"不好控制"指什么：
- 时间不可控——一个网页可能 10 秒返回也可能超时，Phase Agent 不应该干等着
- 信息量不可控——你不知道这次搜索会返回 2 条还是 200 条结果
- 内容质量不可控——你不知道抓回来的页面是学术论文还是营销软文
- 需要独立判断但不想污染主上下文的——比如评估一个 source 是否可信，这个判断本身有价值，但评估过程中读到的噪音不值得留在主上下文

**实操口诀：**

```
这份工作...
  ├── 需要 WebSearch 或 WebFetch？                     → sub-agent（原则一）
  ├── 会产生大量中间信息、但最终结论很短？                → sub-agent
  ├── 纯粹的结构化写入或判断（从已有数据派生）？          → Phase Agent 自己做
  └── 需要综合多个 topic 的上下文做 cross-topic 判断？   → Phase Agent 自己做
```

### 原则三：Sub-agent 不给全貌，只给结论

Sub-agent 不是另一个 workflow authority——它是 Phase Agent 使用的 bounded Agent actor。它收到的上下文是 deliberately bounded 的：只看自己 slot 的 `task.md` 和 `result.schema.json`。它不接触 WorkflowState、gate 内部状态、其他 topic 的结果、queue 内容。

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

这个 JSON 是 Phase Agent 的**决策输入**——短、结构化、可验证。Phase Agent 不需要读 sub-agent 的搜索过程，只需要读这个结论然后做判断。

---

## 5. Slot Protocol

Relay 的 slot 是 sub-agent 和 Phase Agent 之间的唯一通信通道。详细协议见 `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`，此处只记宪法级约束。现有协议文件和 wire/API 示例可能仍使用 `main-agent`，该词在此阶段只表示兼容 wire value，不是概念正典。

### 5.1 Slot 目录结构

```
_subagents/wave_NN/slot_MM/
  ├── task.md              # sub-agent 收到的 bounded task（由 relay engine 写入）
  ├── result.schema.json   # 输出 JSON Schema（由 relay engine 写入）
  ├── _status.json         # pending → running → done|failed（relay engine + Phase Agent 更新）
  ├── _agent.json          # agent metadata（Phase Agent 在 spawn 后写入）
  ├── runtime-receipt.jsonl # sub-agent 自证执行的 trace（至少两个事件）
  └── result.json          # sub-agent 的结构化产出（Phase Agent 验证后写入）
```

### 5.2 权威边界

- **Sub-agent 收到的**：只有 `task.md` + `result.schema.json`（bounded context）
- **Sub-agent 写入的**：`runtime-receipt.jsonl`（自证执行）、`_cache/` 下的中间产物
- **Phase Agent 读取的**：`runtime-receipt.jsonl`、`_status.json`、`result.json`
- **Sub-agent 不碰的**：WorkflowState、gate、queue、artifact 正式路径、其他 slot

### 5.3 Runtime Receipt

`runtime-receipt.jsonl` 至少包含两个事件：
- `agent_runtime_started` — sub-agent 确认开始执行
- `agent_result_ready` — sub-agent 声明结果就绪

每个事件包含 `slotKey`、`roleAgentKey`、`receiptNonce`。这是 sub-agent "真的跑了"的唯一自证——没有这个 receipt，Phase Agent 不应接受 result。

---

## 6. Concurrency Model

### 6.1 Role-Level Parallelism

Relay 天然支持并行 dispatch：一个 task 内可以同时 spawn 多个不同 role 的 sub-agent。当前 v1 引擎并发上限由 `subagent-relay.mjs` 中的 `MAX_CONCURRENT_SUBAGENTS` 定义（当前为 8，超过会被拒绝）。

设计计划是支持 `-1` 哨兵值，代表全量并行——所有可能的 sub-agent 同时打开，无并发上限。`-1` 语义尚未实现。

### 6.2 Task-Level Serialism (Queue Constraint)

虽然单个 task 内的 sub-agent 可以并行，但 task 之间的 complete 仍然是串行的（Queue receipt 需要逐个校验）。这意味着一次只能有一个 task 在"执行中"（`slot_1_current.status = running`），但这个 task 内部的 sub-agent 可以并行跑。这是正确的——receipt 检查的确定性要求 task 级串行。

Queue active window is not the Relay work pool. Relay concurrency happens inside the current Queue task, usually by mapping that task's delegated or batch payload into Relay slots.

### 6.3 Six Role Agents

| Role | Version | Focus |
|------|---------|-------|
| `dpt-source-intake` | v1 | Foundation reference search → structured source metadata |
| `dpt-source-diagnostic` | v1 | Source quality, trust tier, marketing risk assessment |
| `dpt-claim-verifier` | v1 | Support/weakening/contradiction checks for critical claims |
| `dpt-evidence-extractor` | v1 | Single-pass topic deepening → evidence-summary + question-list |
| `dpt-topic-scout` | v1.5 | Gap-fill targeted search for synthesis findings |
| `dpt-synthesis-reviewer` | v1.5 | Wave2 synthesis readiness and must-answer coverage review |

完整角色定义见 `DPT_FRAMEWORK/command_playbook/subagent_templates/roles.md`。

---

## 7. MUST / MUST NOT

### Architecture

- MUST treat Relay as operating exclusively within a single queue task (Tier 3 — innermost).
- MUST NOT let Relay operations drive task sequencing or query the queue.
- MUST route all WebSearch/WebFetch work through sub-agents — never in Phase Agent context.
- MUST keep the three tiers separate: Chain does not call Queue, Queue does not call Relay.
- MUST treat the Phase Agent, operating in MD controller mode, as the sole orchestrator bridging all three tiers.

### Slot Operations

- MUST drive all slot mutations through the runtime driver CLI `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` (`stage`/`commit`/`merge`, SNC-003) — the driver invokes the engine APIs (`stageSubagentSlots()` / `commitSlotResult()` / `collectAndMergeSubagentResults()`) internally; the Phase Agent does not hand-orchestrate them as inline JS.
- MUST NOT hand-edit slot files (`_status.json`, `result.json`, `_agent.json`).
- MUST validate sub-agent output against `result.schema.json` before writing `result.json`.
- MUST verify `runtime-receipt.jsonl` contains both `agent_runtime_started` and `agent_result_ready` events before accepting result.

### Sub-Agent Authority

- MUST give sub-agents only bounded context: `task.md` + `result.schema.json`.
- MUST NOT give sub-agents full WorkflowState, gate internal state, or other topic results.
- MUST NOT let sub-agents write workflow files, pass/fail gates, or mutate queues.
- MUST NOT let sub-agents fabricate sources, URLs, or evidence.
- MUST require sub-agents to exhaust the page-fetching degradation chain before reporting inaccessible.

### Phase Agent Behavior

- MUST read only the render projection (result.json) from sub-agent output — not the full search trail.
- MUST bridge Relay collect → Queue complete: collect committed slot results, pass `slot_result_ref` into delegated queue `complete()`, and let Engine append `rb_output_declarations.jsonl`.
- MUST NOT do WebSearch/WebFetch directly in Phase Agent context.
- MUST NOT skip sub-agent spawn when task card specifies `targets.delegates.to: "sub-agent"`.

### Context Management

- MUST protect Phase Agent context by routing high-I/O, low-judgment-density work to sub-agents.
- MUST keep sub-agent output as structured JSON — not free-text narration.
- MUST release sub-agent context after collecting result (context isolation is the whole point).

---

## 8. Derived Constraints

These are not architectural rules (§3-§6) — they are implementation properties that must hold for the three-tier model to actually work. Each is a "the mechanism cannot function without solving this" constraint.

### 8.1 Context Sustainability

The claim that sub-agent isolation prevents context explosion rests on an assumption that must be experimentally validated: that completing a task via sub-agent + reading only the render projection actually releases context rather than accumulating it. If the Phase Agent reads full sub-agent results back into the conversation after every `collectResults()`, the relay has not reduced context pressure — it has only traded "frequent interruption" for "continuous accumulation."

The intended mechanism (bounded context in, structured JSON out) is architecturally sound, but whether it keeps context growth sub-linear across a full multi-phase run is unknown and requires experimental measurement — not assumption from relay design.

### 8.2 Relay CLI Gap — CLOSED (v0.2)

This gap is closed: `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` is the relay-side CLI (`stage`/`commit`/`merge`), symmetric with `operate-queue.mjs` on the queue side. The Phase Agent now has a uniform bash-callable interface for both tiers; inline-JS orchestration of relay engine functions is prohibited (SNC-003) and locked by `validate-subagent-logging-contract.mjs`.

The history is worth keeping: the relay engine shipped with functions but no runtime caller (supply without demand), so Agents "bridged" the gap with hand-written inline JS or hand-crafted slot files — the direct root of the hand-faking/provenance problems. See the guardrail in `project-charter.md`: new engine capability MUST land together with its Agent-facing demand-side wiring.

### 8.3 Queue × Relay Integration

三层执行模型（§3）描述的是**目标架构**。目前 Queue 和 Relay 是两套各自独立、互不感知的引擎。以下集成问题待解决：

1. **current task → relay slot 映射协议**：当一个 queue task 的 `targets.delegates.to: "sub-agent"` 被执行时，MD 怎么知道该 spawn 哪个 role sub-agent？集成方向是从当前 task 的 `producer_rule`、`targets.delegates.role_key` 或 batch payload 派生 Relay `SlotConfig`，而不是读取多个 pending Queue slots 当作 Relay pool。

2. **collect → complete 交接协议**：relay `collectResults` 收集完 sub-agent 结果后，谁来写产出文件？谁来调 queue `complete()`？需要一个 bridge：relay collect 后写结构化产出文件，然后 MD 调 queue complete 做 receipt 检查。

3. **`operate-relay.mjs` CLI**：Queue 有 CLI，Relay 没有。集成需要统一的 CLI 封装，否则 Phase Agent 无法在 queue claim 和 queue complete 之间编排 relay 操作。

这些不是本文档的定调范围，需通过 OpenSpec change 解决。

### 8.4 Dynamic Spawn vs Queue-Mediated Dispatch

三层执行模型的标准路径是 Chain → Queue → Relay：phase 入口灌料 task card → queue claim → relay dispatch → collect → queue complete。但 wave2 synthesis 引入了一个例外：gap-fill 的 `dpt-topic-scout` sub-agent 是**直接 spawn** 的（不经过 Queue）。

**为什么 wave2 这样做**（Decision D1）：synthesis 过程中 findings 是依次发现的——数量、内容、搜索需求在 phase 填充时未知，无法预枚举 task card。直接 spawn 是应对动态发现的最简方案。

**这个设计打破了标准三层路径**，失去了 Queue 提供的 queue-level receipt check、queue trace pressure、自动 repair task 生成等能力。它仍必须保留 relay/runtime receipt，并由 Phase Agent ingest 后写入 ledger/index；问题不是"无审计"，而是"不受 Queue 的 receipt/repair 闭环治理"。三个可能的改进方向（待评估，不急于改实现）：

| 方案 | 思路 | 优点 | 代价 |
|------|------|------|------|
| **A: 维持直接 spawn** | 现状 | 简单，适合动态发现；保留 relay/runtime receipt | 绕过 Queue，无 queue-level receipt check / queue trace pressure / auto repair |
| **B: Mid-phase queue refill** | 发现 finding 后动态插入 gap-fill task card → claim → relay → complete | 完整走三层，有 receipt 验证 | 需 queue 支持 mid-phase 动态 refill |
| **C: 预分配 relay delegates** | synthesis task card 的 `targets.delegates` 预分配 N 个 scout slot | 走标准 Queue→Relay 路径 | slot 数量需预分配（可能不够或浪费） |

**当前立场**：直接 spawn 作为 wave2 的 pragmatic 方案可接受，但这是**三层执行模型的已知例外**，不是可推广的模式。任何新 phase 引入 sub-agent dispatch 时，必须先考虑 Queue→Relay 标准路径，仅在有明确动态发现需求且 mid-phase refill 不可行时，才允许直接 spawn。

---

## 9. Anti-Patterns

**不要做的事：**

- **不要让 Phase Agent 自己调 WebSearch/WebFetch**——噪声直接进 Phase Agent 上下文，污染后续所有判断。
- **不要给 sub-agent 完整 WorkflowState**——它不需要知道其他 topic 在做什么、gate 状态是什么、queue 里还有什么。只给 bounded task。
- **不要让 sub-agent 写 workflow 文件**——sub-agent 只写自己的 `runtime-receipt.jsonl`（自证"真的跑了"）。`result.json` 由 Phase Agent 验证 sub-agent 返回的 JSON 后写入；`_status.json` 由 relay engine 在 staging 时创建（=pending）、由 Phase Agent 在验证后更新。
- **不要让 sub-agent 调 queue 或 gate**——queue claim/complete 和 gate 检查是 Phase Agent 的职责。
- **不要用直接 spawn 替代 Queue→Relay 标准路径**——除非有明确的动态发现需求（如 wave2 gap-fill），且已在设计文档中记录为已知例外。

---

## 10. Future Directions

- **多视角并行判断**：同一个 claim，派 3 个不同 sub-agent 从 correctness/security/reproducibility 三个视角独立评估，Phase Agent 综合投票
- **对抗性验证**：spawn 一个 sub-agent 专门尝试驳斥 Phase Agent 当前的结论
- **全量并行 (`-1` 哨兵)**：让当前 task 内的所有 role slot 同时运行，绕过 `MAX_CONCURRENT_SUBAGENTS` 上限
- **Phase-level concurrency override**：允许 phase MD frontmatter 声明自己的并发上限

这些方向尚未纳入当前实现，但 relay 的 `role_key` 参数化、dispatchMap 可扩展、slot 目录结构化已为它们预留了接口。

---

## 11. Relationship to Other Authority

- **`project-charter.md`** defines the four-layer split (Agent/Markdown/Engine/JSON). This guideline operates entirely within that split: Relay is an Engine-side tool; Markdown controls whether and how the Agent uses it.
- **`agentic-workflow-mechanism.md`** defines the outer loop (MD → execute → gate → chain → next). Relay operates inside a single phase, never crossing phase boundaries.
- **`agentic-queue-mechanism.md`** defines Tier 2 (Queue — within-phase task execution). Relay nests inside a single queue task; Queue and Relay are connected by the Phase Agent as bridge, not by direct engine calls.
- **`DPT_FRAMEWORK/engine/subagent-relay.mjs`** is the canonical engine implementation (SUD-001, SUS-001, SUC-001, SUR-001). When this guideline and the engine conflict on behavior, the engine is authority — fix the guideline.
- **`DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`** defines the slot communication contract, directory authority boundary, concurrency control, forbidden authority, and page-fetching degradation chain. When this guideline and the protocol conflict on infrastructure details, the protocol wins.
- **`openspec/specs/subagent-slots/spec.md`** (SUS-001), **`subagent-dispatch/spec.md`** (SUD-001/002/003), **`subagent-collect/spec.md`** (SUC-001/002), **`subagent-repair/spec.md`** (SUR-001) define accepted engine requirements. When this guideline conflicts with an accepted spec, the spec wins.

General rule: when this guideline conflicts with an accepted spec or executable contract, the spec/contract wins. Fix the guideline.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Charter](project-charter.md) — repo-wide charter and authority map.
- [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon; this file's parent document.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain) that Relay nests inside (via Queue).
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — Tier 2 (Queue) that Relay nests inside; defines target separation (§6.2) and context sustainability (§7.3).
- [Framework Runtime Boundary](framework-runtime-boundary.md) — framework vs bundle directory boundary.
- [Command Experiments](command-experiments.md) — how to prove mechanisms with real runtime contexts.
- `DPT_FRAMEWORK/engine/subagent-relay.mjs` — Relay engine implementation (1067 lines).
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` — Slot communication contract and infrastructure spec.
- `DPT_FRAMEWORK/command_playbook/subagent_templates/roles.md` — Six role agent definitions.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Accepted specs](../openspec/specs/) — accepted capability requirements (subagent-slots, subagent-dispatch, subagent-collect, subagent-repair).
