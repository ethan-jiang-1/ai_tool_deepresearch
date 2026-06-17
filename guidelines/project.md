---
guideline_id: project
suite: deep-research-guidelines
title: Project Guidelines
status: effective
created: 2026-06-17
role: repo-wide charter and entrypoint
scope: all work in this repository
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
  - openspec/specs/
siblings:
  - guidelines/command-experiments.md
  - guidelines/agentic-dispatch-scheduler-mechanism.md
---

# Project Guidelines

> 状态: 生效 | 创建: 2026-06-17 | 用途: 项目入口指导

---

**你是在设计一个 LLM 能理解、能执行、能根据反馈自我纠正的系统。不是在写一个确定性的程序。**

本项目的目标是 Deep Research Tool rewrite：一个 agentic framework，用于产出证据支撑、多 wave、多 gate 的深度研究报告。

核心分工固定不变：

```
Agent (LLM)      -> 搜索、阅读、提取证据、写作、综合、做内容判断
Engine (JS/CLI)  -> 校验 schema、执行状态机、检查 receipt、写 trace、拒绝非法状态
Markdown         -> Agent 可读的任务/流程界面，连接 Agent 和 Engine
JSON/YAML/JSONL  -> 持久化状态、队列、profile、trace
```

**Engine enforces rules. Agent produces content. Markdown bridges them.**

---

## Charter

### MUST

- MUST treat JS/CLI/schema/trace as the trust root for deterministic state.
- MUST use accepted OpenSpec specs for capability behavior.
- MUST keep Markdown as Agent-readable guidance or task surface, not as the sole verifier for state transitions.
- MUST make evidence, receipts, and trace entries come from real execution.
- MUST keep runtime bundle state in the bundle, not in chat memory.
- MUST keep `guidelines/` aligned with current repository structure and accepted specs.

### MUST NOT

- MUST NOT return to V12-style Agent self-governance for queue, gate, hook, or receipt authority.
- MUST NOT use guidance prose to override schema, CLI output, accepted specs, or runtime state.
- MUST NOT invent implementation behavior in this file without an OpenSpec change.
- MUST NOT fake trace, result files, receipts, subagent output, or bundle validation.
- MUST NOT treat progress summaries, console output, or chat confidence as evidence.
- MUST NOT read `_original_*` archives unless the user explicitly asks for historical analysis.

---

## Authority Map

指导文档不能替代规格、schema、实现或 runtime 状态。遇到冲突时，先判断“这是什么类型的事实”，再按对应 Source of Record 处理：

| Truth Type | Source of Record | Role |
|------------|------------------|------|
| Project rules and constraints | `AGENTS.md`, `openspec/config.yaml` | 技术栈、OpenSpec 纪律、repo-wide hard rules |
| Accepted capability behavior | `openspec/specs/`, `openspec/governance/` | 已接受需求、invariant、requirement registry |
| Executable contracts | `DPT_FRAMEWORK/schema/`, `DPT_FRAMEWORK/cli/`, `tests/` | schema、CLI verdict、状态检查、回归验证 |
| Runtime/run state | `dpt_rb_*`, `dpt_disp_*` | 每个 run 或实验自己的当前控制文件和数据 |
| Human/Agent guidance | `guidelines/` | 工作原则、操作规范、机制草案、阅读路线 |

`guidelines/` 的作用是降低理解成本，不做新的 Source of Record。需要新增或改变系统行为时，走 OpenSpec change，再落到 `DPT_FRAMEWORK/` 或 `experiments/`。

---

## Operating Model

### MD 是 Agent Interface

Markdown 负责让 Agent 看懂“要做什么、为什么做、做完怎么验证”。它可以承载 workflow step、任务卡、playbook 和机制说明，但不应该承担不可错的状态机或 receipt 判定。

### JS/CLI 是 Trust Root

JS/CLI 负责 Agent 不可靠的部分：结构化解析、schema 校验、gate 状态转换、receipt 检查、trace 写入。Agent 可以出错；JS/CLI 的反馈不能造假。

### PDCA 是默认循环

```
Plan  -> Agent 读 MD/状态，决定下一步
Do    -> Agent 或 subagent 执行内容工作
Check -> JS/CLI 校验结果，写 trace/receipt
Act   -> Agent 读反馈，继续、修复、降级或阻塞
```

长程运行的核心不是“Agent 一次想明白”，而是让 Agent 处在真实反馈闭环里。

---

## Error Boundary

本项目允许 Layer 1 出错，不允许 Layer 2 造假。

| 层 | 可以发生什么 | 处理方式 |
|----|--------------|----------|
| Layer 1: Agent/MD | 理解偏差、搜索噪声、输出格式错误、subagent 失败 | 由 Check/Inspect 反馈，Agent 修复或重跑 |
| Layer 2: Engine/CLI/Trace | schema、状态机、receipt、trace、bundle 合法性 | 绝不能假通过；失败要显式暴露 |

绝对不接受：

- 用脚本模拟 LLM/subagent 的实际工作并声称实验通过。
- 手写假 `result.json`、假 trace event、假 receipt。
- 跳过 `validate-bundle.mjs` / `inspect-bundle.mjs` 后继续解释结果。
- 直接改 gate/status 到想要状态，绕过状态机或 CLI。
- 用 `console.log` 当裁决证据。

判断标准：**这个证据是真实执行的副产物，还是人/脚本事后编出来的？**

---

## Agent Guardrails

If you are about to do one of these, stop and switch to the required path:

| If you are about to... | Do this instead |
|------------------------|-----------------|
| Hand-write trace, receipt, or result files to satisfy a check | Run the real Engine/Agent path that produces them |
| Treat `console.log` output as pass/fail proof | Read the trace JSONL or CLI exit result |
| Use chat memory as run state | Reload bundle control files from disk |
| Add behavior only in guidance prose | Create or update an OpenSpec change/spec |
| Copy V12 paths or queue rules into rewrite docs | Check current `openspec/config.yaml` and `DPT_FRAMEWORK/` first |
| Read `_original_*` for inspiration | Confirm the user explicitly asked for historical analysis |
| Let Markdown decide a deterministic transition | Move the rule into schema/CLI/Engine design |

---

## Current Repository Shape

```
repo root/
├── DPT_FRAMEWORK/              # 共享框架，默认只读
│   ├── cli/                    # validate-bundle, inspect-bundle
│   ├── schema/                 # Zod contracts + enums
│   ├── rb_templates/           # production bundle templates
│   ├── command_playbook/       # Agent 可读的一次性操作手册
│   └── command_experiments/    # 实验 playbook: exp_<component>/
├── experiments/                # prototype JS engines, frozen after validation
├── guidelines/                 # 本目录：入口、实验规范、机制草案
├── openspec/                   # spec-driven development + governance
├── tests/                      # node:test 回归
└── dpt_rb_*/ dpt_disp_*/       # runtime 或 disposable bundles
```

Production runtime bundle 使用 `dpt_rb_<name>/`。实验 disposable bundle 使用 `dpt_disp_<name>/`，由 `DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs` 创建。

当前 bundle 数据目录是根级目录：

```
seed_topics/
reference/
artifacts/
_cache/
final/
```

不要把 V12 的 `seed_topics/_reference` / `seed_topics/_artifacts` 路径当成当前 rewrite 的默认结构，除非文档明确在讨论 V12 历史。

---

## Development Flow

```
Explore / design
  -> OpenSpec proposal/spec/tasks
  -> focused prototype or framework implementation
  -> real bundle / real trace validation
  -> archive accepted change
```

实验验证的是机制，不是演示脚本。机制通过后再泛化到 accepted specs 和 `DPT_FRAMEWORK/`。

---

## Hard Rules

1. 使用 Node.js >=20，纯 JavaScript ESM (`.mjs`)。
2. 不使用 TypeScript。
3. 不新增依赖；批准 npm 依赖只有 `zod` 和 `yaml`。
4. 测试使用 `node:test` + `node:assert`。
5. 不修改 `DPT_FRAMEWORK/`，除非该工作由 OpenSpec change 明确覆盖。
6. 裁决只从真实文件、schema 校验、receipt、trace JSONL 来。
7. 不读 `_original_*` 归档，除非用户明确要求分析历史版本。

---

## Reading Order

新 Agent 或新维护者按这个顺序读：

1. `guidelines/project.md`：稳定原则和权威边界。
2. `openspec/config.yaml`：项目级 spec-driven 纪律。
3. `guidelines/command-experiments.md`：如何写和运行实验 playbook。
4. 相关 `openspec/specs/<capability>/spec.md`：具体 capability 的需求。
5. 对应 `DPT_FRAMEWORK/` 或 `experiments/` 代码。

机制草案，例如 `guidelines/agentic-dispatch-scheduler-mechanism.md`，只能作为设计输入；未进入 OpenSpec 和实现前，不是运行时事实。

---

## Guideline Change Checklist

Before changing any file in `guidelines/`, check:

- Does this conflict with `AGENTS.md` or `openspec/config.yaml`?
- Does this conflict with accepted specs under `openspec/specs/`?
- Does this describe current repo structure accurately?
- Does this present future design as current runtime truth?
- Does this reintroduce V12 Agent self-governance for queue/gate/hook/receipt?
- Does this add enough `MUST` / `MUST NOT` clarity for an Agent to act safely?
- Should this be an OpenSpec change instead of guidance prose?

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Command Experiments](command-experiments.md) — operational charter for experiment playbooks.
- [Engine-Side Dispatch Scheduler](agentic-dispatch-scheduler-mechanism.md) — future ds mechanism draft, not runtime truth.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Accepted specs](../openspec/specs/) — accepted capability requirements.
