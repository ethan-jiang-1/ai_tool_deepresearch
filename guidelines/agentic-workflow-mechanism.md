---
guideline_id: agentic-workflow-mechanism
suite: deep-research-guidelines
title: Agentic Workflow Mechanism
status: effective
created: 2026-06-23
role: normative mechanism description of the Agent-driven dynamic-loading workflow loop
scope: all Agent-driven workflow execution across DPT_FRAMEWORK/ and dpt_rb_*/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/command-experiments.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Agentic Workflow Mechanism

> 状态: 生效 | 创建: 2026-06-23 | 适用: 所有 Agent 驱动的 workflow 执行

---

## Purpose

本文件定义 agentic workflow 的运行时循环机制：Agent 如何从第一个 phase node 走到最后一个——谁驱动、谁路由、谁验证，以及三层之间不可逾越的边界。

这是一个**强约束机制描述**，不是设计草案。它描述的是当前已实现并验证的 workflow 执行方式。

---

## File Position

This file can decide:

- The agentic loop architecture: who drives, who routes, who validates.
- The three-layer authority split between MD controllers, chain routing table, and JS validation engine.
- Hard constraints on what each layer MUST NOT do.

This file cannot decide:

- Concrete schema fields, CLI flags, gate rule definitions, or trace event contracts.
- Current run state, bundle contents, or gate outcomes.
- Future mechanisms that have not passed OpenSpec acceptance.

---

## The Agentic Loop

Agent 驱动的 workflow 不是 JS engine 跑循环。它是一个 **Agent 读 MD → 执行 → gate 验证 → chain 查路由 → 加载下一 MD → 重复** 的动态加载闭环。

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  1. Agent 加载当前 phase node MD (assessNode)         │
│         │                                            │
│         ▼                                            │
│  2. MD body 告诉 Agent：目标、动作、gate 命令          │
│         │                                            │
│         ▼                                            │
│  3. Agent 执行动作 → 跑 gate CLI                      │
│         │                                            │
│         ▼                                            │
│  4. Gate 内部查 transitions.chain.json                │
│     → check.next = 下一个 node 的 fileRef             │
│         │                                            │
│         ▼                                            │
│  5. Agent 读 check.next → 加载下一 phase node MD       │
│         │                                            │
│         └────────────── 循环 ───────────────────────→ 1
│                                                      │
└──────────────────────────────────────────────────────┘
```

这个循环的驱动力是 **Agent**，不是 JS 代码。不存在 `while(true) { advance() }`，不存在 lifecycle walker，不存在 cursor 指针。Agent 手持当前 node，做完 gate 验证后问 chain "下一个是谁"，拿到 fileRef，自己去加载下一个。

---

## Three-Layer Architecture

三层各司其职，边界不可模糊：

| 层 | 是什么 | 做什么 | MUST NOT |
|----|--------|--------|----------|
| **MD phase node** | controller | 告诉 Agent：这一步的目标、输入、允许动作、gate 命令、pass/fail 处理、stop 行为、反作弊规则 | 不做确定性裁决；不查路由表；不写 trace |
| **transitions.chain.json** | passive routing table | `{ currentNodeRef, outcome } → nextNodeRef`，纯静态映射 | 不编码分支逻辑（fail/repair 归 Agent）；不持有状态；不驱动循环 |
| **JS Engine** (gate CLI, ask-next, trace) | validator + lookup | schema 校验、gate 规则评估、chain 查表、trace 写入 | 不驱动循环；不加载 node；不做语义判断；不选修复策略 |

### MD Phase Node — Controller

每个 `DPT_FRAMEWORK/workflows/nodes/phases/phase-*.md` 是一个独立的 controller。它的 frontmatter 声明元数据（`phase`、`gate`、`stop`），它的 body 包含完整的执行指令。Agent 读它，照它说的做。

- **MUST**：每个 phase node 的 body 定义该阶段的完整控制面（目标、动作、gate 命令、pass/fail 处理）。
- **MUST**：Agent 执行完毕后跑 gate CLI，读取 `check.next` 确定下一个 node。
- **MUST NOT**：MD node 越过 gate 自行声明 next。transition 路由是 chain 的职责。

### transitions.chain.json — Passive Routing Table

`DPT_FRAMEWORK/workflows/transitions.chain.json` 是唯一的路由数据源。它是一个纯静态映射：给定当前 node fileRef 和 gate outcome，返回下一个 node fileRef。

- **MUST**：chain 只编码 `passed` 边（deterministic normal-next）。fail/repair/rerun 分支归 Agent 决策，不进入 chain。
- **MUST**：chain 的 key 和 value 都是 node fileRef（如 `phases/phase-wave0.md`），不是 gate key 或 phase key。
- **MUST NOT**：chain 不持有状态、不计数、不追踪 cursor、不编码条件分支。它回答查询，仅此而已。

chain 是**被查询**的——Agent 通过 `resolveNodeTransitionDetailed()` 问它，它回答一个字符串。它不知道谁在问、为什么问、问完要干什么。

### JS Engine — Validator + Lookup

Engine 层（gate CLI、ask-next.mjs、transition-chain.mjs、trace.mjs、workflow-chain.mjs）只做确定性工作：校验、查表、写审计记录。

- **MUST**：gate CLI 接收 `--bundle` 和 `--current-node`，内部调用 chain 查路由，输出 `check.next`。
- **MUST**：`resolveNodeTransitionDetailed()` 是唯一的路由查询入口。按文件后缀分发，当前只接受 `.chain.json`。
- **MUST**：trace 写入 `rb_trace.jsonl`，append-only，是 pass/fail 的权威审计 trail。
- **MUST NOT**：Engine 不编排多阶段流程，不自主加载下一个 node，不选修复策略，不做语义判断。

`workflow-chain.mjs` 是被动引擎：Agent 调 `assessNode(fileRef)` 加载**这一个** node（及其依赖闭包），Engine 返回 MD content。Agent 决定下一步——Engine 不推进循环。

---

## Dynamic Loading

Node 按需加载，不预加载。

- **MUST**：Agent 只在拿到 `check.next` 后才加载下一个 node。不存在「先把所有 node 读进内存」的步骤。
- **MUST**：`workflow-chain.mjs` 的 `contentCache` 是运行时缓存（避免重复读磁盘），不是预加载机制。
- **MUST NOT**：manifest 不是执行顺序的权威——chain 才是。manifest 列出所有 node，chain 定义它们之间的转移。

`transitions.chain.json` 里的 10 个 node（instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness → final）在 Agent 走到之前不会被加载。chain 只是地图，不是行程单。

---

## MUST

- MUST treat MD phase nodes as the controller for each workflow step.
- MUST treat `transitions.chain.json` as the single source of truth for node-to-node routing.
- MUST route through `resolveNodeTransitionDetailed()` — no hardcoded next, no manifest-based next inference.
- MUST keep the Agent as the runtime driver: read MD → execute → gate → chain lookup → load next MD.
- MUST keep JS Engine stateless and passive: validate, look up, write trace — never drive the loop.
- MUST encode only `passed` edges in chain. Fail/repair/rerun paths belong to Agent judgment.
- MUST load nodes on demand via `assessNode()`, driven by `check.next`.

## MUST NOT

- MUST NOT implement a JS walker, cursor, or loop that drives node-to-node progression.
- MUST NOT encode repair, fail, or branch logic into `transitions.chain.json`.
- MUST NOT preload all nodes at startup.
- MUST NOT let MD or Agent bypass gate verification to declare next node.
- MUST NOT let JS Engine decide which node to load next or when to advance.
- MUST NOT reintroduce FSM as a transition mechanism. Chain is the only backend.
- MUST NOT use manifest as the source of transition truth — manifest is inventory, chain is routing.

---

## Relationship to Other Guidelines

- **project-charter.md** 定义 Agent/Engine/Markdown 的 authority split。本文件描述这个 split 在 workflow 执行中的具体机制。
- **framework-runtime-boundary.md** 定义 framework assets vs runtime bundles 的目录边界。本文件假设这个边界已成立，在这个边界之上描述运行时循环。
- **agentic-dispatch-scheduler-mechanism.md** 是未来 Engine-side dispatch 的设计草案。本文件描述的循环是 ds 所依赖的当前运行时基础。

---

## Related Specs

- `openspec/specs/gate-state-machine/spec.md` — Gate checkpoint evaluation contract.
- `openspec/specs/transition-table/spec.md` — Transition table file naming, structure, and routing contract.
- `openspec/specs/framework-engine/spec.md` — Engine module canonical locations.
