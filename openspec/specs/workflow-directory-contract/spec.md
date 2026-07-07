# Workflow Directory Contract

> req: WDC-001, WDC-002, WDC-003, WDC-004, WDC-005, WDC-006, WDC-007, WDC-008, WDC-009, WDC-010, WDC-011

## Purpose

定义 Workflow Foundation 所有 artifact 的目录归属、命名约定、runtime coordinate vocabulary、active runtime bundle root 和禁止混放规则。该能力固定两条边界：`DPT_FRAMEWORK/` 是可复用 read-only framework assets；当前 run 或实验的 runtime truth 只存在于明确选中的 active bundle root（production `dpt_rb_*` 或 disposable `dpt_disp_*`）。

Active bundle root 是所有裸 runtime path 的解析锚点。Specs、workflow nodes、playbooks 或 prompts 中出现的 `rb_queue.json`、`rb_trace.jsonl`、`reference/`、`artifacts/`、`_cache/`、`_logs/`、`final/`、`_work_units/...` 等 runtime path，除非显式写成 `DPT_FRAMEWORK/...`，都必须理解为 active bundle-root relative，而不是 repo-root 或 framework-relative。
## Requirements
### Requirement: Read-only framework assets boundary

`DPT_FRAMEWORK/` SHALL 是 read-only framework assets 目录。运行中发生的用户输入、gate attempt、pass/fail、repair、waiting/block、trace event、artifact、final output MUST 只写入 active bundle root，MUST NOT 写回 `DPT_FRAMEWORK/`。

#### Scenario: Gate result written to correct location

- **WHEN** gate CLI 返回 pass/fail/inspect/advice
- **THEN** gate result 记录在 active bundle root 的 `rb_trace.jsonl` 和/或 `rb_status.json` 中，MUST NOT 写入 `DPT_FRAMEWORK/schema/gate_definitions/`

#### Scenario: Multiple bundles share one framework

- **WHEN** 存在两个或以上 `dpt_rb_*` 或 `dpt_disp_*` runtime bundle
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

Active runtime bundles SHALL contain canonical control files and data directories for runtime truth. Production runs use `dpt_rb_*`; disposable experiments use `dpt_disp_*`.

The active runtime bundle root (short form: active bundle root) SHALL be the single mutable runtime directory selected for the current run, command invocation, or controlled experiment. For production it SHALL be the active `dpt_rb_*` directory; for controlled experiments it SHALL be the active `dpt_disp_*` directory. The active bundle root owns runtime truth for that invocation.

Current specs, framework docs, workflow nodes, bundle templates, and Agent-facing playbooks SHALL use this coordinate vocabulary:

- `repo_command_root`: the repository root used to invoke framework commands. It may contain `DPT_FRAMEWORK/` and many runtime bundles, but it is not runtime truth.
- `framework_root`: the `DPT_FRAMEWORK/` reusable framework asset root. It contains schemas, CLIs, engines, workflow nodes, templates, and command playbooks; it is read-only during workflow execution.
- `active_bundle_root`: the selected `dpt_rb_*` or `dpt_disp_*` runtime bundle root. It is the only root for mutable runtime truth.

For CLI operations, the active runtime bundle root SHALL be the explicit bundle path argument such as `--bundle <path>` or an equivalent positional bundle path. For Agent-facing Markdown flows, it SHALL be the bundle directory named by the run entry, playbook setup, or current task card. When multiple `dpt_rb_*` or `dpt_disp_*` directories exist, every runtime read/write SHALL resolve against the selected active bundle root for that step.

The active runtime bundle root SHALL NOT be inferred from repository root, `DPT_FRAMEWORK/`, chat memory, process working directory, shell state, or whichever bundle was mentioned earlier in conversation.

Unless a path is explicitly rooted in `DPT_FRAMEWORK/`, runtime paths in accepted specs and Agent-facing guidance SHALL be read as relative to the active runtime bundle root, not the repository root and not `DPT_FRAMEWORK/`. This includes bare paths such as `rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, `reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, and `_work_units/...`.

Bundle-root runtime surfaces include `START_FROM_HERE.md`, `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, and `_work_units/`. Production delegated work SHALL use bundle-root `_work_units/` as the work-unit runtime directory tree. Bundle-root `_work_units/_index.json` SHALL be Engine-owned allocation and attempt-state truth, while submitted delegated output coverage SHALL remain in bundle-root `rb_output_declarations.jsonl`.

Runtime choices and runtime data SHALL be persisted in the active runtime bundle. Framework definitions, schemas, workflow nodes, CLIs, reusable engine code, templates, and command playbooks SHALL remain under `DPT_FRAMEWORK/` and SHALL NOT become per-run storage.

#### Scenario: coordinate vocabulary distinguishes roots

- **WHEN** an Agent reads a spec, workflow node, playbook, or bundle entrypoint that names `repo_command_root`, `framework_root`, and `active_bundle_root`
- **THEN** it SHALL treat `repo_command_root` only as the shell command location
- **AND** it SHALL treat `framework_root` only as reusable read-only framework assets
- **AND** it SHALL treat `active_bundle_root` as the only root for mutable runtime truth

#### Scenario: command root is not runtime root

- **WHEN** an Agent runs `node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim dpt_rb_climate-policy`
- **THEN** the repository root MAY be the process working directory
- **AND** all runtime state written by the command SHALL resolve under `dpt_rb_climate-policy/`
- **AND** no runtime state SHALL be written to `./_work_units/`, `./rb_queue.json`, or other repository-root runtime-looking paths

#### Scenario: work-units directory is part of delegated runtime structure

- **WHEN** a bundle has executed delegated work-unit claim for a wave
- **THEN** bundle-root `_work_units/waveN/{work_id}/` SHALL contain the claimed work-unit envelope
- **AND** bundle-root `_work_units/_index.json` SHALL contain the corresponding allocation record

#### Scenario: active runtime bundle root is explicit

- **WHEN** a CLI receives `--bundle dpt_rb_climate-policy`
- **THEN** `dpt_rb_climate-policy/` SHALL be the active runtime bundle root for that invocation
- **AND** runtime paths such as `rb_queue.json`, `rb_trace.jsonl`, `reference/`, and `_work_units/` SHALL resolve inside that directory

#### Scenario: work-unit path expands under selected bundle

- **WHEN** the selected active runtime bundle root is `dpt_rb_climate-policy/`
- **AND** a spec, playbook, or prompt names `_work_units/wave1/wu-w1-b000-deep-i0001/`
- **THEN** the runtime path SHALL mean `dpt_rb_climate-policy/_work_units/wave1/wu-w1-b000-deep-i0001/`
- **AND** it SHALL NOT mean `./_work_units/wave1/wu-w1-b000-deep-i0001/` at repository root

#### Scenario: runtime paths are bundle-root relative

- **WHEN** an accepted spec or Agent-facing runtime instruction names `reference/`, `artifacts/`, `_cache/`, `_logs/`, `_work_units/`, `rb_queue.json`, `rb_trace.jsonl`, or `rb_output_declarations.jsonl` without a leading framework path
- **THEN** the path SHALL resolve under the active `dpt_rb_*` or `dpt_disp_*` bundle root
- **AND** the Agent SHALL NOT create or read it as a repository-root or `DPT_FRAMEWORK/` runtime path

#### Scenario: bare work-unit path requires active bundle root

- **WHEN** a prompt or playbook gives the Agent `_work_units/wave2/{work_id}/result.json`
- **THEN** the Agent SHALL first identify the active bundle root for that run or experiment
- **AND** it SHALL resolve the file as `<active-bundle-root>/_work_units/wave2/{work_id}/result.json`
- **AND** it SHALL NOT create or inspect `./_work_units/wave2/{work_id}/result.json` at repo root

#### Scenario: framework templates are not active runtime state

- **WHEN** a template, schema, gate definition, workflow node, CLI, command playbook, or reusable engine helper under `DPT_FRAMEWORK/` names a runtime-relative path
- **THEN** that path SHALL be interpreted only after a caller supplies an active runtime bundle root
- **AND** the Agent or Engine SHALL NOT write current run data into the framework template, schema, workflow, CLI, or engine directory

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
| Runtime bundle | `dpt_rb_<english-slug>[_collision]` for production runs; `dpt_disp_<short>_<case>_<hex>` for disposable experiments | `dpt_rb_climate-policy`, `dpt_disp_agq_case42_a` |
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
- Runtime state, runtime choices, gate result, trace, work-unit attempt data, receipts, artifacts, logs, cache projections, and repair attempt data MUST NOT be written back to `DPT_FRAMEWORK/`.
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
