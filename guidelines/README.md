---
guideline_id: guidelines-index
suite: deep-research-guidelines
title: Guidelines Index
status: effective
created: 2026-06-17
role: index for the guidance suite
scope: guidelines/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/command-experiments.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/subagent-boundary.md
---

# Guidelines Index

> 状态: 生效 | 创建: 2026-06-17

`guidelines/` is the charter layer for this repo. It explains how to think and work here, but it is not the spec authority.

Authority flows only from upstream: `AGENTS.md` and `openspec/config.yaml`. A guideline's `defers_to` names upstream authority only — never a specific downstream spec, module, or path. Its `scope` names the space it governs, and may name concrete directories like `experiments_playbook/*` because that is where this guidance must be followed. Pointing at `openspec/specs/` as a whole ("accepted behavior lives there") is fine; naming a specific downstream spec as a dependency is not.

Read in this order:

1. `project-charter.md` — stable project principles, authority boundaries, and current project surfaces.
2. `framework-runtime-boundary.md` — directory and authority boundary between read-only framework assets and mutable runtime bundles.
3. `agentic-workflow-mechanism.md` — normative description of the Agent-driven workflow loop: who drives, who routes, who validates.
4. `command-experiments.md` — guidance for durable command experiment shape and boundaries.
5. `agentic-queue-mechanism.md` — architectural constitution for queue-driven phase execution: two nested loops, dispatch rule, structural constraints, and derived constraints. Queue engine (AGQ-001~006) is runtime; loop-engineering direction is settled, implementation pending OpenSpec.
6. `subagent-boundary.md` (draft) — architectural principle: when and why work goes into sub-agents. Noise isolation is the highest priority; web search must go through sub-agents. Anything outside the main agent flow that is hard to control is a sub-agent candidate. Parallel dispatch integration with the queue's serial claim model is unsettled (Change 2 will resolve this).

Detailed requirements live in `openspec/specs/`. Project-level OpenSpec rules live in `openspec/config.yaml`.

When a guideline conflicts with accepted specs or executable schema, fix the guideline or create an OpenSpec change. Do not use guidance prose to override machine-verifiable contracts.

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
- MUST use `MUST` / `MUST NOT` language when a rule is safety-critical for Agent behavior.

### MUST NOT

- MUST NOT use guideline prose to create hidden runtime behavior.
- MUST NOT let Markdown become the Source of Record for deterministic queue, gate, receipt, or trace authority.
- MUST NOT describe future surfaces as implemented runtime facts.
- MUST NOT duplicate detailed requirements already owned by `openspec/specs/`.
- MUST NOT list a downstream spec, framework module, or bundle path under `defers_to`; guidelines defer only to upstream authority (`AGENTS.md`, `openspec/config.yaml`). `scope` may name concrete directories — that is the space this guidance governs, not a dependency.
- MUST NOT revive Agent self-governance for deterministic runtime authority under new names.

## Decision Routes

| If you are... | Read / update | Do not do |
|---------------|---------------|-----------|
| Starting repo work | `project-charter.md`, then relevant specs | Start from a draft mechanism document |
| Unsure whether something belongs in `DPT_FRAMEWORK/` or a bundle | `framework-runtime-boundary.md` | Decide by file extension or chat habit |
| Writing or revising a command experiment playbook | `command-experiments.md` and the relevant accepted spec or active OpenSpec change | Invent setup or verdict authority locally |
| Changing accepted behavior | OpenSpec proposal/spec/tasks | Patch only `guidelines/` |
| Modifying transition, gate, or node-loading logic | `agentic-workflow-mechanism.md` and `openspec/specs/transition-table/spec.md` | Add a second transition backend or JS-driven loop |
| Designing or implementing Agentic Queue behavior | `agentic-queue-mechanism.md` and `openspec/specs/agentic-queue/spec.md` | Implement loop engineering without OpenSpec change |
| Deciding whether work should go to a sub-agent | `subagent-boundary.md` | Let main-agent do WebSearch/WebFetch directly |
| Unsure which layer owns a rule | `project-charter.md` Authority Map | Resolve conflict by chat memory |

## Change Routing

| Change target | Primary path | Guidance update |
|---------------|--------------|-----------------|
| Project principle, layer boundary, or reading route | `guidelines/project-charter.md` or this index | Keep it short; do not add runtime behavior |
| Framework-vs-runtime directory boundary | `guidelines/framework-runtime-boundary.md` | Do not encode concrete schema fields there |
| Accepted capability behavior | OpenSpec change under `openspec/changes/`, then `openspec/specs/` | Link or summarize only after acceptance |
| Schema, state machine, receipt, gate, or trace contract | `DPT_FRAMEWORK/`, `tests/`, and accepted specs via OpenSpec | Do not define it only in prose |
| Command experiment execution pattern | `command-experiments.md` plus the relevant accepted spec or active change when normative | Avoid local one-off verdict rules |
| Agentic workflow loop (who drives, routes, validates) | `guidelines/agentic-workflow-mechanism.md` | Read before modifying transition, gate, or node-loading behavior |
| Agentic Queue loop engineering | `agentic-queue-mechanism.md` | Follow architectural constitution; route new implementation through OpenSpec |
| Current runtime/run state | The active runtime context, currently `dpt_rb_*` or `dpt_disp_*` | Reload files; do not rely on chat memory |

## Guidance Map

Guidelines defer only to upstream authority (`AGENTS.md`, `openspec/config.yaml`); none depend on a specific downstream spec or implementation, so this index carries no per-file dependency column.

| File | Reader | Purpose | Not For |
|------|--------|---------|---------|
| `project-charter.md` | Any Agent or maintainer | Repo-wide charter, authority order, hard boundaries | Detailed capability behavior |
| `framework-runtime-boundary.md` | Any Agent or maintainer touching framework/run files | Directory and authority boundary for read-only framework assets vs mutable runtime bundles | Concrete schema fields, CLI flags, or current run truth |
| `command-experiments.md` | Experiment author/executor | How to prove mechanisms with real runtime contexts and trace-backed verdicts | General project philosophy or concrete capability behavior |
| `agentic-workflow-mechanism.md` | Any Agent executing or modifying workflow logic | How the agentic loop works: MD controls, chain routes, JS validates, Agent drives | Alternative transition backends, non-chain routing, JS-driven loops |
| `agentic-queue-mechanism.md` | Designer or implementer of Agentic Queue behavior | Architectural constitution for queue-driven phase execution: two nested loops, dispatch rule, structural constraints | Current runtime behavior |

## Current / Target / Proposed

| Surface | Status | Use Today | Authority |
|---------|--------|-----------|-----------|
| `dpt_rb_*` runtime contexts | Current convention | Yes | Runtime state |
| `dpt_disp_*` disposable experiment contexts | Current convention | Yes | Runtime state |
| `experiments_playbook/exp_*` playbooks | Current | Yes — 6 experiment families, 20 playbooks | Agent-readable experiment playbooks |
| `DPT_FRAMEWORK/engine/` | Current | Yes — 5 engines (queue-manager, gate-loop, gate-fork, subagent-relay, workflow-chain) | Production engine code |
| `DPT_FRAMEWORK/engine/trace.mjs` | Current | Yes — unified trace writer, `createTrace` factory | Trace writer for all engines and playbooks |
| `DPT_FRAMEWORK/` as read-only framework assets | Current convention | Yes | Framework code, definitions, templates, and Agent-facing instructions; not run state |
| `experiments/shared/new-disposable-bundle.mjs` | Current | Yes | Shared experiment disposable-bundle setup |
| `check` trace verdict events | Current | Used by all 20 playbooks | Trace-backed verdict convention |
| `DPT_FRAMEWORK/workflows/manifest.json` + `workflows/nodes/` | Current | Yes | Single canonical workflow package for workflow-foundation; not a multi-workflow namespace |
| `DPT_FRAMEWORK/schema/gate_definitions/` | Current | Yes | Read-only gate definition JSON; skeleton/content completeness is owned by accepted specs |
| `DPT_FRAMEWORK/cli/gates/` | Current | Yes | Accepted one-gate-per-CLI skeleton wrappers |
| `DPT_FRAMEWORK/engine/gates/` | Target | No | Future gate loader/evaluator implementation; directory exists but has no loader/evaluator yet |
| `DPT_FRAMEWORK/cli/operate-queue.mjs` | Current | Yes — Agentic Queue CLI (check/enqueue/claim/complete/fail/preempt/render) | Queue operations and task dispatch |
| `rb_ledger.jsonl` | Proposed | No runtime use; design input only | Future OpenSpec + implementation required |
| Queue Markdown projection | Current | Yes — `queue-manager.mjs` render() writes `_cache/agentic-queue/current-task.md` | Queue state projection, not queue authority |

Current rows can be used as runtime facts only after reloading the active runtime context. Target rows can be used only when the active OpenSpec change or implementation provides the named surface. Proposed rows are design input only.

When a target or proposed surface becomes accepted/current, update this table in the same change that updates `openspec/specs/`, `DPT_FRAMEWORK/`, and any affected guideline. Do not leave a surface marked Proposed or Target after it has accepted executable support, and do not mark a surface Current before the accepted spec and implementation exist.

## Suite Contract

These files are one guidance suite:

- `project-charter.md` defines the repo-wide charter: what must always be true.
- `framework-runtime-boundary.md` defines the framework/runtime boundary: where read-only definitions and mutable run truth belong.
- `command-experiments.md` defines the experiment charter: how mechanisms are proven.
- `agentic-workflow-mechanism.md` defines the runtime loop: how MD, chain, and Engine cooperate during workflow execution.
- `agentic-queue-mechanism.md` defines the architectural constitution for queue-driven phase execution: the queue engine (AGQ-001~006) is implemented runtime; the loop-engineering architecture (two nested loops, dispatch rule, structural constraints) is settled direction; implementation is pending OpenSpec.

Each file has frontmatter declaring its role, scope, authority level, and sibling guidance files.

## Glossary

| Term | Meaning |
|------|---------|
| Agent | LLM actor that reads Markdown/state and performs content work. |
| Engine | JavaScript code that enforces deterministic checkpoints and returns structured feedback; not the Agent Flow controller. |
| CLI | Executable JS surface used for validation, inspection, deterministic checks, feedback, or future scheduling; not the LLM-facing workflow controller. |
| AGQ | Agentic Queue — the queue engine (`queue-manager.mjs` + `operate-queue.mjs`, AGQ-001~006) that drives task dispatch inside a workflow phase. Implemented as CLI/checkpoints, not an Agent, daemon, or content judge. |
| Markdown | LLM-facing Agent Flow controller/control surface; it drives staged LLM work and receives Engine/CLI feedback, but is not machine verification. |
| Markdown Projection | Agent-readable Markdown rendered from structured state; operating surface, not authority. |
| Check | JS/CLI feedback action: deterministic pass/fail for a specific condition. |
| Inspect | JS/CLI feedback action: diagnosis of missing, inconsistent, or malformed state. |
| Advice | JS/CLI feedback action: directional guidance that helps the Agent choose the next repair or continuation step. |
| Receipt | Durable local evidence that a task or boundary really happened. |
| Trace | Append-only JSONL diagnostic memory from real execution. |
| Gate | Deterministic lifecycle boundary that passes only through accepted checks. |
| Gate Definition | Read-only framework-side rule definition that says what a gate checks; not a run result. |
| Runtime context | Run or disposable experiment directory containing current control files, evidence, receipts, trace, and artifacts. |
| Bundle | Current project convention for a runtime context, such as `dpt_rb_*` or `dpt_disp_*`. |
| Prototype | Experiment-specific fixtures, notes, or proof scaffold; not the production Engine source. |
| Playbook | Agent-readable Markdown experiment or command under `DPT_FRAMEWORK/`. |
| Source of Record | The one authoritative surface for a class of truth. |
