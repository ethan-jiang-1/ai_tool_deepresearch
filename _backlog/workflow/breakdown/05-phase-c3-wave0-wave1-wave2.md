---
schema: workflow-breakdown/v1
doc_id: wf-05-phase-c3-wave0-wave1-wave2
title: "Phase C3：Wave0、Wave1、Wave2"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "2.2 从输入材料得出的关键判断"
  - "6. 生命周期模型（Lifecycle Model）"
  - "8. Gate and CLI Contract"
  - "11. Minimum Real Verifiable Actions"
  - "12. Phase C: Full Content Migration by Phase"
  - "13. 非范围（Out of Scope）"
source_context:
  - guidelines/project-charter.md
  - guidelines/command-experiments.md
  - openspec/specs/subagent-dispatch/spec.md
  - openspec/specs/subagent-collect/spec.md
  - openspec/specs/subagent-repair/spec.md
  - DPT_FRAMEWORK/engine/subagent-relay.mjs
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
  - wf-02-phase-b-minimum-real-bundle-run
  - wf-03-phase-c1-shared-and-instantiation
  - wf-04-phase-c2-hitl-and-setup
owns:
  - Wave0/Wave1/Wave2 的 foundation skeleton 要求
  - Wave1 placeholder capability boundary
  - wave0_complete、wave1_complete、wave2_complete gate 的检查方向
does_not_own:
  - full subagent dispatch/collection semantics
  - 复杂 source quality ontology
  - production-grade synthesis quality
  - real-environment research E2E
downstream_targets:
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md
  - DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json
  - DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json
  - DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json
  - DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs
  - DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs
  - DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs
---

# Phase C3：Wave0、Wave1、Wave2

## 1. 本段目标

Phase C3 定义三个 wave 在 foundation 阶段的最小真实要求：

- `wave0`：产生少量 shared foundation evidence。
- `wave1`：保持 topic-scoped placeholder capability boundary，写简单真实 artifact，让 workflow 跑通。
- `wave2`：从已验证 wave artifacts 派生 minimum cross-topic synthesis。

重点不是研究能力完整，而是每个 wave 都真实产出 files/state/trace，并由 gate 检查。尤其 Wave1 不能因为存在 placeholder 就被误解为 full subagent research 已完成。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 2.2 节 | 明确 Wave1 是后续复杂能力边界，foundation 不假装完成 subagent/deepening。 |
| baseline 第 6 节 | 定义 wave0 -> wave1 -> wave2 顺序和各 gate。 |
| baseline 第 8 节 | 定义 Gate definition JSON 只能检查 deterministic/string/file/state/trace 条件，语义判断返回 Agent。 |
| baseline 第 11 节 | 给出 Wave0/Wave1/Wave2 的 minimum real verifiable actions。 |
| baseline 第 13 节 | 排除完整 subagent dispatch、复杂 scheduling、真实世界长跑 E2E。 |
| `guidelines/command-experiments.md` | 禁止 mock Agent/subagent work 和 fake trace/receipt。 |
| subagent 相关 specs / `subagent-relay.mjs` | 作为 future guidance 背景，帮助明确 foundation 不启用 full subagent mechanics。 |

## 3. 范围内

Phase C3 范围内：

- 定义 `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` 的 foundation 要求。
- 定义三个 wave gate 的 deterministic 检查方向。
- 明确哪些 Wave1 内容是 current skeleton，哪些是 future guidance。
- 要求 wave artifacts 真实、可解析、可追溯。
- 定义 semantic judgment 与 deterministic checks 的边界。

## 4. 范围外

Phase C3 不负责：

- 完整 subagent dispatch。
- native subagent fan-out/fan-in。
- candidate intake/backfill 的完整机制。
- evidence ranking 的完整 ontology。
- production final report quality。

这些进入 Phase D 或后续 capability track。

## 5. 目录归属和下游位置

未来实现落点：

```text
DPT_FRAMEWORK/workflows/
  nodes/
    phases/
      phase-wave0.md
      phase-wave1.md
      phase-wave2.md

DPT_FRAMEWORK/schema/gate_definitions/
  gate-wave0-complete.definition.json
  gate-wave1-complete.definition.json
  gate-wave2-complete.definition.json

DPT_FRAMEWORK/cli/gates/
  check-gate-wave0-complete.mjs
  check-gate-wave1-complete.mjs
  check-gate-wave2-complete.mjs
```

Wave1 中暂不启用的 subagent/deepening 内容可以在 `phase-wave1.md` 中标为 future guidance，或拆入 shared guidance node，但不能作为 foundation pass 条件。

## 6. 必须达标的结果

A05-1. `phase-wave0.md` 必须声明：

```yaml
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0_complete
next: wave1
stop: no
```

A05-2. Wave0 minimum action：增加少量真实 shared reference artifacts，metadata 可解析，并更新 index/status/trace。

A05-3. `wave0_complete` gate 至少应检查：

- Wave0 artifact/index 存在。
- reference metadata 可解析。
- 数量达到 foundation floor。
- trace/status 中有 Wave0 completion evidence。

A05-4. `phase-wave1.md` 必须声明：

```yaml
node_type: phase
id: phase-wave1
phase: wave1
gate: wave1_complete
next: wave2
stop: no
subagent: true
```

`subagent: true` 在 foundation 阶段只表示未来可能使用 subagent mechanics，不表示当前必须 dispatch subagent。

A05-5. Wave1 minimum action：写入简单、topic-scoped、可实验跑通的 skeleton artifact(s)，并明确标记为 placeholder capability boundary。

A05-6. Wave1 不能声称：

- full subagent coverage completed。
- topic-specific deepening completed。
- candidate intake/backfill completed。
- fan-in review completed。

A05-7. `wave1_complete` gate 至少应检查：

- topic-scoped skeleton artifact(s) 存在且可解析。
- artifact 明确标记 foundation placeholder 或 equivalent state。
- 没有写入 false completion claim。
- trace/status 中有 Wave1 skeleton completion evidence。

A05-8. `phase-wave2.md` 必须声明：

```yaml
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2_complete
next: hitl2
stop: no
```

A05-9. Wave2 minimum action：从 verified wave artifacts 派生一个小的 cross-topic synthesis artifact。

A05-10. `wave2_complete` gate 至少应检查：

- synthesis artifact 存在且可解析。
- 它引用已验证的 Wave0/Wave1 artifacts。
- 状态/trace 记录 Wave2 completion evidence。
- 不能只检查“有一段文字”，还要检查来源链接或 artifact references。

## 7. 风险、缺口、容易混淆点

R05-1. Wave1 是最容易失控的阶段。必须明确 foundation 只启用 placeholder skeleton，完整 subagent expansion 进入单独 Phase D。

R05-2. Gate definition JSON 无法判断 synthesis 是否“有洞察”。如果需要语义判断，CLI 应返回 structured feedback，告诉 Agent 哪些产物需要语义 review。

R05-3. Wave0 的少量 reference 也必须真实，不能写 fake source 或 fake metadata。

R05-4. Wave2 synthesis 不能凭空总结，必须从 verified wave artifacts 派生。

## 8. Review Questions

Q05-1. Wave0 的 minimum evidence 要求是否足够真实但不过重？

Q05-2. Wave1 placeholder boundary 是否写得足够清楚，不会被理解成 subagent research 已完成？

Q05-3. Wave2 的 minimum synthesis 是否明确依赖 verified artifacts？

Q05-4. 三个 wave gate 是否都保持 deterministic/string/file/state/trace 检查边界？

Q05-5. Future Wave1/subagent 内容是否已经被隔离到 Phase D，而不是塞进 foundation pass？
