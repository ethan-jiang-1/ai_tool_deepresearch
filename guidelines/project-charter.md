---
guideline_id: project-charter
suite: deep-research-guidelines
title: Project Charter
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

# Project Charter

> 状态: 生效 | 创建: 2026-06-17 | 用途: 项目入口指导

---

**你是在设计一个以 LLM 为能力源、以 Markdown 为 Agent Flow 控制面、以 JS/CLI 为确定性 checkpoint/反馈层的系统。不是在写一个单纯的确定性程序。**

本项目的目标是 Deep Research Tool rewrite：一个 agentic framework，用于产出证据支撑、多 wave、多 gate 的深度研究报告。

本项目的开发模式是 spec-driven development。所有能力、行为、schema、状态机、gate、receipt、trace 相关迭代都必须严格遵循 OpenSpec：先 proposal/spec/tasks，再实现、验证、归档。`guidelines/` 只能解释和指路，不能绕过 OpenSpec 直接定义新行为。

核心分工固定不变：

```
Agent (LLM)      -> 搜索、阅读、提取证据、写作、综合、做内容判断，并读取反馈继续
Engine (JS/CLI)  -> 校验 schema、执行状态机、检查 receipt、写 trace，输出 check / inspect / advice 风格反馈
Markdown         -> LLM-facing Agent Flow controller：任务、流程、约束、反馈都在这里被读写
JSON/YAML/JSONL  -> 持久化状态、队列、profile、trace
```

**Markdown controls Agent Flow; JS/CLI controls deterministic checkpoints. LLM supplies judgment. Engine enforces deterministic contracts.**

---

## Charter

### MUST

- MUST treat JS/CLI/schema/trace as the trust root for deterministic state.
- MUST follow `openspec/config.yaml` and the OpenSpec change lifecycle for project evolution.
- MUST use accepted OpenSpec specs for capability behavior.
- MUST keep Markdown as the primary LLM-facing operating/control surface, not as a machine verifier or authority for state transitions.
- MUST keep multi-stage agentic flow in Markdown, playbooks, or task cards by default.
- MUST read JS/CLI feedback back into the conversation context before the next Markdown-driven action.
- MUST treat check / inspect / advice outputs as structured JS/CLI feedback, not as chat noise.
- MUST make evidence, receipts, and trace entries come from real execution.
- MUST keep runtime bundle state in the bundle, not in chat memory.
- MUST keep `guidelines/` aligned with current repository structure and accepted specs.

### MUST NOT

- MUST NOT return to V12-style Agent self-governance for queue, gate, hook, or receipt authority.
- MUST NOT use guidance prose to override schema, CLI output, accepted specs, or runtime state.
- MUST NOT invent implementation behavior in this file without an OpenSpec change.
- MUST NOT move LLM-facing multi-stage flow into JS just because JS is easier to test or feels like a controller.
- MUST NOT let JS/CLI orchestrate search, judgment, writing, repair, synthesis, or native subagent semantics as a substitute for Agent Flow.
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

### Quick Router

When deciding where something belongs, route by authority:

| If the work is about... | Put it in / trust |
|-------------------------|-------------------|
| User-facing task flow, stage instructions, handoff, or feedback context | Markdown playbooks / task cards |
| Semantic judgment, evidence choice, synthesis, or repair reasoning | LLM Agent |
| Schema, state transition, gate, receipt, trace, or deterministic verdict | JS/CLI/Engine + accepted specs |
| Current run state, queue contents, profile, evidence files, or trace history | The active `dpt_rb_*` or `dpt_disp_*` bundle |
| New or changed accepted behavior | OpenSpec change before implementation |
| Future mechanism direction | `guidelines/` as design guidance only |

---

## Operating Model

### LLM 是能力源

最终的理解、判断、写作、取舍、修复和综合能力仍然在 LLM Agent 处。这个项目不是用 JS/CLI 取代 LLM 智力，而是用 Markdown + JS/CLI 反馈动作 + 持久化状态，把 LLM 的能力稳定激发出来，并把它容易发糊的地方约束住。

四个不变量必须同时成立：

1. LLM owns judgment: 语义判断、研究取舍、综合表达在 LLM。
2. Markdown controls Agent Flow: 多阶段任务、handoff、上下文和反馈入口由 Markdown/playbook/task card 驱动。
3. Engine owns deterministic checkpoints: schema、状态、receipt、trace 裁决在 JS/CLI/Engine。
4. Markdown does not own machine authority: queue/gate/receipt 的机器真相仍在结构化状态和 Engine。

| Surface | Owns | Does Not Own |
|---------|------|--------------|
| LLM Agent | 语义理解、内容判断、证据取舍、研究策略、综合写作、根据反馈修复 | 确定性状态权威、receipt 权威、schema 真相 |
| Markdown | conversation-native Agent Flow controller：给 LLM 任务、阶段、约束、上下文、反馈和下一步行动入口 | 机器可验证真相、queue/gate/receipt 权威 |
| JS/CLI/Engine | 传统程序层：精确解析、校验、状态转换、receipt 检查、trace 写入，并执行 Check/Inspect/Advice 反馈动作 | 多阶段 Agent Flow 编排、语义理解、内容判断、研究综合、最终表达 |
| JSON/YAML/JSONL | 持久化状态、证据、receipt、trace，让上下文可重载 | Agent 的语义推理 |

JS/CLI/Engine 可以支持三类反馈动作：

| Action | What It Returns To LLM | Boundary |
|--------|------------------------|----------|
| Check | 针对具体条件给出过/不过，让 LLM 知道结果是否站得住 | 不做内容判断或研究综合 |
| Inspect | 把缺什么、错在哪、哪里不一致讲清楚，让 LLM 能反向修复 | 不自动替 LLM 完成修复 |
| Advice | 基于确定性状态给出下一步方向，让 LLM 少走偏 | 不替 LLM 做最终判断 |

这里的“治理”不是让 Markdown 自己裁决，也不是让 Engine 变成研究者。治理的意思是：把任务、约束、证据和机器反馈持续放回 LLM 可读的 conversation context，让 LLM 在更准的上下文里发挥能力。

### MD 控 Agent Flow，JS 控关键节点

Agentic workflow 的主角是 Markdown + LLM。多阶段流程应该表现为 Agent 可读的 Markdown：当前阶段、目标、输入、允许动作、handoff、反馈、下一步都进入 conversation，让 LLM 在真实上下文里继续工作。

JS/CLI 只在关键节点介入：创建/校验结构、检查 receipt、判断 gate、写 trace、返回 check / inspect / advice 风格反馈。JS 可以做精确 controller，但它控制的是 deterministic checkpoint，不是整条 Agent Flow。

如果一个多阶段过程被藏进 JS controller，LLM 只是在运行脚本，那它就退化成 scripted workflow，而不是 agentic workflow。除非 accepted spec 明确要求，默认不要把 Agent Flow 搬进 JS。

### Markdown 是 LLM Control Surface

Markdown 负责让 Agent 看懂“要做什么、为什么做、做完怎么验证”，并承接 JS/CLI 返回的 check / inspect / advice 风格信息块。它可以承载 workflow step、任务卡、playbook 和机制说明，但不应该承担不可错的状态机或 receipt 判定。

Markdown 不是被动桥梁。它是 LLM Agent 在 conversation 里接收任务、理解约束、读取反馈、继续行动的主要操作面。因为 Agent 靠多轮对话运转，JS/CLI 的输出只有回到 conversation context，才会变成下一步行动的一部分。

### JS/CLI 是 Trust Root

JS/CLI 负责 Agent 不可靠的部分：结构化解析、schema 校验、gate 状态转换、receipt 检查、trace 写入，以及把结果重新吐回 conversation context。它提供精确反馈，不替代 LLM 的语义判断。Agent 可以出错；JS/CLI 的反馈不能造假。

### Feedback Loop

JS/CLI 可以执行三类反馈动作，动作输出都会回到下一轮 Markdown 行动里：

- Check: 对一个具体条件给出过/不过的判定。
- Inspect: 对缺什么、错在哪、哪里不一致给出诊断。
- Advice: 对下一步怎么走给出方向性建议。

这些反馈不是独立报告，而是下一轮 Agent 读取后继续行动的上下文。

Check / Inspect / Advice 是 JS/CLI/Engine 的反馈动作类型，不一定是已接受的 CLI 命令名或 trace event 名。当前 command experiment 的规范性 trace verdict event 是 `check`。

### PDCA 是默认循环

```
Plan  -> Agent 读 MD/状态，决定下一步
Do    -> Agent 或 subagent 执行内容工作
Check -> JS/CLI 执行校验、诊断、建议等反馈动作，并写 trace/receipt
Act   -> Agent 读反馈，继续、修复、降级或阻塞
```

长程运行的核心不是“Agent 一次想明白”，而是让 Agent 处在真实反馈闭环里。

---

## Error Boundary

本项目允许 Layer 1 出错，不允许 Layer 2 造假。

| 层 | 可以发生什么 | 处理方式 |
|----|--------------|----------|
| Layer 1: Agent/MD | 理解偏差、搜索噪声、输出格式错误、subagent 失败 | 由 JS/CLI 的 Check/Inspect/Advice 动作输出反馈，Agent 修复或重跑 |
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
| Put multi-stage Agent Flow into a JS controller because it is easier to test | Keep the flow in Markdown/playbooks/task cards; use JS only for deterministic checkpoints |
| Need to decide where a rule belongs | Use the Quick Router and Authority Map before editing |
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

All capability or behavior changes follow OpenSpec discipline:

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

1. `guidelines/project-charter.md`：稳定原则和权威边界。
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
- Does this accidentally make JS/CLI the Agent Flow controller instead of a checkpoint/feedback layer?
- Does this keep multi-stage LLM-facing flow visible in Markdown/playbooks/task cards?
- Does this duplicate a definition that should instead live in `README.md` glossary or this project charter?
- Does this add enough `MUST` / `MUST NOT` clarity for an Agent to act safely?
- Should this be an OpenSpec change instead of guidance prose?

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Command Experiments](command-experiments.md) — operational charter for experiment playbooks.
- [Engine-Side Dispatch Scheduler](agentic-dispatch-scheduler-mechanism.md) — future ds mechanism draft, not runtime truth.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Accepted specs](../openspec/specs/) — accepted capability requirements.
