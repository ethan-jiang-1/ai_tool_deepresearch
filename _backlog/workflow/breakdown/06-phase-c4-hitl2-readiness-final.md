---
schema: workflow-breakdown/v1
doc_id: wf-06-phase-c4-hitl2-readiness-final
title: "Phase C4：HITL2、Readiness、Final"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "2.2 从输入材料得出的关键判断"
  - "6. 生命周期模型（Lifecycle Model）"
  - "9. Stop Semantics"
  - "10. Gate Failure and Repair Lifecycle"
  - "11. Minimum Real Verifiable Actions"
  - "12. Phase C: Full Content Migration by Phase"
source_context:
  - guidelines/project-charter.md
  - openspec/specs/schema-core/spec.md
  - openspec/specs/repair-loop/spec.md
  - DPT_FRAMEWORK/cli/validate-bundle.mjs
  - DPT_FRAMEWORK/cli/inspect-bundle.mjs
  - DPT_FRAMEWORK/engine/trace.mjs
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
  - wf-02-phase-b-minimum-real-bundle-run
  - wf-03-phase-c1-shared-and-instantiation
  - wf-04-phase-c2-hitl-and-setup
  - wf-05-phase-c3-wave0-wave1-wave2
owns:
  - HITL2 final review decision 记录
  - readiness gate 的 delivery 前检查边界
  - phase-final terminal 语义
  - 用户 final 后反馈的 HITL2 repair/rerun 入口
does_not_own:
  - Wave0/Wave1/Wave2 artifact 生产
  - full report customization
  - post-final standalone revision workflow
  - complete product UX
downstream_targets:
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-readiness.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md
  - DPT_FRAMEWORK/schema/gate_definitions/gate-hitl2-recorded.definition.json
  - DPT_FRAMEWORK/schema/gate_definitions/gate-readiness-passed.definition.json
  - DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs
  - DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs
---

# Phase C4：HITL2、Readiness、Final

## 1. 本段目标

Phase C4 定义 delivery 前后的最后三个阶段：

- `hitl2`：给用户 decision brief，记录 structured final review decision。
- `readiness`：执行 delivery 前 deterministic checks。
- `final`：从已验证 bundle state 生成 final report artifacts，是当前 delivery pass 的 terminal node。

关键点：`phase-final.md` 是 terminal node，但不表示用户永远不能反馈。用户后续反馈进入 HITL2 repair/rerun 语义，反馈写入 `rb_profile.yaml` 的 HITL2/user feedback 承载位置，再回到受影响 phase 或 repair path。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 2.2 节 | 明确 final 是当前 delivery pass 的终点，用户反馈走 HITL2 repair/rerun。 |
| baseline 第 6 节 | 定义 hitl2 -> readiness -> final 顺序，final 无 outgoing gate。 |
| baseline 第 9 节 | 定义 HITL2 是 `stop: yes`，readiness/final 是 `stop: no`。 |
| baseline 第 10 节 | 定义 repair/retry/escalation loop。 |
| baseline 第 11 节 | 给出 HITL2、readiness、final 的 minimum real verifiable actions。 |
| `schema-core/spec.md` | profile/HITL/status/trace schema 背景。 |
| `repair-loop/spec.md` | bounded repair loop 背景。 |
| `validate-bundle.mjs` / `inspect-bundle.mjs` | readiness 可复用 deterministic check 背景。 |

## 3. 范围内

Phase C4 范围内：

- 定义 `phase-hitl2.md`、`phase-readiness.md`、`phase-final.md` 的职责。
- 定义 `hitl2_recorded` 和 `readiness_passed` gate 检查方向。
- 明确 final 无 gate、无 normal next。
- 定义用户 final 后反馈如何回到 HITL2 repair/rerun。
- 定义 readiness 与 final 的 authority boundary。

## 4. 范围外

Phase C4 不负责：

- wave artifacts 的生产。
- full report UI/view customization。
- 单独 revision workflow。
- 复杂 post-delivery versioning。
- 真实世界长跑质量评估。

## 5. 目录归属和下游位置

未来实现落点：

```text
DPT_FRAMEWORK/workflows/
  nodes/
    phases/
      phase-hitl2.md
      phase-readiness.md
      phase-final.md

DPT_FRAMEWORK/schema/gate_definitions/
  gate-hitl2-recorded.definition.json
  gate-readiness-passed.definition.json

DPT_FRAMEWORK/cli/gates/
  check-gate-hitl2-recorded.mjs
  check-gate-readiness-passed.mjs
```

Final 没有 `check-gate-final-*`，因为 final 是 terminal delivery node，不是 outgoing gate。

## 6. 必须达标的结果

A06-1. `phase-hitl2.md` 必须声明：

```yaml
node_type: phase
id: phase-hitl2
phase: hitl2
gate: hitl2_recorded
next: readiness
stop: yes
```

A06-2. HITL2 必须产出 decision brief，并记录用户 structured decision 到 `rb_profile.yaml` 和/或 state。

A06-3. `hitl2_recorded` gate 至少应检查：

- decision brief artifact 存在。
- 用户 decision 已记录到 active bundle。
- required decision fields 非空且合法。
- trace/status 中有 HITL2 recorded evidence。

A06-4. `phase-readiness.md` 必须声明：

```yaml
node_type: phase
id: phase-readiness
phase: readiness
gate: readiness_passed
next: final
stop: no
```

A06-5. Readiness 必须验证：

- required artifacts 可达且可解析。
- 所有 8 个 non-terminal gate 的通过状态可审计。
- profile/status/queue/trace 没有明显不一致。
- final delivery 输入来自 verified bundle state。

A06-6. `readiness_passed` gate 是 final 前最后一个 deterministic checkpoint。它不能判断 final writing quality，但必须阻止缺 artifact、缺 trace、缺 gate evidence 的 delivery。

A06-7. `phase-final.md` 必须声明：

```yaml
node_type: phase
id: phase-final
phase: final
gate: none
next: none
stop: no
```

A06-8. Final minimum action：从已验证 bundle state 生成 final report artifact(s)，并记录 delivery evidence。

A06-9. Final 不允许暗藏 hidden next、hidden gate 或隐式循环。

A06-10. 用户 final 后反馈必须写入 HITL2/user feedback 承载位置，并通过 HITL2 repair/rerun 回到受影响 phase 或 repair path。

## 7. 风险、缺口、容易混淆点

R06-1. Readiness 很容易变成 final quality judge。它只能检查 deterministic readiness，不负责语义质量。

R06-2. Final 是 terminal node，但不是“系统从此不能返工”。返工入口必须是 HITL2 repair/rerun，不是 final hidden loop。

R06-3. HITL2 如果只问用户但不写 profile/state，会重复 HITL1 的 chat memory 问题。

R06-4. Final report artifact 必须来自 verified bundle state，不能重新凭聊天记忆生成。

## 8. Review Questions

Q06-1. HITL2 的 decision brief 和用户 decision 记录是否足够明确？

Q06-2. Readiness 是否只做 deterministic delivery precheck，没有承担语义质量判断？

Q06-3. Final terminal node 语义是否写清楚，没有 hidden gate/next？

Q06-4. 用户 final 后反馈通过 HITL2 repair/rerun 的路径是否足够清楚？

Q06-5. Final artifact 的来源是否明确依赖 verified bundle state？
