# Workflow Directory Contract

> req: WDC-001, WDC-002, WDC-003, WDC-004, WDC-005, WDC-006, WDC-007, WDC-008, WDC-009, WDC-010, WDC-011

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

Active `dpt_rb_*` run bundles SHALL contain canonical control files and data directories for runtime truth. Production delegated work SHALL use `_work_units/` as the work-unit runtime directory tree. `_work_units/_index.json` SHALL be Engine-owned allocation and attempt-state truth, while submitted delegated output coverage SHALL remain in bundle-root `rb_output_declarations.jsonl`.

#### Scenario: work-units directory is part of delegated runtime structure

- **WHEN** a bundle has executed delegated work-unit claim for a wave
- **THEN** `_work_units/waveN/{work_id}/` SHALL contain the claimed work-unit envelope
- **AND** `_work_units/_index.json` SHALL contain the corresponding allocation record

#### Scenario: runtime truth is in bundle not chat memory

- **WHEN** an Agent needs to recover current run state
- **THEN** the Agent MUST reload active bundle control files and work-unit state
- **AND** it MUST NOT rely on chat memory or console summary as runtime state

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

Framework artifact types SHALL NOT be mixed into each other's directories.

The anti-mixing rules SHALL include:

- Gate definition JSON MUST NOT be placed in `DPT_FRAMEWORK/workflows/nodes/` or `dpt_rb_*`.
- Phase/shared node Markdown MUST NOT be placed in `_backlog/workflow/` as a runtime surface.
- Experiment playbooks MUST NOT be treated as production workflow nodes.
- `DPT_FRAMEWORK/command_playbook/` contains Agent-facing command instructions and diagnostic/maintenance playbooks; it MUST NOT contain lifecycle phase nodes and MUST NOT be described as a human or operator co-runner surface for autonomous pipeline execution.
- Runtime state, gate result, trace, and repair attempt data MUST NOT be written back to `DPT_FRAMEWORK/`.
- `_cache/` projections MUST NOT be treated as runtime truth.
- Fake evidence, fake receipts, and fake trace MUST NOT appear in any directory.

#### Scenario: Command playbook is not a lifecycle node

- **WHEN** docs describe `DPT_FRAMEWORK/command_playbook/`
- **THEN** they SHALL describe it as Agent-facing command guidance or diagnostic/maintenance playbooks
- **AND** they SHALL NOT describe it as operator and Agent co-runner instructions for normal autonomous lifecycle execution
- **AND** lifecycle phase nodes SHALL remain under `DPT_FRAMEWORK/workflows/nodes/phases/`

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

### Requirement: Command playbooks are Agent-facing command instructions

`DPT_FRAMEWORK/command_playbook/` SHALL be described as containing Agent-facing command instructions and diagnostic/maintenance playbooks, not as instructions for a human or operator co-runner inside the autonomous pipeline.

Framework directory docs SHALL NOT use unqualified `Agent/operator` or equivalent slash wording to describe the command-playbook audience. Operator or maintainer wording MAY appear only when clearly scoped to post-run inspection, diagnostics, repository maintenance, or out-of-band review, and not to running lifecycle commands mid-pipeline.

#### Scenario: Command playbook audience is Agent-facing

- **WHEN** framework docs describe `DPT_FRAMEWORK/command_playbook/`
- **THEN** they SHALL identify the directory as Agent-readable or Agent-facing command guidance
- **AND** they SHALL NOT identify operator as a co-runner audience for autonomous pipeline execution

#### Scenario: Diagnostic operator wording is allowed

- **WHEN** a command playbook describes post-run forensics, diagnostic inspection, or maintainer review
- **THEN** operator wording MAY appear if it is explicitly out-of-band
- **AND** the wording SHALL NOT imply the operator runs normal lifecycle commands during `stop: no` execution

