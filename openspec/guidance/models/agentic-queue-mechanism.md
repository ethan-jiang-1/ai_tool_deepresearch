---
guideline_id: agentic-queue-mechanism
suite: deep-research-guidelines
title: Agentic Queue Mechanism
status: effective
created: 2026-06-17
revised: 2026-07-25
role: non-authoritative system-understanding model for queue-driven phase execution
scope: Agentic Queue (AGQ) — queue engine operations and loop-engineering architectural principles
authority: guidance
defers_to:
  - openspec/constitution/project-charter.md
---

# Agentic Queue Mechanism

> 状态: 生效 | 创建: 2026-06-17 | 修订: 2026-07-25 | 适用: 所有 queue-driven phase 执行的设计与实现

Agentic Queue (AGQ) 是 Engine-side 的任务队列系统：Phase Agent 从队列领取任务、执行、完成、领下一个——在 phase 内部形成自主静默的执行循环。

> ## Implementation Status
>
> **这份 guideline 描述的内容有两层：Queue/Chain/Work Unit 边界与部分 runtime 已实现；若干剩余问题只表示结果义务已知，不代表复杂实现已经预批准。读之前先看清楚：**
>
> | 内容 | 状态 | 说明 |
> |------|------|------|
> | Queue engine (`queue-manager.mjs`, `operate-queue.mjs`) | **✅ 已实现** | queue v2 state, non-delegated queue completion, projection, repair, and drain checks |
> | Queue 数据结构 (`rb_queue.json`, active window + refill pool + delegated in-flight + terminal history) | **✅ 已实现** | Queue demand uses `queue_item_id`; delegated attempts use work-unit `work_id` |
> | Work-unit delegated completion | **✅ 已实现** | Delegated queue demand completes through `operate-work-unit submit`, not through queue completion |
> | 两层嵌套 loop 架构 | **📐 定调** | 外层 (gate+chain) vs 内层 (queue) 的边界划分已在本文件 §3–§5 定调。内层 loop 的 workflow 集成已部分落地（见下两行） |
> | Phase node MD 驱动 queue loop | **✅ 部分实现** | `phase-seed-topics.md`、`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` 已接入并归档入 accepted specs。readiness 仍不是标准 queue-driven phase。 |
> | Stop authorization 强制执行 | **❌ 未形成统一 runtime contract** | Phase/gate/drain 已有部分继续义务；若后续补强，应优先使用 decision-point cue 或直接 drain fact，不因此预设 chat interceptor/watchdog。§7.2 |
> | 灌料机制（filling） | **✅ 已实现** | seed-topics/wave0/wave1/wave2 使用 phase guidance + CLI 写入 queue demand。当前直接路径可用；不存在“必须再做 JS task-card factory”的目标。§7.1 |
> | Error recovery（stale claim / crash） | **✅ 基础显式恢复；无通用自动恢复** | work-unit inspect、submit rejection repair、timeout/fail/abandon、replacement retry 与狭窄 audited late-submit 已存在；queue-level stale auto-healing/watcher 不是当前默认目标。§7.4 |
> | Context sustainability 验证 | **❌ 未验证** | Sub-agent + render projection 隔离能否控制上下文增长——未经过实验测量。§7.3 |
>
> **这份文件是指导（guidance），不是运行时事实。** 它告诉你边界和最小设计姿态。queue engine 与 seed-topics/wave0/wave1/wave2 集成已落地；剩余 gap 必须先证明现有 direct authority 不足，再通过 OpenSpec 增加最小机制。不要从“需要 recovery/stop/context 保障”直接跳到 watcher、daemon、controller、自动 retry tree 或新状态层。

---

## 1. Purpose

The hard part of working with a phase-running Agent actor is not task complexity — it is that the Phase Agent frequently stops mid-task to "report": narrate progress, surface a partial result, or ask whether to continue. Every such pause fragments context, wastes a turn, and breaks the flow of long-horizon work. The goal is the opposite: the Phase Agent should run through a meaningful unit of work to completion, *then* report — not pause every few steps to check in.

The Agentic Queue is the mechanism that makes this possible. A self-contained task card gives the Phase Agent a clear target, done-condition, and receipt to produce. The Engine-side checkpoint validates completed work, advances state, and renders the next card — so the Phase Agent keeps moving through the queue in one continuous run instead of stopping to ask "what's next?"

This file establishes mechanism guidance for queue-driven phase execution: the two-loop model (§3), the dispatch rule (§4), structural constraints (§5), task card principles (§6), and unresolved result obligations (§7). The queue engine and seed-topics/wave0/wave1/wave2 queue integrations are accepted/current. A result obligation such as recovery or stop visibility does not pre-approve a particular implementation; any behavior change requires an OpenSpec change and must follow the smallest reliable control path.

This file inherits the project charter split: **LLM owns judgment, Markdown controls Agent Flow, Engine owns deterministic checkpoints.** The queue is an Engine-side tool; it does not drive the Agent, replace content judgment, or control phase-to-phase routing.

---

## 2. File Position

This file can decide:

- The two-loop architecture: outer (phase-to-phase via gate+chain) and inner (within-phase via queue).
- The dispatch rule that classifies every piece of work by its verifier and routes it accordingly.
- Structural constraints on how queue, gate, chain, and repair paths interact.
- Task card principles: verification split between engine and agent, target separation between direct Phase Agent execution and delegated Sub-agent execution.
- Result obligations that queue-based execution must satisfy where applicable: filling, stop visibility, context sustainability, and explicit recovery.
- Behavioral MUST / MUST NOT for queue operations, Phase Agent behavior, context management, and implementation discipline.

This file cannot decide:

- Concrete schema fields, CLI flags, state transitions, receipt grammar, or trace event contracts — those are spec territory.
- Current run state, queue contents, gate outcomes, or evidence counts.
- Implementation permission for new queue behavior without an OpenSpec change.
- Whether a specific phase uses Q — this file gives the decision framework; the Phase Agent decides while operating in MD controller mode.

---

## Simple Queue Control Posture

This Tier 2 mechanism follows [`evolution-simple-reliable-control.md`](../../constitution/evolution/simple-reliable-control.md). Queue reliability comes from direct queue/work-unit facts and explicit operations, not from hiding failures behind more loop machinery.

```text
queue demand fact -> one claim/complete/submit check -> one repair or terminal action -> rerun the same visible operation
```

- `rb_queue.json` and Engine-owned work-unit state remain the direct authorities; projections and logs do not become a second queue truth.
- Queue, Work Unit, and Gate may cross-check different authority types, but SHALL NOT each reimplement the same completion fact.
- A missing prerequisite or invalid attempt identity should stop dependent queue/coverage diagnostics before they cascade.
- Recovery should expose one explicit action: repair the same attempt, submit it, wait on a still-valid lease, terminalize it, or claim one replacement. Do not build hidden retry choreography.
- Existing accepted queue behavior remains current. Future changes should simplify locally and must not turn §7 problem statements into generalized controllers without separate evidence.

---

## 3. Core Architecture: Two Nested Loops

> 本文件描述 [三层执行模型](agentic-execution-model.md) 中的 **Tier 2 — Queue**（中层）。Queue 的内部模型是两层嵌套循环（outer = Tier 1 Chain, inner = Tier 2 Queue）。完整嵌套关系和术语正典见该文档。

The agentic queue loop is not one loop. It is **two nested loops**. Each has a distinct authority, a distinct verifier, and a distinct scope.

### 3.1 The Outer Loop (Phase-to-Phase)

```
读 MD node → 执行 → 跑 gate CLI → chain 查 next → 通过 accepted handoff loader/check 消费下一 MD node → 循环
权威 = gate + transitions.chain.json
```

The outer loop solves "which phase comes next." It is deterministic, single-step, and statically routed. It is described normatively in `agentic-workflow-mechanism.md` and is already implemented.

**The outer loop never enters Q.** Phase-to-phase routing is a gate+chain responsibility — not a queue responsibility.

### 3.2 The Inner Loop (Within-Phase)

```text
claim queue demand → execute non-delegated task OR claim work unit for delegated demand
→ non-delegated complete OR work-unit submit
→ promote/refill/drain → gate
权威 = queue-manager validated state + work-unit submit state for delegated demand
```

The inner loop solves "within this phase, how do I execute a dozen sub-tasks without stopping to ask what's next." The queue engine is implemented and persists the queue authority to `rb_queue.json`.

**The inner loop never touches chain.** Within-phase task sequencing is a queue responsibility — not a chain responsibility.

### 3.3 Why Two Loops, Not One

The core mistake in earlier designs was conflating these two concerns into a single giant queue that tried to manage both phase transitions and within-phase task execution. The result: a 400-line hand-written Markdown file that blurred boundary hooks, gate transitions, and task dispatch into one unmaintainable surface.

The lesson: **phase-to-phase routing is deterministic single-step (gate + static chain). Within-phase execution is dynamic multi-task (queue).** Different verifiers, different authorities. Conflating them creates the exact failure mode the project charter prohibits.

### 3.4 Design Invariant

**AGQ is not a daemon.** It does not watch the Phase Agent. Each invocation is stateless except for files in the run bundle. The queue engine is a CLI-style checkpoint between Phase Agent actions — it validates, advances state, renders the next card, and returns. The Phase Agent drives the loop; the queue provides the todo list.

---

## 4. The Dispatch Rule

### 4.1 The Rule

Every piece of work has exactly one verifier. That verifier determines the dispatch path. The question is always the same:

> **这份工作的完成，由谁验证？**

One question. Three possible answers. Exactly one path per piece of work.

### 4.2 Three Paths

| Verifier | Dispatch path | Example |
|----------|--------------|---------|
| **Task-level receipt** (individual output file + schema) | **Q**: enqueue → claim → complete | wave0 里为一个 topic 搜索 source 并写 source.yaml |
| **Phase-level gate** (whole-phase completeness + trace + status) | **Gate + chain**: not Q | wave0 gate 检查所有 topic 的 reference 是否到位 |
| **Human checkpoint or single-step phase** | **Direct execution**: no Q | HITL1 等用户回答、instantiation 建 bundle |

A task receipt passing does not mean the phase gate passes. A task receipt checks "this one task's output exists and passes schema." A phase gate checks "the entire phase is complete, trace events are written, status is consistent." The receipt is a strict subset of the gate — this is correct, not a bug.

### 4.3 Phase Applicability (Corollary)

Not all phases need Q. The decision follows mechanically from the dispatch rule: ask who verifies the phase's work.

- **Phases that decompose into multiple independently-verifiable tasks** (wave0, wave1, wave2) — these benefit from Q. Each sub-task (source intake, evidence extraction, claim verification) has its own task-level receipt.
- **Single-step phases or human-checkpoint phases** (instantiation, HITL1, HITL2, setup, readiness, final) — these do not need Q. Their verifier is a gate or a human, not a task receipt.

The Phase Agent decides whether to activate Q while operating in MD controller mode. This file gives the decision framework; it does not enumerate phases.

---

## 5. Structural Rules

Four hard constraints govern how queue, gate, chain, and repair paths interact. Each follows from the dispatch rule applied to a specific boundary condition.

### 5.1 Rule 1: Two Loops Don't Mix

Outer loop (phase-to-phase) never enters Q. Inner loop (within-phase) never touches chain. No exceptions.

This is the structural consequence of the dispatch rule: the outer loop's verifier is the gate, and gate-routed work does not go through Q. The inner loop's verifier is the task receipt, and receipt-routed work does not query chain.

### 5.2 Rule 2: Queue Lifecycle Bounded Within a Single Phase

Queue is filled at phase entry, drained before the gate runs. A task does not cross phase boundaries — its receipt is satisfied within the current phase, or it fails. The task's impact flows to later phases through artifacts (reference, skeleton, evidence), not through the queue itself.

If a later phase discovers a gap from an earlier phase: that is gate/audit feedback that returns the Agent to the latest legal phase target or records a diagnostic gap through accepted trace/log surfaces. It is not a task crossing phases through Q, and it is not a reason to hand-edit `rb_status.json`.

### 5.3 Rule 3: Two Repair Paths, One Per Layer

- **Q-repair** (phase-internal, task-level): non-delegated queue completion or work-unit submit/gate feedback fails → repair/refill demand is inserted into the current phase queue. Deterministic repair stays within the phase.
- **Gate-repair** (phase-to-phase, phase-level): gate fails → MD "On Gate Fail" + `shared-repair-guidance` → Phase Agent repair, retry 3 times max. Semantic, Phase Agent judgment-driven.

Exactly one contact point between the two: **Q empty + gate fail** (the queue is drained but the gate still doesn't pass). In this case, the gate is the authority. The Phase Agent may optionally re-fill Q as a tool to address specific gaps, but authority does not transfer to Q.

### 5.4 Rule 4: No Phase Rollback

`transitions.chain.json` contains only `passed` edges. No fail edges, no repair edges, no backward edges. A later phase cannot push a task backward into an earlier phase through Q. Backward gaps discovered later are handled by gate/audit diagnostics and legal re-entry/repair from the latest authorized phase target, not by queue cross-boundary work or status edits. This prevents the pathology of "stuff anything into the queue and the queue crosses any boundary."

---

## 6. Task Card Principles

### 6.1 Verification Split

A task card declares what must be true for the task to be complete. The verification is split between two authorities:

- **Engine verifies deterministic facts**: file exists, schema parses, count meets floor, status value matches. `checkReceipts()` operates on engine-side checks only.
- **Agent actor verifies judgment facts**: source relevance, evidence quality, marketing risk, synthesis usefulness.

When the queue engine returns feedback, it uses the same Check / Inspect / Advice action split defined in the project charter — it provides deterministic facts for the Phase Agent's next step, not content judgments.

### 6.2 Target Separation

Which tasks use direct Phase Agent execution vs delegated Sub-agent execution is a context-management decision, not a capability question. Current task-card wire values express this as `targets.controller: "main-agent"` and optional `targets.delegates.to: "sub-agent"`. Five dimensions guide the assignment:

| Dimension | Direct Phase Agent execution (`"main-agent"` wire value) | Delegated Sub-agent execution (`"sub-agent"` wire value) |
|-----------|-------------------|-------------------|
| **I/O density** | Low — reads existing artifacts, makes judgments | High — external search, fetch, large-scale reading |
| **Context dependency** | Needs full plan, profile, and cross-topic context | Needs only bounded task-card context (topic key, query, schema) |
| **Output type** | Synthesis, quality judgments, cross-topic connections | Structured data (source metadata, evidence particles, skeleton YAML) |
| **Determinism** | High-judgment — requires trade-offs and evaluation | High-execution — search → filter → structured write |
| **Context release** | Output stays in conversation for downstream decisions | Output writes to `_cache`; Phase Agent reads only render projection |

The Phase Agent owns the task `targets` / delegation assignment while operating through Markdown control surfaces. The engine does not auto-assign research judgment. Sub-agents never pass gates, mutate queues, append ledgers, count evidence, or authorize output.

Queue active window is not a Sub-agent work pool. Delegated fan-out is created only by `operate-work-unit claim --count N`, which allocates Engine-owned work-unit attempts from the eligible queue-front demand. Sub-agents do not allocate IDs.

> **See also:** [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — the authoritative guideline for when and why work goes to Sub-agents through work units. This section describes queue demand and target mechanics; that guideline defines noise isolation, bounded result contracts, and submit provenance.

---

## 7. Derived Constraints

These are not pre-approved mechanisms. They are result obligations or risks that must be handled only when the applicable phase/runtime path needs them. Each subsection states the simplest acceptable posture first; a more complex implementation needs separate OpenSpec evidence.

### 7.1 Filling: The Weakest Link

Queue starts with ordered demand locations. Without filling `active_window` or `refill_pool`, the inner loop has no demand to claim. Without closing non-terminal delegated in-flight work units, the phase is not drained.

The filling mechanism must be cheap enough that it does not defeat the purpose: if creating task cards is more work than just doing the tasks, the queue provides negative value. The Phase Agent is responsible for ensuring the queue is filled when a queue-driven phase requires demand. Prefer the current direct phase-guidance + CLI path. Do not add a task-card generator, derived planning state, or auto-refill controller unless a concrete repeated failure proves the direct path insufficient.

### 7.2 Stop Authorization: Computed But Not Enforced

The engine already computes `stop_authorization_state` in `claim()`: refill pool non-empty → `unauthorized_continue_required`; refill pool empty → `empty_queue_after_refill`. Valid stop states are `final_delivery`, `decision_blocker`, and `empty_queue_after_refill`. The default is `unauthorized_continue_required` — the Phase Agent must continue.

The enforcement point is phase drain and gate readiness: queue demand, delegated in-flight work units, expired attempts, and repair/refill demand must all be accounted for before the gate can advance. The preferred reinforcement is a short Engine/CLI continuation or repair cue at the decision point. This requirement does not authorize chat interception, a session watcher, or a new stop state machine.

### 7.3 Context Sustainability: An Unverified Assumption

The claim that queue-driven execution prevents context explosion rests on a measurable assumption: delegated high-I/O work writes declared outputs/cache and returns bounded result JSON, while Phase Agent reads projections, submit diagnostics, and gate feedback rather than raw search trails. If the Phase Agent reads full Sub-agent results and cache dumps back into the conversation after every submit, the queue has not reduced context pressure.

The intended mechanism is sub-agent isolation (heavy I/O writes to declared outputs/cache, Phase Agent reads bounded projections and diagnostics). Whether this keeps context growth manageable is unknown and must be experimentally validated — not assumed from queue design. If context pressure remains, first reduce what is read; do not create a stack of summaries, memory mirrors, or inferred context states.

> **See also:** [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) §4（噪声隔离）和 §4（不给全貌只给结论）——定义了 sub-agent 如何通过 bounded context + structured output 在机制上保护 Phase Agent 上下文。Context sustainability 的验证是 queue loop 能否长程运行的关键实验，但噪声隔离本身是已定调的结构性原则。

### 7.4 Error Recovery: Stale Claims and Crash Resilience

Long-running queue loops must survive interruption through bundle truth. Delegated attempts record claim timestamps, deadlines, status, and retry lineage in work-unit state. After interruption, inspect should reveal the earliest actionable state so the Phase Agent can submit, repair, wait, timeout, fail, abandon, use a narrowly accepted audited exception, or claim one replacement.

- **Stale attempt detection**: inspect must report expired or mismatched delegated attempts without silently healing them.
- **Crash recovery**: queue and work-unit state must let the Phase Agent choose one explicit resume, terminalize, audited exception, or replacement action safely.
- **Queue health visibility**: projection/inspect should present the direct root state and nearest action; it need not flatten every derived symptom into primary output.

These are deterministic checkpoint obligations where direct bundle facts exist. They do not require background monitoring or silent auto-healing; explicit inspect plus explicit mutation is the default.

---

## 8. MUST / MUST NOT

### Architecture

- MUST treat the queue as operating exclusively within the inner loop (within-phase).
- MUST NOT let queue operations drive phase transitions or query `transitions.chain.json`.
- MUST classify every piece of work by its verifier before deciding dispatch path.
- MUST keep Q-repair and gate-repair as separate paths with exactly one contact point (Q empty + gate fail, where gate retains authority).

### Queue Operations

- MUST use `operate-queue.mjs` CLI or `queue-manager.mjs` API for all queue mutations.
- MUST NOT hand-edit queue state (`rb_queue.json`).
- MUST treat the Markdown projection (`_cache/agentic-queue/current-task.md`) as a read-only Agent-facing view — not as the queue authority.
- MUST keep machine queue authority in structured JSON state.

### Phase Agent Behavior

- MUST complete every claimed task. MUST NOT skip tasks without explicit failure recording via `operate-queue fail`.
- For tasks delegated to a Sub-agent, MUST claim a work unit, spawn the bounded task, and submit by `work_id` through `operate-work-unit submit`.
- MUST NOT run WebSearch/WebFetch in Phase Agent context to satisfy delegated search/fetch tasks.
- MUST NOT call queue completion as delegated success.
- MUST run gate CLI at phase completion. MUST NOT bypass gate to declare phase complete.
- MUST NOT let sub-agents pass gates, mutate queues, count evidence, or authorize final output.

### Context Management

- MUST assign `targets.delegates.to: "sub-agent"` for high-I/O, low-context-dependency tasks.
- MUST NOT read full Sub-agent output or cache dumps into Phase Agent context after submit — read projections, submit diagnostics, and gate feedback.
- MUST protect Phase Agent context by routing noisy search/fetch work to bounded sub-agent tasks.

### Implementation Discipline

- MUST route new AGQ behavior through OpenSpec proposal/spec/tasks before implementation.
- MUST NOT implement loop-engineering behavior directly from this guideline without an accepted OpenSpec change.
- MUST treat the queue engine (AGQ-001~006) as implemented runtime truth.
- MUST treat queue engine + seed-topics/wave0/wave1/wave2 integrations as accepted runtime truth.
- MUST treat remaining stop/context/recovery gaps as problem statements, not as approval for a specific mechanism; proposals SHALL start with the shortest direct-authority solution and explain any added state or branch.
- MUST NOT add a watcher, daemon, hidden retry loop, duplicate queue truth, or projection-of-projection merely because a historical subsection names a reliability risk.

---

## 9. Relationship to Other Authority

- **`project-charter.md`** defines the four-layer split (Agent/Markdown/Engine/JSON). This guideline operates entirely within that split: the queue is an Engine-side tool; Markdown controls whether and how the Phase Agent uses it.
- **`agentic-workflow-mechanism.md`** defines the outer loop (MD → execute → gate → chain → next). This guideline's inner loop nests inside that outer loop. The two are complementary, not competing.
- **`agentic-subagent-mechanism.md`** defines work-unit-mediated Sub-agent execution. Queue demand becomes delegated work only when the Engine claims it into a work unit; fan-out happens through `claim --count N`, not through queue window shape.
- **`evolution-simple-reliable-control.md`** governs the complexity posture of filling, stop visibility, recovery, repair, and queue diagnostics. This file defines Queue boundaries; it does not override that complexity brake.
- **The accepted queue contract** defines implementable engine requirements (AGQ-001~006). This guideline describes architectural principles; the accepted contract defines implementable behavior. When they conflict, the contract wins.
General rule: when this guideline conflicts with an accepted spec or executable contract, the spec/contract wins. Fix the guideline.

---

## Related Guidance

- [OpenSpec Control Map](../../README.md) — guidance roles and reading routes.
- [Project Charter](../../constitution/project-charter.md) — repo-wide charter and authority map.
- [Abstraction as Semantic Precision](../../constitution/evolution/abstraction-semantic-precision.md) — establish the semantic level before adding a queue state, view, or loop distinction.
- [Simple Reliable Control](../../constitution/evolution/simple-reliable-control.md) — complexity brake for direct queue facts, explicit recovery, and minimal diagnostics.
- [Helper-Oriented Agent](../../constitution/evolution/helper-oriented-agent.md) — action responsibility after the semantic level and control shape are clear.
- [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon; this file's parent document.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain): the outer loop this inner loop nests inside.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — mechanism guidance for work-unit-mediated Sub-agent execution.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary for framework assets versus runtime bundles.
- [Command Experiments](../../operations/command-experiments.md) — how to prove mechanisms with real runtime contexts.
