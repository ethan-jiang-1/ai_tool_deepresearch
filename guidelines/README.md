---
guideline_id: guidelines-index
suite: deep-research-guidelines
title: Guidelines Index
status: effective
created: 2026-06-17
revised: 2026-07-25
role: index for the guidance suite
scope: guidelines/
authority: guidance
defers_to:
  - guidelines/project-charter.md
siblings:
  - guidelines/project-charter.md
  - guidelines/evolution-abstraction-semantic-precision.md
  - guidelines/evolution-simple-reliable-control.md
  - guidelines/evolution-helper-oriented-agent.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/logging-conventions.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Guidelines Index

> 状态: 生效 | 创建: 2026-06-17 | 修订: 2026-07-25

`guidelines/` is the charter layer for this repo. It explains how to think and work here; it does not itself establish capability behavior or current runtime truth.

Within this suite, the hierarchy is deliberately small: [Project Charter](project-charter.md) is the root, and every other effective guideline defers only to it. `siblings` is peer navigation, never a second authority chain. This index is a map of the guidance suite only: it neither imports project configuration as a parent nor directs constitutional reading into capability, framework, experiment, or runtime surfaces.

Read in this order:

1. [Project Charter](project-charter.md) — stable project principles and authority boundaries.
2. [Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) — Dijkstra's original context, justified semantic levels, and the reflection to apply before introducing a new thing.
3. [Simple Reliable Control](evolution-simple-reliable-control.md) — short decision chains, simple quality controls, and Agent-readable root-cause feedback.
4. [Helper-Oriented Agent](evolution-helper-oriented-agent.md) — user decision, Agent execution, Engine authority, and minimal escalation.
5. [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary between reusable framework assets and mutable runtime bundles.
6. [Logging Conventions](logging-conventions.md) — runtime continuity and observability: status/queue/trace/log authority after context loss.
7. [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon: how Chain, Queue, and Work Units compose.
8. [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain): phase-to-phase routing and the Three-Authority Architecture.
9. [Agentic Queue Mechanism](agentic-queue-mechanism.md) — Tier 2 (Queue): within-phase task execution, two nested loops, dispatch rule.
10. [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — work-unit-mediated Sub-agent execution: noise isolation, bounded tasks, submit provenance.
11. [Command Experiments](command-experiments.md) — guidance for durable command experiment shape and boundaries.

When this suite identifies a behavior that must change, leave this reading layer through the project change lifecycle. Do not use guidance prose to override a machine-verifiable contract.

## Guidance Precedence And Compatibility

The suite uses the following interpretation order:

1. [Project Charter](project-charter.md) establishes the ownership and layer boundary.
2. [Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) asks whether a proposed thing gives a reader a precise, bounded semantic level.
3. [Simple Reliable Control](evolution-simple-reliable-control.md) limits the control shape needed around that level.
4. [Helper-Oriented Agent](evolution-helper-oriented-agent.md) allocates the remaining decision and legal mechanical execution responsibility.
5. The relevant mechanism guideline supplies domain terminology and boundaries within that route.

The three directions guide gradual convergence only. They do not create current runtime behavior, permission, or deterministic authority. Existing accepted behavior remains valid until a focused project change alters it.

## Directory Position

This directory can decide:

- Reading order, layer boundaries, and safe operating posture for Agents and maintainers.
- Guidance quality bars, anti-patterns, and the review route for a new idea.
- Draft or target design direction when the file clearly marks the status as draft, target, or proposed.

This directory cannot decide:

- Capability behavior, schema fields, command flags, state transitions, receipt grammar, or trace event contracts.
- Current runtime state, queue contents, gate status, evidence counts, or verdict truth.
- Implementation permission for a future surface.

## Suite Charter

### MUST

- MUST treat this directory as guidance, not behavior or runtime authority.
- MUST keep every guideline aligned with the Charter's source-of-record boundary and the applicable authoritative contract.
- MUST make [Project Charter](project-charter.md) the sole `defers_to` target for every non-Charter guideline.
- MUST preserve the ordered review: semantic precision, then simple reliable control, then helper-oriented responsibility.
- MUST distinguish current runtime facts from draft mechanism proposals.
- MUST preserve the core split: Agent supplies judgment and content, Markdown controls Agent Flow, Engine enforces deterministic checkpoints.
- MUST keep check / inspect / advice feedback visible to the next conversation turn when deterministic feedback is part of the loop.
- MUST keep deterministic control simpler than the work it validates.

### MUST NOT

- MUST NOT use guideline prose to create hidden runtime behavior.
- MUST NOT let Markdown become the Source of Record for deterministic queue, gate, receipt, or trace authority.
- MUST NOT describe future surfaces as implemented runtime facts.
- MUST NOT list any document other than `guidelines/project-charter.md` under `defers_to`.
- MUST NOT route frontmatter, Reading Order, or Related Guidance outside `guidelines/`; an embedded primary source is permitted only as source context, not as constitutional navigation.
- MUST NOT revive Agent self-governance for deterministic runtime authority under new names.
- MUST NOT use [Simple Reliable Control](evolution-simple-reliable-control.md) to bypass accepted behavior or trigger an unscoped full-system rewrite.

## Decision Routes

| If you are... | Read | Do not do |
|---------------|------|-----------|
| Starting repo work or unsure which layer owns a rule | [Project Charter](project-charter.md) | Start from a draft mechanism document or chat memory |
| Introducing a named concept, state, projection, status, module, command, or reader-facing view | [Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) | Choose a controller or status name before the semantic question is clear |
| A design is accumulating checks, fallbacks, or derived state | [Simple Reliable Control](evolution-simple-reliable-control.md) | Assume more logic automatically means more reliability |
| A design asks the user to run commands, repair state, or choose recovery paths | [Helper-Oriented Agent](evolution-helper-oriented-agent.md) | Treat the human as the ordinary pipeline executor |
| Unsure about reusable framework assets versus a run's mutable truth | [Framework Runtime Boundary](framework-runtime-boundary.md) | Decide by file extension or chat habit |
| Resuming after context loss or debugging trace/log confusion | [Logging Conventions](logging-conventions.md) | Infer current state from chat memory or console prose |
| Understanding Chain, Queue, and Work Units together | [Agentic Execution Model](agentic-execution-model.md) | Start from one tier without the global picture |
| Reasoning about phase handoff, queue behavior, or delegated work | [Workflow](agentic-workflow-mechanism.md), [Queue](agentic-queue-mechanism.md), or [Subagent](agentic-subagent-mechanism.md) | Turn a mechanism guideline into a second authority source |
| Writing or revising a command experiment | [Command Experiments](command-experiments.md) | Invent setup or verdict authority locally |
| Changing accepted behavior | [Project Charter](project-charter.md), then leave this suite through the approved change lifecycle | Patch only `guidelines/` |

## Guidance Map

| File | Reader | Purpose | Not For |
|------|--------|---------|---------|
| [project-charter.md](project-charter.md) | Any Agent or maintainer | Repo-wide charter, authority order, hard boundaries | Detailed capability behavior |
| [evolution-abstraction-semantic-precision.md](evolution-abstraction-semantic-precision.md) | Proposal author, reviewer, or interface designer | Charter-level test for whether a new thing gives a precise bounded semantic level | Authority, permission, controller, or verdict design |
| [evolution-simple-reliable-control.md](evolution-simple-reliable-control.md) | Proposal author, reviewer, Engine/CLI designer | Complexity discipline: short decision chains, direct checks, smallest actionable feedback, gradual convergence | Concrete schema fields, weakening deterministic authority, or unscoped rewrites |
| [evolution-helper-oriented-agent.md](evolution-helper-oriented-agent.md) | Proposal author, reviewer, Agent-facing workflow designer | Action responsibility: user decisions, Agent execution, Engine authority, minimal escalation | Permission grants, mutation/reentry implementation, persona/memory, or helper subsystem |
| [framework-runtime-boundary.md](framework-runtime-boundary.md) | Any Agent or maintainer touching framework/run files | Boundary for reusable framework assets versus mutable runtime bundles | Concrete schema fields, command flags, or current run truth |
| [logging-conventions.md](logging-conventions.md) | Any Agent or maintainer resuming/debugging a run | Runtime continuity and observability: status/queue/trace/log authority | API contracts, schema fields, or using logs as verdict |
| [command-experiments.md](command-experiments.md) | Experiment author/executor | How mechanisms are proven with real runtime contexts and trace-backed verdicts | General project philosophy or concrete capability behavior |
| [agentic-execution-model.md](agentic-execution-model.md) | Any Agent or maintainer new to the system | Unified execution model and terminology canon | Per-tier implementation detail |
| [agentic-workflow-mechanism.md](agentic-workflow-mechanism.md) | Any Agent executing or modifying workflow logic | Tier 1 (Chain): phase-to-phase routing and authority split | Alternative transition backends or JS-driven loops |
| [agentic-queue-mechanism.md](agentic-queue-mechanism.md) | Designer or implementer of Agentic Queue behavior | Tier 2 (Queue): within-phase task execution, nested loops, dispatch rule | Current runtime behavior |
| [agentic-subagent-mechanism.md](agentic-subagent-mechanism.md) | Designer or implementer of Sub-agent execution | Work-unit-mediated Sub-agent execution, noise isolation, bounded result contract | Current runtime behavior |

## Boundary Of This Index

This index intentionally does not carry a current/target/proposed repository manifest. Current operational paths, commands, active bundles, and capability contracts belong to the selected work context after the reader leaves this constitutional route. Keeping them out prevents an index from silently becoming a competing source of runtime truth.

## Suite Contract

These files are one guidance suite:

- `project-charter.md` defines the repo-wide charter: what must always be true.
- `evolution-abstraction-semantic-precision.md` is the first charter companion: whether an introduced thing earns a precise bounded semantic level.
- `evolution-simple-reliable-control.md` is the second companion: short control loops, direct checks, and gradual compatibility-safe convergence.
- `evolution-helper-oriented-agent.md` is the third companion: the user decides only necessary semantics/risk/permission; the Agent executes legal mechanical work; Engine authority remains deterministic.
- `framework-runtime-boundary.md`, `logging-conventions.md`, and `command-experiments.md` define focused boundaries for runtime placement, observability, and mechanism proof.
- `agentic-execution-model.md`, `agentic-workflow-mechanism.md`, `agentic-queue-mechanism.md`, and `agentic-subagent-mechanism.md` define the execution vocabulary and the three mechanism tiers.

Each file has frontmatter declaring its role, scope, authority level, and same-layer sibling guidance.

## Glossary

| Term | Meaning |
|------|---------|
| Agent actor | LLM or human actor that executes work by reading Markdown, structured state, or other instructions. |
| Phase Agent | Agent actor currently executing phase-level Markdown: reads phase nodes, claims/completes non-delegated queue tasks, claims/submits work units, runs gates, handles repair, and bridges Chain/Queue/Work Unit boundaries. This is a runtime role, not a permanent identity. |
| Sub-agent | Agent actor executing bounded work-unit task Markdown (`task.md` + `_beacon.json` + `result.schema.json`) and returning structured output. It does not mutate queue, append ledgers, pass gates, or own workflow authority. |
| Engine | JavaScript code that enforces deterministic checkpoints and returns structured feedback; not the Agent Flow controller. |
| CLI | Executable JS surface used for validation, inspection, deterministic checks, feedback, or future scheduling; not the LLM-facing workflow controller. |
| AGQ | Agentic Queue — the queue engine (`queue-manager.mjs` + `operate-queue.mjs`, AGQ-001~006) that drives task dispatch inside a workflow phase. Implemented as CLI/checkpoints, not an Agent, daemon, or content judge. |
| Markdown control surface | Agent-readable operating surface: phase node, task card, playbook, work-unit task, or projection. It carries tasks, constraints, and feedback into Agent context; it is not machine authority. |
| MD controller mode | Phase-level Markdown control mode used by the Phase Agent for workflow execution: read phase MD, call deterministic checkpoints, read check/inspect/advice, continue/repair/block. It is a control mode, not an Agent identity. |
| Markdown | LLM-facing Agent Flow controller/control surface; it drives staged LLM work and receives Engine/CLI feedback, but is not machine verification. See `agentic-execution-model.md` for the terminology canon. |
| Markdown Projection | Agent-readable Markdown rendered from structured state; operating surface, not authority. |
| Check | JS/CLI feedback action: deterministic pass/fail for a specific condition. |
| Inspect | JS/CLI feedback action: diagnosis of missing, inconsistent, or malformed state. |
| Advice | JS/CLI feedback action: directional guidance that helps the Agent choose the next repair or continuation step. |
| Receipt | Durable local evidence that a task or boundary really happened. |
| Trace | Append-only JSONL diagnostic memory from real execution. |
| Gate | Deterministic lifecycle boundary that passes only through accepted checks. |
| Gate Definition | Read-only framework-side rule definition that says what a gate checks; not a run result. |
| Phase transition | Runtime status synchronization such as `rb_status.json` current/next gate updates; not the same as loading or completing the next phase. |
| Phase handoff | Phase Agent consumes gate CLI `check.next` through the accepted loader/check path and receives the next Markdown control surface. |
| Work completion | Target-phase artifacts and accepted gate/content rules prove the target phase's work is done; `enter-phase` / `load_complete` alone do not. |
| Witnessing | Engine-written evidence binding a deterministic gate route to later handoff entry, such as `gate_attempt(passed=true,next=...)` plus route-bound `load_complete`. |
| Autonomous continuation | Non-terminal `stop: no` behavior where the Agent continues silently through gate-driven work and handoff rather than surfacing, waiting, or delivering early chat output. |
| Runtime context | Conceptual run or disposable experiment context containing current control files, evidence, receipts, trace, and artifacts. In the current filesystem convention this is a bundle. |
| Bundle / active bundle root | Current project convention for a runtime context, such as `dpt_rb_*` or `dpt_disp_*`. When selected for a run, CLI invocation, task card, or playbook, it is the root for all bare runtime paths, including `rb_queue.json`, `reference/`, `artifacts/`, `_cache/`, `_logs/`, and `_work_units/...`. |
| Repo command root | Repository root used to invoke `node DPT_FRAMEWORK/...`; it is a command location, not runtime truth. |
| Framework root | `DPT_FRAMEWORK/`, the read-only reusable framework asset root. |
| Prototype | Experiment-specific fixtures, notes, or proof scaffold; not the production Engine source. |
| Playbook | Agent-readable Markdown experiment or command under `DPT_FRAMEWORK/`. |
| Source of Record | The one authoritative surface for a class of truth. |
