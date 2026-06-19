---
schema: workflow-breakdown/v1
doc_id: wf-03-phase-c1-shared-and-instantiation
title: "Phase C1：Shared Nodes 与 Instantiation"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "2.2 从输入材料得出的关键判断"
  - "6.1 标准阶段顺序（Canonical Phase Order）"
  - "7. Node Contract"
  - "11. Minimum Real Verifiable Actions"
  - "12. Phase C: Full Content Migration by Phase"
source_context:
  - guidelines/project-charter.md
  - DPT_FRAMEWORK/rb_templates/
  - DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs
  - openspec/specs/cmd-bundle-instantiation/spec.md
  - openspec/specs/schema-core/spec.md
  - openspec/specs/bundle-data-isolation/spec.md
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
  - wf-02-phase-b-minimum-real-bundle-run
owns:
  - shared node 的归属和边界
  - instantiation phase 的实例化范围
  - dpt_rb_* 命名和 collision 语义
does_not_own:
  - HITL1 问题设计
  - setup 检查细则
  - wave research 内容
  - 完整 schema implementation
downstream_targets:
  - DPT_FRAMEWORK/workflows/nodes/shared/shared-*.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md
  - DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json
  - DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs
---

# Phase C1：Shared Nodes 与 Instantiation

## 1. 本段目标

Phase C1 把两件容易混淆的事情先定清楚：

1. Shared node 是多个 phase 复用的 Agent-readable context，不是隐藏 stage。
2. Instantiation 是 **Run Bundle 实例化（Run Bundle instantiation）**，不是简单 copy 模板，也不是把 HITL、setup、wave research 都提前做掉。

用户已经明确：topic 拆解、artifacts/reference scaffold 属于本次实例化产生的数据，因为不同 Deep Research request 会有不同实例数据。它们应属于 instantiation 的实例化范围，但不能被描述成 evidence coverage 或研究结论。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 2.2 节 | 明确 instantiation 要比 copy 模板更丰富，但不能声称 research 完成。 |
| baseline 第 6.1 节 | 定义 instantiation 在 HITL1 之前，并创建 `dpt_rb_*`、initial topic data、reference/artifact scaffold。 |
| baseline 第 7 节 | 定义 shared node metadata、authority、`requires`、`suggested_context`。 |
| baseline 第 11 节 | 给出 instantiation 的 minimum real verifiable action。 |
| `DPT_FRAMEWORK/rb_templates/` | 当前 bundle control files 的模板来源。 |
| `instantiate-run-bundle.mjs` | 当前实例化入口。 |
| `openspec/specs/cmd-bundle-instantiation/spec.md` | 当前 bundle instantiation 能力背景。 |
| `openspec/specs/schema-core/spec.md` | profile/status/queue/trace 等 schema surface 背景。 |
| `openspec/specs/bundle-data-isolation/spec.md` | 不同 bundle 数据隔离要求背景。 |

## 3. 范围内

Phase C1 范围内：

- 定义 shared node 的最小集合和边界。
- 定义 `phase-instantiation.md` 的职责。
- 定义 `instantiation_complete` gate 的检查方向。
- 定义 `dpt_rb_*` 目录命名策略。
- 定义 initial topic / seed-topic data、reference/artifact directory scaffold 属于 instantiation 的实例数据。
- 定义 instantiation 不能做的事情。

## 4. 范围外

Phase C1 不负责：

- HITL1 的用户问题。
- setup 的完整 consistency check。
- Wave0 evidence collection。
- Wave1 topic deepening。
- Wave2 synthesis。
- readiness/final delivery。

## 5. 目录归属和下游位置

未来实现落点：

```text
DPT_FRAMEWORK/workflows/
  nodes/
    shared/
      shared-profile.md
      shared-gate-rules.md
      shared-schemas.md
      shared-repair-guidance.md
      shared-anti-cheating-rules.md
    phases/
      phase-instantiation.md

DPT_FRAMEWORK/schema/gate_definitions/
  gate-instantiation-complete.definition.json

DPT_FRAMEWORK/cli/gates/
  check-gate-instantiation-complete.mjs
```

如果某些 shared node 太细，可以在实现阶段合并，但合并后仍必须保留 frontmatter 中的 `node_type: shared`、`shared_scope`、`authority`。

## 6. 必须达标的结果

A03-1. Shared node 必须声明 `node_type: shared`，并且不能声明 `phase`、`gate`、`next`、`stop`。

A03-2. Shared node 的 `authority` 必须清楚，例如：

- `guidance-only`
- `generated-summary`

A03-3. `phase-instantiation.md` 必须声明：

```yaml
node_type: phase
id: phase-instantiation
phase: instantiation
gate: instantiation_complete
next: hitl1
stop: no
```

A03-4. Instantiation 必须创建真实 `dpt_rb_*` bundle，并写入 canonical control files。

A03-5. Instantiation 必须创建本 request 专属的 initial instance data scaffold：

- initial topic / seed-topic data。
- reference directory space。
- artifact directory space。
- 与本次 request 绑定的初始 plan/profile/status/queue/trace 状态。

A03-6. `dpt_rb_*` 名称由 Agent/CLI 根据 request 自动生成；默认英文 slug；冲突时 CLI 加 collision suffix 或换名。

A03-7. Instantiation 不能：

- 问 HITL 问题。
- 声称 evidence coverage。
- 执行 wave research。
- 做 synthesis judgment。
- 用 assertion 代替 setup/readiness checks。

A03-8. `instantiation_complete` gate 至少应能检查：

- bundle path 存在且命名合法。
- canonical control files 存在且可解析。
- initial topic/reference/artifact scaffold 存在。
- trace 中有真实 instantiation event 或等价可审计记录。
- 当前 status 尚未跳过 HITL1/setup/wave。

## 7. 风险、缺口、容易混淆点

R03-1. “topic 拆解”在 instantiation 中只能是 seed/initial data，不是研究结论。如果 wording 不清，后续会把 research 提前塞进 instantiation。

R03-2. Shared node 如果写了太多 rules，容易变成第二套 authority。必须反复说明它只是 Agent-readable context。

R03-3. `shared-gate-rules.md` 如果是 generated-summary，必须随 Gate definition JSON/tooling 同步升级，不能长期手工维护。

R03-4. 自动英文 slug 的规则需要足够稳定，但 foundation 阶段不需要一次性解决所有转写边界。最小要求是可读、短小、避免冲突。

## 8. Review Questions

Q03-1. Instantiation 的范围是否准确覆盖“本次实例数据”，同时没有吞掉 HITL/setup/wave 职责？

Q03-2. initial topic/reference/artifact scaffold 的身份是否清楚：它是 instance data，不是 research conclusion？

Q03-3. Shared node 的 boundary 是否足够硬，能防止 hidden stage 或 prose authority？

Q03-4. `dpt_rb_*` 命名和 collision 语义是否足够支持后续实现？

Q03-5. `instantiation_complete` gate 的检查方向是否足够可执行？
