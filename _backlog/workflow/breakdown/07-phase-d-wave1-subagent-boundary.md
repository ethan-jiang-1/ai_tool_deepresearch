---
schema: workflow-breakdown/v1
doc_id: wf-07-phase-d-wave1-subagent-boundary
title: "Phase D：Wave1/Subagent Expansion Boundary"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "2.2 从输入材料得出的关键判断"
  - "11. Minimum Real Verifiable Actions"
  - "12. Phase D: Wave1/Subagent Expansion"
  - "13. 非范围（Out of Scope）"
source_context:
  - guidelines/project-charter.md
  - guidelines/command-experiments.md
  - DPT_FRAMEWORK/engine/subagent-relay.mjs
  - DPT_FRAMEWORK/command_playbook/setup-real-subagents.md
  - openspec/specs/subagent-dispatch/spec.md
  - openspec/specs/subagent-collect/spec.md
  - openspec/specs/subagent-repair/spec.md
  - openspec/specs/subagent-slots/spec.md
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
  - wf-02-phase-b-minimum-real-bundle-run
  - wf-05-phase-c3-wave0-wave1-wave2
owns:
  - Wave1/subagent expansion 的 future boundary
  - foundation placeholder 与 future capability 的区别
  - 后续 capability track 的拆解方向
does_not_own:
  - foundation 阶段 gate pass 条件
  - 当前 subagent dispatch implementation
  - candidate intake/backfill 的正式 schema
  - fan-in review 的完整机制
downstream_targets:
  - future OpenSpec change for Wave1/subagent expansion
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md
  - DPT_FRAMEWORK/engine/subagent-relay.mjs
  - experiments_playbook/exp_subagent_*/
---

# Phase D：Wave1/Subagent Expansion Boundary

## 1. 本段目标

Phase D 不实现 subagent。它负责把 Wave1 的复杂能力边界先圈出来，避免 foundation 阶段为了“看起来完整”把 subagent dispatch、candidate intake、repair/backfill、fan-in review 混进最小 workflow。

Foundation 阶段的 Wave1 只需要 placeholder skeleton，能真实跑通即可。Phase D 以后才处理真正 topic-specific deepening。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 2.2 节 | 明确 Wave1 是后续复杂能力边界，foundation 不假装完成。 |
| baseline 第 11 节 | 定义 Wave1 minimum action 是 placeholder skeleton。 |
| baseline 第 12 节 | Phase D 目标是 Wave1/Subagent Expansion。 |
| baseline 第 13 节 | 明确完整 subagent dispatch/collection semantics 是 out of scope。 |
| `guidelines/project-charter.md` | Agent owns judgment，Engine controls deterministic checkpoints，不让 JS 取代 Agent research。 |
| `guidelines/command-experiments.md` | subagent work 不能 mock；需要真实 Agent/subagent 执行时必须真实发生。 |
| subagent 相关 specs 和 `subagent-relay.mjs` | 作为未来 capability 背景，不作为 foundation 当前完成条件。 |

## 3. 范围内

Phase D 范围内：

- 标记 Wave1 中哪些是 foundation placeholder。
- 标记哪些是 future guidance。
- 定义 future Wave1 expansion 应拆成哪些 capability tracks。
- 定义哪些能力不能成为 foundation pass 条件。
- 定义后续 experiment 和 OpenSpec 的候选方向。

## 4. 范围外

Phase D 不负责：

- 当前创建 subagent workflow。
- 当前修改 subagent CLI/engine。
- 当前定义完整 subagent schema。
- 当前跑真实 subagent E2E。
- 当前提高 final report 研究质量。

## 5. 目录归属和下游位置

Foundation 当前只在 `phase-wave1.md` 中保留 placeholder 和 future guidance 标记。未来真实 expansion 应进入独立下游工作：

```text
future OpenSpec change:
  Wave1/subagent dispatch
  candidate intake
  repair/backfill
  fan-in review
  topic-specific deepening gates

future experiments:
  experiments_playbook/exp_subagent_*/
```

如果后续需要生产 workflow node 的新增内容，仍应落在：

```text
DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md
DPT_FRAMEWORK/workflows/nodes/shared/shared-*.md
```

但必须先通过对应 capability 的下游流程。

## 6. 必须达标的结果

A07-1. Foundation Wave1 必须明确标为 placeholder/skeleton，不得声称 full subagent research completed。

A07-2. Future Wave1 expansion 至少应拆出以下 tracks：

- topic-specific deepening。
- subagent dispatch。
- candidate intake。
- repair/backfill。
- fan-in review。
- topic artifact quality gates。

A07-3. 这些 future tracks 不能成为 foundation 的 gate pass 条件。

A07-4. 如果未来某 track 需要真实 subagent，实验和验收必须使用真实 Agent/subagent execution，不能 mock。

A07-5. JS/CLI 可以检查 subagent receipts、state、trace、artifact shape，但不能替代 Agent 做 research judgment。

A07-6. Wave1 expansion 开始前，应先确认 Phase A/B/C 的 foundation control loop 已经可审计跑通。

## 7. 风险、缺口、容易混淆点

R07-1. Wave1 是复杂度最高的地方。如果 foundation 还没稳就扩 subagent，会掩盖 workflow 本身的问题。

R07-2. `subagent: true` 容易被误读成当前必须 dispatch subagent。Foundation 里它只能是 future marker。

R07-3. Fake subagent output 是高风险反模式。任何依赖 subagent behavior 的验收都必须真实执行。

R07-4. Future guidance 如果写得像 current requirement，会误导 gate 和 review。必须用明确标签区分。

## 8. Review Questions

Q07-1. Phase D 是否足够清楚地把 Wave1 future capability 与 foundation placeholder 分开？

Q07-2. 哪些 Wave1 历史内容应进入 future guidance，而不是 foundation pass 条件？

Q07-3. Future subagent expansion 的 tracks 是否完整，是否还缺明显能力块？

Q07-4. 对 fake subagent output 的禁止是否写得足够硬？

Q07-5. Phase D 是否避免提前做 OpenSpec/implementation 设计？

