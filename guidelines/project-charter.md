---
guideline_id: project-charter
suite: deep-research-guidelines
title: Project Charter
status: effective
created: 2026-06-17
revised: 2026-07-25
role: repo-wide charter and entrypoint
scope: all work in this repository
authority: guidance
siblings:
  - guidelines/evolution-abstraction-semantic-precision.md
  - guidelines/evolution-simple-reliable-control.md
  - guidelines/evolution-helper-oriented-agent.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/logging-conventions.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Project Charter

> 状态: 生效 | 创建: 2026-06-17 | 修订: 2026-07-25 | 用途: 项目入口指导

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

## Before Introducing A New Thing

Before adding a named state, status, projection, Module, command, or reader-facing view, first ask whether it creates a semantic level on which a reader can reason more precisely. Dijkstra's point was not that abstraction permits vagueness: finite reasoning can cover many cases only when it creates a new level at which the relevant distinctions are precise.

Read [Evolution Direction: Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) before choosing the control mechanism. That companion retains the complete EWD 340 Argument Four source paragraph and a clearly separate project interpretation; this Charter retains only the entry-point context.

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
- MUST follow the project's spec-driven change lifecycle for project evolution.
- MUST use accepted behavior contracts for capability behavior.
- MUST, before introducing or materially changing a named state, projection, status, concept, Module, or reader-facing view, review whether it gives a defined reader a precise bounded question, preserves the distinctions that change that answer, and provides a normal reasoning stop point. Use `guidelines/evolution-abstraction-semantic-precision.md` for this review.
- MUST keep Markdown as the primary LLM-facing operating/control surface, not as a machine verifier or authority for state transitions.
- MUST keep multi-stage agentic flow in Markdown, playbooks, or task cards by default.
- MUST read JS/CLI feedback back into the conversation context before the next Markdown-driven action.
- MUST treat check / inspect / advice outputs as structured JS/CLI feedback, not as chat noise.
- MUST prefer the shortest correct control loop: direct runtime fact -> deterministic check -> smallest actionable root cause -> one clear next action. Use `guidelines/evolution-simple-reliable-control.md` as the design-review complexity brake.
- MUST, when proposing or changing a cross-boundary deterministic obligation used to block advancement or establish a deterministic closure condition, make its authoritative fact, owning boundary, legal establishment/change path, or honest owner/terminal/missing-contract boundary reviewable. This review does not itself require a witness, receipt, consumer, writer, retry, state, or controller unless an accepted contract independently requires one.
- MUST treat the Agent as the executor of ordinary authorized commands and reversible mechanical repair when a live Agent turn has required permission, an accepted legal operation, and the facts that operation requires; ask the user only for new semantics, risk/permission decisions, or a genuinely non-delegable action. Use `guidelines/evolution-helper-oriented-agent.md` for the action-responsibility review.
- MUST distinguish autonomous execution, human-directed decisions inside HITL1/HITL2, and out-of-band maintenance/debug without inventing a new lifecycle state or mutation authority.
- MUST keep the iterative research posture simple: HITL1 aligns the work, silent autonomy executes ordinary legal work, HITL2 reviews it, and Final delivers it. This is responsibility allocation, not a promise that a host or model will continue, invoke a tool, retain context, or succeed externally. A normal user-initiated turn may be answered without becoming another checkpoint or authority. Retaining prior decisions, artifacts, and trace as history does not make every historical value permanently current; accepted specs and current runtime truth define behavior.
- MUST treat quality-control complexity as safety-critical: a checker, gate, recovery path, or diagnostic chain must be easier to reason about and test than the work it validates.
- MUST interpret mechanism-level goals such as recovery, stop authorization, context sustainability, or comprehensive validation as required outcomes, not as pre-approval for a particular controller, watcher, retry tree, or derived-state stack.
- MUST make evidence, receipts, and trace entries come from real execution, and bound any completion, closure, causal, or behavioral claim to its identified object and evidence boundary, including applicable provenance, actor/host, and proof class. Evidence outside a claim's stated provenance or continuity boundary may remain diagnostic, but cannot close a stronger claim.
- MUST keep runtime state in the selected active runtime bundle, not in chat memory.
- MUST treat reusable framework assets as reusable assets, not as a per-run workspace.
- MUST keep per-run state, HITL answers, gate attempts, trace, artifacts, delegated work-unit attempts, and final output inside the active bundle root.
- MUST pass the selected active-bundle path explicitly to framework commands that operate on a run.
- MUST, when proposing or changing an Agent-facing boundary explicitly declared for entry, handoff, or recovery, state its input/context boundary and enough authoritative facts for the bounded next legal action or an honest no-path result. It may be a documented protocol, but MUST NOT select semantic work, schedule turns, infer liveness, or advance undeclared transitions.
- MUST keep `guidelines/` aligned with accepted specs and clearly separate stable principles from current repository conventions.

### MUST NOT

- MUST NOT return to Agent self-governance for deterministic runtime authority, where Markdown prose or Agent self-discipline owns queue, gate, hook, receipt, or trace truth.
- MUST NOT use guidance prose to override schema, CLI output, accepted specs, or runtime state.
- MUST NOT invent implementation behavior in this file without an OpenSpec change.
- MUST NOT move LLM-facing multi-stage flow into JS just because JS is easier to test or feels like a controller.
- MUST NOT let JS/CLI orchestrate search, judgment, writing, repair, synthesis, or native subagent semantics as a substitute for Agent Flow.
- MUST NOT make quality control more fragile than the work it validates: avoid long derived-check chains, duplicate validators, cascading symptoms after a prerequisite failure, or blocking presentation-format preferences when direct structured authority exists.
- MUST NOT use a new guideline to invalidate accepted implementation by prose or justify an unscoped full-system rewrite; behavior converges through focused OpenSpec changes and compatibility-safe local simplification.
- MUST NOT turn a human-directed decision into a requirement that the human run ordinary pipeline commands, or treat user agreement as permission to fabricate state, trace, receipt, evidence, or a missing Engine capability.
- MUST NOT fake trace, result files, receipts, subagent output, or runtime validation.
- MUST NOT treat progress summaries, console output, or chat confidence as evidence.
- MUST NOT write runtime state, gate results, HITL answers, repair attempts, artifacts, or final output into reusable framework assets.
- MUST NOT treat implementation-asset directories as active bundle storage.
- MUST NOT read `_original_*` archives unless the user explicitly asks for historical analysis.

---

## Authority Map

指导文档不能替代规格、schema、实现或 runtime 状态。遇到冲突时，先判断“这是什么类型的事实”，再按对应 Source of Record 处理：

| Truth Type | Source of Record | Role |
|------------|------------------|------|
| Project rules and constraints | the project's governing operating contract | 技术栈、spec-driven 纪律、repo-wide hard rules |
| Accepted capability behavior | accepted behavior contract | 已接受需求、invariant、requirement registry |
| Executable contracts | executable implementation and regression evidence | schema、CLI verdict、状态检查、回归验证、框架实现 |
| Runtime/run state | the selected active runtime bundle | 每个 run 或实验自己的当前控制文件和数据 |
| Human/Agent guidance | this Charter and its guidance suite | 项目宪章、复杂度纪律、操作规范、机制指导、阅读路线 |

`guidelines/` 的作用是降低理解成本，不做新的 Source of Record。需要新增或改变系统行为时，离开宪章导航层，按项目变更生命周期进入相应的 authoritative surface；本文件不把那些下游位置编入阅读路线。

Source of Record 只回答哪个 surface 裁决某类事实。Authority、capability、permission、responsibility、liveness 和 evidence 是不同问题；除非 accepted contract 明确规定，任何一个都不自动推出另一个。

### Guidance Conflict Resolution

当 `guidelines/` 内部出现历史机制表述与新原则的张力时：

1. 适用于该事实的 accepted behavior contract、可执行 contract 和 runtime truth 决定当前行为；不能用新 prose 越权修改。
2. 本 Charter 决定 Agent / Markdown / Engine / runtime state 的 ownership boundary。
3. `evolution-abstraction-semantic-precision.md` 决定新增概念是否形成一个让读者对有界问题精确推理的语义层；它要求保留决定性区别，不替代 authority 或 runtime contract。
4. `evolution-simple-reliable-control.md` 决定控制复杂度上限：直接 authority、短路派生症状、一个最近动作、无隐藏恢复树。
5. `evolution-helper-oriented-agent.md` 决定行动责任：用户只承担必要决定或不可代理动作，后续合法机械执行回到 Agent；helper posture 不创造权限。
6. mechanism guideline 只在上述边界内解释领域结构；“问题必须解决”不等于“复杂机制已经定案”。

既有实现与新原则存在差距时，把差距视为渐进 design debt：停止继续叠加，后续触碰该 surface 时局部收敛；不要为了形式一致性一次性重写整个系统。

### Quick Router

When deciding where something belongs, route by authority:

| If the work is about... | Put it in / trust |
|-------------------------|-------------------|
| User-facing task flow, stage instructions, handoff, or feedback context | Markdown playbooks / task cards |
| Semantic judgment, evidence choice, synthesis, or repair reasoning | LLM Agent |
| Schema, state transition, deterministic checkpoint, receipt, trace, or deterministic verdict | the applicable executable contract |
| Current run state, queue contents, profile, evidence files, work-unit attempts, or trace history | the selected active runtime bundle |
| A new or materially changed named state, projection, status, concept, Module, command, or reader-facing view | `guidelines/evolution-abstraction-semantic-precision.md`, then leave the constitutional route through the approved change lifecycle |
| New or changed accepted behavior | the approved change lifecycle before implementation |
| Future mechanism direction | `guidelines/` as design guidance only |
| Control-loop or quality-check complexity | `guidelines/evolution-simple-reliable-control.md` |
| Agent/user action responsibility, escalation, or maintenance/debug posture | `guidelines/evolution-helper-oriented-agent.md` |

---

## Framework Runtime Boundary

可复用的 framework assets 与某一次 run 的 mutable truth 必须分开：前者可以服务多个 run，后者只属于被明确选中的那个 runtime bundle。具体目录、命令和文件路由不属于本宪章；它们由同层的 [Framework Runtime Boundary](framework-runtime-boundary.md) 说明。本 Charter 只固定不可反转的原则：不能把当前运行事实写回可复用资产，也不能把 chat memory、console 或 projection 当作 active runtime truth。

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
| Add more checks, fallbacks, derived state, or repair branches to improve reliability | Read `evolution-simple-reliable-control.md`; first delete brittle blockers, reuse direct checks, short-circuit cascades, and move feedback to the decision point |
| Copy historical prototype paths or queue rules into current docs | Extract the underlying principle, then check current OpenSpec sources and framework conventions |
| Read `_original_*` for inspiration | Confirm the user explicitly asked for historical analysis |
| Let Markdown decide a deterministic transition | Move the rule into schema/CLI/Engine design |
| Ship a new engine function or CLI capability without a runtime caller | Land the demand-side wiring in the same change: Agent-facing control-plane MD must direct the Agent to invoke it, and a validator must lock the wording. Supply without demand is dead code — Agents will bridge the gap by hand (inline JS, hand-written files), which is how hand-faking starts |

---

## Stable Surface Boundaries

The project charter is not a directory manifest or an operational index. It fixes the ownership boundary, not the current tree snapshot:

- The project change lifecycle owns accepted behavior.
- Reusable implementation owns deterministic execution.
- The selected runtime bundle owns current run state.
- Markdown/guidance owns Agent-facing flow and explanation.
- Controlled experiments own evidence for mechanism viability before or during acceptance.

Concrete paths, helper names, bundle skeletons, and trace event contracts belong outside this constitutional reading route. If a future repository shape changes, preserve these ownership boundaries rather than carrying a stale path map forward.

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

真实 bug 不是孤立补丁入口，而是 contract-class probe。一个具体缺口若暴露某类 contract drift，应横向识别同一 contract 的必要权威面：delta/main specs、direct schema/definition、唯一 checker path、Agent-facing producer guidance、focused regression/controlled evidence 和 archive wording。横向审计的目的首先是找到重复 truth、漂移和最小闭环，不是默认修改所有 surface；只触碰关闭该 contract 所必需的面，避免把一个 bug 扩成 mega-change。

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
8. Reusable framework assets are read-only at runtime and never store per-run state, tests, or experiment fixtures; verification modes remain separated by their accepted routing contract.
9. The selected active runtime bundle is the mutable run root; HITL, gate attempts, trace, repair, artifacts, delegated work-unit attempts, and final output belong there, and bare runtime paths resolve relative to it.

---

## Reading Order

新 Agent 或新维护者按这个顺序读：

1. `guidelines/project-charter.md`：稳定原则和权威边界。
2. `guidelines/evolution-abstraction-semantic-precision.md`：Dijkstra 的原文语境、何种新概念形成可精确推理的语义层，以及引入新东西前的退后一步。
3. `guidelines/evolution-simple-reliable-control.md`：短判断链、简单质量控制、最小根因反馈和复杂度刹车。
4. `guidelines/evolution-helper-oriented-agent.md`：用户决定、Agent 执行、Engine 裁决的 helper-oriented 责任边界。
5. `guidelines/framework-runtime-boundary.md`：framework 只读资产与 run bundle 可变状态的目录和权威边界。
6. `guidelines/logging-conventions.md`：runtime continuity、trace/log 的 authority boundary 与诊断记录。
7. `guidelines/agentic-execution-model.md`：统一执行模型与术语正典——Chain、Queue、Work Unit 如何组成当前执行系统。
8. `guidelines/agentic-workflow-mechanism.md`：Tier 1 (Chain) —— phase 间路由与三层权威架构。
9. `guidelines/agentic-queue-mechanism.md`：Tier 2 (Queue) —— phase 内 task 编排，两层嵌套循环。
10. `guidelines/agentic-subagent-mechanism.md`：Work-unit-mediated Sub-agent execution —— bounded sub-agent 任务、噪声隔离、submit provenance。
11. `guidelines/command-experiments.md`：如何写和运行实验 playbook。

---

## Guideline Change Checklist

Before changing any file in `guidelines/`, check:

- Does this stay within the Charter's ownership boundary rather than duplicating an authoritative behavioral contract?
- Does this preserve the Charter-only `defers_to` hierarchy and same-layer constitutional navigation?
- Before adding or materially changing a named concept, state, projection, status, Module, command, or reader-facing view, has it passed the “引入一个新东西之前，先退后一步” reflection: question, essential distinctions, and normal reasoning stop point?
- Does this describe current project surfaces without turning this charter into a directory manifest?
- Does this present future design as current runtime truth?
- Does this reintroduce Agent self-governance for deterministic runtime authority?
- Does this accidentally make JS/CLI the Agent Flow controller instead of a checkpoint/feedback layer?
- Does this keep multi-stage LLM-facing flow visible in Markdown/playbooks/task cards?
- Does this duplicate a definition that should instead live in `README.md` glossary or this project charter?
- Does this add enough `MUST` / `MUST NOT` clarity for an Agent to act safely?
- For a proposed durable constitutional invariant, does it remain valid without current incident or mechanism names and have a meaningful counterexample; and does any new or changed blocking or declared public boundary keep its legal/no-path, non-implication, and proof scope explicit without pre-approving a mechanism?
- Has the change first applied `evolution-abstraction-semantic-precision.md`, so the semantic level is justified before choosing a control shape or allocating action responsibility?
- Has the change passed the two-question `Simplicity Admission Test` in `evolution-simple-reliable-control.md`?
- Has it passed the two-question `Helper Direction Review` in `evolution-helper-oriented-agent.md`, so only necessary decisions remain with the user and legal execution returns to the Agent?
- If it names recovery, stop, context, or validation obligations, does it avoid pre-approving a complex mechanism?
- Does it preserve current accepted behavior while giving future work a focused convergence path?
- Should this be an OpenSpec change instead of guidance prose?

---

## Related Guidance

- [Guidelines Index](README.md) — guidance suite index and reading order.
- [Evolution Direction: Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) — Dijkstra's original context, precise bounded semantic levels, and the reflection to apply before introducing a new concept.
- [Evolution Direction: Simple Reliable Control](evolution-simple-reliable-control.md) — short decision chains, direct Source-of-Record checks, root-cause short-circuiting, and quality-control complexity limits.
- [Evolution Direction: Helper-Oriented Agent](evolution-helper-oriented-agent.md) — user decision, Agent execution, Engine authority, and minimal escalation boundaries.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — directory and authority boundary for read-only framework assets versus mutable runtime bundles.
- [Logging Conventions](logging-conventions.md) — runtime continuity, trace/log authority boundaries, and diagnostic log usage.
- [Command Experiments](command-experiments.md) — target guidance for durable command experiment shape and boundaries.
- [Agentic Execution Model](agentic-execution-model.md) — unified execution model and terminology canon; defines Chain, Queue, and Work Units.
- [Agentic Workflow Mechanism](agentic-workflow-mechanism.md) — Tier 1 (Chain): phase-to-phase routing and Three-Authority Architecture.
- [Agentic Queue Mechanism](agentic-queue-mechanism.md) — Tier 2 (Queue): within-phase task execution; queue engine (AGQ-001~006) is implemented runtime, and seed-topics/wave0/wave1/wave2 queue integrations are accepted/current.
- [Agentic Subagent Mechanism](agentic-subagent-mechanism.md) — mechanism guidance for work-unit-mediated Sub-agent execution and noise-isolation principles.
