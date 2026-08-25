---
guidance_id: openspec-control-map
title: Project Control Map
status: effective
created: 2026-06-17
revised: 2026-08-10
role: demand-driven control map for project guidance roles and authority limits
scope: openspec/
authority: guidance
---

# Project Control Map

Use this map only when the task needs a next authoritative reading surface.
Select one row that answers the uncertainty; this is not a sequential reading
list, a second glossary, or a cache of accepted behavior and runtime truth.

## Route By Trigger

| I need to decide... | Read next | Stop when |
|---|---|---|
| What is universally true for repository work? | [Project Charter](constitution/project-charter.md) | the fact needs a more specific owner |
| Does a new concept/state/view give a reader a precise bounded question? | [Abstraction as Semantic Precision](constitution/evolution/abstraction-semantic-precision.md) | the semantic level is justified or explicitly unknown |
| Is a design accumulating unnecessary checks, state, or recovery? | [Simple Reliable Control](constitution/evolution/simple-reliable-control.md) | direct facts and the shortest legal loop are clear |
| Who decides, executes, or returns the deterministic verdict? | [Helper-Oriented Agent](constitution/evolution/helper-oriented-agent.md) | responsibility is allocated without inventing permission |
| Which project terms distinguish Agent, Engine, framework, and run? | [Root Context](../CONTEXT.md) | a full definition is needed from its owner |
| How do Chain, Queue, Work Unit, and delegated work compose? | [Agentic Execution Model](guidance/models/agentic-execution-model.md) | a focused mechanism or accepted contract is selected |
| How does phase routing, Queue demand, or delegated work operate? | [Workflow](guidance/models/agentic-workflow-mechanism.md), [Queue](guidance/models/agentic-queue-mechanism.md), or [Subagent](guidance/models/agentic-subagent-mechanism.md) | the relevant contract owns the next fact |
| Does a path belong to reusable framework assets or mutable runtime state? | [Framework Runtime Boundary](guidance/models/framework-runtime-boundary.md) | the selected framework or run boundary is clear |
| How should a feedback-lifecycle change be reviewed or finalized? | [Change Feedback Loop](operations/change-feedback-loop.md) | its accepted spec and finalizer provide the legal result |
| How should a command experiment be authored or operated? | [Command Experiments](operations/command-experiments.md) | the selected experiment/spec/host contract owns the next step |
| How are status, trace, and logs distinguished during operation? | [Logging Conventions](operations/logging-conventions.md) | the executable or accepted logging contract owns the fact |
| What accepted behavior may change? | [OpenSpec specification catalog](specs/README.md) | the applicable main spec and approved change are selected |
| Where does a new behavior attach (which mechanism or layer)? | [Where New Behavior Goes](guidance/models/where-new-behavior-goes.md) | the preferred entry point and its upgrade condition are selected |
| What is true right now for a research run? | the explicitly selected current run bundle | the runtime fact is inspected at its owner |

The three constitutional design rows are deliberately ordered: semantic
precision, then simple reliable control, then helper-oriented responsibility.
They guide future work but do not alter accepted behavior, create runtime truth,
or grant implementation permission.

## Role Roots

| Role root | Owns | Does not own |
|---|---|---|
| `openspec/constitution/` | enduring project boundaries and constitutional review directions | capability behavior or runtime facts |
| `openspec/guidance/models/` | non-authoritative system-understanding models and terminology | a deterministic or semantic verdict |
| `openspec/operations/` | current Agent-facing procedures with explicit authority limits | accepted behavior or archive authority |

Models and operations are not Charter companions. Accepted specifications,
executable contracts, and the selected run bundle remain separate authorities.
When a guidance document reveals behavior that must change, leave this map and
use the approved OpenSpec lifecycle (`/opsx:propose` → `/opsx:explore` →
`/opsx:apply` → `/opsx:archive`; 每阶段先读 `openspec/governance/` 对应检查)。
