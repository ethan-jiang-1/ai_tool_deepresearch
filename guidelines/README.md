---
guideline_id: guidelines-index
suite: deep-research-guidelines
title: Guidelines Index
status: effective
created: 2026-06-17
revised: 2026-07-12
role: index for the guidance suite
scope: guidelines/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
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

> 状态: 生效 | 创建: 2026-06-17 | 修订: 2026-07-12

`guidelines/` is the charter layer for this repo. It explains how to think and work here, but it is not the spec authority.

Authority flows from `AGENTS.md` and `openspec/config.yaml`. The two `evolution-*` charter companions additionally defer to `guidelines/project-charter.md`, their suite-local upstream charter. Other guidelines do not name sibling guidance or downstream specs/modules as authority under `defers_to`; `siblings` and prose links provide navigation. A file's `scope` names the space it governs and may name concrete directories such as `experiments_playbook/*`.

Read in this order:

1. `project-charter.md` — stable project principles, authority boundaries, and current project surfaces.
2. `evolution-simple-reliable-control.md` — short decision chains, simple quality controls, and Agent-readable root-cause feedback.
3. `evolution-helper-oriented-agent.md` — user decision, Agent execution, Engine authority, and minimal escalation.
4. `framework-runtime-boundary.md` — directory and authority boundary between read-only framework assets and mutable runtime bundles.
5. `logging-conventions.md` — runtime continuity and observability: status/queue/trace/log authority after context loss.
6. `agentic-execution-model.md` — unified execution model and terminology canon: how Chain, Queue, and Work Units compose into the current execution system. Start here to understand the overall architecture.
7. `agentic-workflow-mechanism.md` — Tier 1 (Chain): phase-to-phase routing and the Three-Authority Architecture.
8. `agentic-queue-mechanism.md` — Tier 2 (Queue): within-phase task execution, two nested loops, dispatch rule.
9. `agentic-subagent-mechanism.md` — Work-unit-mediated Sub-agent execution: noise isolation, bounded tasks, submit provenance.
10. `command-experiments.md` — guidance for durable command experiment shape and boundaries.

Detailed requirements live in `openspec/specs/`. Project-level OpenSpec rules live in `openspec/config.yaml`.

When a guideline conflicts with accepted specs or executable schema, fix the guideline or create an OpenSpec change. Do not use guidance prose to override machine-verifiable contracts.

## Guidance Precedence And Compatibility

Within this suite, `project-charter.md` defines authority/layer boundaries. The two `evolution-*` files are paired charter companions: `evolution-simple-reliable-control.md` reviews system shape and net simplification; `evolution-helper-oriented-agent.md` reviews action responsibility and escalation. Mechanism files explain their domains; they do not pre-approve a complex implementation merely by naming a problem.

Use this interpretation order:

1. Upstream rules, accepted specs, executable contracts, and current runtime truth decide actual behavior.
2. `project-charter.md` decides which layer may own the behavior.
3. `evolution-simple-reliable-control.md` decides the simplest admissible control shape.
4. `evolution-helper-oriented-agent.md` decides which decisions remain with the user and which legal mechanical work returns to the Agent.
5. The relevant mechanism guideline supplies domain-specific boundaries and terminology.

## Evolution Directions

Load both `evolution-*` files when reviewing a new OpenSpec design, recovery/mutation proposal, or Agent/user interaction surface. Apply them in order:

1. Simplicity axis: identify the shortest legal loop, direct authority, and net deletion/avoidance of complexity.
2. Helper axis: identify the smallest human decision and return all authorized mechanical execution to the Agent.

They guide gradual convergence only. They do not create current runtime behavior, and neither can override accepted specs, executable contracts, host permission, or runtime truth.

This is a convergence rule, not a big-bang rewrite order. Existing accepted implementation remains valid until changed through OpenSpec. New work must not add avoidable layers; work that touches an older complex surface should simplify locally where safe by reusing a checker, removing duplicate truth, short-circuiting dependent symptoms, downgrading presentation-only blockers, or moving one next action closer to the decision point.

## Directory Position

This directory can decide:

- Reading order, layer boundaries, and safe operating posture for Agents and maintainers.
- Guidance quality bars, anti-patterns, and routing rules that help choose the right Source of Record.
- Draft or target design direction when the file clearly marks the status as draft, target, or proposed.

This directory cannot decide:

- Accepted capability behavior, schema fields, CLI flags, state transitions, receipt grammar, or trace event contracts.
- Current runtime state, queue contents, gate status, evidence counts, or verdict truth.
- Implementation permission for future surfaces that have not passed OpenSpec and executable validation.

## Suite Charter

### MUST

- MUST treat this directory as guidance, not spec authority.
- MUST keep every guideline aligned with `AGENTS.md`, `openspec/config.yaml`, accepted specs, and executable schema.
- MUST distinguish current runtime facts from draft mechanism proposals.
- MUST preserve the core split: Agent supplies judgment and content, Markdown controls Agent Flow, Engine enforces deterministic checkpoints.
- MUST keep check / inspect / advice feedback visible to the next conversation turn when CLI/Engine output is part of the loop.
- MUST keep JS/CLI as the checkpoint/feedback layer, not the LLM-facing workflow controller.
- MUST use `MUST` / `MUST NOT` language when a rule is safety-critical for Agent actor behavior.
- MUST treat quality-control complexity as safety-critical: the control path should be simpler than the work it validates and should expose direct authority, earliest root cause, and one next action.
- MUST interpret historical mechanism goals as result obligations, not automatic approval for watchers, controllers, fallback trees, duplicate validators, or derived-state stacks.
- MUST paired-load both Evolution Directions for new architecture, recovery/mutation, or Agent/user responsibility design.

### MUST NOT

- MUST NOT use guideline prose to create hidden runtime behavior.
- MUST NOT let Markdown become the Source of Record for deterministic queue, gate, receipt, or trace authority.
- MUST NOT describe future surfaces as implemented runtime facts.
- MUST NOT duplicate detailed requirements already owned by `openspec/specs/`.
- MUST NOT list a downstream spec, framework module, or bundle path under `defers_to`. The only suite-local exception is that the two `evolution-*` charter companions defer to `guidelines/project-charter.md`; `scope` may name concrete directories because it describes governed space, not a dependency.
- MUST NOT revive Agent self-governance for deterministic runtime authority under new names.
- MUST NOT use `evolution-simple-reliable-control.md` to bypass accepted behavior or trigger an unscoped full-system rewrite; convergence happens through focused OpenSpec changes.

## Decision Routes

| If you are... | Read / update | Do not do |
|---------------|---------------|-----------|
| Starting repo work | `project-charter.md`, then relevant specs | Start from a draft mechanism document |
| A design is accumulating checks, fallbacks, or derived state | `evolution-simple-reliable-control.md` | Assume more logic automatically means more reliability |
| A design asks the user to run commands, repair state, or choose among recovery paths | `evolution-helper-oriented-agent.md` | Treat the human as the ordinary pipeline executor |
| Reviewing architecture, recovery/mutation, or Agent/user responsibility | Both `evolution-*` files, then the relevant mechanism/spec | Apply only one axis and miss either system complexity or action responsibility |
| Unsure whether something belongs in `DPT_FRAMEWORK/` or a bundle | `framework-runtime-boundary.md` | Decide by file extension or chat habit |
| Resuming a run after context loss or debugging log/trace confusion | `logging-conventions.md`, then active bundle control files and trace | Infer current state from chat memory, console output, or `_logs/run.log` |
| Writing or revising a command experiment playbook | `command-experiments.md` and the relevant accepted spec or active OpenSpec change | Invent setup or verdict authority locally |
| Changing accepted behavior | OpenSpec proposal/spec/tasks | Patch only `guidelines/` |
| Understanding how Chain, Queue, and Work Units fit together | `agentic-execution-model.md` | Start from a single mechanism file without the global picture |
| Modifying transition, gate, or node-loading logic | `agentic-workflow-mechanism.md` and `openspec/specs/transition-table/spec.md` | Add a second transition backend or JS-driven loop |
| Designing or implementing Agentic Queue behavior | `agentic-queue-mechanism.md` and `openspec/specs/agentic-queue/spec.md` | Implement loop engineering without OpenSpec change |
| Deciding whether work should go to a sub-agent | `agentic-subagent-mechanism.md` | Let Phase Agent do WebSearch/WebFetch directly |
| Unsure which layer owns a rule | `project-charter.md` Authority Map | Resolve conflict by chat memory |

## Change Routing

| Change target | Primary path | Guidance update |
|---------------|--------------|-----------------|
| Project principle, layer boundary, or reading route | `guidelines/project-charter.md` or this index | Keep it short; do not add runtime behavior |
| Evolution direction for system shape or action responsibility | The relevant `guidelines/evolution-*.md`; paired-load both for design review | Do not define concrete runtime behavior there |
| Framework-vs-runtime directory boundary | `guidelines/framework-runtime-boundary.md` | Do not encode concrete schema fields there |
| Accepted capability behavior | OpenSpec change under `openspec/changes/`, then `openspec/specs/` | Link or summarize only after acceptance |
| Schema, state machine, receipt, gate, or trace contract | `DPT_FRAMEWORK/`, `tests/`, and accepted specs via OpenSpec | Do not define it only in prose |
| Command experiment execution pattern | `command-experiments.md` plus the relevant accepted spec or active change when normative | Avoid local one-off verdict rules |
| Agentic workflow loop (who drives, routes, validates) | `guidelines/agentic-workflow-mechanism.md` | Read before modifying transition, gate, or node-loading behavior |
| Agentic Queue loop engineering | `agentic-queue-mechanism.md` | Preserve its boundaries, then use `evolution-simple-reliable-control.md` to choose the smallest implementation; route behavior changes through OpenSpec |
| Current runtime/run state | The active runtime bundle root, currently a selected `dpt_rb_*` or `dpt_disp_*` directory | Reload files; do not rely on chat memory |

## Guidance Map

Guidelines defer to upstream authority and never to a downstream spec or implementation. The two Evolution Directions additionally defer to the Project Charter as their suite-local upstream guidance, so this index carries no downstream dependency column.

| File | Reader | Purpose | Not For |
|------|--------|---------|---------|
| `project-charter.md` | Any Agent or maintainer | Repo-wide charter, authority order, hard boundaries | Detailed capability behavior |
| `evolution-simple-reliable-control.md` | Proposal author, reviewer, Engine/CLI designer | Charter-level complexity discipline: short decision chains, direct quality checks, smallest actionable root-cause feedback, gradual convergence | Concrete schema fields, CLI flags, weakening deterministic authority, or unscoped rewrites |
| `evolution-helper-oriented-agent.md` | Proposal author, reviewer, Agent-facing workflow designer | Charter-level action-responsibility direction: user decisions, Agent execution, Engine authority, minimal escalation | Permission grants, mutation/reentry implementation, persona/memory, or helper subsystem |
| `framework-runtime-boundary.md` | Any Agent or maintainer touching framework/run files | Directory and authority boundary for read-only framework assets vs mutable runtime bundles | Concrete schema fields, CLI flags, or current run truth |
| `logging-conventions.md` | Any Agent or maintainer resuming/debugging a run | Runtime continuity and observability: status/queue/trace/log authority, diagnostic vs audit boundaries | API contracts, schema fields, or using logs as verdict |
| `command-experiments.md` | Experiment author/executor | How to prove mechanisms with real runtime contexts and trace-backed verdicts | General project philosophy or concrete capability behavior |
| `agentic-execution-model.md` | Any Agent or maintainer new to the system | Unified execution model and terminology canon: how Chain, Queue, and Work Units compose into the current execution system | Per-tier implementation detail |
| `agentic-workflow-mechanism.md` | Any Agent executing or modifying workflow logic | Tier 1 (Chain): phase-to-phase routing and Three-Authority Architecture | Alternative transition backends, non-chain routing, JS-driven loops |
| `agentic-queue-mechanism.md` | Designer or implementer of Agentic Queue behavior | Tier 2 (Queue): within-phase task execution, two nested loops, dispatch rule | Current runtime behavior |
| `agentic-subagent-mechanism.md` | Designer or implementer of Sub-agent execution | Work-unit-mediated Sub-agent execution, noise isolation, bounded task contract, submit provenance | Current runtime behavior |

## Current / Target / Proposed

| Surface | Status | Use Today | Authority |
|---------|--------|-----------|-----------|
| `dpt_rb_*` runtime bundle roots | Current convention | Yes | Production run state |
| `dpt_disp_*` disposable experiment bundle roots | Current convention | Yes | Disposable experiment state |
| `experiments_playbook/exp_*` playbooks | Current | Yes — see `experiments_playbook/RUN.md` for current inventory | Agent-readable experiment playbooks |
| `DPT_FRAMEWORK/engine/` | Current | Yes — queue, work-unit, gate, trace, workflow-chain, and supporting helpers | Production engine code |
| `DPT_FRAMEWORK/engine/trace.mjs` | Current | Yes — unified trace writer, `createTrace` factory | Trace writer for all engines and playbooks |
| `DPT_FRAMEWORK/` as read-only framework assets | Current convention | Yes | Framework code, definitions, templates, and Agent-facing instructions; not run state |
| `experiments_env/shared/new-disposable-bundle.mjs` | Current | Yes | Shared experiment disposable-bundle setup |
| `check` trace verdict events | Current | Used by command experiment playbooks; see `experiments_playbook/RUN.md` for inventory | Trace-backed verdict convention |
| `DPT_FRAMEWORK/workflows/manifest.json` + `workflows/nodes/` | Current | Yes | Single canonical workflow package for workflow-foundation; not a multi-workflow namespace |
| `DPT_FRAMEWORK/schema/gate_definitions/` | Current | Yes | Read-only gate definition JSON; skeleton/content completeness is owned by accepted specs |
| `DPT_FRAMEWORK/cli/gates/` | Current | Yes | Accepted one-gate-per-CLI skeleton wrappers |
| `DPT_FRAMEWORK/engine/gates/` | Target | No | Future gate loader/evaluator implementation; directory exists but has no loader/evaluator yet |
| `DPT_FRAMEWORK/cli/operate-queue.mjs` | Current | Yes — Agentic Queue CLI for non-delegated queue maintenance/completion | Queue operations and non-delegated task completion |
| `DPT_FRAMEWORK/cli/operate-work-unit.mjs` | Current | Yes — delegated claim/submit/fail/timeout/abandon/inspect lifecycle | Production delegated work boundary |
| `rb_ledger.jsonl` | Proposed | No runtime use; design input only | Future OpenSpec + implementation required |
| Queue Markdown projection | Current | Yes — `queue-manager.mjs` render() writes `_cache/agentic-queue/current-task.md` | Queue state projection, not queue authority |

Current rows can be used as runtime facts only after reloading the active runtime bundle root. Bare runtime paths such as `rb_queue.json`, `reference/`, `artifacts/`, `_cache/`, `_logs/`, and `_work_units/...` resolve under that active bundle root. Target rows can be used only when the active OpenSpec change or implementation provides the named surface. Proposed rows are design input only.

When a target or proposed surface becomes accepted/current, update this table in the same change that updates `openspec/specs/`, `DPT_FRAMEWORK/`, and any affected guideline. Do not leave a surface marked Proposed or Target after it has accepted executable support, and do not mark a surface Current before the accepted spec and implementation exist.

## Suite Contract

These files are one guidance suite:

- `project-charter.md` defines the repo-wide charter: what must always be true.
- `evolution-simple-reliable-control.md` is the charter companion for complexity posture: short control loops, direct checks, quality-control logic simpler than the work it validates, and gradual compatibility-safe convergence.
- `evolution-helper-oriented-agent.md` is the charter companion for action responsibility: the user decides only new semantics/risk/permission, the Agent executes legal mechanical work, and Engine authority remains deterministic.
- `framework-runtime-boundary.md` defines the framework/runtime boundary: where read-only definitions and mutable run truth belong.
- `logging-conventions.md` defines runtime continuity and observability guidance: how status, queue, trace, and log keep a long-running bundle recoverable without chat memory.
- `command-experiments.md` defines the experiment charter: how mechanisms are proven.
- `agentic-execution-model.md` defines the unified execution model and terminology canon: Chain, Queue, and Work Units, how they compose, and the canonical definitions that resolve ambiguity across mechanism files.
- `agentic-workflow-mechanism.md` defines Tier 1 (Chain): phase-to-phase routing and the Three-Authority Architecture (MD / Chain / Engine).
- `agentic-queue-mechanism.md` defines Tier 2 (Queue): within-phase task execution, two nested loops, dispatch rule. Queue engine (AGQ-001~006) is implemented runtime; seed-topics/wave0/wave1/wave2 are accepted/current queue integrations. Remaining loop engineering gaps still require OpenSpec.
- `agentic-subagent-mechanism.md` defines work-unit-mediated Sub-agent execution: noise-isolation principles, bounded work-unit tasks, runtime receipts, and submit provenance.

Each file has frontmatter declaring its role, scope, authority level, and sibling guidance files.

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
