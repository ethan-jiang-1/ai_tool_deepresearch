---
guideline_id: agentic-workflow-mechanism
suite: deep-research-guidelines
title: Agentic Workflow Mechanism
status: effective
created: 2026-06-23
revised: 2026-07-25
role: non-authoritative system-understanding model of the Agent-driven dynamic-loading workflow loop
scope: all Agent-driven workflow execution across DEEP_RESEARCH_HARNESS/, dpt_rb_*/, and dpt_disp_*/
authority: guidance
defers_to:
  - openspec/constitution/project-charter.md
---

# Agentic Workflow Mechanism

> 状态: 生效 | 创建: 2026-06-23 | 修订: 2026-07-25 | 适用: 所有 Agent 驱动的 workflow 执行

---

## Purpose

本文件定义 agentic workflow 的运行时循环机制：Phase Agent 如何从第一个 phase node 走到最后一个——谁驱动、谁路由、谁验证，以及三类权威组件之间不可逾越的边界。

这是一个**强约束机制描述**，不是设计草案。它描述的是当前已实现并验证的 workflow 执行方式。

---

## File Position

This file can decide:

- The agentic loop architecture: who drives, who routes, who validates.
- The Three-Authority Architecture between MD phase nodes, chain routing table, and JS validation engine.
- Hard boundaries on what each authority component does not do.

This file cannot decide:

- Concrete schema fields, CLI flags, gate rule definitions, or trace event contracts.
- Current run state, bundle contents, or gate outcomes.
- Future mechanisms that have not passed OpenSpec acceptance.

---

## Simple Control Posture

This Tier 1 mechanism follows [`evolution-simple-reliable-control.md`](../../constitution/evolution/simple-reliable-control.md): Chain reliability comes from a short explicit handoff, not from adding a smarter workflow controller.

The preferred path stays one hop at each boundary:

```text
current phase artifact/state -> gate check -> one chain lookup -> one check.next -> one target-node load
```

- Gate rules should read direct Source-of-Record facts and return the smallest actionable root-cause set.
- A missing prerequisite should short-circuit dependent checks instead of producing a cascade of routing or quality symptoms.
- `transitions.chain.json` should remain a passive direct mapping; do not add fallback routers, inferred cursors, shadow lifecycle state, or multi-stage auto-recovery.
- If a proposed workflow mechanism needs several derived decisions before it can tell the Phase Agent what to do next, simplify or split the change before implementation.

---

## The Agentic Loop

> 本文件描述 [三层执行模型](agentic-execution-model.md) 中的 **Tier 1 — Chain**（外层）。三层嵌套关系和术语正典见该文档。

Agent 驱动的 workflow 不是 JS engine 跑循环。它是一个 **Phase Agent 读 phase MD → 执行 → gate 验证 → chain 查路由 → 通过 accepted handoff loader/check 消费 `check.next` → 读取下一 phase MD → 重复** 的动态加载闭环。

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  1. Phase Agent 加载当前 phase node MD (assessNode)   │
│         │                                            │
│         ▼                                            │
│  2. MD body 告诉 Phase Agent：目标、动作、gate 命令    │
│         │                                            │
│         ▼                                            │
│  3. Phase Agent 执行动作 → 跑 gate CLI                │
│         │                                            │
│         ▼                                            │
│  4. Gate 内部查 transitions.chain.json                │
│     → check.next = 下一个 node 的 fileRef             │
│         │                                            │
│         ▼                                            │
│  5. Phase Agent 读 check.next → handoff loader/check   │
│     渲染下一 phase node MD                              │
│         │                                            │
│         └────────────── 循环 ───────────────────────→ 1
│                                                      │
└──────────────────────────────────────────────────────┘
```

这个循环的驱动力是 **Phase Agent operating in MD controller mode**，不是 JS 代码。不存在 `while(true) { advance() }`，不存在 lifecycle walker，不存在 cursor 指针。Phase Agent 手持当前 node，做完 gate 验证后问 chain "下一个是谁"，拿到 fileRef，再通过 accepted loader/check 消费这个 `check.next` 并把渲染出的下一段 Markdown 读回上下文。

边界词要分清：`advance-status` / `phase_transition` 只同步 runtime status；`enter-phase` / route-bound `load_complete` 只证明 Phase Agent 进入了目标 Markdown control surface。目标 phase 的 work completion 仍要靠目标 phase 自己的 artifacts 和 gate/content rules 证明。

---

## Three-Authority Architecture

> 这是权威分工轴（MD / Chain / Engine），与 [执行模型](agentic-execution-model.md) 的执行粒度轴（Chain / Queue / Work Unit）正交。详见该文档。

三类权威组件各司其职，边界不可模糊：

> 本节「约定/反向约定」是术语纪律（非权威 model 的读法约定）；规范性效力以对应 accepted spec 为准（如 `engine/transition-table`、`workflow/workflow-node-contract`），不在本文件。

| 权威组件 | 是什么 | 做什么 | 边界（不做） |
|----|--------|--------|----------|
| **MD phase node** | controller surface | 告诉 Phase Agent：这一步的目标、输入、允许动作、gate 命令、pass/fail 处理、stop 行为、反作弊规则 | 不做确定性裁决；不查路由表；不写 trace |
| **transitions.chain.json** | passive routing table | `{ currentNodeRef, outcome } → nextNodeRef`，纯静态映射 | 不编码分支逻辑（fail/repair 归 Agent）；不持有状态；不驱动循环 |
| **JS Engine** (gate CLI, loader/check, trace) | validator + lookup | schema 校验、gate 规则评估、chain 查表、trace/loader receipt 写入 | 不驱动循环；不自主选择或执行下一个 node；不做语义判断；不选修复策略 |

### MD Phase Node — Controller

每个 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-*.md` 是一个独立的 controller surface。它的 frontmatter 声明元数据（`phase`、`gate`、`stop`），它的 body 包含完整的执行指令。Phase Agent 读它，照它说的做。

- **约定**：每个 phase node 的 body 定义该阶段的完整控制面（目标、动作、gate 命令、pass/fail 处理）。
- **约定**：Phase Agent 执行完毕后跑 gate CLI，读取 `check.next`，再通过 accepted handoff loader/check 消费该 node。
- **反向约定**：MD node 不越过 gate 自行声明 next。transition 路由是 chain 的职责。

### transitions.chain.json — Passive Routing Table

`DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json` 是唯一的路由数据源。它是一个纯静态映射：给定当前 node fileRef 和 gate outcome，返回下一个 node fileRef。

- **约定**：chain 编码**确定性出口**（outcome 有固定、上下文无关的 next-node 目标，如 `passed` 和 `rerun`）。不确定 branch（`request_view_revision`、`repair`、`stop_blocked`）归 Agent 判断，不进入 chain。
- **约定**：chain 的 key 和 value 都是 node fileRef（如 `phases/phase-wave0.md`），不是 gate key 或 phase key。
- **反向约定**：chain 不持有状态、不计数、不追踪 cursor、不编码条件分支。它回答查询，仅此而已。

chain 是**被查询**的——Phase Agent 通过 gate/Engine 的 `resolveNodeTransitionDetailed()` 问它，它回答一个字符串。它不知道谁在问、为什么问、问完要干什么。

### JS Engine — Validator + Lookup

Engine 层（gate CLI、ask-next.mjs、transition-chain.mjs、trace.mjs、workflow-chain.mjs）只做确定性工作：校验、查表、写审计记录。

- **约定**：gate CLI 接收 `--bundle` 和 `--current-node`，内部调用 chain 查路由，输出 `check.next`。
- **约定**：路由查询入口在 Engine 内部——MD/Phase Agent 不自己查路由。当前实现（`resolveNodeTransitionDetailed()`）按 transition file 后缀分发（`.chain.json`），但具体函数名与后缀调度规则归 accepted spec，不是本文件的 normative 契约。
- **约定**：trace 写入 `rb_trace.jsonl`，append-only，是 pass/fail 的权威审计 trail。
- **反向约定**：Engine 不编排多阶段流程，不自主选择、加载或执行下一个 node，不选修复策略，不做语义判断。

`workflow-chain.mjs` 是被动引擎：Phase Agent 调 `assessNode(fileRef)` 加载**这一个** node（及其依赖闭包），Engine 返回 MD content。Phase Agent 决定下一步——Engine 不推进循环。

---

## Dynamic Loading

Node 按需加载，不预加载。

- **约定**：Phase Agent 只在拿到 `check.next` 后才通过 accepted loader/check 加载下一个 node。不存在「先把所有 node 读进内存」的步骤。
- **约定**：Engine 的运行时按需读缓存（避免重复读磁盘）只是缓存，不是预加载机制。
- **反向约定**：manifest 不是执行顺序的权威——chain 才是。manifest 列出所有 node，chain 定义它们之间的转移。

当前 workflow 的 `transitions.chain.json` 里列出的 node（instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness → rerun → final）在 Phase Agent 走到之前不会被加载。chain 只是地图，不是行程单。

---

## Reading Conventions

> Terminology discipline only: the accepted specs (e.g. `engine/transition-table`, `workflow/workflow-node-contract`) own the normative effect of these reading conventions; this model document does not.

- Convention: MD phase nodes are the controller for each workflow step.
- Convention: `transitions.chain.json` is the single source of truth for node-to-node routing.
- Convention: route through the Engine's accepted transition lookup — no hardcoded next, no manifest-based next inference.
- Convention: the Phase Agent is the runtime driver: read phase MD → execute → gate → chain lookup → consume `check.next` through the accepted handoff loader/check → read next phase MD.
- Convention: the JS Engine stays stateless and passive: validate, look up, write trace — never drive the loop.
- Convention: deterministic outcomes are encoded in chain. A deterministic outcome is one with a fixed, context-independent next-node target. Currently: `passed` (all phases) and `rerun` (HITL2). Indeterminate branches (`request_view_revision`, `repair`, `stop_blocked`) whose target depends on Agent runtime judgment have no chain entries — they return `no_transition`.
- Convention: load nodes on demand, driven by `check.next` and the accepted handoff loader/check — never preload the whole graph.
- Convention: keep each phase boundary as a short explicit chain: direct gate facts -> one verdict -> one route lookup -> one target-node load.

Concrete function and file names referenced above (e.g. the current `resolveNodeTransitionDetailed()` entry point and `assessNode()` node loader) are descriptive anchors for the current implementation, not part of this normative contract. They may be renamed, wrapped, or relocated by an accepted project change; the principles above must hold either way. The applicable accepted contract owns function, file-naming, and backend-dispatch details.

## Anti-Conventions

- Anti-convention: implement a JS walker, cursor, or loop that drives node-to-node progression.
- Anti-convention: encode indeterminate branch logic into `transitions.chain.json`. Outcomes whose target depends on Agent judgment of runtime state (`request_view_revision`, `repair`, `stop_blocked`) have no chain entries.
- Anti-convention: preload all nodes at startup.
- Anti-convention: let MD node or Phase Agent bypass gate verification to declare next node.
- Anti-convention: let JS Engine decide which node to load next or when to advance.
- Anti-convention: reintroduce FSM as a transition mechanism. Chain is the only backend.
- Anti-convention: use manifest as the source of transition truth — manifest is inventory, chain is routing.
- Anti-convention: add layered fallback routing, derived lifecycle controllers, or cascading gate diagnostics when a direct check and one `check.next` are sufficient.

---

## Derived Constraints

These are not architectural rules — they are implementation properties that must hold for the agentic workflow loop to actually function. Each is a "the loop cannot function without solving this" constraint.

### Chain Completeness

`transitions.chain.json` must contain valid edges for every **deterministic** phase-to-phase transition the workflow needs. A deterministic transition is one whose outcome has a fixed, context-independent next-node target. Currently: `passed` (all phases — gate-determined normal next) and `rerun` (HITL2 — user-chosen incremental rerun path). A missing edge for a deterministic outcome produces `no_transition` from the chain lookup — the Phase Agent receives no next node and the loop stalls. The chain is a static file; it cannot recover from missing entries at runtime.

Indeterminate branches — outcomes whose targets depend on Agent judgment of runtime state — are intentionally absent from chain. These include `request_view_revision` (Agent decides which phase to return to), `repair` (Agent stays in HITL2 to fix issues), and `stop_blocked` (terminal, no next). Chain correctly returns `no_transition` for these.

Every new phase added to the workflow needs its deterministic chain entries before the phase can be reached through the normal loop.

### Dynamic Loading Integrity

The Phase Agent loads each phase node on demand by consuming `check.next` through the accepted handoff loader/check. If nodes are preloaded (or the Phase Agent guesses the next node), two failures become possible: (a) the Phase Agent executes a phase the gate did not authorize, bypassing the gate's deterministic checkpoint; (b) the Phase Agent's context accumulates the content of phases it has not yet reached, defeating the context-isolation benefit of single-phase-at-a-time execution. The on-demand loading is not a performance optimization — it is a structural requirement for the gate-chain contract to hold.

`enter-phase` and the resulting route-bound `load_complete` are handoff witnesses. They prove target-node entry/loading, not target-phase work completion. After handoff, the Phase Agent must still execute the target phase and pass its own gate or content checks before that target work is complete.

### Gate as Sole Phase Boundary

The gate CLI is the only mechanism that queries the chain and produces `check.next`. If the Phase Agent skips the gate and declares "phase complete" on its own authority, the chain is never consulted and the loop breaks. The gate is not a formality — it is the deterministic verifier that the current phase's exit conditions are met. Without it, phase-to-phase routing reverts to Agent self-governance, which the project charter prohibits.

### MD Node Availability

Every `fileRef` in `transitions.chain.json` must resolve to a readable Markdown file in `DEEP_RESEARCH_HARNESS/workflows/nodes/`. A chain entry pointing to a missing or unreadable file produces a load failure that stops the loop. Node files are the Phase Agent's sole source of phase-level instruction; if one is missing, there is no fallback.

---

## Related Guidance

- [OpenSpec Control Map](../../README.md) — guidance roles and reading routes.
- [Project Charter](../../constitution/project-charter.md) — repo-wide charter and authority map.
- [Abstraction as Semantic Precision](../../constitution/evolution/abstraction-semantic-precision.md) — establish the semantic level before adding a phase, route, or handoff distinction.
- [Simple Reliable Control](../../constitution/evolution/simple-reliable-control.md) — short decision chains, root-cause short-circuiting, and quality-control complexity limits.
- [Helper-Oriented Agent](../../constitution/evolution/helper-oriented-agent.md) — action responsibility after the semantic level and control shape are clear.
- [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon; this file's parent document.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary for framework assets versus runtime bundles.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — Tier 2 (Queue) for within-phase task execution; defines the inner loop that nests inside this file's outer loop.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — work-unit-mediated Sub-agent execution within the current execution model.
- [Command Experiments](../../operations/command-experiments.md) — how to prove mechanisms with real runtime contexts.

## Relationship to Other Guidelines

- **project-charter.md** 定义 Agent/Engine/Markdown 的 authority split。本文件描述这个 split 在 workflow 执行中的具体机制。
- **evolution-abstraction-semantic-precision.md** 先审视新增 phase、route 或 reader-facing view 是否让一个明确读者对有界问题精确推理；本文件不把一个新名字本身当作足够理由。
- **evolution-simple-reliable-control.md** 定义本机制的复杂度上限：一跳路由、直接 gate facts、最小根因反馈，不把 Chain 扩成隐藏 controller。
- **evolution-helper-oriented-agent.md** 在语义层和控制形状已经明确后，定义用户、Agent 与 Engine 的行动责任边界。
- **framework-runtime-boundary.md** 定义 framework assets vs runtime bundles 的目录边界。本文件假设这个边界已成立，在这个边界之上描述运行时循环。
- **agentic-queue-mechanism.md** 定义 queue-driven phase execution 的机制边界：两层嵌套 loop、dispatch rule、结构约束和结果义务。queue engine 与 seed-topics/wave0/wave1/wave2 integrations 已进入 accepted runtime；未来 stop/context/recovery work 仍需 OpenSpec，并受 simple-reliable-control 的最小实现纪律约束。
- **agentic-subagent-mechanism.md** 定义 work-unit-mediated Sub-agent execution 的机制指导：噪声隔离、bounded task、runtime receipt、submit provenance。本文件描述的 Chain 是 Sub-agent 执行的上层 phase 路由容器；Sub-agent work units 在单个 phase 内部被 claimed/submitted，不跨 phase。完整嵌套关系见 agentic-execution-model。

---
