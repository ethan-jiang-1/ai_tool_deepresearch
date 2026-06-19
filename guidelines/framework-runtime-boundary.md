---
guideline_id: framework-runtime-boundary
suite: deep-research-guidelines
title: Framework Runtime Boundary
status: effective
created: 2026-06-19
role: directory and authority boundary for framework assets versus run bundle runtime state
scope: DPT_FRAMEWORK/, dpt_rb_*/, dpt_disp_*/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
  - openspec/specs/
  - DPT_FRAMEWORK/schema/
siblings:
  - guidelines/project-charter.md
  - guidelines/command-experiments.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Framework Runtime Boundary

> 状态: 生效 | 创建: 2026-06-19 | 用途: 固定 framework 只读资产与 run bundle 可变状态的边界

---

## Purpose

本文件定义 `DPT_FRAMEWORK/` 和 `dpt_rb_*` / `dpt_disp_*` 的目录和权威边界。它只说明东西应该放在哪里、谁是只读定义、谁是运行时真相，不定义具体 schema 字段、CLI flags、状态机或 gate 规则。

核心规则：

```text
DPT_FRAMEWORK/ = read-only framework assets
dpt_rb_*/      = mutable production run state/data/evidence/results
dpt_disp_*/    = mutable disposable experiment state/data/evidence/results
```

同一套 `DPT_FRAMEWORK/` 可以服务多个 run bundle。运行中发生的用户输入、gate attempt、pass/fail、repair、waiting/block、trace、artifact 和 final output 都必须写入 active runtime context，不能写回 framework。

当前 v1 只有一个 canonical Deep Research workflow package，因此 workflow-foundation target 使用 `DPT_FRAMEWORK/workflows/manifest.json` 和 `DPT_FRAMEWORK/workflows/nodes/`，不使用 `workflows/<workflow-name>/` namespace。这不限制 run bundle 数量；同一套 framework 仍必须支持多个互相隔离的 `dpt_rb_*`。

---

## File Position

This file can decide:

- Directory and authority boundary between framework assets and runtime bundles.
- Whether a surface is read-only framework definition or mutable runtime state.
- Routing rules for gate definitions, gate results, workflow nodes, CLI wrappers, templates, and cache/projections.

This file cannot decide:

- Accepted capability behavior, schema fields, CLI flags, state transitions, receipt grammar, or trace event contracts.
- Current run state, queue contents, gate status, evidence counts, or verdict truth.
- Implementation permission for future surfaces that have not passed OpenSpec and executable validation.

---

## Framework Assets

`DPT_FRAMEWORK/` is read-only during workflow execution. It may contain code, templates, definitions, schemas, and Agent-facing instructions. It must not contain per-run results.

Current executable framework surfaces:

```text
DPT_FRAMEWORK/
  COMMANDS.md
  cli/
    instantiate-run-bundle.mjs
    validate-bundle.mjs
    inspect-bundle.mjs
    operate-queue.mjs
  schema/
    contracts/
  engine/
  rb_templates/
  command_playbook/
```

Workflow-foundation target routing:

```text
DPT_FRAMEWORK/
  workflows/
    manifest.json
    nodes/
      phases/
      shared/

  schema/
    contracts/
      gate-definition.mjs
    gate_definitions/
      gate-*.definition.json

  engine/
    gates/
      loader.mjs
      evaluator.mjs
    helpers/

  cli/
    gates/
      check-gate-*.mjs
    instantiate-run-bundle.mjs
    validate-bundle.mjs
    inspect-bundle.mjs
    operate-queue.mjs

  rb_templates/
  command_playbook/
```

`DPT_FRAMEWORK/workflows/` is the target Agent-facing workflow surface: manifest and Markdown nodes.

`DPT_FRAMEWORK/schema/contracts/` contains executable schema contracts.

`DPT_FRAMEWORK/schema/gate_definitions/` is the target location for read-only gate definition JSON. These files define what each gate checks; they are not run data and must not store pass/fail status.

`DPT_FRAMEWORK/engine/` contains deterministic engine code.

`DPT_FRAMEWORK/cli/` contains executable framework commands. Gate-specific wrappers target `DPT_FRAMEWORK/cli/gates/`.

`DPT_FRAMEWORK/rb_templates/` contains templates copied or materialized into new runtime bundles during instantiation. Only files that become initial bundle content belong here.

---

## Runtime Bundles

Every `dpt_rb_*` production run and `dpt_disp_*` disposable experiment is a mutable runtime context. It contains that run's current truth.

Current production bundle routing:

```text
dpt_rb_<name>/
  START_FROM_HERE.md
  rb_plan.md
  rb_profile.yaml
  rb_status.json
  rb_queue.json
  rb_trace.jsonl

  seed_topics/
  reference/
  artifacts/
    wave1/
    wave2/
  final/
  _cache/
```

Workflow-foundation target cache convention:

```text
dpt_rb_<name>/
  _cache/
    gate-results/
    projections/
```

Runtime ownership:

| Runtime surface | Owns |
|-----------------|------|
| `rb_plan.md` | This run's plan and topic registry. |
| `rb_profile.yaml` | HITL1/HITL2 user input, research profile, decisions, and configurable retry/profile data. |
| `rb_status.json` | Current workflow/phase/gate status summary for this run. |
| `rb_queue.json` | Runtime queue state for this run. |
| `rb_trace.jsonl` | Append-only event history and audit trail for this run. |
| `seed_topics/` | Initial topic / seed-topic instance data. |
| `reference/` | Reference artifacts and metadata for this run. |
| `artifacts/` | Phase outputs, synthesis artifacts, decision briefs, readiness artifacts. |
| `final/` | Final report artifacts for this run. |
| `_cache/` | Rebuildable diagnostic/projection space; not primary authority. |
| `_cache/gate-results/` | Target optional gate output snapshots; diagnostic cache only. |
| `_cache/projections/` | Target generated projections; rebuildable and not authority. |

---

## Gate Boundary

Gate files have three different meanings and must not be mixed:

| Concern | Location | Mutability | Meaning |
|---------|----------|------------|---------|
| Gate definition schema target | `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` | read-only | Defines the shape of gate definition JSON. |
| Gate definition target | `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json` | read-only | Defines what a gate checks. |
| Gate engine target | `DPT_FRAMEWORK/engine/gates/` | read-only | Loads/evaluates definitions against a bundle. |
| Gate CLI wrapper target | `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` | read-only | Runs one gate against an explicit bundle. |
| Gate runtime status | `dpt_rb_*/rb_status.json` | mutable | Records current run's phase/gate state summary. |
| Gate attempt history | `dpt_rb_*/rb_trace.jsonl` | append-only | Records gate attempts, pass/fail, repair, waiting/block events. |
| Gate output snapshot | `dpt_rb_*/_cache/gate-results/` | mutable cache | Optional latest CLI output; not main authority. |

Gate CLI commands MUST accept an explicit bundle path. The workflow-foundation target examples use `--bundle`, but the concrete flag shape belongs to the executable command contract:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle dpt_rb_example
```

Gate CLI commands MUST NOT infer active run state from chat memory or write results into `DPT_FRAMEWORK/`.

---

## MUST

- MUST treat `DPT_FRAMEWORK/` as read-only during run execution.
- MUST store mutable runtime truth inside the active `dpt_rb_*` or `dpt_disp_*` context.
- MUST distinguish framework definition from runtime state.
- MUST put read-only gate definitions under `DPT_FRAMEWORK/schema/gate_definitions/` when gate definitions are implemented.
- MUST put current run phase/gate status in `rb_status.json`.
- MUST put gate attempts, pass/fail events, repair events, waiting/block events, and audit history in `rb_trace.jsonl`.
- MUST require gate CLIs to receive an explicit bundle path.
- MUST treat `_cache/` as rebuildable diagnostic/projection space, not primary authority.

## MUST NOT

- MUST NOT write gate result, HITL answer, repair attempt, trace, artifact, or final output into `DPT_FRAMEWORK/`.
- MUST NOT copy gate definitions into every bundle as runtime state.
- MUST NOT put mutable run data under `DPT_FRAMEWORK/schema/`, `DPT_FRAMEWORK/workflows/`, `DPT_FRAMEWORK/engine/`, or `DPT_FRAMEWORK/cli/`.
- MUST NOT put framework definitions in `_cache/`.
- MUST NOT treat chat memory, progress summaries, or console output as runtime truth.
- MUST NOT use guideline prose to override accepted specs, executable schema, CLI verdicts, or active bundle state.

---

## Quick Router

| If the artifact is... | Put it in |
|-----------------------|-----------|
| Agent-facing lifecycle node target | `DPT_FRAMEWORK/workflows/nodes/phases/` |
| Agent-facing shared workflow context target | `DPT_FRAMEWORK/workflows/nodes/shared/` |
| Workflow manifest target | `DPT_FRAMEWORK/workflows/manifest.json` |
| Gate definition schema target | `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` |
| Gate rule definition target | `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json` |
| Gate evaluator/loader code target | `DPT_FRAMEWORK/engine/gates/` |
| Gate CLI wrapper target | `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` |
| Bundle initial template | `DPT_FRAMEWORK/rb_templates/` |
| Current run profile / HITL data | `dpt_rb_*/rb_profile.yaml` |
| Current run workflow status | `dpt_rb_*/rb_status.json` |
| Current run trace/audit history | `dpt_rb_*/rb_trace.jsonl` |
| Current run artifacts | `dpt_rb_*/artifacts/` or `dpt_rb_*/final/` |
| Rebuildable projection/cache | `dpt_rb_*/_cache/` |
