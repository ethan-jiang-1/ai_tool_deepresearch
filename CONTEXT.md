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
| Durable architecture rationale | [ADR 0001](docs/adr/0001-keep-agent-flow-markdown-driven-and-engine-gated.md), [ADR 0002](docs/adr/0002-name-the-reusable-surface-deep-research-harness.md), and [ADR 0003](docs/adr/0003-retire-legacy-harness-source-alias.md) |
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
| **Gate** | Engine checkpoint that permits a legal transition only when accepted checks pass; not a research phase or workflow controller。Gate 一词有五面含义（transition 表 / definition JSON / engine / CLI wrapper / runtime status），完整五面表见 `openspec/guidance/models/framework-runtime-boundary.md`「Gate Boundary」节。注意区分：工作单元恢复语境的「五反馈面」（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）是另一概念，owner 见 `DEEP_RESEARCH_HARNESS/RUN.md` 决策表 |
| **Check / Inspect / Advice** | deterministic pass/fail, diagnosis, and bounded next-step feedback; none repairs or grants permission by itself |
| **`hints[]` / `repair_kind`（gate/phase 反馈面）** | phase §7 反馈主面的 closed-enum 载体：`hints[]` 带一个直接 repair/owner 边界；`repair_kind` ∈ {`agent_action` / `engine_operation` / `user_decision` / `external_action` / `missing_contract`}；反馈形状以所属 accepted spec / model 为准，此处只做术语对齐 |
| **`attempt_disposition` / `repair_kind`（work-unit 反馈面）** | 五个工作单元反馈面（submit 拒绝 / late-submit 拒绝 / transaction 阻塞 / dry-submit / inspect）统一发出 `attempt_disposition` + `next`；此面 `repair_kind` 是另一套枚举（如 `wait` / `recover-transaction` / `supersede` / `missing_contract` 等），完整词汇与 CLI 动词映射以 `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` 导出 + `DEEP_RESEARCH_HARNESS/RUN.md` 决策表 + `tests/engine/work-unit-recovery-decision-table.test.mjs` 为准。与 gate/phase 面的 `repair_kind` 同名不同枚举 |
| **`repair_directive`（file-observability 面）** | 由 `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` 发射：`materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`；owner 为该文件。与 gate/phase 面、work-unit 面的 `repair_kind` 显式区分（字段名不同），使用时以各自 owner surface 为准 |
| **C2（checkpoint 代号）** | HITL1/rerun 的 freshness checkpoint，授权 `research_style_params` 写入；owner `openspec/specs/research/research-styles/spec.md` |
| **C3（pipeline 代号）** | post-final rerun 阶段既有的 mutation/gate pipeline（canonical topic mutation、style CLI、rerun_count 推进）；owner `openspec/specs/research/post-final-recovery/spec.md` |
| **C5（event/lineage 代号）** | Final 之后 evidence-expanding reentry 的 accepted event/lineage，post-final recovery 所有权与资格判定的依据；owner `openspec/specs/research/post-final-recovery/spec.md` + `openspec/specs/research/content-delivery-phase-content/spec.md` |

> C2/C3/C5 全仓库无单一展开定义，上表为按 owner spec 用法归纳的 compact distinction；具体判定以 owner spec 为准。

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
