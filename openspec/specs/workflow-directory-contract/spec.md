# Workflow Directory Contract

> req: WDC-001, WDC-002, WDC-003, WDC-004, WDC-005, WDC-006, WDC-007, WDC-008, WDC-009, WDC-010

## Purpose

定义 Workflow Foundation 所有 artifact 的目录归属、命名约定和禁止混放规则。为后续 wff change（contract skeleton、content migration 等）提供无歧义的文件落点，消除需求/runtime/实验/CLI/schema 混放的问题。

## Requirements

### Requirement: Read-only framework assets boundary

`DPT_FRAMEWORK/` SHALL 是 read-only framework assets 目录。运行中发生的用户输入、gate attempt、pass/fail、repair、waiting/block、trace event、artifact、final output MUST 只写入 active `dpt_rb_*` run bundle，MUST NOT 写回 `DPT_FRAMEWORK/`。

#### Scenario: Gate result written to correct location

- **WHEN** gate CLI 返回 pass/fail/inspect/advice
- **THEN** gate result 记录在 active bundle 的 `rb_trace.jsonl` 和/或 `rb_status.json` 中，MUST NOT 写入 `DPT_FRAMEWORK/schema/gate_definitions/`

#### Scenario: Multiple bundles share one framework

- **WHEN** 存在两个或以上 active `dpt_rb_*` run bundle
- **THEN** 所有 bundle 通过相对路径引用同一套 `DPT_FRAMEWORK/`，各自独立持有 runtime state，互不污染

### Requirement: Workflow node directory structure

Workflow nodes SHALL 放置在 `DPT_FRAMEWORK/workflows/nodes/` 下，分两个子目录：

- `phases/` — phase node，agent 按 phase 顺序执行，完成后运行 gate
- `shared/` — shared node，提供多个 phase 复用的 Agent-readable context

Phase manifest 或等价 lifecycle map SHALL 放置在 `DPT_FRAMEWORK/workflows/manifest.json`。

#### Scenario: Phase node location

- **WHEN** agent 需要加载当前 phase 的指令
- **THEN** phase node MUST 位于 `DPT_FRAMEWORK/workflows/nodes/phases/phase-<phase>.md`

#### Scenario: Shared node location

- **WHEN** agent 需要加载 shared context（如 profile 说明、gate 摘要）
- **THEN** shared node MUST 位于 `DPT_FRAMEWORK/workflows/nodes/shared/shared-<scope>.md`

#### Scenario: Shared node is not a hidden phase

- **WHEN** 一个 Markdown 文件位于 `shared/` 子目录下
- **THEN** 该文件 SHALL NOT 声明 `phase`、`gate`、`next` 或 `stop` 字段，SHALL NOT 改变 phase order

### Requirement: Gate artifacts location and shape

Gate definition JSON files SHALL 放置在 `DPT_FRAMEWORK/schema/gate_definitions/`，命名 `gate-<gate-name-kebab>.definition.json`。Gate definition SHALL 是 read-only deterministic rule source，属于 framework definition，NOT 被复制进每个 `dpt_rb_*`。

Gate CLI SHALL 放置在 `DPT_FRAMEWORK/cli/gates/`，命名 `check-gate-<gate-name-kebab>.mjs`。每个 gate 对应一个外部 CLI wrapper。CLI SHALL 显式接收 active bundle path（`--bundle` 或等价 flag），不能假设当前工作目录即为目标 bundle。

Gate engine（loader、evaluator）SHALL 放置在 `DPT_FRAMEWORK/engine/gates/` when a per-gate engine module exists。共享 helper SHALL 放置在 `DPT_FRAMEWORK/engine/helpers/`。

Current gate transition-table contract SHALL be represented by `DPT_FRAMEWORK/schema/contracts/gate.mjs`. Gate definition JSON files remain read-only rule sources under `DPT_FRAMEWORK/schema/gate_definitions/` and are loaded by the gate helper / per-gate CLI pipeline; no `gate-definition.mjs` executable contract is part of the current accepted runtime surface.

> Apply note: this retires stale accepted prose about a non-existent `gate-definition.mjs` Zod contract. It is not a rename from a gate-definition schema to `gate.mjs`; `gate.mjs` is the current transition-table contract, while gate definition rule data remains JSON under `schema/gate_definitions/`.

#### Scenario: Gate definition is framework asset not bundle copy

- **WHEN** `dpt_rb_*` 被实例化
- **THEN** gate definition JSON MUST NOT 被复制进 bundle；gate CLI 从 `DPT_FRAMEWORK/` 读取 definition，以 `--bundle` 参数指定检查目标

#### Scenario: One gate per CLI

- **WHEN** agent 需要运行某个 gate
- **THEN** agent MUST 调用独立的 `check-gate-<name>.mjs`，MUST NOT 通过统一入口加 subcommand 区分 gate

#### Scenario: Gate CLI requires bundle path

- **WHEN** gate CLI 被调用时未提供 `--bundle` 参数
- **THEN** CLI SHALL 报错退出，MUST NOT 假设默认 bundle 或扫描目录

### Requirement: Runtime bundle canonical structure

Active `dpt_rb_*` run bundle 的初始模板 SHALL 放置在 `DPT_FRAMEWORK/rb_templates/`。实例化时从模板 copy 到新 bundle，模板本身 MUST NOT 被直接修改。

Active `dpt_rb_*` run bundle SHALL 包含以下 canonical control files 和 data directories：

Control files:
- `rb_plan.md` — 本 run 的 plan/topic registry
- `rb_profile.yaml` — HITL1/HITL2 用户输入、profile、decision、retry config
- `rb_status.json` — 当前 workflow/phase/gate 状态摘要
- `rb_queue.json` — runtime queue state
- `rb_trace.jsonl` — append-only runtime history/audit trail

Data directories:
- `seed_topics/` — initial topic / seed-topic data
- `reference/` — 本地 evidence
- `artifacts/` — 阶段产物（如 `wave1/`、`wave2/`）
- `final/` — 最终报告

Relay directory:
- `_subagents/` — relay-managed sub-agent slot tree (`wave_NN/slot_MM/` per SDC-001 / SUS-001); created on first relay staging, not necessarily present in the empty template

Cache directory:
- `_cache/` — 可重建 cache/projection，NOT runtime truth

#### Scenario: `_subagents/` is part of the bundle skeleton

- **WHEN** a bundle has executed relay staging for a wave
- **THEN** `_subagents/wave_NN/` SHALL exist with `dispatch.json` and per-slot directories under `slot_MM/`
- **AND** provenance forensics and slot presence checks SHALL scan only this tree for relay slot artifacts (SDC-002)

#### Scenario: Runtime truth is in bundle not chat memory

- **WHEN** agent 需要恢复当前 run 状态
- **THEN** agent MUST 从 active `dpt_rb_*` 的 control files reload，MUST NOT 依赖 chat memory 或 console summary 作为 state

#### Scenario: Cache is not authority

- **WHEN** `_cache/` 内容与 canonical control files 冲突
- **THEN** canonical control files 的值为 authoritative truth

### Requirement: Test and experiment boundary

Regression tests（unit + integration）SHALL 放置在 `tests/` 下，目录映射 framework 结构（`tests/engine/` ↔ `DPT_FRAMEWORK/engine/`）。

Agent-driven controlled E2E experiments SHALL 放置在 `experiments_playbook/exp_workflow-foundation/` 下。

`DPT_FRAMEWORK/` 内部 SHALL NOT 放置测试文件、experiment fixtures 或 playbook。

#### Scenario: Regression test location

- **WHEN** 需要测试 gate evaluator 的 deterministic behavior
- **THEN** test 文件 MUST 位于 `tests/engine/gates/`（对应 `DPT_FRAMEWORK/engine/gates/`）

#### Scenario: Agent-driven E2E is not a regression test

- **WHEN** 需要证明 agent 能读取 Markdown node、执行动作、读取 CLI feedback 并 repair
- **THEN** 验证 MUST 使用 `experiments_playbook/exp_workflow-foundation/` 下的 playbook，MUST NOT 放在 `tests/`

### Requirement: Naming conventions

所有 workflow foundation artifact SHALL 遵循以下命名约定：

| Artifact | Naming | Example |
|----------|--------|---------|
| Phase node | `phase-<phase>.md` | `phase-wave0.md` |
| Shared node | `shared-<scope>.md` | `shared-profile.md` |
| Gate definition JSON | `gate-<gate-name-kebab>.definition.json` | `gate-wave0-complete.definition.json` |
| Gate CLI | `check-gate-<gate-name-kebab>.mjs` | `check-gate-wave0-complete.mjs` |
| Runtime bundle | `dpt_rb_<english-slug>[_collision]` | `dpt_rb_climate-policy` |
| Experiment family | `experiments_playbook/exp_<component>/` | `experiments_playbook/exp_workflow-foundation/` |

#### Scenario: Consistent gate naming

- **WHEN** reviewer 需要找到 `wave0_complete` gate 的所有相关文件
- **THEN** gate definition JSON MUST 在 `gate-wave0-complete.definition.json`，gate CLI MUST 在 `check-gate-wave0-complete.mjs`

### Requirement: Anti-mixing rules

以下 artifact 类型 SHALL NOT 混入对方目录：

- Gate definition JSON MUST NOT 放入 `DPT_FRAMEWORK/workflows/nodes/` 或 `dpt_rb_*`
- Phase/shared node MUST NOT 放入 `_backlog/workflow/` 当 runtime surface
- Experiment playbook MUST NOT 被当成 production workflow node
- `DPT_FRAMEWORK/command_playbook/` 放 operator/Agent 命令说明，MUST NOT 放入 lifecycle phase node
- Runtime state、gate result、trace、repair attempt MUST NOT 写回 `DPT_FRAMEWORK/`
- `_cache/` projection MUST NOT 被当成 runtime truth
- Fake evidence、fake receipt、fake trace MUST NOT 出现在任何目录

#### Scenario: Gate definition stays in schema directory

- **WHEN** 新增一个 gate definition
- **THEN** file MUST 位于 `DPT_FRAMEWORK/schema/gate_definitions/`，MUST NOT 位于 `DPT_FRAMEWORK/workflows/nodes/`

#### Scenario: Experiment is not production

- **WHEN** experiment 需要加载一个 Markdown node
- **THEN** 它 MUST 使用位于 `experiments_playbook/` 的 playbook node 或 disposable bundle 中的 node copy，MUST NOT 修改 `DPT_FRAMEWORK/workflows/nodes/` 中的 production node

### Requirement: Single canonical workflow package

v1 阶段 SHALL 只有一个 canonical Deep Research workflow package，使用 `DPT_FRAMEWORK/workflows/manifest.json`。SHALL NOT 引入 `workflows/<workflow-name>/` namespace。

此决策 SHALL NOT 限制 run bundle 数量：同一套 `DPT_FRAMEWORK/` MUST 能服务多个互相隔离的 `dpt_rb_*` run bundle。

#### Scenario: Multiple run bundles share one workflow package

- **WHEN** 同时存在 `dpt_rb_project-a` 和 `dpt_rb_project-b` 两个 active run bundle
- **THEN** 两个 bundle MUST 引用同一套 `DPT_FRAMEWORK/workflows/` 中的 phase/shared node，各自维护独立的 runtime state

### Requirement: Manifest includes rerun phase entry

`DPT_FRAMEWORK/workflows/manifest.json` SHALL include a `rerun` phase entry in its `phases` array:

```json
{ "key": "rerun", "node": "phases/phase-rerun.md", "gate": "rerun-ready" }
```

The rerun phase SHALL be registered as a phase node with its corresponding gate. Its position in the manifest array SHALL NOT imply linear runtime order — the manifest is an inventory, not a routing table.

#### Scenario: Manifest lists rerun phase

- **WHEN** a workflow consistency validator scans manifest.json
- **THEN** it SHALL find `rerun` among the registered phase keys with node `phases/phase-rerun.md` and gate `rerun-ready`

#### Scenario: Rerun node file exists

- **WHEN** manifest references `phases/phase-rerun.md`
- **THEN** the file SHALL exist at `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md`

