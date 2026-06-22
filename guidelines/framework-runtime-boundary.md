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

当前 v1 只有一个 canonical Deep Research workflow package，因此 workflow-foundation 路由使用 `DPT_FRAMEWORK/workflows/manifest.json` 和 `DPT_FRAMEWORK/workflows/nodes/`，不使用 `workflows/<workflow-name>/` namespace。这不限制 run bundle 数量；同一套 framework 仍必须支持多个互相隔离的 `dpt_rb_*`。

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

Workflow-foundation route map:

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

`DPT_FRAMEWORK/workflows/` is the current Agent-facing workflow surface: manifest and Markdown nodes.

`DPT_FRAMEWORK/schema/contracts/` contains executable schema contracts.

`DPT_FRAMEWORK/schema/gate_definitions/` is the current location for read-only gate definition JSON. These files define what each gate checks; they are not run data and must not store pass/fail status.

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

## Agent–Engine Communication

这些规则约束 Markdown/Agent 和 JS/CLI/Engine 之间的信息流向。核心原则：**MD 控制流程，JS 控制校验节点；JS 不知道全局路由，MD 不越权做确定性裁决。**

### MD 是 Controller

Markdown（playbook、task card、node）是 Agent Flow 的编织者。它告诉 Agent 该做什么，读取 JS/CLI 的反馈，根据反馈决定下一步行动（advance、repair、escalate、block）。JS/CLI 只在关键节点执行确定性检查并返回结构化反馈；它不编排多阶段流程，不替 Agent 做判断。

- **MUST**：多阶段 Agent Flow 保持在 Markdown/playbook 中，JS/CLI 只做确定性 checkpoint。
- **MUST NOT**：将 Agent Flow 藏入 JS controller。JS 控制的是校验节点，不是整条流程。

### ⚡ 铁律：禁止环境变量传递配置

**这是硬性约束，没有例外。** Coding Agent 环境中每个 tool call 是独立 shell 进程——`export FOO=bar` 在 call A 中设置，call B 完全看不到。任何依赖 `process.env` 在 component 间传递配置的做法在 Coding Agent 下都是死路。

- **MUST**：所有配置通过 CLI flag、函数参数、runtime 属性显式传递。
- **MUST NOT**：在任何 `.mjs`、`.js`、playbook inline script 中使用 `process.env` 读取配置或状态。
- 常见错误模式及替代方案：
  - `process.env.NODES_DIR` → `createWorkflowRuntime(source, nodesDir)` 参数
  - `export DPT_NON_INTERACTIVE=1` → `--non-interactive` CLI flag
  - `NODES_DIR=$B/exp/nodes node script.mjs` → `node script.mjs $B/exp/nodes`（CLI arg）

### Gate 通过 Node-Result Transition Router 查询下一步

Gate CLI 是纯确定性检查器——遍历 rules、执行 check、返回结构化结果。它不知道全局流程，不持有路由逻辑。

但 Gate 知道**问谁**：它调用详细路由接口 `resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome)`，由底下的 **Transition Table**——静态 chain 映射表——回答下一个 Node 去哪。Gate 不认识底下那层是什么，只认接口。

这层封装：

- **MD Controller 不再背路由**——Playbook 不需要手动查 manifest、拼 `--next` flag、喂给 gate。Gate 自己以 `--current-node` 驱动，问 transition table，回答直接带回 `check.next` 和详细 `routing`。Playbook 读这个值加载下一 node。
- **Transition table 只管 Node 间的转移**——给定 (currentNodeRef, outcome)，回答 routing result (next / terminal / no_transition / invalid_input / config_error)。其他一概不管。
- **"不知道"是合法回答**——transition table 返回 `no_transition` 时，Gate 诚实告诉 MD controller。Controller 决定怎么办。
- **Routing identity 是 node fileRef**——例如 `phases/phase-wave0.md`，而不是 gate key、phase key 或 frontmatter `id`。

- Gate CLI 输出 SHALL 包含：`check`（passed/failed + currentNodeRef + next）、`routing`（详细路由结果）、`inspect`（诊断）、`advice`（修复方向）。
- `next` SHALL 来自 `resolveNodeTransitionDetailed(currentNodeRef, outcome)` 查询，NOT 来自 CLI flag 或 manifest 字段。
- **MUST NOT**：让 Playbook 手动查表拼参数传给 gate。Transition 查询是 Gate 的内部调用。
- `--current-node` 是必选 flag；`askNext(path, gate, state)` 已退役。

### Trace 是真相，Log 是解释

两套互补记录，边界不可模糊：

| 维度 | Trace (`rb_trace.jsonl`) | Log (`_logs/run.log`) |
|------|--------------------------|------------------------|
| 角色 | 权威审计 trail | 人类可读诊断 |
| 格式 | 结构化 JSONL（machine-verifiable） | 自由文本行 |
| 裁决 | 是——最终 pass/fail 从这里判 | 否——只辅助理解 |
| 内容 | 完整 gate 响应（check + inspect + advice） | 引擎事件、进度、细节 |

- **MUST**：实验/playbook 的最终裁决从 trace JSONL 来，不从 console output 或 log 来。
- **MUST**：trace check event 记录 gate 的完整回答（passed + next + inspect + advice），不止 passed/failed。
- **MUST NOT**：用 `console.log` 替代 trace 做 pass/fail 裁决。

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
| Operator/Agent command instructions | `DPT_FRAMEWORK/command_playbook/` |
| Gate definition schema target | `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` |
| Gate rule definition target | `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json` |
| Gate evaluator/loader code target | `DPT_FRAMEWORK/engine/gates/` |
| Gate shared helper code target | `DPT_FRAMEWORK/engine/helpers/` |
| Gate CLI wrapper target | `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` |
| Bundle initial template | `DPT_FRAMEWORK/rb_templates/` |
| Current run profile / HITL data | `dpt_rb_*/rb_profile.yaml` |
| Current run workflow status | `dpt_rb_*/rb_status.json` |
| Current run trace/audit history | `dpt_rb_*/rb_trace.jsonl` |
| Current run artifacts | `dpt_rb_*/artifacts/` or `dpt_rb_*/final/` |
| Rebuildable projection/cache | `dpt_rb_*/_cache/` |
