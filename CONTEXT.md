# Context

> Role: mandatory vocabulary orientation for repository work. This file is not a behavior specification, executable contract, Gate verdict, or runtime projection.

## Terminology Sources and Authority Boundary

Read this after the [Project Charter](openspec/constitution/project-charter.md)
to align the vocabulary used by repository instructions. It is a
non-authoritative vocabulary-alignment surface: normal instruction discovery and
the task-specific authoritative source still decide the work.

| Need | Canonical owner |
|---|---|
| Project boundary and ordered design review | [Project Charter](openspec/constitution/project-charter.md) and its constitutional companions |
| Next guidance role | [OpenSpec Control Map](openspec/README.md) |
| Complete execution vocabulary | [Agentic Execution Model](openspec/guidance/models/agentic-execution-model.md) |
| Framework assets versus mutable run state | [Framework Runtime Boundary](openspec/guidance/models/framework-runtime-boundary.md) |
| Durable architecture rationale | [ADR 0001](docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md), [ADR 0002](docs/adr/0002-name-the-reusable-surface-deep-research-harness.md), and [ADR 0003](docs/adr/0003-retire-legacy-harness-source-alias.md) |
| Current behavior or machine fact | the selected accepted/executable contract or selected current run bundle |

`CONTEXT.md` does not itself grant authority, capability, permission, liveness,
or evidence. It does not replace a selected accepted spec, CLI result, or
runtime record. There is deliberately no `DEEP_RESEARCH_HARNESS/CONTEXT.md`.

## Project Orientation

- **Deep Research Tool project** is the repository and engineering effort.
- **Deep Research Harness** is the reusable framework that turns a broad
  research question into an evidence-backed, gated report.
- **`DEEP_RESEARCH_HARNESS/`** is the framework source directory, not a run.
- **Run bundle** is the durable package for one bounded research engagement.
- **Current run bundle root** is the explicit absolute root selected for the
  present run, CLI invocation, task card, or experiment. It is never inferred
  from chat, cwd, recency, or filesystem order.

## Core Ownership Terms

| Term | Compact distinction |
|---|---|
| **LLM Agent** | supplies semantic judgment, research, writing, and feedback-driven repair; not deterministic runtime authority |
| **Phase Agent** | the LLM Agent's temporary phase-level role; not a permanent identity |
| **Sub-agent** | a bounded LLM Agent assigned one work unit; no workflow authority |
| **Markdown control surface** | Agent-readable work, constraints, and deterministic feedback; not machine truth |
| **Engine** | deterministic schema/checkpoint/receipt/trace authority; not a research or semantic judge |
| **Runtime truth** | durable current facts under the selected current run bundle root; not chat memory or reusable assets |
| **Source of Record** | the one owner for a class of facts; not a projection or an automatic permission grant |
| **Gate** | Engine checkpoint that permits a legal transition only when accepted checks pass; not a research phase or workflow controller |
| **Check / Inspect / Advice** | deterministic pass/fail, diagnosis, and bounded next-step feedback; none repairs or grants permission by itself |

## Execution Distinctions

- **Chain** routes phases after an accepted Gate result. It does not inspect a
  Queue or allocate work.
- **Queue** tracks phase-local demand. It is not a research planner or a Work
  Unit.
- **Queue demand item** names work needed in a phase; **Work unit** names one
  Engine-allocated delegated attempt. Their identities are different.
- **Submit** is the Engine transaction that accepts a Work Unit result and
  creates its submitted ledger row. Writing a file alone is not Submit.
- A **Gate verdict** does not itself select the next Chain phase, load a phase,
  or choose semantic repair. The accepted transition authority and Agent flow
  handle those separate responsibilities.

For complete Phase Agent, Sub-agent, Queue demand item, Work unit, and Submit
vocabulary, read the [Agentic Execution Model](openspec/guidance/models/agentic-execution-model.md)
and then the focused mechanism model selected by the control map.

## Working Boundary

Use this context to avoid category errors, then stop. For capability behavior,
read the applicable accepted spec; for deterministic facts, inspect the
executable contract or selected run bundle; for a procedure, read its operation
guide. Do not turn this orientation into a second glossary or a cached copy of
current behavior.
