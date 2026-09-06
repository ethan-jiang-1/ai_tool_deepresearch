# Context

> Role: mandatory vocabulary orientation for repository work. This file is not a behavior specification, executable contract, Gate verdict, or runtime projection.

## Terminology Sources and Authority Boundary

Read this after the [Project Charter](openspec/constitution/project-charter.md)
to align the vocabulary used by repository instructions. It is a
non-authoritative vocabulary-alignment surface: normal instruction discovery and
the task-specific authoritative source still decide the work.

| Need | Canonical owner |
|---|---|
| Project boundary and ordered design review | [Project Charter](openspec/constitution/project-charter.md) and its constitutional companions |
| Next guidance role | [OpenSpec Control Map](openspec/README.md) |
| Complete execution vocabulary | [Agentic Execution Model](openspec/guidance/models/agentic-execution-model.md) |
| Framework assets versus mutable run state | [Framework Runtime Boundary](openspec/guidance/models/framework-runtime-boundary.md) |
| Durable architecture rationale | [ADR 0001](docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md), [ADR 0002](docs/adr/0002-name-the-reusable-surface-deep-research-harness.md), [ADR 0003](docs/adr/0003-retire-legacy-harness-source-alias.md), [ADR 0004](docs/adr/0004-keep-capability-catalog-reuse-first-and-non-authoritative.md), and [ADR 0005](docs/adr/0005-use-two-level-capability-paths-as-canonical-identity.md) |
| Current behavior or machine fact | the selected accepted/executable contract or selected current run bundle |

`CONTEXT.md` does not itself grant authority, capability, permission, liveness,
or evidence. It does not replace a selected accepted spec, CLI result, or
runtime record. There is deliberately no `DEEP_RESEARCH_HARNESS/CONTEXT.md`.

## Project Orientation

- **Deep Research Tool project** is the repository and engineering effort.
- **Deep Research Harness** is the reusable framework that turns a broad
  research question into an evidence-backed, gated report.
- **`DEEP_RESEARCH_HARNESS/`** is the framework source directory, not a run.
- **Run bundle** is the durable package for one bounded research engagement.
- **Current run bundle root** is the explicit absolute root selected for the
  present run, CLI invocation, task card, or experiment. It is never inferred
  from chat, cwd, recency, or filesystem order.

运行时三坐标(compact 版;完整定义见 `DEEP_RESEARCH_HARNESS/README.md`「运行时边界」):

| 坐标 | Compact distinction |
|---|---|
| `repo_command_root` | 执行 `node DEEP_RESEARCH_HARNESS/...` 的仓库根，只是命令位置 |
| `framework_root` | `DEEP_RESEARCH_HARNESS/`，只读 reusable Harness assets |
| `current_run_bundle_root` | 本次操作显式选中的 `dpt_rb_*` / `dpt_disp_*`，唯一 runtime truth 根 |

## Core Ownership Terms

| Term | Compact distinction |
|---|---|
| **LLM Agent** | supplies semantic judgment, research, writing, and feedback-driven repair; not deterministic runtime authority |
| **Phase Agent** | the LLM Agent's temporary phase-level role; not a permanent identity |
| **Sub-agent** | a bounded LLM Agent assigned one work unit; no workflow authority |
| **Markdown control surface** | Agent-readable work, constraints, and deterministic feedback; not machine truth |
| **Engine** | deterministic schema/checkpoint/receipt/trace authority; not a research or semantic judge |
| **Runtime truth** | durable current facts under the selected current run bundle root; not chat memory or reusable assets |
| **Source of Record** | the one owner for a class of facts; not a projection or an automatic permission grant |
| **Gate** | Engine checkpoint that permits a legal transition only when accepted checks pass; not a research phase or workflow controller. Gate 一词有五面含义（transition 表 / definition JSON / engine / CLI wrapper / runtime status），完整五面表见 `openspec/guidance/models/framework-runtime-boundary.md`「Gate Boundary」节。注意区分：工作单元恢复语境的「五反馈面」（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）是另一概念，owner 见 `DEEP_RESEARCH_HARNESS/RUN.md` 决策表 |
| **Check / Inspect / Advice** | deterministic pass/fail, diagnosis, and bounded next-step feedback; none repairs or grants permission by itself |
| **`repair_kind`（gate/phase 门禁面）** | phase §7 门禁反馈主面的责任归属载体：gate/inspect 结构化反馈的 `hints[]`（gate 定义内 finding 为 `repair.kind`）标明责任主体 `repair_kind` ∈ {`agent_action` / `engine_operation` / `user_decision` / `external_action` / `missing_contract`}（`GATE_REPAIR_KINDS`）；明确告知谁来处置门禁未通过 |
| **`attempt_disposition` / `recovery_action`（work-unit 恢复面）** | 五个工作单元反馈面（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）统一发出 `attempt_disposition` + `next`；载体字段为 `next.recovery_action`（如 `wait` / `recover-transaction` / `supersede` / `missing_contract` 等），完整词汇与 CLI 动词映射以 `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` 导出 + `DEEP_RESEARCH_HARNESS/RUN.md` 决策表为准 |
| **`repair_directive`（file-observability 面）** | 由 `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` 发射：`materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`；owner 为该文件。与 gate/phase 面、work-unit 面的 `repair_kind` 显式区分（字段名不同），使用时以各自 owner surface 为准 |
| **ResearchConfigLock（研究风格锁定契约）** | HITL1/rerun 的 freshness checkpoint，授权 `research_style_params` 写入；owner `openspec/specs/research/research-styles/spec.md` |
| **TopicTreeEvolution（课题大纲演进管线）** | post-final rerun 阶段既有的 mutation/gate pipeline（canonical topic mutation、style CLI、rerun_count 推进）；owner `openspec/specs/research/post-final-recovery/spec.md` |
| **ReopenResearchPass（终态重开通行证）** | Final 之后 evidence-expanding reentry 的 accepted event/lineage，post-final recovery 所有权与资格判定的依据；owner `openspec/specs/research/post-final-recovery/spec.md` + `openspec/specs/research/content-delivery-phase-content/spec.md` |
| **StateHealthCheck（状态健康巡检）** | 系统崩溃与文件观测自愈基础；owner `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` |

> 全仓库核心机制与代号定义按 owner spec 用法归纳，具体判定以 owner spec 为准。

### 术语罗塞塔石碑：反馈面与枚举速查 (Rosetta Stone: Feedback Surfaces & Enums)

**字段名分诊（先归类，再行动）**：遇到任何 `repair*` / 恢复类字段，先按**字段名**归类，不要按语义猜——

| 字段 | 出现位置 | 语义归属 | 回答的问题 | owner / 可执行枚举源 |
|---|---|---|---|---|
| `repair_kind` | gate/phase `hints[]` 与 finding `repair.kind` | Gate/Phase 门禁面 | Who 处置这次门禁未通过 | `DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` 的 `GATE_REPAIR_KINDS` |
| `recovery_action`（载体 `next.recovery_action`） | work-unit 五反馈面 | Work-Unit 恢复面 | What to run（恢复动作 / CLI 动词） | `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` |
| `repair_directive` | file-observability finding | File-Observability 面 | 文件观测如何自愈 | `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` 的 `FILE_REPAIR_DIRECTIVES` |

三个字段名不同是**故意的物理隔离**；把一个面的字段名或值集用到另一个面是缺陷。本表只做字段名归类与 owner 指路，值集与完整契约以下方速查表和各 owner surface 为准。

| 反馈面 (Surface) | 载体字段 (Field) | 闭合枚举 (Closed Enum) | 权威源 (Source of Record) | 语义归属与核心用途 |
|---|---|---|---|---|
| **Gate / Phase 门禁面** | `repair_kind`（`hints[]` / finding `repair.kind`） | `agent_action`, `engine_operation`, `user_decision`, `external_action`, `missing_contract` | `openspec/specs/engine/check-inspect-feedback/spec.md`（语义）+ `DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` `GATE_REPAIR_KINDS`（可执行枚举） | 责任主体划分（归 Agent、Engine 还是 User 处置，回答 Who） |
| **Work-Unit 恢复面** | `next.recovery_action` | `wait`, `recover-transaction`, `recover-declaration`, `supersede`, `missing_contract` 等 | `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` | 工作单元具体恢复动作（直接映射 CLI 动词，回答 What to run） |
| **File-Observability 面** | `repair_directive` | `materialize_canonical_surface`, `reconcile_topic_identity`, `repair_topic_reference` 等 | `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` | 文件观测与规范主题自愈指令（字段名不同，物理隔离） |

### 核心检查点与生命周期命名速查 (Rosetta Stone: Checkpoint & Lifecycle Concepts)

| 领域概念 / 契约 | 类别 (Category) | 触发/生效阶段 | 核心语义与授权契约 | 权威所有者规范 (Owner Spec) |
|---|---|---|---|---|
| **HITL1** | Checkpoint / Interactive | Instantiation 与 Setup 之间 | 初始立项对齐：Agent 提供推荐，用户确认方向、profile 与探测结果 | `openspec/specs/research/pre-research-phase-content/spec.md`<br>`openspec/specs/agent/hitl-ux/spec.md` |
| **HITL2** | Checkpoint / Interactive | Wave2 与 Readiness 之间 | 阶段产出审阅：Agent 总结研究全貌，用户决定交付或合法重跑 | `openspec/specs/research/research-wave-phase-content/spec.md` |
| **Final** | Terminal Delivery | 最终交付阶段 | 终态报告交付：交付后在 Final 原地接受呈现反馈；呈现修订以 CAS 更新当前 latest 字节、版本号不变，证据扩张走新版本；不是第三个 Checkpoint | `openspec/specs/research/content-delivery-phase-content/spec.md` |
| **ResearchConfigLock** | Freshness Checkpoint | HITL1 与 Rerun 阶段 | 授权将用户确认的 `research_style_params` 写入 Bundle 配置 | `openspec/specs/research/research-styles/spec.md` |
| **TopicTreeEvolution** | Mutation Pipeline | Post-Final Rerun 阶段 | Post-Final 重跑时的变更/门控管线（包含规范化主题突变、Style CLI 调优与 `rerun_count` 推进） | `openspec/specs/research/post-final-recovery/spec.md` |
| **ReopenResearchPass** | Lineage / Reentry Event | Final 交付之后 | 证据扩张型重入的准入血统凭证，用于在 Final 之后合法重开新一轮研究 | `openspec/specs/research/post-final-recovery/spec.md`<br>`openspec/specs/research/content-delivery-phase-content/spec.md` |
| **StateHealthCheck** | Recovery Observability | 异常/崩溃恢复阶段 | 系统异常时扫描文件树与规范化主题一致性，指导自愈 | `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` |

## Execution Distinctions

- **Chain** routes phases after an accepted Gate result. It does not inspect a
  Queue or allocate work.
- **Queue** tracks phase-local demand. It is not a research planner or a Work
  Unit.
- **Queue demand item** names work needed in a phase; **Work unit** names one
  Engine-allocated delegated attempt. Their identities are different.
- **Submit** is the Engine transaction that accepts a Work Unit result and
  creates its submitted ledger row. Writing a file alone is not Submit.
- A **Gate verdict** does not itself select the next Chain phase, load a phase,
  or choose semantic repair. The accepted transition authority and Agent flow
  handle those separate responsibilities.

For complete Phase Agent, Sub-agent, Queue demand item, Work unit, and Submit
vocabulary, read the [Agentic Execution Model](openspec/guidance/models/agentic-execution-model.md)
and then the focused mechanism model selected by the control map.

## Working Boundary

Use this context to avoid category errors, then stop. For capability behavior,
read the applicable accepted spec (start at the [OpenSpec Control Map](openspec/README.md),
then the [spec catalog](openspec/specs/README.md)); for deterministic facts, inspect the
executable contract or selected run bundle; for a procedure, read its operation
guide. Do not turn this orientation into a second glossary or a cached copy of
current behavior.
