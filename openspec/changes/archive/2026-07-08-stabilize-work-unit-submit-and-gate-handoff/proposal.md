## Why

FOSE Europe Engelberg 2026 这次 run bundle 暴露了三类会互相放大的运行时问题：sub-agent 写出的结果/receipt/cache 形状有可预期的 LLM 漂移，`operate-queue` / `operate-work-unit` 会把 `--help` 当 bundle 路径产生垃圾目录，gate 失败后又容易被手改 status 绕过合法 handoff，最终让 Wave2/HITL2/final 的生命周期证据断链。

本 change 来源于 `_backlog/plans/fose-run-bugfix-batch-plan.md` 的 Change 1：`stabilize-work-unit-submit-and-gate-handoff`，覆盖 BUG-059、BUG-060、BUG-063。它先把 submit 和 handoff 的确定性边界稳住，避免后续并行 delegated 执行把同类摩擦成倍放大。

## What Changes

- 在 `operate-work-unit submit` 路径加入窄范围 canonicalization：只接受单层 `result` wrapper、可从 work-unit record 安全补齐的 receipt schema default 与 binding identity、同一 cache leaf 下 `page-content.md` 到 `page.md` 的规范化、以及 identity 全匹配且结果路径在 assigned work-unit dir 内的 nonce 归一化。
- 所有 normalization 都必须可诊断且必须物化 canonical authority surface：成功 submit 的 assigned `result.json`、`runtime-receipt.jsonl`、canonical cache `page.md`、ledger row 保持 canonical shape，trace/log/submit output 或等价诊断面记录发生过哪些归一化；错误的 `work_id`、`queue_item_id`、`kind`、路径逃逸、wrapper sibling key、冲突 receipt binding identity、缺失 cache authority 仍然 fail closed。
- 给 `operate-queue.mjs` 和 `operate-work-unit.mjs` 增加 `--help` 与 suspicious bundle argument guard：help 调用只输出 usage 或清晰参数错误，绝不创建 `--help/` 目录；bundle positional 以 `-` 开头时，在加载 queue/work-unit runtime、写 log/trace 或创建目录之前拒绝。
- 收紧 gate handoff cascade：下游 phase/readiness/final 只能由 gate 产生的 clean/degraded trace-durable handoff 加 route-bound entry witness 授权；status 漂移、artifact/file presence、`current_node` 或手写状态不能替代 source-gate pass。
- 明确不产出：不新增 broad `advance-status --force`；不放松 source_claims/cache coverage 的 fetched-source 约束；不把 Change 2 的 Phase-owned reference materialization 合并进来；不新增依赖、不引入 Python、不修改 agentic phase 并行策略。
- 版本：需要 version bump，target version 为 `v0.9`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `delegated-work-units`: 增加 work-unit submit 的窄 canonicalization 合同，覆盖 result wrapper、receipt schema/default 与 binding identity canonicalization、cache leaf file normalization、constrained nonce normalization，并保持 ledger/receipt authority fail-closed。
- `queue-input-validation`: 增加 queue/work-unit runtime CLI 的 help 与 suspicious bundle argument guard，要求在任何 runtime side effect 前处理参数误用。
- `cli-phase-transition`: 强化 source-gate status sync 与 drift audit 的审查边界，明确 failed/missing handoff、manual bypass、premature downstream/final status 不能被接受。
- `gate-skeleton`: 强化 lifecycle gate preflight/readiness/final 对 route-bound handoff evidence 的依赖，并要求诊断优先指向 root cause，避免 cascade symptom 指导手改 authority 文件。

## Impact

- 影响的未来代码面包括 `DPT_FRAMEWORK/engine/work-unit-core.mjs`、`DPT_FRAMEWORK/cli/operate-work-unit.mjs`、`DPT_FRAMEWORK/cli/operate-queue.mjs`、`DPT_FRAMEWORK/cli/advance-status.mjs`、gate helper/preflight/readiness/final/audit 相关模块。
- 影响的未来测试面包括 `tests/engine/` 下的 work-unit submit normalization/rejection 覆盖，以及 `tests/integration/cli/` 下的 help guard、advance-status、handoff witnessing、readiness/final/audit 回归。
- 需要更新 `openspec/governance/req-registry.yaml` 中 `DEW-012`、`QIV-005`、`CPT-008`、`GSK-010`；本 change 不新增 capability prefix。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
