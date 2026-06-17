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
  - guidelines/project.md
  - guidelines/command-experiments.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Guidelines Index

> 状态: 生效 | 创建: 2026-06-17

`guidelines/` is the human/Agent guidance layer. It explains how to think and work in this repo, but it is not the spec authority.

Read in this order:

1. `project.md` — stable project principles, authority boundaries, current repository shape.
2. `command-experiments.md` — operational rules for writing and running `DPT_FRAMEWORK/command_experiments/exp_*` playbooks.
3. `agentic-dispatch-scheduler-mechanism.md` — draft design for a future Engine-side dispatch scheduler; not current runtime truth.

Detailed requirements live in `openspec/specs/`. Project-level OpenSpec rules live in `openspec/config.yaml`.

When a guideline conflicts with accepted specs or executable schema, fix the guideline or create an OpenSpec change. Do not use guidance prose to override machine-verifiable contracts.

## Suite Charter

### MUST

- MUST treat this directory as guidance, not spec authority.
- MUST keep every guideline aligned with `AGENTS.md`, `openspec/config.yaml`, accepted specs, and executable schema.
- MUST distinguish current runtime facts from draft mechanism proposals.
- MUST preserve the core split: Agent produces content, Engine enforces deterministic contracts, Markdown bridges the two.
- MUST use `MUST` / `MUST NOT` language when a rule is safety-critical for Agent behavior.

### MUST NOT

- MUST NOT use guideline prose to create hidden runtime behavior.
- MUST NOT let Markdown become the Source of Record for deterministic queue, gate, receipt, or trace authority.
- MUST NOT describe future surfaces as implemented runtime facts.
- MUST NOT duplicate detailed requirements already owned by `openspec/specs/`.
- MUST NOT revive V12-style Agent self-governance under new names.

## Decision Routes

| If you are... | Read / update | Do not do |
|---------------|---------------|-----------|
| Starting repo work | `project.md`, then relevant specs | Start from a draft mechanism document |
| Writing an experiment playbook | `command-experiments.md` | Invent bundle setup or verdict rules locally |
| Changing accepted behavior | OpenSpec proposal/spec/tasks | Patch only `guidelines/` |
| Designing future ds behavior | `agentic-dispatch-scheduler-mechanism.md` | Treat ds as implemented or Agent-owned |
| Unsure which layer owns a rule | `project.md` Authority Map | Resolve conflict by chat memory |

## Guidance Map

| File | Reader | Purpose | Not For | Defers To |
|------|--------|---------|---------|-----------|
| `project.md` | Any Agent or maintainer | Repo-wide charter, authority order, hard boundaries | Detailed capability behavior | `AGENTS.md`, `openspec/config.yaml`, `openspec/specs/` |
| `command-experiments.md` | Experiment author/executor | How to prove mechanisms with real bundles and trace verdicts | General project philosophy | `agent-testing` specs, validate/inspect CLIs |
| `agentic-dispatch-scheduler-mechanism.md` | Designer of future ds capability | Draft Engine-side scheduler model and open questions | Current runtime behavior | Future OpenSpec change and schema |

## Current vs Proposed

| Surface | Status | Authority |
|---------|--------|-----------|
| `dpt_rb_*` production bundles | Current | Runtime state |
| `dpt_disp_*` experiment bundles | Current | Runtime state |
| `new-disposable-bundle.mjs` | Current | Experiment bundle creation helper |
| `check` trace verdict events | Current | Command experiment verdict convention |
| `DPT_FRAMEWORK/cli/ds.mjs` | Proposed | Future OpenSpec + implementation required |
| `rb_ledger.jsonl` | Proposed | Future OpenSpec + implementation required |
| Queue Markdown projection | Proposed | Future interface projection, not queue authority |

When a proposed surface becomes accepted, update this table in the same change that updates `openspec/specs/` and `DPT_FRAMEWORK/`. Do not leave a surface marked Proposed after it has executable support, and do not mark a surface Current before the accepted spec and implementation exist.

## Suite Contract

These files are one guidance suite:

- `project.md` defines the repo-wide charter: what must always be true.
- `command-experiments.md` defines the experiment charter: how mechanisms are proven.
- `agentic-dispatch-scheduler-mechanism.md` defines a draft mechanism: what Engine-side ds might become, not what exists today.

Each file has frontmatter declaring its role, scope, authority level, and sibling guidance files.

## Glossary

| Term | Meaning |
|------|---------|
| Agent | LLM actor that reads Markdown/state and performs content work. |
| Engine | JavaScript code that enforces deterministic contracts. |
| CLI | Executable JS surface used for validation, inspection, or future scheduling. |
| ds | Future Engine-side Dispatch Scheduler; a CLI/checkpoint, not an Agent, daemon, or content judge. |
| Markdown | Agent-readable interface; not a substitute for machine verification. |
| Markdown Projection | Agent-readable Markdown rendered from structured state; interface, not authority. |
| Receipt | Durable local evidence that a task or boundary really happened. |
| Trace | Append-only JSONL diagnostic memory from real execution. |
| Gate | Explicit lifecycle boundary that passes only through accepted checks. |
| Bundle | Runtime or disposable directory containing control files and data. |
| Prototype | Self-contained experiment Engine under `experiments/prototype-*`. |
| Playbook | Agent-readable Markdown experiment or command under `DPT_FRAMEWORK/`. |
| Source of Record | The one authoritative surface for a class of truth. |
