---
guideline_id: agentic-queue-mechanism
suite: deep-research-guidelines
title: Agentic Queue Mechanism
status: effective
created: 2026-06-17
revised: 2026-06-24
role: architectural constitution for queue-driven phase execution
scope: Agentic Queue (AGQ) — queue engine operations and loop-engineering architectural principles
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/command-experiments.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/subagent-boundary.md
---

# Agentic Queue Mechanism

> 状态: 生效 | 创建: 2026-06-17 | 修订: 2026-06-24 | 适用: 所有 queue-driven phase 执行的设计与实现

Agentic Queue (AGQ) 是 Engine-side 的任务队列系统：Agent 从队列领取任务、执行、完成、领下一个——在 phase 内部形成自主静默的执行循环。

> ## Implementation Status
>
> **这份 guideline 描述的内容有两层：架构原则已定调，queue engine 与 seed-topics/wave0 集成已实现，但部分行为尚未实现。读之前先看清楚：**
>
> | 内容 | 状态 | 说明 |
> |------|------|------|
> | Queue engine (`queue-manager.mjs`, `operate-queue.mjs`) | **✅ 已实现** | enqueue / claim / complete / fail / preempt / render / checkReceipts，AGQ-001~006 accepted，3 个 playbook 验证通过 |
> | Queue 数据结构 (`rb_queue.agq.json`, 5-slot window + refill pool) | **✅ 已实现** | Zod-validated QueueItemSchema，`_cache/agentic-queue/current-task.md` projection |
> | 两层嵌套 loop 架构 | **📐 定调** | 外层 (gate+chain) vs 内层 (queue) 的边界划分已在本文件 §3–§5 定调。内层 loop 的 workflow 集成已部分落地（见下两行） |
> | Phase node MD 驱动 queue loop | **✅ 部分实现** | `phase-seed-topics.md` + `phase-wave0.md` 已接入 queue-driven 三阶段（灌料→执行循环→收尾+gate），3 个 phase-level playbook 验证通过（AGQ-007~010 已归档入 main spec）。wave1/wave2/readiness 尚未接入，待 Change 2+ |
> | Stop authorization 强制执行 | **❌ 未实现** | Engine 已计算 `stop_authorization_state`，但无任何东西读取它来阻止 Agent 停机。§7.2 |
> | 灌料机制（filling） | **✅ 已实现** | 两个已接入 phase 都有 task card JSON 模板——Agent 从 `topic_registry` 派生 task card → 写 JSON → `operate-queue enqueue --task`。仍为手写模板+CLI，未做 JS helper（§7.1） |
> | Error recovery（stale claim / crash） | **❌ 未实现** | `claim()` 不检测 stale running 状态。§7.4 |
> | Context sustainability 验证 | **❌ 未验证** | Sub-agent + render projection 隔离能否控制上下文增长——未经过实验测量。§7.3 |
>
> **这份文件是指导（guidance），不是运行时事实。** 它告诉你架构怎么设计、边界在哪里、规则是什么。queue engine 已实现，seed-topics + wave0 的 queue 集成已落地（AGQ-007~010），但 stop authorization 强制执行、error recovery、context sustainability 验证仍未实现。新的 queue 集成（wave1+）实现前必须先走 OpenSpec proposal → spec → tasks。

---

## 1. Purpose

The hard part of working with a Coding Agent is not task complexity — it is that the Agent frequently stops mid-task to "report": narrate progress, surface a partial result, or ask whether to continue. Every such pause fragments context, wastes a turn, and breaks the flow of long-horizon work. The goal is the opposite: the Agent should run through a meaningful unit of work to completion, *then* report — not pause every few steps to check in.

The Agentic Queue is the mechanism that makes this possible. A self-contained task card gives the Agent a clear target, done-condition, and receipt to produce. The Engine-side checkpoint validates completed work, advances state, and renders the next card — so the Agent keeps moving through the queue in one continuous run instead of stopping to ask "what's next?"

This file establishes the architectural constitution for queue-driven phase execution: the two-loop model (§3), the dispatch rule (§4), structural constraints (§5), task card principles (§6), and derived constraints that must be solved for loop engineering to work (§7). The queue engine and seed-topics/wave0 queue integration are implemented; remaining loop engineering (wave1+ queue wiring, engine-enforced stop authorization) is settled architectural direction — implementation requires OpenSpec change.

This file inherits the project charter split: **LLM owns judgment, Markdown controls Agent Flow, Engine owns deterministic checkpoints.** The queue is an Engine-side tool; it does not drive the Agent, replace content judgment, or control phase-to-phase routing.

---

## 2. File Position

This file can decide:

- The two-loop architecture: outer (phase-to-phase via gate+chain) and inner (within-phase via queue).
- The dispatch rule that classifies every piece of work by its verifier and routes it accordingly.
- Structural constraints on how queue, gate, chain, and repair paths interact.
- Task card principles: verification split between engine and agent, target separation between main-agent and sub-agent.
- Derived constraints that must be solved for loop engineering to work: filling, stop authorization enforcement, context sustainability, error recovery.
- Behavioral MUST / MUST NOT for queue operations, Agent behavior, context management, and implementation discipline.

This file cannot decide:

- Concrete schema fields, CLI flags, state transitions, receipt grammar, or trace event contracts — those are spec territory.
- Current run state, queue contents, gate outcomes, or evidence counts.
- Implementation permission for new queue behavior without an OpenSpec change.
- Whether a specific phase uses Q — this file gives the decision framework; the phase's MD controller decides.

---

## 3. Core Architecture: Two Nested Loops

The agentic queue loop is not one loop. It is **two nested loops**. Each has a distinct authority, a distinct verifier, and a distinct scope.

### 3.1 The Outer Loop (Phase-to-Phase)

```
读 MD node → 执行 → 跑 gate CLI → chain 查 next → 加载下一 MD node → 循环
权威 = gate + transitions.chain.json
```

The outer loop solves "which phase comes next." It is deterministic, single-step, and statically routed. It is described normatively in `agentic-workflow-mechanism.md` and is already implemented.

**The outer loop never enters Q.** Phase-to-phase routing is a gate+chain responsibility — not a queue responsibility.

### 3.2 The Inner Loop (Within-Phase)

```
claim task → 执行 task → complete (receipt check + promote + refill)
→ 读下一 task card → claim → 执行 → complete → ... → queue 空
权威 = rb_queue.agq.json + queue-manager.mjs
```

The inner loop solves "within this phase, how do I execute a dozen sub-tasks without stopping to ask what's next." The queue engine is implemented; the workflow integration (phase node MD calling the queue) is pending OpenSpec.

**The inner loop never touches chain.** Within-phase task sequencing is a queue responsibility — not a chain responsibility.

### 3.3 Why Two Loops, Not One

V12's core mistake was conflating these two concerns into a single giant queue that tried to manage both phase transitions and within-phase task execution. The result: a 400-line hand-written Markdown file that blurred boundary hooks, gate transitions, and task dispatch into one unmaintainable surface.

The lesson: **phase-to-phase routing is deterministic single-step (gate + static chain). Within-phase execution is dynamic multi-task (queue).** Different verifiers, different authorities. Conflating them creates the exact failure mode the project charter prohibits.

### 3.4 Design Invariant

**AGQ is not a daemon.** It does not watch the Agent. Each invocation is stateless except for files in the run bundle. The queue engine is a CLI-style checkpoint between Agent turns — it validates, advances state, renders the next card, and returns. The Agent drives the loop; the queue provides the todo list.

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

The phase's MD controller decides whether to activate Q. This file gives the decision framework; it does not enumerate phases.

---

## 5. Structural Rules

Four hard constraints govern how queue, gate, chain, and repair paths interact. Each follows from the dispatch rule applied to a specific boundary condition.

### 5.1 Rule 1: Two Layers Don't Mix

Outer loop (phase-to-phase) never enters Q. Inner loop (within-phase) never touches chain. No exceptions.

This is the structural consequence of the dispatch rule: the outer loop's verifier is the gate, and gate-routed work does not go through Q. The inner loop's verifier is the task receipt, and receipt-routed work does not query chain.

### 5.2 Rule 2: Queue Lifecycle Bounded Within a Single Phase

Queue is filled at phase entry, drained before the gate runs. A task does not cross phase boundaries — its receipt is satisfied within the current phase, or it fails. The task's impact flows to later phases through artifacts (reference, skeleton, evidence), not through the queue itself.

If a later phase discovers a gap from an earlier phase: that is a gate fail or escalation (`rb_status.json` → `blocked`). It is not a task crossing phases through Q.

### 5.3 Rule 3: Two Repair Paths, One Per Layer

- **Q-repair** (phase-internal, task-level): `complete()` receipt fails → `makeRepairItem` auto-generates repair task → `preempt` inserts into slot_2. Deterministic, automatic, stays within the phase.
- **Gate-repair** (phase-to-phase, phase-level): gate fails → MD "On Gate Fail" + `shared-repair-guidance` → Agent-driven repair, retry 3 times max. Semantic, Agent-judgment-driven.

Exactly one contact point between the two: **Q empty + gate fail** (the queue is drained but the gate still doesn't pass). In this case, the gate is the authority. The Agent may optionally re-fill Q as a tool to address specific gaps, but authority does not transfer to Q.

### 5.4 Rule 4: No Phase Rollback

`transitions.chain.json` contains only `passed` edges. No fail edges, no repair edges, no backward edges. A later phase cannot push a task backward into an earlier phase through Q. Backward gaps discovered later escalate via `rb_status.json` → `blocked`, not via Q. This prevents V12's pathology of "stuff anything into the queue and the queue crosses any boundary."

---

## 6. Task Card Principles

### 6.1 Verification Split

A task card declares what must be true for the task to be complete. The verification is split between two authorities:

- **Engine verifies deterministic facts**: file exists, schema parses, count meets floor, status value matches. `checkReceipts()` operates on engine-side checks only.
- **Agent verifies judgment facts**: source relevance, evidence quality, marketing risk, synthesis usefulness.

When the queue engine returns feedback, it uses the same Check / Inspect / Advice action split defined in the project charter — it provides deterministic facts for the Agent's next turn, not content judgments.

### 6.2 Target Separation

Which tasks go to `main-agent` vs `sub-agent` is a context-management decision, not a capability question. Five dimensions guide the assignment:

| Dimension | target: main-agent | target: sub-agent |
|-----------|-------------------|-------------------|
| **I/O density** | Low — reads existing artifacts, makes judgments | High — external search, fetch, large-scale reading |
| **Context dependency** | Needs full plan, profile, and cross-topic context | Needs only bounded task-card context (topic key, query, schema) |
| **Output type** | Synthesis, quality judgments, cross-topic connections | Structured data (source metadata, evidence particles, skeleton YAML) |
| **Determinism** | High-judgment — requires trade-offs and evaluation | High-execution — search → filter → structured write |
| **Context release** | Output stays in conversation for downstream decisions | Output writes to `_cache`; main-agent reads only render projection |

The MD controller owns the `target` field assignment per task. The engine does not auto-assign. Sub-agents never pass gates, mutate queues, count evidence, or authorize output.

> **See also:** [Sub-Agent Boundary](subagent-boundary.md) — the authoritative guideline for *when and why* work goes to sub-agents. This section describes the queue's target field mechanics; that guideline defines the architectural principle (noise isolation, bounded context, structured output) and the three-layer model (Chain → Queue → Relay) that frames how sub-agent dispatch fits into the larger execution loop.

---

## 7. Derived Constraints

These are not architectural rules (§5) — they are implementation properties that must hold for loop engineering to actually work. Each is a "the loop cannot function without solving this" constraint, not an open question.

### 7.1 Filling: The Weakest Link

Queue starts empty. `createQueue()` produces 5 null slots. `claim()` returns `item: null` when slot_1 is empty. Without filling, the inner loop never starts.

The filling mechanism must be cheap enough that it does not defeat the purpose: if creating task cards is more work than just doing the tasks, the queue provides negative value. The MD controller is responsible for ensuring the queue is filled at phase entry. The exact filling mechanism (JS helper derivation from plan artifacts vs Agent template-based generation) is an implementation decision — but the constraint that filling MUST be solved is architectural, not optional.

### 7.2 Stop Authorization: Computed But Not Enforced

The engine already computes `stop_authorization_state` in `claim()`: refill pool non-empty → `unauthorized_continue_required`; refill pool empty → `empty_queue_after_refill`. Valid stop states are `final_delivery`, `decision_blocker`, and `empty_queue_after_refill`. The default is `unauthorized_continue_required` — the Agent must continue.

The gap: **nothing reads this field to prevent the Agent from stopping.** The engine has computed the correct answer; the system lacks the enforcement mechanism. MD-level instructions ("don't stop if unauthorized") are Agent self-governance and violate the project charter. The enforcement must be engine-side: either `complete()`/`claim()` returning a hard "continue required" signal, or the gate CLI refusing to advance when the queue is non-empty and non-blocker. This is the highest-priority gap to close for loop integrity.

### 7.3 Context Sustainability: An Unverified Assumption

The claim that queue-driven execution prevents context explosion rests on an unverified assumption: that completing a task via sub-agent + render projection actually releases context rather than accumulating it. If the main-agent reads full sub-agent results back into the conversation after every `complete()`, the queue has not reduced context pressure — it has only traded "frequent interruption" for "continuous accumulation."

The intended mechanism is sub-agent isolation (heavy I/O writes to `_cache`, main-agent reads only the render projection's done-condition). Whether this keeps context growth sub-linear is unknown and must be experimentally validated — not assumed from queue design.

> **See also:** [Sub-Agent Boundary](subagent-boundary.md) §原则一（噪声隔离）和 §原则三（不给全貌只给结论）——定义了 sub-agent 如何通过 bounded context + structured output 在机制上保护主 Agent 上下文。Context sustainability 的验证是 queue loop 能否长程运行的关键实验，但噪声隔离本身是已定调的结构性原则。

### 7.4 Error Recovery: Stale Claims and Crash Resilience

Long-running queue loops must survive interruption. `claim()` currently sets `slot_1_current.status = 'running'` without recording a claim timestamp or detecting stale state. If the Agent crashes between claim and complete, the task stays in `running` — claim is idempotent (re-claiming the same task works), but the system cannot distinguish "actively executing" from "crash residue." Three properties are required:

- **Stale claim detection**: `claim()` must detect tasks stuck in `running` beyond a threshold and auto-fail them.
- **Crash recovery**: `loadQueue()` must handle `running` state on restore. Task cards must be designed for idempotent re-execution.
- **Queue health visibility**: `inspect()` must report running duration and stale state.

These are engine-side requirements — they cannot be solved by MD instructions alone.

---

## 8. MUST / MUST NOT

### Architecture

- MUST treat the queue as operating exclusively within the inner loop (within-phase).
- MUST NOT let queue operations drive phase transitions or query `transitions.chain.json`.
- MUST classify every piece of work by its verifier before deciding dispatch path.
- MUST keep Q-repair and gate-repair as separate paths with exactly one contact point (Q empty + gate fail, where gate retains authority).

### Queue Operations

- MUST use `operate-queue.mjs` CLI or `queue-manager.mjs` API for all queue mutations.
- MUST NOT hand-edit `rb_queue.agq.json`.
- MUST treat the Markdown projection (`_cache/agentic-queue/current-task.md`) as a read-only Agent-facing view — not as the queue authority.
- MUST keep machine queue authority in structured JSON state.

### Agent Behavior

- MUST complete every claimed task. MUST NOT skip tasks without explicit failure recording via `operate-queue fail`.
- MUST run gate CLI at phase completion. MUST NOT bypass gate to declare phase complete.
- MUST NOT let sub-agents pass gates, mutate queues, count evidence, or authorize final output.

### Context Management

- MUST assign `target: sub-agent` for high-I/O, low-context-dependency tasks.
- MUST NOT read full sub-agent output into main-agent context after completion — read only the render projection.
- MUST protect main-agent context by routing noisy search/fetch work to bounded sub-agent tasks.

### Implementation Discipline

- MUST route new AGQ behavior through OpenSpec proposal/spec/tasks before implementation.
- MUST NOT implement loop-engineering behavior directly from this guideline without an accepted OpenSpec change.
- MUST treat the queue engine (AGQ-001~006) as implemented runtime truth.
- MUST treat loop-engineering integration as settled architectural direction: queue engine + seed-topics/wave0 queue integration are implemented runtime truth (AGQ-001~010); remaining integration (wave1+ queue wiring, engine-enforced stop authorization) is pending OpenSpec — not as currently implemented.

---

## 9. Relationship to Other Authority

- **`project-charter.md`** defines the four-layer split (Agent/Markdown/Engine/JSON). This guideline operates entirely within that split: the queue is an Engine-side tool; Markdown controls whether and how the Agent uses it.
- **`agentic-workflow-mechanism.md`** defines the outer loop (MD → execute → gate → chain → next). This guideline's inner loop nests inside that outer loop. The two are complementary, not competing.
- **`openspec/specs/agentic-queue/spec.md`** defines accepted engine requirements (AGQ-001~006). This guideline describes architectural principles; the spec defines implementable behavior. When they conflict, the spec wins.
- **`_backlog/queue/agentic-queue-landing-analysis.md`** is the detailed application analysis from which this guideline extracts its constitutional principles. The landing analysis contains scenario enumeration (8 scenarios), current-state inventory, implementation strategy (Path A/B, phased rollout), and concrete templates. When this guideline is silent on an application detail, consult the landing analysis. When they conflict on a principle, this guideline is authority — it is the extracted constitution. The landing analysis remains in `_backlog/` as a historical analysis document; it is not a guideline, not a spec, and not runtime truth.

General rule: when this guideline conflicts with an accepted spec or executable contract, the spec/contract wins. Fix the guideline.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Charter](project-charter.md) — repo-wide charter and authority map.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — normative description of the outer loop this inner loop nests inside.
- [Sub-Agent Boundary](subagent-boundary.md) — architectural principle for when and why work goes to sub-agents; defines the three-layer model (Chain → Queue → Relay) and noise-isolation strategy that queue-driven execution depends on.
- [Command Experiments](command-experiments.md) — how to prove mechanisms with real runtime contexts.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Accepted specs](../openspec/specs/) — accepted capability requirements.
- [`_backlog/queue/agentic-queue-landing-analysis.md`](../_backlog/queue/agentic-queue-landing-analysis.md) — detailed application analysis; constitutional companion to this guideline.
