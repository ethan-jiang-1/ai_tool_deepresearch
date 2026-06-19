## Why

Workflow Foundation 需要创建 14 个 phase/shared node、8 个 gate definition JSON、8 个 gate CLI wrapper、phase manifest、regression tests 和 controlled E2E playbook——共 ~50 个文件落在 `DPT_FRAMEWORK/`、`tests/`、`experiments_playbook/` 三个根目录下。如果不先定清每个 artifact 的目录归属，后续实现会在每个 change 里重新争夺 authority：需求文档混进 framework、gate definition 混进 workflow node 目录、runtime state 写回 read-only framework、实验 playbook 被当成 production workflow node。

这个 change 只做一件事：建立 Workflow Foundation 所有 artifact 的目录 contract，一次说清楚什么放在哪、什么名字、什么不能混放，为后续 5 个 wff content change 提供无歧义的落点。

## What Changes

- 新增目录 contract，定义 `DPT_FRAMEWORK/workflows/`、`DPT_FRAMEWORK/schema/gate_definitions/`、`DPT_FRAMEWORK/engine/gates/`、`DPT_FRAMEWORK/cli/gates/`、`tests/`、`experiments_playbook/` 和 `dpt_rb_*` run bundle 的边界和命名规则
- 确立 artifact routing rules：哪些 artifact 只能放在哪个目录，哪些目录之间禁止混放
- 明确 `DPT_FRAMEWORK/` = read-only framework assets vs `dpt_rb_*/` = mutable runtime truth 的边界
- 明确 v1 只有一个 canonical workflow package（`DPT_FRAMEWORK/workflows/manifest.json`），不引入多 workflow namespace，但同一套 framework 必须服务多个互相隔离的 `dpt_rb_*`
- 所有 gate CLI 必须显式接收 active bundle path（`--bundle` 或等价 flag），确保一套 framework 服务多个 run bundle

## Capabilities

### New Capabilities

- `workflow-directory-contract`: Workflow Foundation 的目录归属规则——定义哪些 artifact 落在 `DPT_FRAMEWORK/` 的哪个子目录、哪些落在 `tests/`、哪些落在 `experiments_playbook/`、哪些属于 active `dpt_rb_*` run bundle。包含命名约定（`phase-<phase>.md`、`shared-<scope>.md`、`check-gate-<name>.mjs`、`gate-<name>.definition.json`）、禁止混放规则、以及 framework assets vs runtime truth 的硬边界。

### Modified Capabilities

<!-- 本 change 不修改现有 capability 的 requirement，只建立后续 wff change 的目录落点 -->
（无）

## Impact

- **受影响的目录**：`DPT_FRAMEWORK/workflows/`、`DPT_FRAMEWORK/schema/gate_definitions/`、`DPT_FRAMEWORK/schema/contracts/`、`DPT_FRAMEWORK/engine/gates/`、`DPT_FRAMEWORK/engine/helpers/`、`DPT_FRAMEWORK/cli/gates/`、`tests/`、`experiments_playbook/`
- **受影响的文档**：可能需要更新 `guidelines/framework-runtime-boundary.md` 以反映新增的 workflow foundation 子目录
- **约束后续 change**：所有后续 wff change（`wff-contract-skeleton` 到 `wff-content-delivery`）的文件落点必须遵守本 contract
- **不产生代码**：本 change 是治理层 artifact，不创建框架代码或 runtime 文件
