---
guideline_id: command-experiments
suite: deep-research-guidelines
title: Command Experiments Guideline
status: effective
created: 2026-06-17
role: operational charter for staging experiment playbooks
scope: DPT_FRAMEWORK/command_experiments/exp_*
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
  - openspec/specs/agent-testing/spec.md
  - DPT_FRAMEWORK/cli/validate-bundle.mjs
  - DPT_FRAMEWORK/cli/inspect-bundle.mjs
siblings:
  - guidelines/project.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Guideline: command_experiments 实验规范

> 状态: 生效 | 创建: 2026-06-17 | 适用于: `DPT_FRAMEWORK/command_experiments/exp_*`

---

## Purpose

`command_experiments/` 是 agentic mechanism 的 staging 级端到端实验层。每个实验用 Agent 可读的 Markdown playbook 驱动真实 disposable bundle、真实 prototype Engine、真实文件写入和真实 trace 裁决。

实验的价值不是“脚本打印 passed”，而是证明一个机制能在接近真实 run bundle 的环境里形成可追溯反馈闭环：Markdown 驱动 LLM 行动，JS/CLI 执行反馈动作，输出回到 conversation context，LLM 再据此继续、修复、阻塞或裁决。

---

## Experiment Charter

### MUST

- MUST use a real `dpt_disp_*` disposable bundle.
- MUST create bundles with `DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs`.
- MUST run `validate-bundle.mjs` and `inspect-bundle.mjs` before mechanism execution.
- MUST import and exercise the prototype Engine instead of reimplementing the mechanism in the playbook.
- MUST use real Agent/subagent execution when the mechanism depends on Agent behavior.
- MUST let Engine/CLI output return to the LLM as actionable context.
- MUST make the final verdict come from trace JSONL.
- MUST clean up the disposable bundle at the end of the playbook.

### MUST NOT

- MUST NOT mock LLM/subagent work.
- MUST NOT hand-write fake `result.json`, runtime receipt, trace event, or completion receipt.
- MUST NOT use `console.log` as pass/fail authority.
- MUST NOT manually create new experiment bundles with `mkdir`, `sed {{name}}`, or direct `rb_templates` copying.
- MUST NOT read node MD from the prototype directory at runtime when the experiment contract says nodes live inside the bundle.
- MUST NOT patch a failed receipt by hand to make the verdict pass.
- MUST NOT leave a successful experiment bundle behind.

判断标准：**这个事件是真实发生的，还是脚本/人写出来假装发生的？**

---

## Directory Contract

```
DPT_FRAMEWORK/
└── command_experiments/
    ├── scripts/
    │   └── new-disposable-bundle.mjs
    └── exp_<component>/
        ├── test-simple.md
        ├── test-medium.md
        └── test-complex.md

experiments/
└── prototype-<component>/
    ├── EXPERIMENT.md
    ├── package.json
    ├── <component>.mjs
    ├── <component>.test.mjs
    ├── trace.mjs
    └── nodes-<component>/
```

Naming:

- Experiment directory: `DPT_FRAMEWORK/command_experiments/exp_<component>/`
- Prototype directory: `experiments/prototype-<component>/`
- Disposable bundle: `dpt_disp_<short>_<case>/`
- Trace file: `dpt_disp_<short>_<case>/_trace_<short>_<case>.jsonl`
- Node MD copied into bundle: `dpt_disp_<short>_<case>/exp/nodes/`

---

## Playbook Frontmatter

Every playbook starts with YAML frontmatter. It contains routing facts only, not explanation.

```markdown
---
schema: command-experiment/v1
experiment: <component>
case: <simple|medium|complex|identity|...>
case_goal: "<one sentence: what this case proves>"
runner: coding-agent
agent_mode: native-subagent  # only when real subagent execution is required
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

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。
```

Then use a title:

```markdown
# test-<component>-<case>
```

---

## Runtime Path

Every playbook follows this shape:

```markdown
## Expected Runtime Path

1. 创建 disposable bundle `[MAIN/SHELL]`
2. 执行核心机制 `[MAIN/SHELL]`
3. 如需要，启动真实 subagent `[MAIN->SUBAGENT]`
4. 读取 JS/CLI 输出和 trace JSONL，形成可行动反馈 `[MAIN/SHELL]`
5. LLM 根据反馈继续、修复、阻塞或裁决 `[MAIN]`
6. 清理 disposable bundle `[MAIN/SHELL]`

## Step 1: 创建 disposable bundle
...

## Step N: 从 trace 裁决
...

## Cleanup
...
```

Step names can vary, but the lifecycle cannot.

---

## Step 1: Bundle Creation

Use the shared helper. Do not hand-roll `mkdir`, `sed {{name}}`, or manual `rb_templates` copying in new experiments.

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs <short>_<case> --nodes=experiments/prototype-<component>/nodes-<component> --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

If the experiment has no node MD, omit `--nodes=...`.

The helper creates current rewrite bundle shape:

```
START_FROM_HERE.md
rb_plan.md
rb_profile.yaml
rb_status.json
rb_queue.json
rb_trace.jsonl
seed_topics/
reference/
artifacts/wave1/
artifacts/wave2/
_cache/
final/
```

---

## Execution Steps

Each execution step should contain:

1. One short paragraph saying what mechanism is being exercised.
2. One shell block that writes a minimal inline `.mjs` driver into the bundle and runs it, or directly invokes an existing script.
3. One expected result line.

Keep inline scripts thin:

- Import prototype Engine APIs.
- Set trace file.
- Call the mechanism under test.
- Append `check` events to trace.
- Avoid implementing the mechanism inside the playbook.

Complex logic belongs in `experiments/prototype-<component>/<component>.mjs`, not in Markdown shell blocks.

New experiment verdict checks use `event === "check"` with a boolean `passed` field. Older `verify` events are migration residue only; do not use them for new or updated playbooks.

Use JS/CLI feedback actions consistently when a playbook needs machine feedback beyond raw trace verdict:

- `check` answers whether a specific condition passed.
- `inspect` explains missing files, malformed state, inconsistent counters, or other diagnosis.
- `advice` gives the next recommended action when a deterministic system can point the Agent in a better direction.

For current command experiments, only `check` is the normative trace verdict event. `inspect` and `advice` are feedback actions for LLM context unless a future accepted spec defines them as trace events or CLI commands. Do not confuse the feedback action `inspect` with the existing `inspect-bundle.mjs` validation CLI.

The output of those steps should be useful when it returns to the conversation; do not bury the only actionable detail inside an unparsed wall of console text.

---

## Subagent Experiments

If a case requires native subagent behavior:

- Set `agent_mode: native-subagent`.
- Include `## Task Size [MAIN]` if the playbook needs fast/normal routing.
- Create real slot/task files through the prototype Engine.
- Start a real native subagent through the available Agent tool.
- Require the subagent to write its own `runtime-receipt.jsonl` or equivalent runtime evidence.
- Let the parent Agent collect and merge only after runtime evidence exists.

Do not satisfy a subagent test by writing the expected `result.json` from the parent context.

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

## Prototype Engine Rules

Every prototype should be self-contained:

```
experiments/prototype-<component>/
├── EXPERIMENT.md
├── package.json
├── <component>.mjs
├── <component>.test.mjs
├── trace.mjs
└── nodes-<component>/
```

Rules:

- Use pure ESM `.mjs`.
- Use `node:test` + `node:assert`.
- Do not import another prototype.
- Validate state with Zod where schemas exist.
- Throw on invalid state; do not silently repair in Engine code unless that repair is the mechanism under test.
- `trace.mjs` is local to the prototype; do not share it across prototypes.

Trace API convention:

```js
setTraceFile(path)
getTraceFile()
traceInit(label, detail)
traceEntry(event, detail)
traceSummary()
traceCleanup()
```

---

## Case Tiers

| Tier | Purpose |
|------|---------|
| `simple` | Smallest happy path proving the core mechanism. |
| `medium` | Main advanced behavior: dependency, branch, repair, collection, or cache/execute distinction. |
| `complex` | Error paths, malformed input, missing dependency, partial failure, convergence, or blocked outcome. |
| `identity` | Optional platform/agent identity or runtime metadata check. |

Each case should answer one question. If a case tries to prove several unrelated things, split it.

---

## Anti-Patterns

- New playbook manually creates bundles instead of using `new-disposable-bundle.mjs`.
- Playbook code implements the mechanism instead of importing the prototype Engine.
- A test passes from hard-coded expected output rather than runtime evidence.
- `console.log` is treated as the verdict.
- Node MD is read from the prototype directory at runtime instead of copied into `dpt_disp_*/exp/nodes/`.
- A failed receipt is patched by hand instead of producing a repair path or explicit failure.
- A disposable bundle is left behind after a successful case.

---

## New Experiment Checklist

- [ ] `DPT_FRAMEWORK/command_experiments/exp_<component>/` exists.
- [ ] `experiments/prototype-<component>/` exists.
- [ ] `EXPERIMENT.md` states the mechanism, hypothesis, and result.
- [ ] `test-simple.md`, `test-medium.md`, and `test-complex.md` exist when the mechanism is broad enough to need all three tiers.
- [ ] Frontmatter names `dpt_disp_*` bundle and trace paths.
- [ ] Step 1 uses `new-disposable-bundle.mjs`.
- [ ] Bundle passes validate + inspect before mechanism execution.
- [ ] Trace JSONL is the final verdict.
- [ ] Cleanup removes the disposable bundle.

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Project Guidelines](project.md) — repo-wide charter and authority map.
- [Engine-Side Dispatch Scheduler](agentic-dispatch-scheduler-mechanism.md) — future ds mechanism draft; use this experiment guideline for any ds prototype.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Agent Testing spec](../openspec/specs/agent-testing/spec.md) — accepted requirements for agent-assisted experiment playbooks.
