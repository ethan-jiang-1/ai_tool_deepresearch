---
schema: workflow-breakdown/v1
doc_id: wf-00-directory-contract
title: "目录约定（Directory Contract）"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "2. 上下文与依据（Review Inputs / Source Context）"
  - "5. 权威模型（Authority Model）"
  - "7. Node Contract"
  - "8. Gate and CLI Contract"
  - "12. 分阶段落地策略（Phased Delivery Strategy）"
source_context:
  - AGENTS.md
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/README.md
  - guidelines/command-experiments.md
  - DPT_FRAMEWORK/
  - DPT_FRAMEWORK/rb_templates/
  - experiments_playbook/
  - tests/
depends_on: []
owns:
  - workflow foundation 阶段的目录归属规则
  - backlog、runtime framework、gate、CLI、test、experiment 的边界
does_not_own:
  - OpenSpec change 结构
  - 具体 schema 字段
  - 具体 CLI flags
  - runtime bundle 的当前状态
downstream_targets:
  - _backlog/workflow/
  - DPT_FRAMEWORK/workflows/
  - DPT_FRAMEWORK/schema/gate_definitions/
  - DPT_FRAMEWORK/schema/contracts/gate-definition.mjs
  - DPT_FRAMEWORK/engine/gates/
  - DPT_FRAMEWORK/cli/gates/
  - DPT_FRAMEWORK/command_playbook/
  - DPT_FRAMEWORK/schema/
  - tests/
  - experiments_playbook/
---

# 目录约定（Directory Contract）

## 1. 本段目标

这份文档先把 workflow foundation 相关内容应该放在哪个目录讲清楚。历史问题之一是“先能跑起来再说”，导致需求、指导、runtime state、实验、CLI、schema、template、临时草稿混在一起。后续拆解和实现必须先服从本目录约定，否则每个阶段都会重新争夺 authority。

核心判断：

```text
_backlog/workflow/ 是上游需求和拆解工作区。
DPT_FRAMEWORK/ 是未来 runtime framework 和 deterministic surface。
experiments_playbook/ 是 Agent-driven E2E 实验层。
tests/ 是 regression test 层。
active dpt_rb_* bundle 是 runtime truth，不是 backlog 文档。
```

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| `_backlog/workflow/workflow-foundation-requirements.md` | 当前 workflow foundation 需求基准，定义 lifecycle、node、gate、bundle、trace、stop/retry 等上游规则。 |
| `AGENTS.md` | repo hard rules：Node.js >=20、ESM、无新增依赖、不要读 `_original_*`、OpenSpec 是下游正式流程。 |
| `guidelines/project-charter.md` | 目录权威边界的最高指导：Markdown controls Agent Flow；JS/CLI controls deterministic checkpoints；runtime state 不在 chat memory。 |
| `guidelines/README.md` | 确认 `guidelines/` 是 guidance layer，不是 accepted capability 或 runtime truth。 |
| `guidelines/command-experiments.md` | 确认实验层必须用真实 runtime context、真实 trace-backed verdict，不能 mock。 |
| `DPT_FRAMEWORK/` | 当前 framework code、bundle templates、CLI、schema 的实际位置。 |
| `DPT_FRAMEWORK/rb_templates/` | 当前 run bundle 模板实际创建哪些 control files 和 data directories。 |
| `experiments_playbook/` | Agent-driven playbook 和 controlled E2E 应放的位置。 |
| `tests/` | unit/integration regression tests 应放的位置。 |

## 3. 目标目录结构（Target Directory Tree）

本节定义 workflow foundation 相关文件的目标放置结构。这里的 “target” 是后续下游实现要遵守的目录 contract；当前拆解阶段只写 `_backlog/workflow/` 下的需求文档，不提前创建 runtime framework 文件。

目录规划先按两个根边界切开：

```text
DPT_FRAMEWORK/ = read-only framework assets
dpt_rb_*/      = mutable runtime state/data/evidence/results
```

同一套 `DPT_FRAMEWORK/` 可以服务多个 `dpt_rb_*`。运行中发生的用户输入、gate attempt、pass/fail、repair、waiting/block、trace、artifact、final output 都只能写入 active run bundle，不能写回 framework。

当前 v1 只有一个 canonical Deep Research workflow package，所以 workflow foundation target 使用 `DPT_FRAMEWORK/workflows/manifest.json` 和 `DPT_FRAMEWORK/workflows/nodes/`，不引入 `workflows/<workflow-name>/` namespace。这个决策不限制 run bundle 数量；一套 framework 仍要服务多个互相隔离的 `dpt_rb_*`。

### 3.1 上游需求工作区

```text
_backlog/workflow/
  workflow-foundation-requirements.md
  breakdown/
    00-directory-contract.md
    01-phase-a-workflow-contract-skeleton.md
    02-phase-b-minimum-real-bundle-run.md
    03-phase-c1-shared-and-instantiation.md
    04-phase-c2-hitl-and-setup.md
    05-phase-c3-wave0-wave1-wave2.md
    06-phase-c4-hitl2-readiness-final.md
    07-phase-d-wave1-subagent-boundary.md
    90-review-checklist.md
```

`_backlog/workflow/` 只放 pre-OpenSpec requirements、拆解、review checklist 和决策记录。它不能放 runtime state、生产 CLI、生产 schema、fake bundle artifacts 或 gate verdict。

### 3.2 Workflow-foundation target read-only framework assets

```text
DPT_FRAMEWORK/
  workflows/
    manifest.json
    nodes/
      phases/
        phase-instantiation.md
        phase-hitl1.md
        phase-setup.md
        phase-wave0.md
        phase-wave1.md
        phase-wave2.md
        phase-hitl2.md
        phase-readiness.md
        phase-final.md
      shared/
        shared-profile.md
        shared-gate-rules.md
        shared-schemas.md
        shared-repair-guidance.md
        shared-anti-cheating-rules.md

  schema/
    contracts/
      gate-definition.mjs
      plan.mjs
      profile.mjs
      queue.mjs
      status.mjs
      trace.mjs
    gate_definitions/
      gate-instantiation-complete.definition.json
      gate-hitl1-recorded.definition.json
      gate-setup-ready.definition.json
      gate-wave0-complete.definition.json
      gate-wave1-complete.definition.json
      gate-wave2-complete.definition.json
      gate-hitl2-recorded.definition.json
      gate-readiness-passed.definition.json

  engine/
    gates/
      loader.mjs
      evaluator.mjs
    helpers/
      gate-helpers.mjs

  cli/
    gates/
      check-gate-instantiation-complete.mjs
      check-gate-hitl1-recorded.mjs
      check-gate-setup-ready.mjs
      check-gate-wave0-complete.mjs
      check-gate-wave1-complete.mjs
      check-gate-wave2-complete.mjs
      check-gate-hitl2-recorded.mjs
      check-gate-readiness-passed.mjs
    instantiate-run-bundle.mjs
    validate-bundle.mjs
    inspect-bundle.mjs
    operate-queue.mjs

  rb_templates/
  command_playbook/
```

Framework target 内部边界：

- `workflows/` 放未来 Agent-facing workflow surface：manifest 和 Markdown nodes。
- `schema/contracts/gate-definition.mjs` 是未来 gate definition 的结构校验 contract。
- `schema/gate_definitions/*.definition.json` 放未来 read-only gate definitions，不是 run data。
- `engine/gates/` 放未来读取和执行 gate definitions 的 engine code。
- `cli/gates/` 放未来 one gate per CLI wrappers，所有 gate 命令必须显式接收 active bundle path；具体 flag 属于 executable command contract。
- `rb_templates/` 只放会被实例化进每个 run bundle 的初始模板。
- `command_playbook/` 放 operator/Agent 如何运行命令的说明，不放 lifecycle phase node。

### 3.3 Mutable run bundle

```text
dpt_rb_<english-slug>[_collision]/
  START_FROM_HERE.md
  rb_plan.md
  rb_profile.yaml
  rb_status.json
  rb_queue.json
  rb_trace.jsonl

  seed_topics/
  reference/
  artifacts/
    wave1/
    wave2/
  final/

  _cache/
```

Run bundle 内部边界：

- `rb_plan.md` 承载本 run 的 plan/topic registry。
- `rb_profile.yaml` 承载 HITL1/HITL2 用户输入、profile、decision、retry config。
- `rb_status.json` 承载当前 workflow/phase/gate 状态摘要。
- `rb_queue.json` 承载 runtime queue state。
- `rb_trace.jsonl` 承载 append-only runtime history/audit trail。
- `seed_topics/`、`reference/`、`artifacts/`、`final/` 承载本 run 的实例数据、证据、阶段产物和最终输出。
- `_cache/` 承载可重建 cache/projection，不是 runtime truth。
- `_cache/gate-results/` 和 `_cache/projections/` 是 workflow-foundation target convention，不是当前 `inspect-bundle.mjs` required shape。

## 4. Artifact Routing Rules

| Artifact / Concern | Must live in | Must not live in | Reason |
|--------------------|--------------|------------------|--------|
| Upstream workflow baseline | `_backlog/workflow/workflow-foundation-requirements.md` | `DPT_FRAMEWORK/`, `openspec/specs/` | 现在是 pre-OpenSpec 需求基准，不是 runtime 或 accepted spec。 |
| Breakdown slice | `_backlog/workflow/breakdown/` | `guidelines/`, `DPT_FRAMEWORK/workflows/` | 拆解用于 review，不是 repo-wide guidance 或 runtime node。 |
| Repo-wide principle | `guidelines/` | `_backlog/workflow/`, `DPT_FRAMEWORK/` | 指导层只讲原则和边界。 |
| Accepted behavior | `openspec/specs/` | `_backlog/workflow/`, `guidelines/` | accepted capability 必须走 OpenSpec 下游流程。 |
| Phase/shared node | `DPT_FRAMEWORK/workflows/nodes/` | `_backlog/workflow/`, `experiments_playbook/` | Node 是 Agent-facing runtime workflow surface。 |
| Phase manifest | `DPT_FRAMEWORK/workflows/manifest.json` | Gate definition、bundle state | Manifest owns navigation, not gate truth。 |
| Gate definition JSON | `DPT_FRAMEWORK/schema/gate_definitions/*.definition.json` | workflow node、shared prose、run bundle | Gate definition 是 read-only deterministic rule source，不是 run data。 |
| Gate definition schema | `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` | gate definition JSON、bundle state | Schema contract 校验 definition 结构，不保存规则实例或结果。 |
| Gate evaluator/loader | `DPT_FRAMEWORK/engine/gates/` | `schema/`, `workflows/`, run bundle | Engine code 读取 definitions 并检查 bundle。 |
| Gate CLI wrapper | `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` | workflow nodes、experiments | One gate per Agent-facing external CLI，必须显式接收 active bundle path；具体 flag 属于 executable command contract。 |
| Shared gate logic | `DPT_FRAMEWORK/engine/helpers/` | copied into each CLI | 避免重复实现，但不改变外部 CLI shape。 |
| Reusable schema | `DPT_FRAMEWORK/schema/contracts/` | node Markdown、backlog prose | Schema 是 executable contract。 |
| Bundle templates | `DPT_FRAMEWORK/rb_templates/` | workflow node、experiments fixtures | Templates 只负责 initial bundle file contents。 |
| Regression tests | `tests/` | experiments_playbook | 测 deterministic code behavior。 |
| Controlled Agent E2E | `experiments_playbook/exp_workflow-foundation/` | tests、backlog | 测 Agent Flow + real bundle + trace-backed verdict。 |
| Shared experiment setup | `experiments/shared/` | DPT_FRAMEWORK unless promoted by spec | 实验 helper 不是 production runtime behavior。 |
| Runtime truth | active `dpt_rb_*` bundle | chat memory、backlog、guidelines | 当前 run state 必须从 bundle reload。 |
| Generated projection/cache | active bundle `_cache/` | authoritative state files | Projection/cache 可重建，不是 authority。 |

## 5. 命名和禁止混放

### 5.1 Naming

- Breakdown doc：`NN-short-kebab-title.md`，例如 `05-phase-c3-wave0-wave1-wave2.md`。
- Phase node：`phase-<phase>.md`。
- Shared node：`shared-<scope>.md`。
- Gate definition JSON：`gate-<gate-name-kebab>.definition.json`，放在 `DPT_FRAMEWORK/schema/gate_definitions/`。
- Gate CLI：`check-gate-<gate-name-kebab>.mjs`，放在 `DPT_FRAMEWORK/cli/gates/`。
- Experiment family：`experiments_playbook/exp_workflow-foundation/`。
- Runtime bundle：`dpt_rb_<english-slug>[_collision]`。

### 5.2 Must Not Mix

- 不把 Gate definition JSON 放进 workflow node 目录或 run bundle。
- 不把 phase/shared node 放进 `_backlog/workflow/` 当 runtime surface。
- 不把 experiment playbook 当 production workflow node。
- 不把 runtime state、gate result、trace、repair attempt 写回 `DPT_FRAMEWORK/`。
- 不把 `_cache/` projection 当 runtime truth。
- 不把 fake evidence、fake receipt、fake trace 放进任何目录。
- 不把 OpenSpec accepted behavior 只写在 backlog 或 guidelines 里。

## 6. 本文不定义的内容

本段不定义：

- OpenSpec change 的目录和任务结构。
- Gate definition JSON 的完整 schema。
- Node frontmatter 的最终 executable validator。
- `dpt_rb_*` 中每种 artifact 的最终字段 schema。
- 任何真实实现文件的创建顺序。

## 7. 必须达标的结果

D00-A1. Reviewer 能回答：任意 workflow foundation 相关 artifact 应放在哪个目录。

D00-A2. Reviewer 能区分：`_backlog/workflow/` 是需求工作区，不是 runtime authority。

D00-A3. Reviewer 能区分：`DPT_FRAMEWORK/workflows/` 放 Agent-facing nodes；`DPT_FRAMEWORK/schema/gate_definitions/` 放 read-only gate definitions；`DPT_FRAMEWORK/engine/gates/` 放 evaluator/loader；`DPT_FRAMEWORK/cli/gates/` 放 executable gate wrappers。

D00-A4. Reviewer 能区分：`tests/` 做 regression；`experiments_playbook/` 做 Agent-driven controlled E2E。

D00-A5. Reviewer 不需要推断 active runtime truth 在哪里：它在 active `dpt_rb_*` bundle，不在 backlog、chat summary 或 generated prose。

D00-A6. Reviewer 能区分：gate definition 是 framework read-only rule source；gate result、attempt、repair 和 pass/fail history 是 run bundle runtime data。

D00-A7. Reviewer 能区分：v1 只有一个 canonical workflow package，但同一套 `DPT_FRAMEWORK/` 必须服务多个互相隔离的 `dpt_rb_*` run bundle。

## 8. 风险、缺口、容易混淆点

R00-1. `shared-gate-rules.md` 看起来像规则文档，但它不能成为 gate authority。它只能是由 Gate definition JSON/tooling 同步出来的 Agent-readable summary。

R00-2. `_backlog/workflow/breakdown/` 写得再细也不是 OpenSpec，不应该被实现者当成 accepted spec 直接绕过下游流程。

R00-3. Controlled E2E 的 playbook 会像 workflow node 一样是 Markdown，但它的位置和用途不同：playbook 证明机制，workflow node 驱动真实 run。

R00-4. Runtime bundle 里可能有 Markdown projection，但 projection 不是 deterministic authority。状态、trace、receipt 仍然以结构化文件和 CLI verdict 为准。

R00-5. `schema/gate_definitions/` 里是 JSON data，但它仍是 read-only framework definition，不是 `rb_templates/`，不会被复制进每个 bundle。

## 9. Review Questions

DQ00-1. 这个目录约定是否足够清楚，能阻止后续把需求、runtime state、实验结果和 production CLI 混放？

DQ00-2. `DPT_FRAMEWORK/workflows/`、`DPT_FRAMEWORK/schema/gate_definitions/`、`DPT_FRAMEWORK/engine/gates/`、`DPT_FRAMEWORK/cli/gates/` 的边界是否容易执行？

DQ00-3. 是否还有某类 artifact 没有明确归属？

DQ00-4. `_backlog/workflow/` 作为 pre-OpenSpec requirements workbench 的限制是否写得够硬？
