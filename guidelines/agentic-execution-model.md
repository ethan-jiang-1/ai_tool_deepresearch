---
guideline_id: agentic-execution-model
suite: deep-research-guidelines
title: Agentic Execution Model
status: effective
created: 2026-06-24
role: unified execution model and terminology canon for the three-tier agentic execution system
scope: the complete agentic execution loop — how Chain, Queue, and Relay compose into a single nested execution system
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/command-experiments.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Agentic Execution Model

> 状态: 生效 | 创建: 2026-06-24 | 适用: 所有涉及 agentic execution 的设计、实现与阅读

本文档是三道机制的**统一总纲**。它定义全局执行模型、确立术语正典、展示 Chain/Queue/Relay 如何嵌套为一个完整的执行系统。三个机制文件（workflow、queue、subagent）各描述一层；本文档描述它们如何组成整体。

---

## 1. Purpose

系统有三个确定性引擎：transition-chain、queue-manager、subagent-relay。它们分别管 phase 间路由、phase 内 task 编排、task 内 sub-agent 派发。三个文件（`agentic-workflow-mechanism.md`、`agentic-queue-mechanism.md`、`agentic-subagent-mechanism.md`）各描述一层，内容自洽。

但缺少一份文档回答三个跨层问题：

1. **三层如何嵌套为一个完整执行流？** — 每个文件展示自己的局部，没有文件展示全局。
2. **关键术语的唯一定义是什么？** — "three-layer" 在不同文件中指不同概念，"Chain" 在一个文件是外层在另一个是中层。
3. **执行模型与 Project Charter 的权威分工是什么关系？** — Charter 切权威类型（纵向），执行模型切粒度（横向），两者正交但从未被解释。

本文档解决这三个问题。

---

## 2. File Position

This file can decide:

- The unified three-tier execution model: how Chain, Queue, and Relay compose into one nested execution system.
- The canonical terminology for all execution-model concepts. When another file uses a term defined here, this file is the authority.
- How the three mechanism files relate to each other and to this model.
- How the execution model relates to the Project Charter's authority split.

This file cannot decide:

- Concrete behavior within any single tier — those are owned by the respective mechanism files.
- Schema fields, CLI flags, state transitions, receipt grammar, or trace event contracts — those are spec territory.
- Current run state, queue contents, gate outcomes, or evidence counts.
- Implementation permission for new behavior without an OpenSpec change.

---

## 3. The Three-Tier Execution Model

系统的执行架构是**三层嵌套**。每一层管一种粒度，Phase Agent 通过 MD controller mode 在三层之间传递状态。

```
┌──────────────────────────────────────────────────────────┐
│        Phase Agent using MD controller mode                │
│              读 phase MD，调引擎，桥接三层                 │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Tier 1 — Chain (外层)                              │  │
│  │  管 phase 间路由。                                   │  │
│  │  gate pass → chain lookup → next phase node → 重复   │  │
│  │  权威: gate verdict + transitions.chain.json         │  │
│  │  粒度: 单步串行（一步一个 phase）                     │  │
│  │  详见: agentic-workflow-mechanism.md                 │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Tier 2 — Queue (中层)                       │    │  │
│  │  │  管 phase 内 task 编排。                      │    │  │
│  │  │  fill → claim → execute → complete(receipt)  │    │  │
│  │  │       → 循环至 queue 空 → 跑 gate             │    │  │
│  │  │  权威: queue-manager state + receipt check    │    │  │
│  │  │  粒度: task 级串行（一次一个 task）            │    │  │
│  │  │  详见: agentic-queue-mechanism.md             │    │  │
│  │  │                                              │    │  │
│  │  │  ┌──────────────────────────────────────┐    │    │  │
│  │  │  │  Tier 3 — Relay (内层)                │    │    │  │
│  │  │  │  管 task 内 sub-agent dispatch。       │    │    │  │
│  │  │  │  stage slots → spawn role agent(s)    │    │    │  │
│  │  │  │     → collect → merge → 写产出文件     │    │    │  │
│  │  │  │  权威: result.schema.json              │    │    │  │
│  │  │  │       + runtime-receipt.jsonl          │    │    │  │
│  │  │  │  粒度: role 级并行（上限 4）            │    │    │  │
│  │  │  │  详见: agentic-subagent-mechanism.md   │    │    │  │
│  │  │  └──────────────────────────────────────┘    │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.1 三层不越级

每层只跟相邻层通过**产出文件**交接，Phase Agent 是运行时桥梁，MD controller mode 是它使用的 Markdown 控制模式：

```
Chain 产出: gate pass → check.next (fileRef)
  → Phase Agent 加载下一个 phase MD → 进入 Queue
Queue 产出: task card (`targets` + receipt spec)
  → Phase Agent 判断 `targets` / delegation → 如需 Sub-agent，进入 Relay
Relay 产出: result.json
  → Phase Agent 基于 result 写 artifact → 回到 Queue complete(receipt)
```

Chain 不知道 Queue 的存在。Queue 不知道 Relay 的存在。Relay 不知道 Chain 或 Queue 的存在。**Phase Agent 以 MD controller mode 读 phase MD，依次调用引擎，把它们的产出拼接成完整执行流。**

### 3.2 并发粒度分配

| Tier | 并发模型 | 原因 |
|------|---------|------|
| Tier 1 — Chain | 单步串行 | 一次只在一个 phase，gate 必须逐个验证 |
| Tier 2 — Queue | task 级串行 | receipt 必须逐个校验后才能推进 |
| Tier 3 — Relay | role 级并行（≤4） | 一个 task 内的多个 sub-agent 可同时运行 |

三层各有各的并发粒度，互不干涉。

---

## 4. Terminology Canon

以下术语在本文档中有唯一定义。当其他文件的用法与本文档冲突时，本文档为权威。

### 4.1 执行模型术语

| 术语 | 定义 | 旧称/别称 | 备注 |
|------|------|----------|------|
| **Three-Tier Execution Model** (三层执行模型) | §3 定义的 Chain → Queue → Relay 嵌套执行系统 | "三层编排模型" | 这是本文档的核心概念。唯一命名为 "three-tier" 的概念 |
| **Tier** (层) | 执行粒度的一级嵌套。Tier 1 包含 Tier 2，Tier 2 包含 Tier 3 | — | 不与 "authority layer" 混用 |
| **Chain** | Tier 1 — `transitions.chain.json` + transition engine。管 phase 间路由 | — | 同一 artifact 在执行模型与权威架构中处于不同位置，详见 §4.4 |
| **Queue** | Tier 2 — `queue-manager.mjs` + `operate-queue.mjs`。管 phase 内 task 编排 | AGQ | — |
| **Relay** | Tier 3 — `subagent-relay.mjs`。管 task 内 sub-agent dispatch | — | — |
| **Agent actor** | 执行工作的 LLM/人类 actor。系统里的 Agent actor 都通过某种 Markdown 或结构化指令工作 | "Agent" | 这是执行主体，不是控制面，也不是权限级别 |
| **Phase Agent** | 当前执行 phase-level Markdown 的 Agent actor：读 phase node、做流程决策（claim/spawn/gate）、读取反馈、桥接 Chain/Queue/Relay | "main Agent", "parent Agent", "orchestrator" | 这是运行时角色，不是永久身份；同一个底层 Agent actor 在不同上下文中可承担不同角色 |
| **Sub-agent** | 执行 bounded task Markdown（`task.md` + `result.schema.json`）的 Agent actor：做 I/O 密集或窄范围工作，返回结构化结果 | "child Agent", "worker" | Sub-agent 也跑 MD，只是 MD surface 更窄；它不碰 WorkflowState、gate、queue |
| **MD controller mode** | Phase Agent 使用 phase-level Markdown 进行流程控制的模式：读 phase MD → 调 Engine checkpoint → 读取 check/inspect/advice → 继续/修复/阻塞 | "MD controller" | 这是控制模式/控制面，不是 Agent 身份。Sub-agent 也使用 Markdown control surface，但不是 workflow-level MD controller mode |
| **Markdown control surface** | Agent actor 可读的 Markdown 操作面，包括 phase node、task card、playbook、slot task 等 | "MD control surface" | 不拥有机器裁决；它把任务、约束和反馈带回 Agent 上下文 |

### 4.2 Actor Roles and MD Surfaces

| Actor role | MD surface used | Authority boundary |
|------------|-----------------|--------------------|
| **Phase Agent** | Phase node, shared workflow context, queue projection, gate feedback | Can bridge Chain/Queue/Relay through accepted Engine/CLI/API calls; cannot self-declare deterministic truth |
| **Sub-agent** | Relay slot `task.md` + `result.schema.json` | Can perform bounded task work and produce structured result/receipt; cannot mutate queue, pass gates, or write workflow authority files |
| **Human operator** | Project docs, HITL prompts, command playbooks | Can provide decisions/input where requested; runtime truth still lives in bundle files and accepted Engine output |

`targets.controller: "main-agent"` and `--actor main-agent` are current executable wire/API values. They remain valid until a separate OpenSpec migration changes schema and CLI contracts. In conceptual prose, prefer **Phase Agent** for the actor role and **MD controller mode** for the control mode.

### 4.3 易混淆概念对照

以下是三个容易混淆的概念——它们都用过 "layer" 这个词，但指完全不同的事物：

| 概念 | 本文档中的名称 | 定义 | 出处 |
|------|--------------|------|------|
| Chain → Queue → Relay 嵌套 | **Three-Tier Execution Model** (三层执行模型) | 执行粒度嵌套：phase 间 → task 间 → sub-agent 间 | 本文档 §3 |
| MD / Chain / Engine 权威分工 | **Three-Authority Architecture** (三层权威架构) | 控制权分工：谁控制( MD)、谁路由(chain table)、谁验证(JS engine) | `agentic-workflow-mechanism.md` |
| Outer loop + Inner loop | **Two Nested Loops** (两层嵌套循环) | Queue 机制的内部模型：outer = Tier 1, inner = Tier 2 | `agentic-queue-mechanism.md` §3 |

**为什么有三个不同的"三层"？** 因为它们切系统的轴不同。三层执行模型切**执行粒度**（纵向嵌套）。三层权威架构切**权威类型**（控制面分工）。两层嵌套循环是三层的简化视角——queue 文件聚焦 phase 内行为，把 Tier 1 (Chain) 和 Tier 2 (Queue) 建模为两个 loop，Tier 3 (Relay) 在 queue 文件的视角中是不可见的（它藏在 task 执行内部）。

三者不冲突。但读者必须知道自己在看哪个轴。

### 4.4 "Chain" 的双重角色

`transitions.chain.json` 是同一个 artifact，但在两个模型中处于不同位置：

| 视角 | Chain 是什么 | 出处 |
|------|------------|------|
| **执行模型**（粒度轴） | Tier 1 — 最外层。phase 间路由的权威 | 本文档 §3 |
| **权威架构**（控制轴） | 中间组件 — 被动路由表。在 MD（控制器）和 JS Engine（验证器）之间 | `agentic-workflow-mechanism.md` |

这不是矛盾。在执行模型中，Chain 是最外层 Tier——因为 phase 路由是最大粒度的编排动作。在权威架构中，Chain 是被查询的路由表——它不控制任何东西，MD 控制流程，Engine 执行验证，Chain 只回答"下一个是谁"。同一块石头，从山脚看是山顶，从山顶看是地面。

---

## 5. Complete Execution Flow

以 wave0 的一个 source-intake task 为例，展示一个工作单元如何完整穿过三层：

```
[Phase Agent 在 phase-wave0.md 的上下文中]

1. Tier 2 — Queue: claim
   Phase Agent 执行 operate-queue claim → 获得 task card:
   {
     work_id: "wave0-source-...",
     targets: {
       controller: "main-agent",
       delegates: { to: "sub-agent", role_key: "dpt-source-intake" }
     },
     receipt: "file:reference/topic/source.yaml"
   }

2. Phase Agent 判断
   task.targets.delegates.to == "sub-agent" → 这件工作委托给 Tier 3 (Relay)

3. Tier 3 — Relay: stage
   Phase Agent 调 stageSubagentSlots() → 写 slot 目录:
   _subagents/wave_00/slot_01/{task.md, result.schema.json, _status.json(=pending)}

4. Tier 3 — Relay: spawn
   Phase Agent spawn native sub-agent (dpt-source-intake)
   → sub-agent 读 task.md，执行 WebSearch + WebFetch
   → sub-agent 写 runtime-receipt.jsonl (agent_runtime_started + agent_result_ready)
   → sub-agent 返回结构化 JSON

5. Tier 3 — Relay: collect
   Phase Agent 验证 JSON 符合 result.schema.json → 写入 result.json → 更新 _status.json(=done)
   Phase Agent 调 collectResults() → 读回 result
   Phase Agent 基于 result 写产出文件: reference/<topic>/source.yaml

6. Tier 2 — Queue: complete
   Phase Agent 执行 operate-queue complete → queue 检查 receipt:
   reference/<topic>/source.yaml 存在 + schema 通过? → PASS
   → promote 下一个 task → refill → render projection

7. Tier 2 — Queue: 循环
   Phase Agent 回到步骤 1 (claim 下一个 task)
   ...直到 queue 空 (claim 返回 item: null)

8. Tier 1 — Chain: gate + transition
   Phase Agent 跑 gate CLI → gate pass → chain lookup → check.next = phase-wave1.md
   Phase Agent 加载 phase-wave1.md → 进入下一个 phase
```

**关键交接点（只有三个）**：
- **Queue → Relay**：task.targets.delegates.to == "sub-agent" → Phase Agent 决定进 Relay
- **Relay → Queue**：result.json → Phase Agent 写 artifact → complete(receipt)
- **Queue → Chain**：queue 空 → Phase Agent 跑 gate → chain 返回 next

---

## 6. Relationship to the Project Charter

Project Charter 定义了**四类权威**（Agent / Markdown / JS-Engine / JSON-State）——这是系统的纵向切面：谁拥有哪类真理。

三层执行模型定义了**三级粒度**（Chain / Queue / Relay）——这是系统的横向切面：工作如何从大到小逐级分解。

```
            权威轴 (Charter)
            ↑
    Agent   │   Markdown   JS/CLI   JSON/JSONL
            │
Tier 1 ─────┼──────────────────────────────────→ 执行轴 (本文档)
Chain       │  gate pass   chain     chain.json
            │  (MD tells   lookup    routing
            │   Agent to   (Engine)  table
            │   run gate)
            │
Tier 2 ─────┼──────────────────────────────────
Queue       │  task card   claim/    rb_queue
            │  (MD drives  complete  .json
            │   the loop)  (CLI)
            │
Tier 3 ─────┼──────────────────────────────────
Relay       │  slot task   stage/    result.
            │  (MD tells   collect   schema.json
            │   Agent to   (API)     runtime-
            │   spawn)              receipt
```

两者正交、互补。Charter 回答"谁有权威做这个决定"。执行模型回答"这个决定发生在哪个粒度层"。一个新的设计问题通常需要两个答案。

---

## 7. How to Read the Mechanism Files

| 阅读顺序 | 文件 | 覆盖 |
|---------|------|------|
| 1 | `agentic-execution-model.md`（本文档） | 全局模型、术语正典、三层嵌套 |
| 2 | `agentic-workflow-mechanism.md` | Tier 1 (Chain) + 三层权威架构 |
| 3 | `agentic-queue-mechanism.md` | Tier 2 (Queue) + 两层嵌套循环 |
| 4 | `agentic-subagent-mechanism.md` | Tier 3 (Relay) + 噪声隔离原则 |

每个机制文件在开头引用本文档作为上游权威。细节在各机制文件；全局图景在本文档。

---

## 8. MUST / MUST NOT

### Terminology

- MUST use "Three-Tier Execution Model" when referring to the Chain → Queue → Relay nesting.
- MUST use "Three-Authority Architecture" when referring to the MD / Chain-table / JS-Engine control split.
- MUST use "Tier" for execution-granularity nesting, not "layer."
- MUST use "Phase Agent" for the Agent actor currently executing phase-level Markdown and bridging Chain/Queue/Relay.
- MUST use "MD controller mode" for the phase-level Markdown control mode, not as an Agent identity.
- MUST use "sub-agent" for an Agent actor executing bounded task Markdown (`task.md` + `result.schema.json`).
- MUST treat `"main-agent"` as a legacy/current wire value only when describing existing schema, CLI, fixtures, or examples.
- MUST NOT use "three-layer" without qualification. Specify which model.

### Architecture

- MUST treat the three tiers as nested: Tier 1 contains Tier 2, Tier 2 contains Tier 3.
- MUST NOT let a tier skip its neighbor. Chain does not call Relay. Queue does not call Chain.
- MUST treat the Phase Agent, operating in MD controller mode, as the sole orchestrator bridging all three tiers.
- MUST treat the three engines as mutually unaware.

### Documentation

- MUST reference this document as the authority when defining execution-model terms in other guidelines.
- MUST update this document's Terminology Canon when a new execution concept is introduced.
- MUST NOT introduce a new name for a concept already defined in §4 without updating this document first.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Charter](project-charter.md) — repo-wide charter and authority map.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain) and the Three-Authority Architecture.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — Tier 2 (Queue) and the Two Nested Loops model.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — Tier 3 (Relay) and noise-isolation principles.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary for framework assets versus runtime bundles.
- [Command Experiments](command-experiments.md) — how to prove mechanisms with real runtime contexts.
