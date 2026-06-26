---
schema: workflow-breakdown/v1
doc_id: wf-90-review-checklist
title: "Workflow Foundation 拆解 Review Checklist"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "14. Review Checklist"
  - "all breakdown docs"
source_context:
  - _backlog/workflow/breakdown/00-directory-contract.md
  - _backlog/workflow/breakdown/01-phase-a-workflow-contract-skeleton.md
  - _backlog/workflow/breakdown/02-phase-b-minimum-real-bundle-run.md
  - _backlog/workflow/breakdown/03-phase-c1-shared-and-instantiation.md
  - _backlog/workflow/breakdown/04-phase-c2-hitl-and-setup.md
  - _backlog/workflow/breakdown/05-phase-c3-wave0-wave1-wave2.md
  - _backlog/workflow/breakdown/06-phase-c4-hitl2-readiness-final.md
  - _backlog/workflow/breakdown/07-phase-d-wave1-subagent-boundary.md
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
  - wf-02-phase-b-minimum-real-bundle-run
  - wf-03-phase-c1-shared-and-instantiation
  - wf-04-phase-c2-hitl-and-setup
  - wf-05-phase-c3-wave0-wave1-wave2
  - wf-06-phase-c4-hitl2-readiness-final
  - wf-07-phase-d-wave1-subagent-boundary
owns:
  - 拆解文档 review checklist
  - 跨文档一致性检查
does_not_own:
  - 新增需求
  - 修改各 slice 的具体结论
  - 下游 OpenSpec 验收
downstream_targets:
  - reviewer feedback
  - future requirement cleanup
---

# Workflow Foundation 拆解 Review Checklist

## 1. 本段目标

这份 checklist 不新增需求，只帮助 review `_backlog/workflow/breakdown/` 下的拆解文档是否足够系统、结构清楚、一致、可落地。Reviewer 可以用编号逐条反馈。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 14 节 | 提供原始 acceptance checks 和 answered decisions。 |
| `00-directory-contract.md` | 检查目录归属是否统一。 |
| `01-phase-a-workflow-contract-skeleton.md` | 检查 lifecycle/node/gate/CLI skeleton。 |
| `02-phase-b-minimum-real-bundle-run.md` | 检查 minimum real verifiable action。 |
| `03-phase-c1-shared-and-instantiation.md` | 检查 shared nodes 和 instantiation 边界。 |
| `04-phase-c2-hitl-and-setup.md` | 检查 HITL1 和 setup 边界。 |
| `05-phase-c3-wave0-wave1-wave2.md` | 检查 waves 和 Wave1 placeholder。 |
| `06-phase-c4-hitl2-readiness-final.md` | 检查 HITL2/readiness/final/revision path。 |
| `07-phase-d-wave1-subagent-boundary.md` | 检查 future Wave1/subagent boundary。 |

## 3. 总体一致性检查

C90-1. 所有文档是否都使用 `_backlog/workflow/`，没有残留 `_backlog/current/`？

C90-2. 所有文档是否都明确自己是 `pre-openspec-requirements`，没有冒充 accepted spec？

C90-3. 所有文档是否都说明引用来源和为什么引用？

C90-4. 所有文档是否都区分 `owns` 和 `does_not_own`？

C90-5. 是否没有把 runtime truth 放进 backlog 文档？

C90-6. 是否没有要求现在创建 OpenSpec 或 framework implementation？

## 4. 目录约定检查

C90-7. `00-directory-contract.md` 是否足够清楚地规定：

- `_backlog/workflow/` 放需求和拆解。
- `DPT_FRAMEWORK/workflows/` 放未来 node/manifest。
- `DPT_FRAMEWORK/schema/gate_definitions/` 放 Gate definition JSON。
- `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` 放 gate definition schema。
- `DPT_FRAMEWORK/engine/gates/` 放 gate loader/evaluator。
- `DPT_FRAMEWORK/cli/gates/` 放 gate CLI wrappers。
- `tests/` 放 regression。
- `experiments_playbook/` 放 Agent-driven controlled E2E。
- `dpt_rb_*` 是 runtime truth。

C90-8. 是否还有 artifact 类型没有归属？

C90-8a. 是否明确 `DPT_FRAMEWORK/` 是 read-only framework assets，运行时不写 gate result、HITL answer、trace、repair attempt、artifact 或 final output？

C90-8b. 是否明确同一套 `DPT_FRAMEWORK/` 可以服务多个互相隔离的 `dpt_rb_*`，所有 gate CLI 都必须显式接收 active bundle path？

C90-8c. 是否明确 v1 只有一个 canonical workflow package，不引入 `workflows/<workflow-name>/` namespace，但这不限制 run bundle 数量？

## 5. Lifecycle / Node / Gate 检查

C90-9. Lifecycle 是否始终为：

```text
instantiation -> hitl1 -> setup -> wave0 -> wave1 -> wave2 -> hitl2 -> readiness -> final
```

C90-10. 是否始终只有 8 个 non-terminal gates？

C90-11. `phase-final.md` 是否始终无 outgoing gate、无 normal next？

C90-12. Phase node 与 shared node 是否始终通过 `node_type` 区分？

C90-13. Shared node 是否始终不是 hidden phase，也不拥有 gate/runtime authority？

C90-14. `requires` 和 `suggested_context` 是否始终区分 mandatory 与 optional context？

C90-15. 是否保持 one gate per external CLI？

## 6. Runtime / Auditability 检查

C90-16. 是否所有 skeleton action 都要求真实 files/state/trace 或等价可审计产物？

C90-17. 是否明确禁止 fake evidence、fake receipt、fake trace、console-only proof？

C90-18. 是否 gate failure 都要求 rerun same gate，而不是 Agent 自我声明修好了？

C90-19. Retry limit 是否默认为 3 且可配置？

C90-20. waiting/transient 与 explicit escalation 是否区分清楚？

C90-20a. 是否明确 `rb_status.json` 承载当前 run 的 workflow/phase/gate 状态摘要？

C90-20b. 是否明确 `rb_trace.jsonl` 承载 gate attempt、pass/fail、repair、waiting/block 的 append-only audit？

C90-20c. 是否明确 `rb_profile.yaml` 承载 HITL1/HITL2 用户输入、profile、decision、retry config？

C90-20d. 是否明确 `_cache/gate-results/` 是 workflow-foundation target convention，只能放可选 gate output snapshot，不是当前 required shape，也不是主 authority？

## 7. Phase 边界检查

C90-21. Instantiation 是否被定义为 Run Bundle 实例化，而不是 copy templates？

C90-22. Instantiation 是否包含 initial topic/reference/artifact scaffold，但不声称 research conclusion？

C90-23. HITL1 是否在 instantiation 之后，并写入 `rb_profile.yaml`？

C90-24. Setup 是否只做进入 Wave0 前的 bundle consistency，不做 readiness 或 research quality？

C90-25. Wave0 是否只要求 minimum shared foundation evidence？

C90-26. Wave1 是否明确是 placeholder capability boundary？

C90-27. Wave2 是否从 verified wave artifacts 派生 minimum synthesis？

C90-28. HITL2 是否记录 structured decision 到 active bundle？

C90-29. Readiness 是否是 final 前 deterministic checkpoint，不是 semantic quality judge？

C90-30. Final 是否从 verified bundle state 生成 artifact，并保持 terminal node 语义？

C90-31. 用户 final 后反馈是否统一进入 HITL2 repair/rerun，而不是 final hidden loop？

## 8. Future Boundary 检查

C90-32. Wave1/subagent expansion 是否被隔离为 Phase D/future capability track？

C90-33. 是否没有把 full subagent dispatch/collection/backfill/fan-in review 作为 foundation pass 条件？

C90-34. Future guidance 是否明确不是 current requirement？

C90-35. 需要真实 subagent 行为的未来验收是否明确不能 mock？

## 9. Reviewer 反馈格式建议

Reviewer 可以按下面格式反馈：

```text
C90-7: yes
C90-8: 缺少 xxx artifact 的归属
C90-26: wording 仍可能让人误解 Wave1 已完成 full subagent research
Q05-2: 建议把 placeholder marker 写成 required field
```

如果某个问题不能在 checklist 中定位，应新增：

```text
NEW: <问题描述>
impact: <为什么会影响后续实现或 review>
suggested location: <建议修改哪份 slice>
```
