---
schema: workflow-breakdown/v1
doc_id: wf-01-phase-a-workflow-contract-skeleton
title: "Phase A：Workflow Contract Skeleton"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "4. 核心需求（Core Requirements）"
  - "5. 权威模型（Authority Model）"
  - "6. 生命周期模型（Lifecycle Model）"
  - "7. Node Contract"
  - "8. Gate and CLI Contract"
  - "12. Phase A: Workflow Contract Skeleton"
source_context:
  - guidelines/project-charter.md
  - DPT_FRAMEWORK/engine/workflow-chain.mjs
  - DPT_FRAMEWORK/engine/gate-loop.mjs
  - openspec/specs/dynamic-node-loading/spec.md
  - openspec/specs/check-inspect-feedback/spec.md
depends_on:
  - wf-00-directory-contract
owns:
  - lifecycle shell 的阶段顺序
  - phase/shared node metadata contract
  - 8 个 gate 的骨架关系
  - one gate per CLI 的外部形态
does_not_own:
  - 每个 phase 的完整研究能力
  - Gate definition JSON 的最终完整 rule set
  - OpenSpec 规格写法
  - 具体实现代码
downstream_targets:
  - DPT_FRAMEWORK/workflows/
  - DPT_FRAMEWORK/schema/gate_definitions/
  - DPT_FRAMEWORK/cli/gates/check-gate-*.mjs
---

# Phase A：Workflow Contract Skeleton

## 1. 本段目标

Phase A 只做 workflow contract skeleton：把 lifecycle、node、gate、CLI 外形先定成可检查的壳。它的成功不是“研究做得深”，而是 Agent 不再需要从散落 prose 或 chat memory 里猜当前阶段、下一阶段、gate 入口和失败修复路径。

Phase A 的核心输出应让后续实现者可以回答：

- 当前 workflow 有哪些 phase？
- 每个 phase 读哪个 node？
- 每个 node 的 mandatory context 是什么？
- 每个 non-terminal phase 跑哪个 gate？
- gate pass 后进入哪个 phase？
- gate fail 后如何 repair/retry/escalate？
- shared MD 是 context dependency 还是 hidden stage？

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 4 节 | 定义 explicit workflow、dynamic loading、node/gate 基本职责。 |
| baseline 第 5 节 | 定义 Phase manifest、node MD、metadata、Gate definition JSON、bundle state、trace、Agent、JS/CLI 的 authority boundary。 |
| baseline 第 6 节 | 给出 canonical phase order 和 8 个 non-terminal gates。 |
| baseline 第 7 节 | 给出 `node_type: phase | shared`、`requires`、`suggested_context`、`stop` 等 node metadata。 |
| baseline 第 8 节 | 给出 Gate definition JSON 和 one gate per CLI 的外形要求。 |
| `guidelines/project-charter.md` | 确认不能把 Agent Flow 藏进 JS，也不能让 Markdown 成为 deterministic authority。 |
| `DPT_FRAMEWORK/engine/workflow-chain.mjs` | 现有方向是 Markdown loader/dependency resolver，不是 Markdown VM。 |
| `DPT_FRAMEWORK/engine/gate-loop.mjs` | 现有 gate loop 是 deterministic feedback checkpoint，不是 research judge。 |
| `openspec/specs/dynamic-node-loading/spec.md` | 支持 dynamic loading 方向。 |
| `openspec/specs/check-inspect-feedback/spec.md` | 支持 check/inspect/advice feedback 方向。 |

## 3. 范围内

Phase A 范围内：

- 定义 9 个 phase nodes 的 skeleton。
- 定义 shared nodes 的 skeleton。
- 定义 phase manifest 或等价 lifecycle map 的最小内容。
- 定义 8 个 Gate definition JSON files 的占位和命名。
- 定义 8 个 external gate CLI 的命名和 invocation 形态。
- 定义 Agent-facing playbook 的最低行为：load current node、load `requires`、do minimum action、run gate、read feedback、repair/retry/advance。
- 定义 final node 是 terminal node，没有 outgoing gate。

## 4. 范围外

Phase A 不负责：

- 完整 evidence strategy。
- subagent dispatch。
- 复杂 queue scheduling。
- final report 模板质量。
- Gate definition JSON 的完整检查规则。
- 真实 long-running research E2E。

## 5. 目录归属和下游位置

未来实现落点：

| Artifact | 下游位置 |
|----------|----------|
| Phase/shared nodes | `DPT_FRAMEWORK/workflows/` |
| Manifest/lifecycle map | `DPT_FRAMEWORK/workflows/manifest.json` 或同目录等价文件 |
| Gate definition JSON skeleton | `DPT_FRAMEWORK/schema/gate_definitions/` |
| Gate CLI wrappers | `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` |
| Shared gate helper | `DPT_FRAMEWORK/engine/helpers/` 或 `DPT_FRAMEWORK/engine/` |
| Regression tests | `tests/` |

本拆解文档只定义要求，不直接创建这些 runtime 文件。

## 6. 必须达标的结果

A01-1. Lifecycle 必须无歧义：

```text
instantiation -> hitl1 -> setup -> wave0 -> wave1 -> wave2 -> hitl2 -> readiness -> final
```

A01-2. 必须正好有 8 个 non-terminal gates：

```text
instantiation_complete
hitl1_recorded
setup_ready
wave0_complete
wave1_complete
wave2_complete
hitl2_recorded
readiness_passed
```

A01-3. `phase-final.md` 必须是当前 delivery pass 的 terminal node：`gate: none`、`next: none`。

A01-4. 每个 phase node 必须声明：

```yaml
node_type: phase
id: phase-...
phase: ...
gate: ...
next: ...
stop: yes | no
requires: []
suggested_context: []
```

A01-5. 每个 shared node 必须声明：

```yaml
node_type: shared
id: shared-...
shared_scope: ...
authority: guidance-only | generated-summary
requires: []
suggested_context: []
```

A01-6. Shared node 不能声明 `phase`、`gate`、`next` 或 `stop`，不能成为 hidden phase。

A01-7. Gate definition JSON 是 deterministic rule source；prose summary 必须从属于 Gate definition JSON/CLI output。

A01-8. 每个 gate 必须有一个外部 CLI：

```text
check-gate-<gate-name-in-kebab-case>.mjs
```

A01-9. Phase A 的验收需要能演示一个简单失败：gate fail -> inspect/advice -> Agent repair -> rerun same gate -> pass/advance。

## 7. 风险、缺口、容易混淆点

R01-1. 如果 manifest、node metadata 和 Gate definition JSON 都重复描述 phase order，后续可能漂移。Phase A 要明确哪个 surface 拥有 navigation，哪个 surface 拥有 gate truth。

R01-2. `requires` 和 `suggested_context` 容易被当成“多读点也没坏处”。必须坚持 dynamic loading：当前 phase 只读当前 node 和 mandatory shared context。

R01-3. Gate CLI wrapper 如果被统一入口替代，Agent-facing command 会重新不清楚。内部 helper 可以共享，外部入口仍一 gate 一 CLI。

R01-4. Skeleton 容易变成空文件加 pass。Phase A 可以小，但必须有真实 load、gate、feedback、trace 或可审计 state 变化。

## 8. Review Questions

Q01-1. Phase A 是否只做 contract skeleton，没有把完整 research 能力偷塞进去？

Q01-2. Phase/shared node metadata 是否足够让 loader 和 Agent 区分 lifecycle step 与 shared context？

Q01-3. 8 个 gate 与 9 个 phase 的关系是否完全无歧义？

Q01-4. one gate per external CLI 是否在命名和下游目录上都写清楚？

Q01-5. Gate prose summary 的 subordinate 地位是否足够明确？

