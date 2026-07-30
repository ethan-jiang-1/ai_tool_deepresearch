## Why

仓库已经有 requirement、main-spec 与 verification-routing 的治理检查，但 apply 和 archive 时对它们的
使用仍部分依赖 Agent 记忆的流程，而不是一个闭合、可观察的控制环。于是 advisory review、可持久化的
修复任务与不可逆的 archive transition 之间存在空档：检查曾经运行过，并不等于当前选中的 change 仍有一个
确定性的 owner 证明其机械 closeout 前提全部成立。

本 change 依据
`_backlog/plans/session-drift-guardrail-analysis/08-final-recommendation-openspec-feedback-loop.md`
中的证据与最终建议。它刻意独立于
`_backlog/plans/framework-contract-remediation-openspec-sequence.md` 中的 C5：C5 仍等待真实 search provider，
而本 change 面对的是已有本地证据、无外部 provider 前置条件的 lifecycle 缺口。

新增语义层服务于执行中的 Agent 与未来维护者的一个有界问题："这个被选中的 active change 是否满足机械
closeout 前提；若满足，canonical archive transition 是否已完成？" 它保留会改变答案的区别：artifact/task
状态、必需 review marker、strict validation、每一项既有 governance 结果和 native archive 结果。它刻意不
裁决 semantic review 质量、delta/main merge 判断、测试执行、provider 或 host 事实。读者可以在 finalizer
结果处停止对这个机械问题的重建，或得到明确的最早 root，而不必跨多个 adapter 拼接路径和 checker 顺序。

## What Changes

- 新增 `change-feedback-loop` capability（计划 requirement prefix 为 `CHF`），定义 durable plan/closeout
  review task、operation-time guidance 与唯一 deterministic archive-finalization Interface 的项目级契约。
- 增加 Agent-facing review posture，并通过 OpenSpec operation guidance 送达当前 apply/archive entry。finding
  继续写为普通未完成 task；guidance 只是送达机制，不是 pass/fail 证据。
- 增加 repository-owned governance finalizer：从 OpenSpec 解析被选 change，只校验机械 closeout 事实，调用
  既有 governance checkers，并在 Agent 完成 spec sync 与语义 re-comparison 后委托 native OpenSpec archive
  执行 canonical move。
- 让 project-supported archive entry surface 调用同一个 finalizer，不再分别拼接 checker 顺序或 raw move。
  当直接前提失败时，finalizer 返回 root-first structured feedback 与同一 rerun coordinate。
- 增加 focused deterministic verification，覆盖 prerequisite short-circuit、supported-entry routing 与 native
  archive success path。此 change 不断言 Agent behavior，因此不需要 `agent_flow_e2e` claim。

finalizer 是 archive seam 上的 deep Module：caller 只提供一个 change selection 并得到稳定结果；path discovery、
task parsing、checker invocation 与 native archive response handling 都封装在实现中。它的 net simplification 是
删除 adapter-specific 的重复排序与 raw move，而不新增第二条 spec-merge path、persistent lifecycle state、retry
controller、rollback protocol 或 semantic-review receipt。

责任边界保持明确：Agent 负责 semantic review、将 finding 写入 task、执行合法修复并完成 delta/main sync；
Engine finalizer 只裁决直接的机械事实并调用 native transition；OpenSpec CLI 继续拥有 validation、collision
handling、archive naming 与 canonical move。仅当需要新的语义、风险或权限决定时才询问用户。

本 change 不改变 `DPT_FRAMEWORK/` runtime behavior，因此不需要 framework version bump。

## Capabilities

### New Capabilities

- `change-feedback-loop`: 定义本仓库 OpenSpec change 的有界 review 与机械 archive-finalization contract。

### Modified Capabilities

- 无。既有 requirement-traceability 与 verification-routing checker 继续各自拥有其 authoritative contract；
  本 capability 仅复用其结果，不重定义 checker 语义。

## Impact

- 受影响的 repository surface：`openspec/config.yaml`、`openspec/governance/`、root Agent routing guidance、
  OpenSpec apply/archive adapter，以及 `tests/` 下的 focused tests。
- 增加一个 project lifecycle CLI/module 与一份 advisory guideline；不增加依赖、runtime-bundle state、provider
  registry、通用 Agent controller，也不替代 native OpenSpec archive。
- 后续 change 将获得 durable review marker 与单一 supported mechanical closeout path；既有 archived change
  保持历史记录，不做迁移。
