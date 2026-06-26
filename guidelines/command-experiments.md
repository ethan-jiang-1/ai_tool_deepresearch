---
guideline_id: command-experiments
suite: deep-research-guidelines
title: Command Experiments Guideline
status: effective
created: 2026-06-17
role: guidance for durable command experiment shape and boundaries
scope: experiments_playbook/*, experiments
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Guideline: command_experiments Current Guidance

> 状态: 生效 | 创建: 2026-06-17 | 适用于: `experiments_playbook/exp_*`, `experiments_playbook/exph_*`

---

## Purpose

`experiments_playbook/` 是 agentic mechanism 的 staging 级端到端实验层。每个实验用 Agent 可读的 Markdown playbook 编排 Agent Flow，驱动真实 disposable bundle、真实 framework code、真实文件写入和真实 trace 裁决。

实验的价值不是“脚本打印 passed”，也不是把多阶段流程藏进 JS controller。它要证明一个机制能在接近真实 run bundle 的环境里形成可追溯反馈闭环：Markdown 驱动 LLM 行动，JS/CLI 只在关键节点执行 deterministic driver/checkpoint/feedback，输出回到 conversation context，LLM 再据此继续、修复、阻塞或裁决。

This guideline is for any command experiment that proves an agentic mechanism, not only the experiment families that exist today. It defines the reusable experiment shape: real bundle, canonical framework code, thin deterministic checkpoints, real Agent work when required, trace-backed verdict, and cleanup.

Command experiments are evidence for the OpenSpec process, not a shortcut around it. If an experiment changes accepted behavior, schema, state transitions, receipt rules, trace verdicts, or CLI contracts, create or update the OpenSpec proposal/spec/tasks first, then implement and validate the experiment.

This file is the authoritative guidance for command experiments. Engines live under `DPT_FRAMEWORK/`, playbooks under `experiments_playbook/`, shared experiment tools under `experiments_env/shared/`, and prototype fixtures under `experiments_env/prototype-*/`. The pre-dedup prototype-local engine layout is retired.

This file intentionally does not enumerate every future experiment family. A new command experiment belongs here when it has the same shape: it stages an Agent-facing mechanism in a real bundle, uses deterministic framework checkpoints for facts the Agent must not self-police, and produces evidence that can be replayed through filesystem state plus trace.

---

## File Position

This file can decide:

- The command experiment quality bar: real runtime context, real Agent work when required, canonical framework code, trace-backed verdict, and cleanup.
- The stable experiment ownership split between framework code, experiment playbooks, shared setup, and prototype fixtures.
- Current conventions for durable command experiments under the current framework layout.

This file cannot decide:

- Accepted capability behavior, concrete schema fields, CLI flags, trace event semantics, or framework API signatures.
- That a path, helper, or convention labeled here as future or target exists today — only the accepted spec plus framework implementation can affirm that.
- That a command experiment passing is enough to bypass OpenSpec acceptance for behavior changes.

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

Do not confuse this guideline's stable core with its current conventions.

Stable core:

- Real Agent-facing mechanism work, not scripted pretending.
- Real disposable runtime context, not isolated scratch files that skip bundle state.
- Canonical framework code for deterministic behavior, not playbook-local reimplementation.
- Markdown-visible Agent Flow, with JS/CLI limited to deterministic checkpoints and feedback.
- Coding agent execution of the Markdown playbook as the action surface; the playbook is not an explanatory note that can be mentally translated into a different script.
- Machine feedback returning to the LLM before the next Agent action.
- Final claim backed by runtime files, receipts where applicable, trace, and an explicit PASS/FAIL report.
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

## Quality Gate

A playbook is not complete until a coding agent has executed it from a clean repo, step by step, and the verdict shows PASS. Committed-but-never-run is not done. The act of running IS the quality gate — most of the Runner-Emergent Principles below were discovered by running playbooks that had been written but never executed.

This applies regardless of how confident the author is in the logic. Mechanism-under-test failures, stale state from earlier steps, gate output format drift, and shell-escaping bugs all surface only at execution time.

---

## Experiment Charter

The safety rules below always apply. Concrete path or helper names refer to the current framework layout; when those surfaces move, update the accepted spec and this guideline together.

### MUST

- MUST follow `openspec/config.yaml` and the relevant OpenSpec change before changing accepted behavior.
- MUST use a real disposable experiment runtime context; the current project convention is a `dpt_disp_*` bundle.
- MUST create disposable runtime contexts through approved shared experiment infrastructure; the current default is `experiments_env/shared/new-disposable-bundle.mjs`.
- MUST run `validate-bundle.mjs` and `inspect-bundle.mjs` before mechanism execution.
- MUST import and exercise framework APIs from their canonical `DPT_FRAMEWORK/` location instead of reimplementing the mechanism in the playbook.
- MUST write every trace event in the canonical format owned by the accepted trace-writer contract; do not run a parallel trace format.
- MUST use real Agent actor or native subagent execution when the mechanism depends on Agent actor behavior.
- MUST treat the Markdown playbook as executable instructions for the coding agent runner: run it step by step, in order, inside the real runtime context.
- MUST keep stage sequence, Agent handoff, and any native subagent semantics visible in the Markdown playbook.
- MUST keep inline `.mjs` code, when present, as a thin deterministic driver/checkpoint.
- MUST let Engine/CLI output return to the LLM as actionable context.
- MUST design case-specific runtime assertions from the case goal: which trace events, receipts, files, state, content markers, queue status, or artifacts prove the run did the intended thing.
- MUST record critical runtime artifact assertions as trace `check` events so the final verdict includes them.
- MUST make the final verdict come from trace JSONL.
- MUST end every playbook with a reportable PASS/FAIL verdict that a higher-level runner can aggregate.
- MUST clean up the disposable runtime context at the end of the playbook.

### MUST NOT

- MUST NOT mock LLM/subagent work.
- MUST NOT use bash/JS to prewrite Agent-produced content as evidence that an Agent can produce that content.
- MUST NOT use a passing experiment as permission to bypass OpenSpec acceptance.
- MUST NOT hand-write fake `result.json`, runtime receipt, trace event, or completion receipt.
- MUST NOT use `console.log` as pass/fail authority.
- MUST NOT bypass approved bundle creation with ad hoc `mkdir`, `sed {{name}}`, or direct `rb_templates` copying.
- MUST NOT import production engine or trace code from `experiments_env/prototype-*`.
- MUST NOT read source fixtures from the prototype directory at runtime when the experiment contract says runtime inputs live inside the bundle.
- MUST NOT patch a failed receipt by hand to make the verdict pass.
- MUST NOT hide a multi-stage Agent Flow inside an inline `.mjs` controller.
- MUST NOT replace Agent Flow with a JS controller just because that is easier to test.
- MUST NOT leave important runtime file/content verification as console-only `PASS`/`FAIL` text if that verification is part of the case's pass condition.
- MUST NOT let an outer runner combine multiple playbooks, rewrite their steps into an "equivalent" script, skip slow Agent work, or infer success by reading instead of running.
- MUST NOT leave a successful experiment bundle behind.

判断标准：**这个事件是真实发生的，还是脚本/人写出来假装发生的？**

---

## Layer Contract

Command experiments use four ownership layers. The exact mechanism names vary; the ownership split does not.

| Layer | Owns | Does not own |
|-------|------|--------------|
| `DPT_FRAMEWORK/` | Reusable framework code: deterministic engines, CLIs, schemas, trace writer, command playbooks | Experiment-only setup data or mechanism-specific fixtures |
| `experiments_playbook/exp_<mechanism>/` | Agent-readable playbooks that stage real end-to-end mechanism experiments — **auto-runnable** by runner | Core mechanism implementation |
| `experiments_playbook/exph_<mechanism>/` | Same ownership as `exp_`: Agent-readable playbooks. Difference: mechanism under test requires human intervention — **not auto-runnable**. Runner skips these. | Core mechanism implementation |
| `experiments_env/shared/` | Experiment-only shared setup utilities, such as disposable bundle creation | Production runtime behavior |
| `experiments_env/prototype-<mechanism>/` | Experiment-specific fixtures and notes, such as `EXPERIMENT.md`, case data, and mechanism-specific fixture files | Production engine code, trace writer code, CLI contracts, reusable schemas |

`experiments_env/prototype-*` is not a production code location. It does not own engine logic, trace writer logic, CLI contracts, or reusable schema.

Naming:

- Experiment directory: `experiments_playbook/exp_<mechanism>/`
- Human-in-the-loop variant: `experiments_playbook/exph_<mechanism>/` (`exph_` = exp + human). Pairs with `exp_`. For playbooks whose mechanism under test currently requires human judgment (e.g., verifying Agent topic-rewrite quality). These are a **temporary backlog** — the goal is to move them back to `exp_` once automation matures. They do not block the automation pipeline; the runner skips `exph_` directories.
- Prototype directory, when used: `experiments_env/prototype-<mechanism>/`
- Case playbook, new/updated target: `case-<XX>-<cost>-<what-it-proves>.md`, where `XX` is the case ID — a two- or three-digit Arabic numeral. The leading digit(s) name the case group; the final digit names the case's order within that group. Two-digit IDs (`MN`) serve groups 1–9 (e.g. `11` = group 1 case 1, `29` = group 2 case 9, `41` = group 4 case 1). Three-digit IDs (`MMN`) serve groups 10+ (e.g. `101` = group 10 case 1, `121` = group 12 case 1, `211` = group 21 case 1). `MM` is the group number; `N` is the case within that group. `cost` is `light|standard|heavy` (for example, `case-11-light-four-returns.md`, `case-121-standard-wave0-happy.md`, `case-211-heavy-wave0-happy-path.md`). The suffix names what the case actually proves and SHOULD be short kebab-case, 2-4 words.
- **9NN exception band (three-digit, group numbering rule does not apply):** cases whose mechanism under test involves human judgment use the `9NN` band, split by who plays the human — `901–949` = real human (runner skips, manual only); `950–999` = AI simulates the human (auto-runnable). Both halves live under `exph_*/` co-located as `+50` pairs (e.g. `901` ↔ `951`); the runner decides skip-vs-auto by number band, not by the `exph_` prefix. 950–999 verdicts must be tagged `source: ai-judge` in trace — they are not human verdicts. See `experiments_playbook/README.md` § 编号约定 for the authoritative wording.
- Cost label: `light` means cheap JS/CLI/gate/filesystem execution; `standard` means normal real-bundle multi-step execution such as repair loops or artifact checks; `heavy` means expensive execution with real Agent/subagent, WebSearch/WebFetch, long chains, or other external/slow work.
- Filename `cost` is an authoring and runner-cost label. Frontmatter `weight` remains owned by the accepted agent-testing spec; until that spec grows a `standard` value, use `weight: light` for `light` and `standard` cases, and `weight: heavy` for `heavy` cases. This is a temporary compatibility mapping; if the accepted spec adds `standard`, update the runner-facing frontmatter convention and this guideline together.
- Case playbook, legacy/current files: `test-<complexity>-<what-it-tests>.md` remains recognized for existing playbooks, but new designs should avoid `test-` so command experiments do not read like regression tests.
- Disposable bundle: `dpt_disp_<short>_<case>_*/` (random hex suffix appended for collision avoidance)
- Trace file: `_logs/_trace.jsonl` (unified name across all playbooks; bundle directory provides isolation)
- Runner entry: `experiments_playbook/RUN.md` (contains playbook manifest + execution instructions)
- Fixture files copied into bundle: paths defined by the playbook and relevant spec.

These names are current conventions, not the mechanism taxonomy. Future mechanisms may add case names, fixture types, helper inputs, or optional prototype-free organization when an OpenSpec change or playbook explains why; they must not change the ownership split above.

## Import Boundary

Use canonical framework paths for production code. Do not import engine, trace, schema, or CLI logic from `experiments_env/prototype-*`.

Import paths are a boundary check, not a memorized table. The exact relative path depends on where the `.mjs` file is written and executed. If an import path is inconvenient, move the driver or use the accepted CLI; do not create a local copy of framework code to make the path easier.

Stable import rules:

- Drivers and playbooks import production logic only from `DPT_FRAMEWORK/` or an accepted CLI.
- Framework modules import other framework modules directly from their canonical framework locations.
- Prototype directories provide fixtures and notes only.
- Relative imports are resolved from the executing `.mjs` file location, not from the shell command's current working directory.
- Exact path examples belong in the relevant OpenSpec spec, framework test, or playbook template.

---

## Playbook Frontmatter

Every playbook starts with YAML frontmatter. It carries routing facts only, not explanation. Field definitions are owned by the accepted agent-testing spec — not by this guidance. Today only `weight` is spec-owned (AGT-005); the other fields below are the current de-facto shape shared across playbooks, kept here so authors can recognize the pattern. Treat them as convention, not as a contract this file defines.

```markdown
---
schema: command-experiment/v1
experiment: <mechanism>
case: <case-name>
weight: light | heavy               # spec-owned runner class; filename cost `standard` currently maps to weight: light
case_goal: "<one sentence: what this case proves>"
runner: coding-agent
agent_mode: <mode-if-agent-dependent>  # omit or set only when real Agent/subagent execution is required
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_<short>_<case>_*    # random hex suffix appended at creation time
trace: dpt_disp_<short>_<case>_*/_logs/_trace.jsonl   # unified trace name across all playbooks
verdict: trace-jsonl
---
```

Immediately after frontmatter, include a short execution contract:

```markdown
## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。
```

If a playbook uses seeded fixtures or prefilled runtime content, the execution contract must say what those fixtures prove and what they do not prove. A fixture may support a schema, gate, CLI, or structural test; it must not be described as proof that an Agent can make the same semantic judgment or write the same artifact.

Then use a title:

```markdown
# case-<MN>-<cost>-<what-it-proves>
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
6. 验证 case-specific runtime evidence，并把关键检查写入 trace `[MAIN/SHELL]`
7. 输出 PASS/FAIL verdict/report `[MAIN/SHELL]`
8. 结果解读：说明每个 check 证明了什么，PASS/FAIL 意味着什么 `[MAIN/SHELL]`
9. 清理 disposable bundle（PASS 才清理，FAIL 保留现场供排查）`[MAIN/SHELL]`

## Step 1: 创建 disposable runtime context
...

## Step N: 从 trace 裁决
...

## Cleanup
...
```

Step names can vary, but the lifecycle cannot.

Every playbook should also make its evidence target explicit: after the run, what must be different in the disposable bundle for the case goal to be true? Depending on the mechanism, the answer may be trace events, receipts, generated files, removed placeholders, status transitions, queue contents, artifact schemas, content markers, or cross-file consistency. If a runtime fact is part of the pass condition, record it as a trace `check`; do not leave it only as a printed diagnostic.

---

## Runtime Context Creation

Use approved shared experiment infrastructure. Do not hand-roll `mkdir`, `sed {{name}}`, or manual `rb_templates` copying in new experiments.

The current default is `experiments_env/shared/new-disposable-bundle.mjs`, invoked with a mechanism-specific bundle suffix and only the fixture inputs the case actually needs. If a future experiment needs different setup, that setup must still be shared, explicit, covered by OpenSpec when it changes framework behavior, and produce a normal disposable runtime context that passes `validate-bundle.mjs` and `inspect-bundle.mjs` before mechanism execution starts.

Shared setup owns the exact runtime skeleton. The playbook owns only the case identity, fixture selection, and follow-up validation calls.

---

## Execution Steps

Each execution step should normally contain:

1. One short paragraph saying what mechanism is being exercised.
2. One deterministic action block that writes and runs a minimal inline `.mjs` driver, invokes an accepted CLI, or starts required real Agent work.
3. One expected result line.

Keep inline scripts thin:

- Import framework APIs from their canonical `DPT_FRAMEWORK/` location, or call an accepted CLI.
- Write trace events in the canonical format (see Trace Verdict and the accepted trace-writer contract).
- Call the mechanism under test.
- Append `check` events to trace.
- Avoid implementing the mechanism inside the playbook.
- Avoid orchestrating multi-stage Agent Flow inside the inline script.

Complex deterministic logic belongs in the canonical framework module or CLI defined by the relevant spec, not in Markdown shell blocks. Experiment playbooks import or invoke framework code from its canonical `DPT_FRAMEWORK/` location.

New experiment verdict checks SHOULD use `event === "check"` with a boolean `passed` field. `verify` is an older event name still accepted by the trace reader as an alias; do not introduce new `verify` events in new or updated playbooks.

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

- Make the case goal say that Agent behavior is under test.
- Declare that dependency in frontmatter or the execution contract.
- Keep the Agent-visible routing, handoff, and expected evidence in Markdown.
- Create runtime work items through the framework mechanism under test.
- Start real Agent/subagent execution through the available Agent tool when the mechanism requires it.
- Require each Agent actor to write its own runtime evidence, such as a receipt, result file, or trace event defined by the relevant spec.
- Let the Phase Agent collect, merge, or judge only after runtime evidence exists.

Do not satisfy an Agent-dependent experiment by writing the expected child output from the parent context. A parent shell block may stage inputs, call deterministic CLIs, import receipts, or run artifact checks, but it must not prewrite the semantic output that the Agent actor is supposed to produce.

If a playbook intentionally uses a fixed payload or prefilled artifact, scope the case to the deterministic surface it actually tests, such as "gate accepts this valid payload" or "CLI rejects this malformed state." It must not claim to test the Agent's ability to infer, rewrite, search, repair, synthesize, or judge unless a real Agent performed that work during the run.

When the Agent's judgment *is* the mechanism under test and no mature automation exists to verify it, the experiment lives in `exph_<mechanism>/` (see Naming conventions above). A human reviewer reads the playbook's review checklist and judges the Agent's output quality — the gate only checks structure, not semantic correctness.

### Human-in-the-Loop Playbooks (`exph_`)

Some experiments currently require human intervention to complete — for example, HITL1 topic rewrite exercises a real LLM Agent's ability to read `phase-hitl1.md` §3a and produce a structured original topic with seed topics, but there is no programmatic way to judge whether the rewrite is *good*. These playbooks live in `exph_<mechanism>/` (`exph_` = exp + human), paired with their auto-runnable `exp_<mechanism>/` counterparts.

**This is a temporary state, not a permanent architecture.**

- `exph_` is a "known-not-yet-automated" backlog, not "forever manual"
- Every `exph_` playbook targets eventual migration to `exp_` once automation matures
- Does not block progress — automated experiments keep running, manual ones wait for capability
- The runner skips `exph_` directories by default
- Each `exph_` playbook must identify the human judgment point, why deterministic automation cannot yet replace it, and why gate pass alone is not a human pass
- Each `exph_` playbook should name the automation condition that would let it move back to `exp_`, such as a reliable programmatic reviewer, Agent-run receipt, or accepted semantic check

---

## Trace Verdict

The verdict step reads trace JSONL and exits nonzero on failed checks. It also prints a compact PASS/FAIL report that a higher-level runner can aggregate.

Trace remains the authority for verdict truth, but trace does not have to stand alone as the only evidence. Runtime artifact assertions should be converted into trace `check` events before the verdict step. Examples include "file exists," "placeholder marker is gone," "receipt has the expected nonce," "queue is empty," "status advanced," "artifact parses," or "frontmatter slug matches filename." Console output may show those facts for humans, but if the fact decides pass/fail, it must be represented in trace.

Minimum verdict script behavior:

- Parse every JSONL line.
- Filter `event === "check"`.
- Require at least one `check` event.
- Treat missing `expected` as `true`.
- Count matched checks where `passed === expected`.
- Count failed checks where `passed !== expected`.
- Print a compact summary for humans, including the playbook path or case identifier.
- Print an explicit `PASS` or `FAIL`.
- Include a short failed-check reason when failing.
- May include a one-line description of what the case proved when passing.
- `process.exit(1)` if no checks exist or any check failed.

Console output explains the verdict; trace data decides it.

Console output may use color for readability, but coloring is a presentation detail owned by the verdict helper or spec — it is not part of the trace contract.

An outer runner may aggregate many playbook reports, but it must not replace the playbook's own verdict. The runner's summary is a roll-up of individual real runs, not a shortcut around them.

---

## Framework Code Rules

Reusable deterministic mechanism code lives under `DPT_FRAMEWORK/` and is imported by both experiment playbooks and production run bundles. Engine modules normally live under `DPT_FRAMEWORK/engine/`; CLIs, schemas, and trace utilities stay under their existing framework directories. The `experiments_env/prototype-<mechanism>/` directory is thin: it holds experiment-specific fixtures and notes only.

Rules:

- Use pure ESM `.mjs`.
- Use `node:test` + `node:assert`.
- Framework modules MAY import from each other when dependencies exist. Do not embed a copy of another framework module's code; use direct imports.
- Validate state with Zod where schemas exist.
- Throw on invalid state; do not silently repair in Engine code unless that repair is the mechanism under test.
- Trace events follow a single canonical format owned by the accepted trace-writer contract. Prototypes do not keep a parallel trace writer.
- Follow the Import Boundary above; relative paths depend on where the inline driver file is written and executed.
- **Engine provides the deterministic loop; MD/Agent provides the intelligent strategy.** When a mechanism needs a decision — how to repair, what to dispatch, which branch to take — Engine exposes an injection point (a function parameter or factory argument) and the Agent/MD supplies the actual logic. Engine owns the loop mechanics: iterate, detect stall, enforce a max-iterations bound, recognize terminal branches. The *strategy* inside each step — what counts as a repair, which branch to choose — is an intelligent decision owned by the Agent/MD. Engine must not hardcode a repair strategy, dispatch rule, or branch action.

Trace writer rule: every trace event must conform to the canonical format defined by the accepted trace-writer contract. Whether a playbook writes events through the framework writer or a shared helper, the format must match — do not invent a parallel trace format, and do not recreate trace helpers inside playbooks or prototype fixtures.

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
- Playbook imports engine or trace code from `experiments_env/prototype-*`.
- A prototype directory keeps production engine, trace writer, CLI, or reusable schema logic.
- Inline `.mjs` becomes the multi-stage Agent Flow controller instead of a thin deterministic driver.
- Stage sequence, Agent handoff, or native subagent semantics are hidden inside JS instead of remaining visible in Markdown.
- Bash/JS prewrites the output that a real Agent is supposed to infer, write, search, repair, synthesize, or judge, while the case still claims to test Agent ability.
- A fixture-backed structural/gate test is described as if it proved Agent semantic behavior.
- A test passes from hard-coded expected output rather than runtime evidence.
- `console.log` is treated as the verdict.
- Runtime artifact checks print `V1 PASS`/`V2 FAIL` but never become trace `check` events, so the final verdict can pass while those checks failed.
- Source fixtures are read directly from the prototype directory at runtime instead of being staged into the disposable bundle when the experiment contract requires staged runtime inputs.
- A failed receipt is patched by hand instead of producing a repair path or explicit failure.
- A disposable bundle is left behind after a successful case.
- A higher-level runner rewrites, batches, or compresses playbook steps instead of faithfully executing the Markdown one playbook at a time.
- Current known experiment families are treated as the full universe of future command experiments.
- Case labels such as `simple`/`medium`/`complex` are treated as mandatory even when a mechanism needs a different proof shape.
- Treating `exph_` playbooks as auto-runnable — they require human intervention by design. Runner must skip `exph_` directories.

---

## Runner-Emergent Principles

These principles were discovered by executing playbooks and fixing the failures, not designed upfront. They apply to every playbook in `experiments_playbook/`. Violating any of them produced at least one real failure during runner execution.

**Scope**: This section governs *playbook authoring shape* — how to call the gate, how to record results, how to declare expectations. It does not define gate JSON schema, trace event schema, or CLI flag contracts. Those belong to `guidelines/framework-runtime-boundary.md` and the relevant accepted spec or framework implementation.

### 1. Gate output is structured feedback for the Phase Agent in MD controller mode

The gate CLI is an Engine-layer deterministic checkpoint. Its primary output is structured JSON on stdout — not the shell exit code. The current gate CLIs emit JSON with four fields the Phase Agent uses in MD controller mode to decide the next action. The exact JSON shape is owned by the accepted gate CLI spec and may evolve; the principle is what matters here:

| Field | Role | Used by |
|-------|------|---------|
| `check.passed` | Did the gate pass? | verdict |
| `check.next` | Where does the walker go if passed? | routing |
| `inspect[]` | What specifically is wrong? (diagnosis) | LLM reads → decides repair |
| `advice[]` | How should the Agent fix it? (guidance) | LLM reads → executes repair |

The exit code is a shell-level mirror of `check.passed` — it carries far less information than the JSON. Playbooks MUST capture the JSON as the primary artifact and treat the exit code as secondary:

```bash
# Capture the full gate JSON on stdout. Do NOT let a nonzero exit code stop the
# shell before you see the JSON — guard the call (e.g. `|| true`) and parse the
# JSON as the contract. Extract check.passed / check.next from that JSON.
#
# Caution: stdout may exceed the pipe buffer when inspect/advice arrays grow.
# Read stdout to EOF before parsing; a single chunk read can truncate the JSON.
```

> The exact parsing mechanism is the playbook's own concern. What matters is that the full JSON is captured and parsed before any field is read.

Do not chain gate calls with `&&`. The `|| true` is not a workaround for misbehavior — it reflects the architectural fact that the JSON on stdout IS the output. The exit code is a convenience for `if` statements, not the contract.

Gate CLI implementations MUST keep inspect/advice strings valid as JSON values (no raw regex backslash escapes, no unescaped control characters). If the JSON is unparseable, the Phase Agent's MD controller mode is blind.

### 2. Never hardcode gate results

The check event written to trace MUST use the gate's actual `check.passed` value, extracted from its JSON output. Hardcoding `passed: false` or `passed: true` creates a false trace — the trace no longer proves the gate returned what the playbook claims it did.

```bash
# Extract check.passed from the gate JSON, then write a check event to trace
# carrying that real value. NEVER write a hardcoded passed:true/false literal.
#   gate: <name>,  passed: <real check.passed>,  detail: <why>
```

The trace is evidence. Hardcoded evidence is fake evidence.

### 3. Boundary tests must declare their expectations

A check event's `expected` defaults to `true`. A gate rejection (`passed: false`) is a failure in happy-path semantics but the CORRECT behavior in a boundary test. Boundary test steps MUST set `expected: false`:

```js
// Boundary — gate should reject this input, and that rejection is correct
//   gate: <name>,  passed: false,  expected: false,  detail: <why rejection is correct>
```

The verdict function compares `passed !== expected`. A boundary rejection counts as passed when `expected: false`.

### 4. Verdict mode matches experiment shape

| Experiment shape | Verdict mode | Why |
|-----------------|-------------|-----|
| Happy-path (every step should pass) | `all` | Any failure is real |
| Boundary (gate SHOULD reject some steps) | `all` + `expected: false` | Each check matched to its expectation |
| Repair-loop (fail → repair → pass) | `last` | Only the final state per gate matters |

### 5. Step state is explicit, not inherited

A step that assumes clean bundle state MUST create that state itself. Files written in Step 2 survive until explicitly deleted. A step that fails because of stale state from an earlier step is a playbook bug.

```bash
# Before testing {topic} expansion: remove ALL per-topic files, then recreate
rm -f "$B"/reference/*/source.yaml
cat > "$B"/reference/topic-a/source.yaml << 'EOF'
...
EOF
```

Do not "notice topic-c still has a file from Step 2 and skip deleting it because it's convenient." Delete it. Then the test condition is explicit and auditable.

### 6. Runtime artifact checks are verdict checks

Many command experiments need evidence beyond "the expected trace events happened." If the case goal depends on generated files, missing files, content markers, receipt contents, queue state, or cross-artifact consistency, those checks MUST be recorded as trace `check` events before the final verdict.

```bash
# Good shape: calculate the real runtime fact, then record it as a check
#   markerGone=<actual boolean from grep/test/parser>
#   recordCheck(trace, { gate: 'artifact-content', passed: markerGone, detail: 'backfill marker removed' })
```

It is fine to print `V1 PASS` or a table for humans, but printed verification is not enough. If the final verdict ignores the runtime fact, the experiment can report PASS while the case goal failed.

### 7. Outer runners aggregate; they do not reinterpret

A runner may execute many playbooks and produce a summary such as `N/N PASS`. It MUST still run each playbook faithfully, step by step, using the Markdown instructions and the playbook's own verdict. It MUST NOT merge playbooks into one driver, rewrite commands into a different "equivalent" implementation, skip slow Agent/subagent steps, or decide a verdict by reading the playbook.

The higher-level report is bookkeeping over real playbook verdicts. It is not a separate source of truth.

---

These principles are not exhaustive. When a new experiment family exposes a new failure mode, capture the principle here and apply it backward to existing playbooks.

---

## Experiment Design Criteria

Use the checklist below as the design criteria for command experiments. After a playbook is designed, reviewers can ask whether these criteria are fully satisfied. If yes, the design is reasonable enough to implement and run; if not, revise the playbook before treating it as a valid experiment design.

These criteria judge the experiment design shape, not whether a future execution will pass. Execution still has to happen from a clean repo and produce a PASS verdict before the playbook is complete.

### Design Criteria Checklist

**Setup & layout**

- [ ] `experiments_playbook/exp_<mechanism>/` exists.
- [ ] Reusable framework code exists under `DPT_FRAMEWORK/` for the mechanism under test.
- [ ] Trace events written by the playbook and engine match the canonical trace-writer format.
- [ ] Any `experiments_env/prototype-<mechanism>/` content is fixture-only.
- [ ] The experiment note, usually `EXPERIMENT.md`, states the mechanism, hypothesis, and result.

**Mechanism & playbook shape**

- [ ] Case playbooks cover the mechanism's needed proof roles, and each case answers one question.
- [ ] The experiment note, manifest, or playbook explains the case groups used by the leading digit(s) in `case-<XX>-...`.
- [ ] New or renamed case playbooks use `case-<XX>-<cost>-<what-it-proves>.md`; `XX` is a two- or three-digit Arabic numeral: `MN` (two-digit) for groups 1–9, `MMN` (three-digit) for groups 10+; the leading digit(s) identify the group, the final digit `N` gives stable order inside that group; `cost` is `light|standard|heavy`; the suffix names the proof target.
- [ ] For new or renamed playbooks, frontmatter `case` matches the filename stem unless an accepted spec says otherwise.
- [ ] Filename `cost` matches frontmatter `weight`: `light` and `standard` use `weight: light`; `heavy` uses `weight: heavy`.
- [ ] If the case uses fixed fixtures or prefilled runtime content, its contract states that it tests a deterministic surface, not Agent semantic ability.
- [ ] If the case goal depends on Agent judgment, writing, search, repair, synthesis, or subagent behavior, real Agent/subagent execution is part of the steps.
- [ ] Frontmatter names the disposable runtime context and trace paths.
- [ ] The playbook keeps stage sequence and Agent handoff visible in Markdown.
- [ ] Any inline `.mjs` is only a thin deterministic driver/checkpoint.
- [ ] Runtime context setup uses approved shared experiment infrastructure.
- [ ] Disposable runtime context passes validate + inspect before mechanism execution.
- [ ] The playbook states the runtime facts that should change by the end of the run.

**Runner principles**

- [ ] Gate CLI calls use `|| true` defense and stream-accumulate stdout (Principle 1).
- [ ] Check events extract `passed` from real gate JSON — no hardcoded values (Principle 2).
- [ ] Boundary steps set `expected: false` on their check events (Principle 3).
- [ ] Verdict mode matches experiment shape: `all` for happy-path/boundary, `last` for repair-loop (Principle 4).
- [ ] Steps that depend on clean state explicitly clean up inherited artifacts (Principle 5).
- [ ] Runtime artifact checks that affect pass/fail are recorded as trace `check` events (Principle 6).
- [ ] Higher-level runners can aggregate the playbook's verdict without rewriting or compressing the playbook (Principle 7).

**Verdict & cleanup**

- [ ] Trace JSONL is the final verdict, including critical runtime artifact assertions.
- [ ] The verdict/report prints explicit PASS or FAIL, includes the playbook or case identifier, includes a compact failure reason on FAIL, and may include a one-line proof description on PASS.
- [ ] The playbook includes a result interpretation section (e.g., `## Step N: 结果解读`) that explains what each check event proved and what PASS/FAIL means for the mechanism under test.
- [ ] Cleanup is conditional: executed only on PASS. When FAIL, the disposable bundle is preserved for diagnosis. The cleanup step must explicitly state this rule (e.g., "PASS 才执行。FAIL 时保留 bundle 现场供排查").

**Human-in-the-loop**

- [ ] Any `exph_` playbook explains the human judgment point, why automation is not mature yet, and why gate pass is not human pass.
- [ ] Any `exph_` playbook states the future automation condition for migration back to `exp_`.

## Completion Criteria

These criteria are not required for design approval. They apply when deciding whether an implemented playbook is complete.

- [ ] Playbook has been executed end-to-end by a coding agent and verdict shows PASS (see Quality Gate).
- [ ] Successful execution includes cleanup; PASS 时清除 disposable bundle，FAIL 时保留现场。A leftover bundle after a PASS run means the playbook is not complete.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Charter](project-charter.md) — repo-wide charter and authority map.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — architectural constitution for queue-driven phase execution; queue engine (AGQ-001~006) implemented runtime, seed-topics/wave0/wave1/wave2 integrations accepted/current, remaining loop-engineering gaps pending OpenSpec.
- [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain): phase-to-phase routing.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — architectural constitution for sub-agent dispatch; defines Tier 3 (Relay) within the three-tier execution model.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary for framework assets versus runtime bundles.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- Accepted specs under `openspec/specs/` — capability requirements, including agent-assisted experiment playbooks.
