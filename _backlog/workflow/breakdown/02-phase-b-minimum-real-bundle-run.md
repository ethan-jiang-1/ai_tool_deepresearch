---
schema: workflow-breakdown/v1
doc_id: wf-02-phase-b-minimum-real-bundle-run
title: "Phase B：Minimum Real Bundle Run"
status: draft-for-review
created: 2026-06-19
language: zh-CN
scope: workflow-foundation
layer: pre-openspec-requirements
source_baseline: _backlog/workflow/workflow-foundation-requirements.md
source_sections:
  - "4.5 Skeleton 工作也必须真实（Minimum Real Verifiable Action）"
  - "9. Stop Semantics"
  - "10. Gate Failure and Repair Lifecycle"
  - "11. Minimum Real Verifiable Actions"
  - "12. Phase B: Minimum Real Bundle Run"
source_context:
  - guidelines/project-charter.md
  - guidelines/command-experiments.md
  - DPT_FRAMEWORK/rb_templates/
  - DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs
  - DPT_FRAMEWORK/cli/validate-bundle.mjs
  - DPT_FRAMEWORK/cli/inspect-bundle.mjs
  - DPT_FRAMEWORK/engine/trace.mjs
depends_on:
  - wf-00-directory-contract
  - wf-01-phase-a-workflow-contract-skeleton
owns:
  - foundation 阶段最小真实 run bundle 验收路径
  - skeleton action 的真实可审计标准
  - gate failure repair/retry 的最小闭环要求
does_not_own:
  - 完整 research quality
  - full Wave1 subagent mechanics
  - production evidence ontology
  - real-environment long-running E2E
downstream_targets:
  - DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs
  - DPT_FRAMEWORK/cli/validate-bundle.mjs
  - DPT_FRAMEWORK/cli/inspect-bundle.mjs
  - experiments_playbook/exp_workflow-foundation/
---

# Phase B：Minimum Real Bundle Run

## 1. 本段目标

Phase B 用真实 `dpt_rb_*` run bundle 证明 workflow skeleton 不是纸面结构。它要求 instantiation 到 final 的最小路径能通过真实文件、真实状态、真实 gate output 和真实 trace 被审计。

这不是完整 Deep Research E2E。它的目标是证明：

- bundle 是真实实例化出来的；
- 每个 phase 至少产生一个真实 runtime artifact；
- 每个 non-terminal phase 通过对应 gate；
- gate failure 能进入 bounded repair loop；
- pass/fail claim 能从 bundle files、CLI output、trace 中追溯。

## 2. 引用来源与为什么引用

| 来源 | 为什么引用 |
|------|------------|
| baseline 第 4.5 节 | 确认 skeleton 也必须是真实可审计动作，不是 mock。 |
| baseline 第 9 节 | 定义 `stop: yes/no`、transient waiting、explicit escalation。 |
| baseline 第 10 节 | 定义 fail -> inspect/advice -> repair -> retry -> bounded escalation。 |
| baseline 第 11 节 | 给出每个 phase 的 minimum real verifiable action。 |
| `guidelines/project-charter.md` | Layer 2 不能造假，trace/receipt/state 不可手写伪造。 |
| `guidelines/command-experiments.md` | 真实 runtime context、trace-backed verdict、不能 console-only proof。 |
| `DPT_FRAMEWORK/rb_templates/` | 当前 canonical bundle files 的模板来源。 |
| `instantiate-run-bundle.mjs` | 当前 bundle 实例化入口。 |
| `validate-bundle.mjs` / `inspect-bundle.mjs` | 当前 bundle 检查入口。 |
| `trace.mjs` | durable trace evidence 的实现方向。 |

## 3. 范围内

Phase B 范围内：

- 使用真实 `dpt_rb_*` bundle，而不是 `_backlog/` scratch。
- 写入 canonical control files：
  - `rb_plan.md`
  - `rb_profile.yaml`
  - `rb_status.json`
  - `rb_queue.json`
  - `rb_trace.jsonl`
- 按 phase 产生最小真实 artifact。
- 每个 gate 使用 CLI 返回 structured feedback。
- 至少验证一次 gate fail 后的 repair/retry。
- 记录 retry、blocked、waiting/transient、escalation 到 runtime state/trace。

## 4. 范围外

Phase B 不负责：

- 完整资料搜集质量。
- 完整 citation/evidence scoring。
- 多 subagent 并发。
- 长时间真实联网 research。
- 最终报告的正式产品形态。

## 5. 目录归属和下游位置

未来验收最适合落在 controlled E2E playbook：

```text
experiments_playbook/exp_workflow-foundation/
```

原因：Phase B 不是纯 library test，它要证明 Agent 读取 Markdown node、执行动作、读取 CLI feedback 并 repair。`tests/` 可以覆盖 helper 和 CLI 单元行为，但不能单独证明 Agent Flow。

如果需要 disposable run，必须明确它是 test/disposable bundle，不把结果当真实研究产出。

## 6. 必须达标的结果

A02-1. 必须通过真实 instantiation path 创建 `dpt_rb_*`，不能手工 copy 模板声称实例化完成。

A02-2. Bundle 必须包含 canonical control files，且后续 phase 不依赖 chat memory 作为 state。

A02-3. 每个 phase 的 minimum action 必须写入真实 files/state/trace 中至少一类可审计 surface。

A02-4. Gate pass claim 必须能从 gate CLI output 和 runtime files 复查，不能只来自 Agent summary。

A02-5. 至少一个 gate failure 必须被真实触发，并走完整路径：

```text
fail -> inspect/advice -> Agent repair -> rerun same gate -> pass
```

A02-6. 默认 retry limit 为 3，超限时必须记录 explicit escalation/block；不能无限自修。

A02-7. Transient blocker 应进入 waiting/transient state，恢复后继续；它不是 user-visible stop。

A02-8. 任何需要伪造 evidence、receipt、trace 或 state 才能继续的情况必须 escalation，不能硬跑。

## 7. 风险、缺口、容易混淆点

R02-1. “最小真实”不是“随便写个空文件”。artifact 必须是 phase 合法产物，gate 能检查它的存在、解析性或状态。

R02-2. Log 可以辅助诊断，但不能单独作为 pass/fail proof。优先 proof 是 bundle files、gate CLI output、`rb_trace.jsonl`。

R02-3. Controlled E2E 如果使用 fixture，必须明确 fixture 身份，并走同一套 file/state/gate path。

R02-4. `stop: no` 不代表永不阻塞。它代表不能主动问用户，除非出现权限、用户决策、连续 gate failure、无法不造假继续等 explicit escalation 条件。

## 8. Review Questions

Q02-1. Phase B 的验收是否足够真实，能防止 mock 或 console-only proof？

Q02-2. 每个 phase 的 minimum action 是否都有可审计产物？

Q02-3. Gate failure repair loop 是否有明确 retry 上限和 escalation 记录？

Q02-4. waiting/transient 与 explicit escalation 的区别是否清楚？

Q02-5. Phase B 是否仍保持 foundation 范围，没有变成完整 deep research 质量验收？

