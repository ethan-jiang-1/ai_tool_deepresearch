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
  - openspec/specs/
siblings:
  - guidelines/project-charter.md
  - guidelines/command-experiments.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Guidelines Index

> 状态: 生效 | 创建: 2026-06-17

`guidelines/` is the human/Agent guidance layer. It explains how to think and work in this repo, but it is not the spec authority.

Read in this order:

1. `project-charter.md` — stable project principles, authority boundaries, and current project surfaces.
2. `command-experiments.md` — target guidance for durable command experiment shape and boundaries.
3. `agentic-dispatch-scheduler-mechanism.md` — draft design for a future Engine-side dispatch scheduler; not current runtime truth.

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
- MUST NOT revive Agent self-governance for deterministic runtime authority under new names.

## Decision Routes

| If you are... | Read / update | Do not do |
|---------------|---------------|-----------|
| Starting repo work | `project-charter.md`, then relevant specs | Start from a draft mechanism document |
| Writing or revising a command experiment playbook | `command-experiments.md` and the relevant accepted spec or active OpenSpec change | Invent setup or verdict authority locally |
| Changing accepted behavior | OpenSpec proposal/spec/tasks | Patch only `guidelines/` |
| Designing future ds behavior | `agentic-dispatch-scheduler-mechanism.md` | Treat ds as implemented or Agent-owned |
| Unsure which layer owns a rule | `project-charter.md` Authority Map | Resolve conflict by chat memory |

## Change Routing

| Change target | Primary path | Guidance update |
|---------------|--------------|-----------------|
| Project principle, layer boundary, or reading route | `guidelines/project-charter.md` or this index | Keep it short; do not add runtime behavior |
| Accepted capability behavior | OpenSpec change under `openspec/changes/`, then `openspec/specs/` | Link or summarize only after acceptance |
| Schema, state machine, receipt, gate, or trace contract | `DPT_FRAMEWORK/`, `tests/`, and accepted specs via OpenSpec | Do not define it only in prose |
| Command experiment execution pattern | `command-experiments.md` plus `agent-testing` spec or active experiment-framework change when normative | Avoid local one-off verdict rules |
| Future ds design | `agentic-dispatch-scheduler-mechanism.md` | Keep proposed surfaces marked Proposed until implemented |
| Current runtime/run state | The active runtime context, currently `dpt_rb_*` or `dpt_disp_*` | Reload files; do not rely on chat memory |

## Guidance Map

| File | Reader | Purpose | Not For | Defers To |
|------|--------|---------|---------|-----------|
| `project-charter.md` | Any Agent or maintainer | Repo-wide charter, authority order, hard boundaries | Detailed capability behavior | `AGENTS.md`, `openspec/config.yaml`, `openspec/specs/` |
| `command-experiments.md` | Experiment author/executor | How to prove mechanisms with real runtime contexts and trace-backed verdicts | General project philosophy or concrete capability behavior | `agent-testing` specs, active experiment-framework change, accepted specs |
| `agentic-dispatch-scheduler-mechanism.md` | Designer of future ds capability | Draft Engine-side scheduler model and open questions | Current runtime behavior | Future OpenSpec change and framework contracts |

## Current / Target / Proposed

| Surface | Status | Use Today | Authority |
|---------|--------|-----------|-----------|
| `dpt_rb_*` runtime contexts | Current convention | Yes | Runtime state |
| `dpt_disp_*` disposable experiment contexts | Current convention | Yes | Runtime state |
| `DPT_FRAMEWORK/command_experiments/exp_*` playbooks | Current / target surface | Existing playbooks now; target conventions via active change | Agent-readable experiment playbooks |
| `experiments/shared/new-disposable-bundle.mjs` | Target after `dedup-experiments-framework` | Only if the active change or implementation provides it | Shared experiment setup helper |
| `DPT_FRAMEWORK/trace/trace.mjs` | Target after `dedup-experiments-framework` | Only if the active change or implementation provides it | Unified trace writer |
| `check` trace verdict events | Target command-experiment convention | For new/updated verdicts when supported | Trace-backed verdict convention |
| `DPT_FRAMEWORK/cli/ds.mjs` | Proposed | No runtime use; design input only | Future OpenSpec + implementation required |
| `rb_ledger.jsonl` | Proposed | No runtime use; design input only | Future OpenSpec + implementation required |
| Queue Markdown projection | Proposed | No runtime use; design input only | Future interface projection, not queue authority |

Current rows can be used as runtime facts only after reloading the active runtime context. Target rows can be used only when the active OpenSpec change or implementation provides the named surface. Proposed rows are design input only.

When a target or proposed surface becomes accepted/current, update this table in the same change that updates `openspec/specs/`, `DPT_FRAMEWORK/`, and any affected guideline. Do not leave a surface marked Proposed or Target after it has accepted executable support, and do not mark a surface Current before the accepted spec and implementation exist.

## Suite Contract

These files are one guidance suite:

- `project-charter.md` defines the repo-wide charter: what must always be true.
- `command-experiments.md` defines the experiment charter: how mechanisms are proven.
- `agentic-dispatch-scheduler-mechanism.md` defines a draft mechanism: what Engine-side ds might become, not what exists today.

Each file has frontmatter declaring its role, scope, authority level, and sibling guidance files.

## Glossary

| Term | Meaning |
|------|---------|
| Agent | LLM actor that reads Markdown/state and performs content work. |
| Engine | JavaScript code that enforces deterministic checkpoints and returns structured feedback; not the Agent Flow controller. |
| CLI | Executable JS surface used for validation, inspection, deterministic checks, feedback, or future scheduling; not the LLM-facing workflow controller. |
| ds | Future Engine-side Dispatch Scheduler; a CLI/checkpoint, not an Agent, daemon, or content judge. |
| Markdown | LLM-facing Agent Flow controller/control surface; it drives staged LLM work and receives Engine/CLI feedback, but is not machine verification. |
| Markdown Projection | Agent-readable Markdown rendered from structured state; operating surface, not authority. |
| Check | JS/CLI feedback action: deterministic pass/fail for a specific condition. |
| Inspect | JS/CLI feedback action: diagnosis of missing, inconsistent, or malformed state. |
| Advice | JS/CLI feedback action: directional guidance that helps the Agent choose the next repair or continuation step. |
| Receipt | Durable local evidence that a task or boundary really happened. |
| Trace | Append-only JSONL diagnostic memory from real execution. |
| Gate | Deterministic lifecycle boundary that passes only through accepted checks. |
| Runtime context | Run or disposable experiment directory containing current control files, evidence, receipts, trace, and artifacts. |
| Bundle | Current project convention for a runtime context, such as `dpt_rb_*` or `dpt_disp_*`. |
| Prototype | Experiment-specific fixtures, notes, or proof scaffold; not the production Engine source. |
| Playbook | Agent-readable Markdown experiment or command under `DPT_FRAMEWORK/`. |
| Source of Record | The one authoritative surface for a class of truth. |
