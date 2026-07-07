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
siblings:
  - guidelines/framework-runtime-boundary.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Project Charter

> 状态: 生效 | 创建: 2026-06-17 | 用途: 项目入口指导

---

**你是在设计一个以 LLM 为能力源、以 Markdown 为 Agent Flow 控制面、以 JS/CLI 为确定性 checkpoint/反馈层的系统。不是在写一个单纯的确定性程序。**

本项目的目标是 Deep Research Tool rewrite：一个 agentic framework，用于产出证据支撑、多阶段、多 checkpoint 的深度研究报告。

本项目完全靠 OpenSpec 推进工程变更。OpenSpec 不是旁路文档或事后记录，而是 proposal、spec、tasks、apply、archive 的执行主干：它把要做什么、为什么做、按什么顺序做、怎样验证、完成后如何并入 main specs 固化下来。

本项目的开发模式是 spec-driven development。所有能力、行为、schema、状态机、deterministic checkpoint、receipt、trace 相关迭代都必须严格遵循 OpenSpec：先 proposal/spec/tasks，再实现、验证、归档。`guidelines/` 只能解释和指路，不能绕过 OpenSpec 直接定义新行为。

核心分工固定不变：

```
Agent (LLM)      -> 搜索、阅读、提取证据、写作、综合、做内容判断，并读取反馈继续
Engine (JS/CLI)  -> 校验 schema、执行确定性状态转换、检查 receipt、写 trace，输出 check / inspect / advice 风格反馈
Markdown         -> LLM-facing Agent Flow controller：任务、流程、约束、反馈都在这里被读写
JSON/YAML/JSONL  -> 持久化 runtime state、证据、receipt、trace，让上下文可重载
```

**Markdown controls Agent Flow; JS/CLI controls deterministic checkpoints. LLM supplies judgment. Engine enforces deterministic contracts.**

---

## File Position

This file can decide:

- Repo-wide principles, authority order, layer boundaries, and safety-critical guidance rules.
- Reading routes and conflict-resolution rules for choosing the right Source of Record.
- Stable project posture when current repository surfaces are confusing or in flux.

This file cannot decide:

- Concrete capability behavior, schema fields, CLI flags, state transitions, receipt grammar, or trace event contracts.
- Current runtime facts, queue contents, gate status, evidence counts, or verdict truth.
- Implementation permission for a new behavior without an OpenSpec change or accepted executable contract.

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
- MUST keep runtime state in the active runtime bundle root, not in chat memory.
- MUST treat `DPT_FRAMEWORK/` as reusable framework assets, not as a per-run workspace.
- MUST keep per-run state, HITL answers, gate attempts, trace, artifacts, delegated work-unit attempts, and final output inside the active bundle root, currently an explicit `dpt_rb_*` or `dpt_disp_*` directory.
- MUST pass the active bundle path explicitly to framework commands that operate on a run.
- MUST keep `guidelines/` aligned with accepted specs and clearly separate stable principles from current repository conventions.

### MUST NOT

- MUST NOT return to Agent self-governance for deterministic runtime authority, where Markdown prose or Agent self-discipline owns queue, gate, hook, receipt, or trace truth.
- MUST NOT use guidance prose to override schema, CLI output, accepted specs, or runtime state.
- MUST NOT invent implementation behavior in this file without an OpenSpec change.
- MUST NOT move LLM-facing multi-stage flow into JS just because JS is easier to test or feels like a controller.
- MUST NOT let JS/CLI orchestrate search, judgment, writing, repair, synthesis, or native subagent semantics as a substitute for Agent Flow.
- MUST NOT fake trace, result files, receipts, subagent output, or runtime validation.
- MUST NOT treat progress summaries, console output, or chat confidence as evidence.
- MUST NOT write runtime state, gate results, HITL answers, repair attempts, artifacts, or final output into `DPT_FRAMEWORK/`.
- MUST NOT treat `DPT_FRAMEWORK/schema/`, `DPT_FRAMEWORK/workflows/`, `DPT_FRAMEWORK/engine/`, or `DPT_FRAMEWORK/cli/` as active bundle storage.
- MUST NOT read `_original_*` archives unless the user explicitly asks for historical analysis.

---

## Authority Map

指导文档不能替代规格、schema、实现或 runtime 状态。遇到冲突时，先判断“这是什么类型的事实”，再按对应 Source of Record 处理：

| Truth Type | Source of Record | Role |
|------------|------------------|------|
| Project rules and constraints | `AGENTS.md`, `openspec/config.yaml` | 技术栈、OpenSpec 纪律、repo-wide hard rules |
| Accepted capability behavior | `openspec/specs/`, `openspec/governance/` | 已接受需求、invariant、requirement registry |
| Executable contracts | `DPT_FRAMEWORK/`, `tests/` | schema、CLI verdict、状态检查、回归验证、框架实现 |
| Runtime/run state | active runtime bundle root, currently a selected `dpt_rb_*` or `dpt_disp_*` directory | 每个 run 或实验自己的当前控制文件和数据 |
| Human/Agent guidance | `guidelines/` | 工作原则、操作规范、架构宪法、阅读路线 |

`guidelines/` 的作用是降低理解成本，不做新的 Source of Record。需要新增或改变系统行为时，走 OpenSpec change，再落到 accepted specs、`DPT_FRAMEWORK/`、实验基础设施或测试里。

### Quick Router

When deciding where something belongs, route by authority:

| If the work is about... | Put it in / trust |
|-------------------------|-------------------|
| User-facing task flow, stage instructions, handoff, or feedback context | Markdown playbooks / task cards |
| Semantic judgment, evidence choice, synthesis, or repair reasoning | LLM Agent |
| Schema, state transition, deterministic checkpoint, receipt, trace, or deterministic verdict | JS/CLI/Engine + accepted specs |
| Current run state, queue contents, profile, evidence files, work-unit attempts, or trace history | The active runtime bundle root, currently a selected `dpt_rb_*` or `dpt_disp_*` bundle |
| New or changed accepted behavior | OpenSpec change before implementation |
| Future mechanism direction | `guidelines/` as design guidance only |

---

## Framework Runtime Boundary

`DPT_FRAMEWORK/` 是 framework，不是 run bundle。它可以包含 workflow nodes、schema contracts、gate definitions、engine code、CLI wrappers、bundle templates 和 command playbooks；它不保存某一次 run 的结果。

同一套 `DPT_FRAMEWORK/` 必须能够服务多个 active runtime bundle root。当前约定中，production run 使用 `dpt_rb_*`，disposable experiment 使用 `dpt_disp_*`。被本次 run、CLI invocation 或 controlled experiment 明确选中的那个目录就是 active bundle root，承载当前 truth：profile、HITL answer、queue/status、gate attempt、trace、repair state、reference、artifact、delegated work-unit attempt 和 final output。

裸 runtime path 都以 active bundle root 为根。`rb_queue.json`、`rb_trace.jsonl`、`rb_output_declarations.jsonl`、`reference/`、`artifacts/`、`_cache/`、`_logs/`、`final/`、`_work_units/...` 不是 repo-root path，也不是 `DPT_FRAMEWORK/` path，除非文本显式写出其他根。

三个坐标必须分清：

- `repo_command_root`：执行 `node DPT_FRAMEWORK/...` 的仓库根，只是命令位置，不是 runtime truth。
- `framework_root`：`DPT_FRAMEWORK/` reusable framework assets 根，运行时只读。
- `active_bundle_root`：当前选中的 `dpt_rb_*` / `dpt_disp_*` runtime bundle root，唯一 mutable runtime truth 根。

当前 v1 只有一个 canonical Deep Research workflow package；这不限制 run bundle 数量。一套 framework 必须能服务多个互相隔离的 `dpt_rb_*`。

关键边界：

- 当 gate definitions 实现后，`DPT_FRAMEWORK/schema/gate_definitions/` 里的 JSON 是 read-only gate definition，不是 run data，也不是 pass/fail 结果。
- `DPT_FRAMEWORK/schema/contracts/` 定义 executable contract，不保存当前 run 的状态。
- `DPT_FRAMEWORK/engine/` 和 `DPT_FRAMEWORK/cli/` 执行 deterministic checkpoint，不拥有研究判断，也不把结果写回 framework。
- `DPT_FRAMEWORK/rb_templates/` 只放会被实例化到 bundle 的初始模板，不放某个 run 的运行产物。
- `rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`、`rb_queue.json`、`rb_output_declarations.jsonl`、`_work_units/` 等 active bundle root 下的文件才是当前 run 的 runtime truth。

如果不确定某个文件应该放在 framework 还是 bundle，先读 `guidelines/framework-runtime-boundary.md`。本 Charter 固定 authority boundary；具体目录路由由该 guideline、accepted specs 和 executable framework contracts 进一步细化。

---

## Operating Model

### LLM 是能力源

最终的理解、判断、写作、取舍、修复和综合能力仍然在 LLM Agent 处。这个项目不是用 JS/CLI 取代 LLM 智力，而是用 Markdown + JS/CLI 反馈动作 + 持久化状态，把 LLM 的能力稳定激发出来，并把它容易发糊的地方约束住。

四个不变量必须同时成立：

1. LLM owns judgment: 语义判断、研究取舍、综合表达在 LLM。
2. Markdown controls Agent Flow: 多阶段任务、handoff、上下文和反馈入口由 Markdown/playbook/task card 驱动。
3. Engine owns deterministic checkpoints: schema、状态转换、receipt、trace 裁决在 JS/CLI/Engine。
4. Markdown does not own machine authority: runtime state、transition、receipt、trace 的机器真相仍在结构化状态和 Engine。

| Surface | Owns | Does Not Own |
|---------|------|--------------|
| LLM Agent | 语义理解、内容判断、证据取舍、研究策略、综合写作、根据反馈修复 | 确定性状态权威、receipt 权威、schema 真相 |
| Markdown | conversation-native Agent Flow controller：给 LLM 任务、阶段、约束、上下文、反馈和下一步行动入口 | 机器可验证真相、状态转换/receipt/trace 权威 |
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

JS/CLI 只在关键节点介入：创建/校验结构、检查 receipt、执行确定性状态转换、写 trace、返回 check / inspect / advice 风格反馈。JS 可以做精确 controller，但它控制的是 deterministic checkpoint，不是整条 Agent Flow。

如果一个多阶段过程被藏进 JS controller，LLM 只是在运行脚本，那它就退化成 scripted workflow，而不是 agentic workflow。除非 accepted spec 明确要求，默认不要把 Agent Flow 搬进 JS。

### Markdown 是 LLM Control Surface

Markdown 负责让 Agent 看懂“要做什么、为什么做、做完怎么验证”，并承接 JS/CLI 返回的 check / inspect / advice 风格信息块。它可以承载 workflow step、任务卡、playbook 和机制说明，但不应该承担不可错的状态机或 receipt 判定。

Markdown 不是被动桥梁。它是 LLM Agent 在 conversation 里接收任务、理解约束、读取反馈、继续行动的主要操作面。因为 Agent 靠多轮对话运转，JS/CLI 的输出只有回到 conversation context，才会变成下一步行动的一部分。

### JS/CLI 是 Trust Root

JS/CLI 负责 Agent 不可靠的部分：结构化解析、schema 校验、确定性状态转换、receipt 检查、trace 写入，以及把结果重新吐回 conversation context。它提供精确反馈，不替代 LLM 的语义判断。Agent 可以出错；JS/CLI 的反馈不能造假。

### Feedback Loop

JS/CLI 可以执行三类反馈动作，动作输出都会回到下一轮 Markdown 行动里：

- Check: 对一个具体条件给出过/不过的判定。
- Inspect: 对缺什么、错在哪、哪里不一致给出诊断。
- Advice: 对下一步怎么走给出方向性建议。

这些反馈不是独立报告，而是下一轮 Agent 读取后继续行动的上下文。

Check / Inspect / Advice 是 JS/CLI/Engine 的反馈动作类型，不一定是已接受的 CLI 命令名或 trace event 名。具体命令名、trace event 名和 verdict 语义由 accepted specs、active OpenSpec change 或机制级指导定义。

### PDCA 是默认循环

```
Plan  -> Agent 读 MD/状态，决定下一步
Do    -> Agent 或 Agent actor 执行内容工作
Check -> JS/CLI 执行校验、诊断、建议等反馈动作，并写 trace/receipt
Act   -> Agent 读反馈，继续、修复、降级或阻塞
```

长程运行的核心不是“Agent 一次想明白”，而是让 Agent 处在真实反馈闭环里。

---

## Error Boundary

本项目允许 Layer 1 出错，不允许 Layer 2 造假。

| 层 | 可以发生什么 | 处理方式 |
|----|--------------|----------|
| Layer 1: Agent/MD | 理解偏差、搜索噪声、输出格式错误、Agent actor 失败 | 由 JS/CLI 的 Check/Inspect/Advice 动作输出反馈，Agent 修复或重跑 |
| Layer 2: Engine/CLI/Trace | schema、状态机、receipt、trace、runtime context 合法性 | 绝不能假通过；失败要显式暴露 |

绝对不接受：

- 用脚本模拟 LLM/Agent actor 的实际工作并声称实验通过。
- 手写假 `result.json`、假 trace event、假 receipt。
- 跳过所需 runtime validation 后继续解释结果。
- 直接改 deterministic state 到想要状态，绕过状态机或 CLI。
- 用 `console.log` 当裁决证据。

判断标准：**这个证据是真实执行的副产物，还是人/脚本事后编出来的？**

---

## Agent Guardrails

If you are about to do one of these, stop and switch to the required path:

| If you are about to... | Do this instead |
|------------------------|-----------------|
| Hand-write trace, receipt, or result files to satisfy a check | Run the real Engine/Agent path that produces them |
| Treat `console.log` output as pass/fail proof | Read the trace JSONL, CLI exit result, or accepted verdict source |
| Use chat memory as run state | Reload control files from the active bundle root |
| Add behavior only in guidance prose | Create or update an OpenSpec change/spec |
| Put multi-stage Agent Flow into a JS controller because it is easier to test | Keep the flow in Markdown/playbooks/task cards; use JS only for deterministic checkpoints |
| Need to decide where a rule belongs | Use the Quick Router and Authority Map before editing |
| Copy historical prototype paths or queue rules into current docs | Extract the underlying principle, then check current OpenSpec sources and framework conventions |
| Read `_original_*` for inspiration | Confirm the user explicitly asked for historical analysis |
| Let Markdown decide a deterministic transition | Move the rule into schema/CLI/Engine design |
| Ship a new engine function or CLI capability without a runtime caller | Land the demand-side wiring in the same change: Agent-facing control-plane MD must direct the Agent to invoke it, and a validator must lock the wording. Supply without demand is dead code — Agents will bridge the gap by hand (inline JS, hand-written files), which is how hand-faking starts |

---

## Current Project Surfaces

The project charter should not become a directory manifest. Treat these paths as current project surfaces, not as eternal architecture:

| Surface | Current location | Stable role |
|---------|------------------|-------------|
| OpenSpec governance | `openspec/` | proposal/spec/tasks lifecycle, accepted requirements, governance checks |
| Framework implementation | `DPT_FRAMEWORK/` | reusable framework assets: workflow nodes, schemas, gate definitions, CLIs, deterministic engines, trace utilities, templates, command playbooks — no tests and no runtime state |
| Agent-facing guidance | `guidelines/` | principles, reading routes, mechanism guidance, quality bars |
| Experiments and fixtures | `experiments_env/` and `experiments_playbook/` | prototype fixtures, shared experiment setup, command experiment playbooks |
| Regression checks | `tests/` | executable tests for accepted behavior |
| Runtime bundle roots | currently `dpt_rb_*` and `dpt_disp_*` | active run/experiment state, evidence, receipts, trace, artifacts, work-unit attempts |

The stable rule is ownership, not a specific tree snapshot:

- OpenSpec owns accepted behavior.
- Framework code owns deterministic implementation.
- Runtime bundle roots own current run state.
- Markdown/guidance owns Agent-facing flow and explanation.
- Experiments own evidence for mechanism viability before or during acceptance.

When the repository shape changes, update this section as a route map only. Do not encode detailed subdirectory layouts here unless they are needed to prevent a known class of mistakes. Concrete paths, helper names, bundle skeletons, and trace event contracts belong in accepted specs, active OpenSpec changes, or mechanism-specific guidance.

Do not copy historical prototype paths or control rules into current work unless the document is explicitly doing historical comparison. Extract the principle first, then route the current behavior through OpenSpec and framework conventions.

---

## Development Flow

All capability or behavior changes follow OpenSpec discipline:

```
Explore / design
  -> OpenSpec proposal/spec/tasks
  -> focused experiment, prototype, or framework implementation
  -> real runtime bundle / real trace validation
  -> archive accepted change
```

实验验证的是机制，不是演示脚本。机制通过后，按 OpenSpec 结果进入 accepted specs、framework implementation、实验指导或测试。

### OpenSpec Apply Discipline

本项目的工程纪律主要靠 OpenSpec 外化和维持，而不是靠 Agent 自律、聊天记忆或一次性 code review。OpenSpec 把意图、任务顺序、contract、验证要求和归档入口放到可检查的 artifact 里，让 implementation 可以被追踪、质疑和复盘；没有 OpenSpec artifact 承载的行为变化，不应伪装成已接受工程事实。

因此，OpenSpec apply 不是机械照抄计划，也不是脱离计划的临场发挥。它是一个受 `tasks.md` 约束的反馈闭环：任务序列提供依赖顺序和审计面；真实实现、测试和 E2E 暴露计划中没有完全说清的边界；这些新边界再回到 active delta specs 和 tasks，最后才进入 accepted specs。

因此，Apply 阶段默认按已批准的 `tasks.md` 顺序执行。若实施中发现任务顺序本身会导致假验证、漏实现或错误依赖，必须显式说明原因，再调整执行顺序或补充 task section；不要静默跳步。Tasks 是 apply 审计面，不是事后装饰。

真实 bug 不是孤立补丁入口，而是 contract-class probe。一个具体缺口若暴露某类 contract drift，应横向检查同一 contract 的所有权威面：delta/main specs、schema/definitions、CLI/runtime implementation、shared helper、Agent-facing Markdown、validators、regression tests、controlled E2E 和 archive wording。单点修复不能替代类问题审计。

实施中发现的高信噪比规则要回写到 active delta spec；归档后再进入 main specs。不要让“这次才想明白的边界”只留在聊天、测试名、一次性复盘或某个实现注释里。若旧 spec/guideline wording 会误导未来 Agent，优先用当前 change 的 delta spec 或同轮 guideline 更新清理它，而不是依赖记忆。

验证和任务勾选必须跟真实证据同步：先跑对应 regression/E2E/governance，再勾 final checks；若完成后又补了 spec 或验证边界，新增一个 post-apply task section 记录原因和结果。完成说明和 archive note 不得 overclaim；必须明确区分机制证明、真实 Agent 行为证明、negative-case diagnostic artifacts、以及仍然存在的 residual risk。

---

## Hard Rules

1. 使用 Node.js >=20，纯 JavaScript ESM (`.mjs`)。
2. 不使用 TypeScript。
3. 不新增依赖；批准 npm 依赖只有 `zod` 和 `yaml`。
4. 测试使用 `node:test` + `node:assert`。
5. 修改 framework implementation 必须由 OpenSpec change、accepted spec 或明确任务覆盖。
6. 裁决只从真实文件、schema 校验、receipt、trace JSONL 或 accepted verdict source 来。
7. 不读 `_original_*` 归档，除非用户明确要求分析历史版本。
8. `DPT_FRAMEWORK/` 是纯框架目录，可发行，运行时视为 read-only framework assets。不放测试文件、实验 fixture、实验 playbook，也不放 per-run runtime state。测试统一在 root `tests/`。
9. `dpt_rb_*` 和 `dpt_disp_*` 是 mutable runtime bundle root；HITL、gate attempt、trace、repair、artifact、delegated work-unit attempt、final output 等运行时事实必须写在 active bundle root。裸 runtime path 一律按 active bundle-root relative 解析。

---

## Reading Order

新 Agent 或新维护者按这个顺序读：

1. `guidelines/project-charter.md`：稳定原则和权威边界。
2. `guidelines/framework-runtime-boundary.md`：framework 只读资产与 run bundle 可变状态的目录和权威边界。
3. `openspec/config.yaml`：项目级 spec-driven 纪律。
4. `guidelines/agentic-execution-model.md`：统一执行模型与术语正典——Chain、Queue、Work Unit 如何组成当前执行系统。
5. `guidelines/agentic-workflow-mechanism.md`：Tier 1 (Chain) —— phase 间路由与三层权威架构。
6. `guidelines/agentic-queue-mechanism.md`：Tier 2 (Queue) —— phase 内 task 编排，两层嵌套循环。
7. `guidelines/agentic-subagent-mechanism.md`：Work-unit-mediated Sub-agent execution —— bounded sub-agent 任务、噪声隔离、submit provenance。
8. `guidelines/command-experiments.md`：如何写和运行实验 playbook。
9. 相关 `openspec/specs/<capability>/spec.md`：具体 capability 的需求。
10. 对应 framework、experiment 或 active bundle root 文件。

---

## Guideline Change Checklist

Before changing any file in `guidelines/`, check:

- Does this conflict with `AGENTS.md` or `openspec/config.yaml`?
- Does this conflict with accepted specs under `openspec/specs/`?
- Does this describe current project surfaces without turning this charter into a directory manifest?
- Does this present future design as current runtime truth?
- Does this reintroduce Agent self-governance for deterministic runtime authority?
- Does this accidentally make JS/CLI the Agent Flow controller instead of a checkpoint/feedback layer?
- Does this keep multi-stage LLM-facing flow visible in Markdown/playbooks/task cards?
- Does this duplicate a definition that should instead live in `README.md` glossary or this project charter?
- Does this add enough `MUST` / `MUST NOT` clarity for an Agent to act safely?
- Should this be an OpenSpec change instead of guidance prose?

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary for read-only framework assets versus mutable runtime bundles.
- [Command Experiments](command-experiments.md) — target guidance for durable command experiment shape and boundaries.
- [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon; defines Chain, Queue, and Work Units.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain): phase-to-phase routing and Three-Authority Architecture.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — Tier 2 (Queue): within-phase task execution; queue engine (AGQ-001~006) is implemented runtime, and seed-topics/wave0/wave1/wave2 queue integrations are accepted/current.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — architectural constitution for work-unit-mediated Sub-agent execution and noise-isolation principles.
- [OpenSpec config](../openspec/config.yaml) — project-level OpenSpec rules.
- [Accepted specs](../openspec/specs/) — accepted capability requirements.
