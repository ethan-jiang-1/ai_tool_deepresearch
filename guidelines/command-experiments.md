---
guideline_id: command-experiments
suite: deep-research-guidelines
title: Command Experiments Guideline
status: target
created: 2026-06-17
role: target guidance for durable command experiment shape and boundaries
scope: experiments_playbook/*, experiments
authority: guidance-target
defers_to:
  - AGENTS.md
  - openspec/config.yaml
  - openspec/specs/agent-testing/spec.md
  - openspec/changes/dedup-experiments-framework/specs/framework-engine/spec.md
  - openspec/changes/dedup-experiments-framework/specs/trace-writer/spec.md
  - openspec/changes/dedup-experiments-framework/specs/experiment-shared-infra/spec.md
activation:
  after_change: openspec/changes/dedup-experiments-framework
  requires:
    - DPT_FRAMEWORK/engine/
    - DPT_FRAMEWORK/engine/ 
    - experiments/shared/ 
siblings:
  - guidelines/project-charter.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Guideline: command_experiments Current Guidance

> 状态: 生效 | 创建: 2026-06-17 | 已激活: `openspec/changes/dedup-experiments-framework` Phase 1-10 landed | 适用于: `experiments_playbook/exp_*`

---

## Purpose

`experiments_playbook/` 是 agentic mechanism 的 staging 级端到端实验层。每个实验用 Agent 可读的 Markdown playbook 编排 Agent Flow，驱动真实 disposable bundle、真实 framework code、真实文件写入和真实 trace 裁决。

实验的价值不是“脚本打印 passed”，也不是把多阶段流程藏进 JS controller。它要证明一个机制能在接近真实 run bundle 的环境里形成可追溯反馈闭环：Markdown 驱动 LLM 行动，JS/CLI 只在关键节点执行 deterministic driver/checkpoint/feedback，输出回到 conversation context，LLM 再据此继续、修复、阻塞或裁决。

This guideline is for any command experiment that proves an agentic mechanism, not only the experiment families that exist today. It defines the reusable experiment shape: real bundle, canonical framework code, thin deterministic checkpoints, real Agent work when required, trace-backed verdict, and cleanup.

Command experiments are evidence for the OpenSpec process, not a shortcut around it. If an experiment changes accepted behavior, schema, state transitions, receipt rules, trace verdicts, or CLI contracts, create or update the OpenSpec proposal/spec/tasks first, then implement and validate the experiment.

This file is the authoritative guidance for command experiments. Engines live under `DPT_FRAMEWORK/`, playbooks under `experiments_playbook/`, shared experiment tools under `experiments/shared/`, and prototype fixtures under `experiments/prototype-*/`. The pre-dedup prototype-local engine layout is retired.

This file intentionally does not enumerate every future experiment family. A new command experiment belongs here when it has the same shape: it stages an Agent-facing mechanism in a real bundle, uses deterministic framework checkpoints for facts the Agent must not self-police, and produces evidence that can be replayed through filesystem state plus trace.

---

## File Position

This file can decide:

- The command experiment quality bar: real runtime context, real Agent work when required, canonical framework code, trace-backed verdict, and cleanup.
- The stable experiment ownership split between framework code, experiment playbooks, shared setup, and prototype fixtures.
- Target conventions for durable command experiments under the current framework layout.

This file cannot decide:

- Accepted capability behavior, concrete schema fields, CLI flags, trace event semantics, or framework API signatures.
- That a target path or helper exists in the current repository before the activating change has landed and validated.
- That a command experiment passing is enough to bypass OpenSpec acceptance for behavior changes.

---

## Current Use

This guideline is fully active. The target surfaces it describes — framework engines under `DPT_FRAMEWORK/`, playbooks under `experiments_playbook/`, shared experiment tools under `experiments/shared/`, and a unified trace writer — exist and are current. The stable core rules always apply: do not mock Agent work, hand-write fake receipts or trace, use console output as verdict, hide Agent Flow inside JS, or treat prototype code as production authority.

---

## Post-Activation Cleanup

This section records that activation cleanup happened. When a future change makes target surfaces current, do the same: update `guidelines/README.md` statuses, remove migration language that only applied before activation, re-check target paths, and resolve any conflicts with accepted specs or implementation. The `dedup-experiments-framework` change completed this cleanup — see that change's tasks.md for the detailed checklist.

---

## Guidance Boundary

This guideline owns the experiment shape and quality bar. It does not own concrete capability behavior.

| Concern | Source of record |
|---------|------------------|
| Why command experiments exist, what evidence counts, and what anti-patterns are forbidden | This guideline, under `guidelines/project-charter.md` |
| Accepted behavior, schemas, state transitions, trace event semantics, and CLI contracts | `openspec/specs/` or the active OpenSpec change |
| Exact module names, function signatures, CLI flags, and trace writer API | Accepted specs plus `DPT_FRAMEWORK/` implementation |
| Case-specific story, fixture selection, execution steps, and cleanup command | The individual experiment playbook |

If a needed detail is not stable across mechanisms, do not promote it into this guideline. Put it in the relevant OpenSpec change/spec, framework module, or playbook.

---

## Stable Core And Variable Surface

Do not confuse this guideline's stable core with its target conventions.

Stable core:

- Real Agent-facing mechanism work, not scripted pretending.
- Real disposable runtime context, not isolated scratch files that skip bundle state.
- Canonical framework code for deterministic behavior, not playbook-local reimplementation.
- Markdown-visible Agent Flow, with JS/CLI limited to deterministic checkpoints and feedback.
- Machine feedback returning to the LLM before the next Agent action.
- Final claim backed by runtime files, receipts where applicable, and trace.
- OpenSpec discipline before behavior, schema, state, CLI, or trace contract changes.

Variable surface:

- Case names and proof roles.
- Fixture types and where they are staged inside the disposable context.
- Whether a case needs native subagent work, another Agent tool, or only main-Agent action.
- Whether deterministic checkpoints are reached through inline `.mjs`, a CLI, or a reusable framework helper.
- The exact frontmatter fields, helper flags, trace event details, and import strings defined by accepted specs or the active change.

When extending command experiments, preserve the stable core and let the variable surface be mechanism-specific. Do not copy the shape of the current experiment families unless that shape answers the new mechanism's proof question.

---

## Applicability Test

Use this guideline for a future experiment when all of these are true:

- The experiment proves an Agent-facing mechanism, not only a pure library function.
- The mechanism needs a real run-like filesystem context to be credible.
- Some facts must be checked by JS/CLI/Engine instead of Agent self-report.
- The Agent must read machine feedback and continue, repair, block, or judge.
- The final claim can be audited from runtime files and trace JSONL.

If those conditions do not hold, route the work to unit tests, framework integration tests, or a separate OpenSpec change instead of forcing it into `experiments_playbook/`.

---

## Experiment Charter

The safety rules below always apply. Any rule that names a target path or helper is subject to `Current Use`: use that path only after the active change or accepted implementation provides it.

### MUST

- MUST follow `openspec/config.yaml` and the relevant OpenSpec change before changing accepted behavior.
- MUST use a real disposable experiment runtime context; the target project convention is a `dpt_disp_*` bundle.
- MUST create disposable runtime contexts through approved shared experiment infrastructure; the target default is `experiments/shared/new-disposable-bundle.mjs`.
- MUST run `validate-bundle.mjs` and `inspect-bundle.mjs` before mechanism execution.
- MUST import and exercise framework APIs from their canonical `DPT_FRAMEWORK/` location instead of reimplementing the mechanism in the playbook.
- MUST use `DPT_FRAMEWORK/engine/trace.mjs` as the single trace writer.
- MUST use real Agent or native subagent execution when the mechanism depends on Agent behavior.
- MUST keep stage sequence, Agent handoff, and any native subagent semantics visible in the Markdown playbook.
- MUST keep inline `.mjs` code, when present, as a thin deterministic driver/checkpoint.
- MUST let Engine/CLI output return to the LLM as actionable context.
- MUST make the final verdict come from trace JSONL.
- MUST clean up the disposable runtime context at the end of the playbook.

### MUST NOT

- MUST NOT mock LLM/subagent work.
- MUST NOT use a passing experiment as permission to bypass OpenSpec acceptance.
- MUST NOT hand-write fake `result.json`, runtime receipt, trace event, or completion receipt.
- MUST NOT use `console.log` as pass/fail authority.
- MUST NOT bypass approved bundle creation with ad hoc `mkdir`, `sed {{name}}`, or direct `rb_templates` copying.
- MUST NOT import production engine or trace code from `experiments/prototype-*`.
- MUST NOT read source fixtures from the prototype directory at runtime when the experiment contract says runtime inputs live inside the bundle.
- MUST NOT patch a failed receipt by hand to make the verdict pass.
- MUST NOT hide a multi-stage Agent Flow inside an inline `.mjs` controller.
- MUST NOT replace Agent Flow with a JS controller just because that is easier to test.
- MUST NOT leave a successful experiment bundle behind.

判断标准：**这个事件是真实发生的，还是脚本/人写出来假装发生的？**

---

## Layer Contract

Command experiments use four ownership layers. The exact mechanism names vary; the ownership split does not.

| Layer | Owns | Does not own |
|-------|------|--------------|
| `DPT_FRAMEWORK/` | Reusable framework code: deterministic engines, CLIs, schemas, trace writer, command playbooks | Experiment-only setup data or mechanism-specific fixtures |
| `experiments_playbook/exp_<mechanism>/` | Agent-readable playbooks that stage real end-to-end mechanism experiments | Core mechanism implementation |
| `experiments/shared/` | Experiment-only shared setup utilities, such as disposable bundle creation | Production runtime behavior |
| `experiments/prototype-<mechanism>/` | Experiment-specific fixtures and notes, such as `EXPERIMENT.md`, case data, and mechanism-specific fixture files | Production engine code, trace writer code, CLI contracts, reusable schemas |

`experiments/prototype-*` is not a production code location. It does not own engine logic, trace writer logic, CLI contracts, or reusable schema.

Naming:

- Experiment directory: `experiments_playbook/exp_<mechanism>/`
- Prototype directory, when used: `experiments/prototype-<mechanism>/`
- Case playbook: `test-<case>.md`, where case names are chosen to prove one mechanism question at a time.
- Disposable bundle: `dpt_disp_<short>_<case>/`
- Trace file: `dpt_disp_<short>_<case>/_trace_<short>_<case>.jsonl`
- Fixture files copied into bundle: paths defined by the playbook and relevant spec.

These names are target conventions, not the mechanism taxonomy. Future mechanisms may add case names, fixture types, helper inputs, or optional prototype-free organization when an OpenSpec change or playbook explains why; they must not change the ownership split above.

## Import Boundary

Use canonical framework paths for production code. Do not import engine, trace, schema, or CLI logic from `experiments/prototype-*`.

Import paths are a boundary check, not a memorized table. The exact relative path depends on where the `.mjs` file is written and executed. If an import path is inconvenient, move the driver or use the accepted CLI; do not create a local copy of framework code to make the path easier.

Stable import rules:

- Drivers and playbooks import production logic only from `DPT_FRAMEWORK/` or an accepted CLI.
- Framework modules import other framework modules directly from their canonical framework locations.
- Prototype directories provide fixtures and notes only.
- Relative imports are resolved from the executing `.mjs` file location, not from the shell command's current working directory.
- Exact path examples belong in the relevant OpenSpec spec, framework test, or playbook template.

---

## Playbook Frontmatter

Every playbook starts with YAML frontmatter. It contains routing facts only, not explanation. The fields below are the target baseline; accepted specs may add mechanism-specific routing fields.

```markdown
---
schema: command-experiment/v1
experiment: <mechanism>
case: <case-name>
case_goal: "<one sentence: what this case proves>"
runner: coding-agent
agent_mode: <mode-if-agent-dependent>  # omit or set only when real Agent/subagent execution is required
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_<short>_<case>
trace: dpt_disp_<short>_<case>/_trace_<short>_<case>.jsonl
verdict: trace-jsonl
---
```

Immediately after frontmatter, include a short execution contract:

```markdown
## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。
```

Then use a title:

```markdown
# test-<mechanism>-<case>
```

---

## Runtime Path

Every playbook follows this shape:

```markdown
## Expected Runtime Path

1. 创建 disposable bundle `[MAIN/SHELL]`
2. 执行核心机制 `[MAIN/SHELL]`
3. 如需要，启动真实 Agent/subagent 工作 `[MAIN->AGENT]`
4. 读取 JS/CLI 输出和 trace JSONL，形成可行动反馈 `[MAIN/SHELL]`
5. LLM 根据反馈继续、修复、阻塞或裁决 `[MAIN]`
6. 清理 disposable bundle `[MAIN/SHELL]`

## Step 1: 创建 disposable runtime context
...

## Step N: 从 trace 裁决
...

## Cleanup
...
```

Step names can vary, but the lifecycle cannot.

---

## Runtime Context Creation

Use approved shared experiment infrastructure. Do not hand-roll `mkdir`, `sed {{name}}`, or manual `rb_templates` copying in new experiments.

The current target default is `experiments/shared/new-disposable-bundle.mjs`, invoked with a mechanism-specific bundle suffix and only the fixture inputs the case actually needs. If a future experiment needs different setup, that setup must still be shared, explicit, covered by OpenSpec when it changes framework behavior, and produce a normal disposable runtime context that passes `validate-bundle.mjs` and `inspect-bundle.mjs` before mechanism execution starts.

Shared setup owns the exact runtime skeleton. The playbook owns only the case identity, fixture selection, and follow-up validation calls.

---

## Execution Steps

Each execution step should normally contain:

1. One short paragraph saying what mechanism is being exercised.
2. One deterministic action block that writes and runs a minimal inline `.mjs` driver, invokes an accepted CLI, or starts required real Agent work.
3. One expected result line.

Keep inline scripts thin:

- Import framework APIs from their canonical `DPT_FRAMEWORK/` location, or call an accepted CLI.
- Set trace file through `DPT_FRAMEWORK/engine/trace.mjs`.
- Call the mechanism under test.
- Append `check` events to trace.
- Avoid implementing the mechanism inside the playbook.
- Avoid orchestrating multi-stage Agent Flow inside the inline script.

Complex deterministic logic belongs in the canonical framework module or CLI defined by the relevant spec, not in Markdown shell blocks. Experiment playbooks import or invoke framework code from its canonical `DPT_FRAMEWORK/` location.

New experiment verdict checks use `event === "check"` with a boolean `passed` field. Older `verify` events are migration residue only; do not use them for new or updated playbooks.

Use JS/CLI feedback actions consistently when a playbook needs machine feedback beyond raw trace verdict:

- `check` answers whether a specific condition passed.
- `inspect` explains missing files, malformed state, inconsistent counters, or other diagnosis.
- `advice` gives the next recommended action when a deterministic system can point the Agent in a better direction.

For command experiments under this guideline, only `check` is the normative trace verdict event. `inspect` and `advice` are feedback actions for LLM context unless a future accepted spec defines them as trace events or CLI commands. Do not confuse the feedback action `inspect` with the existing `inspect-bundle.mjs` validation CLI.

The output of those steps should be useful when it returns to the conversation; do not bury the only actionable detail inside an unparsed wall of console text.

If a playbook needs to restate project-wide layer boundaries, link to `guidelines/project-charter.md` instead of redefining them locally. This keeps experiment instructions focused on execution and prevents drift.

---

## Agent-Dependent Experiments

If a case depends on real Agent or native subagent behavior:

- Declare that dependency in frontmatter or the execution contract.
- Keep the Agent-visible routing, handoff, and expected evidence in Markdown.
- Create runtime work items through the framework mechanism under test.
- Start real Agent/subagent execution through the available Agent tool when the mechanism requires it.
- Require each Agent actor to write its own runtime evidence, such as a receipt, result file, or trace event defined by the relevant spec.
- Let the parent Agent collect, merge, or judge only after runtime evidence exists.

Do not satisfy an Agent-dependent experiment by writing the expected child output from the parent context.

---

## Trace Verdict

The verdict step reads trace JSONL and exits nonzero on failed checks.

Minimum verdict script behavior:

- Parse every JSONL line.
- Filter `event === "check"`.
- Require at least one `check` event.
- Count passed checks where `passed === true`.
- Count failed checks where `passed !== true`.
- Print a compact summary for humans.
- `process.exit(1)` if no checks exist or any check failed.

Console output explains the verdict; trace data decides it.

---

## Framework Code Rules

Reusable deterministic mechanism code lives under `DPT_FRAMEWORK/` and is imported by both experiment playbooks and production run bundles. Engine modules normally live under `DPT_FRAMEWORK/engine/`; CLIs, schemas, and trace utilities stay under their existing framework directories. The `experiments/prototype-<mechanism>/` directory is thin: it holds experiment-specific fixtures and notes only.

Rules:

- Use pure ESM `.mjs`.
- Use `node:test` + `node:assert`.
- Framework modules MAY import from each other when dependencies exist. Do not embed a copy of another framework module's code; use direct imports.
- Validate state with Zod where schemas exist.
- Throw on invalid state; do not silently repair in Engine code unless that repair is the mechanism under test.
- `trace.mjs` lives at `DPT_FRAMEWORK/engine/trace.mjs` as a single unified trace writer. Prototypes do not keep per-prototype trace copies.
- Follow the Import Boundary above; relative paths depend on where the inline driver file is written and executed.
- **Engine provides the deterministic loop; MD/Agent provides the intelligent strategy.** When a mechanism needs a decision—how to repair, what to dispatch, which branch action to take—Engine exports an injection point (function parameter, factory argument) and MD/Agent supplies the actual logic. Engine never hardcodes a repair strategy, dispatch rule, or branch action. Example: `convergeRepair(state, { repairStep })` — Engine owns the loop (iterate, check stall, enforce maxIterations, detect terminal branches); the `repairStep` function is written by MD/Agent because "how to repair" is an intelligent decision.

Trace writer rule: use the unified `DPT_FRAMEWORK/engine/trace.mjs` writer, and choose the import path from the Import Boundary above. The exact API is defined by the trace-writer spec; do not recreate trace helpers inside playbooks or prototype fixtures.

---

## Case Design

Case names are labels for mechanism questions, not a fixed taxonomy. Use the smallest set of cases that proves the mechanism without mixing unrelated claims.

Common case roles:

| Role | Purpose |
|------|---------|
| Happy path | Smallest real path proving the core mechanism. |
| Advanced path | Main non-trivial behavior: dependency, branch, repair, collection, routing, cache/execute distinction, or other mechanism-specific complexity. |
| Failure path | Malformed input, missing dependency, partial failure, convergence failure, blocked outcome, or repair behavior. |
| Environment path | Optional platform, identity, runtime metadata, or integration assumption check. |

Names such as `simple`, `medium`, `complex`, and `identity` are acceptable when they match these roles, but they are not mandatory. Each case should answer one question. If a case tries to prove several unrelated things, split it.

---

## Anti-Patterns

- New playbook manually creates disposable runtime contexts instead of using approved shared setup infrastructure.
- Playbook code implements the mechanism instead of importing framework code from `DPT_FRAMEWORK/`.
- Playbook imports engine or trace code from `experiments/prototype-*`.
- A prototype directory keeps production engine, trace writer, CLI, or reusable schema logic.
- Inline `.mjs` becomes the multi-stage Agent Flow controller instead of a thin deterministic driver.
- Stage sequence, Agent handoff, or native subagent semantics are hidden inside JS instead of remaining visible in Markdown.
- A test passes from hard-coded expected output rather than runtime evidence.
- `console.log` is treated as the verdict.
- Source fixtures are read directly from the prototype directory at runtime instead of being staged into the disposable bundle when the experiment contract requires staged runtime inputs.
- A failed receipt is patched by hand instead of producing a repair path or explicit failure.
- A disposable bundle is left behind after a successful case.
- Current known experiment families are treated as the full universe of future command experiments.
- Case labels such as `simple`/`medium`/`complex` are treated as mandatory even when a mechanism needs a different proof shape.

---

## New Experiment Checklist

- [ ] `experiments_playbook/exp_<mechanism>/` exists.
- [ ] Reusable framework code exists under `DPT_FRAMEWORK/` for the mechanism under test.
- [ ] `DPT_FRAMEWORK/engine/trace.mjs` is the single trace writer used by the playbook and engine.
- [ ] Any `experiments/prototype-<mechanism>/` content is fixture-only.
- [ ] The experiment note, usually `EXPERIMENT.md`, states the mechanism, hypothesis, and result.
- [ ] Case playbooks cover the mechanism's needed proof roles, and each case answers one question.
- [ ] Frontmatter names the disposable runtime context and trace paths.
- [ ] The playbook keeps stage sequence and Agent handoff visible in Markdown.
- [ ] Any inline `.mjs` is only a thin deterministic driver/checkpoint.
- [ ] Runtime context setup uses approved shared experiment infrastructure.
- [ ] Disposable runtime context passes validate + inspect before mechanism execution.
- [ ] Trace JSONL is the final verdict.
- [ ] Cleanup removes the disposable runtime context.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Charter](project-charter.md) — repo-wide charter and authority map.
- [Engine-Side Dispatch Scheduler](agentic-dispatch-scheduler-mechanism.md) — future ds mechanism draft; use this experiment guideline for any ds prototype.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Agent Testing spec](../openspec/specs/agent-testing/spec.md) — accepted requirements for agent-assisted experiment playbooks.
