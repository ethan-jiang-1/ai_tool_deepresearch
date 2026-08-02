## Why

`case-51-standard-happy-path` 的 retained report 证明：三个 completion-declared `standard` health target 都因不存在的 `_work_units/_index.json` 被计为 `ISSUES`。这不是该 case 缺少一个应有的 work-unit lifecycle，而是 health implementation 将 work-unit authority 提升为 standard 的 blocking 要求，超出了已接受的 EXO-002 contract。

现在修正可让 fast deterministic regression 的 health 只裁决其明确承诺的 light、Gate diagnostics 和 trace/log timeline；work-unit lifecycle 仍被观察并诊断，但只在 heavy profile 中作为 blocking provenance obligation。这样 case fixture 不必伪造不属于其 reader question 的 work-unit authority。

## What Changes

- 将 `standard` health profile 的 required sections 对齐为 light checks 加 Gate diagnostics 和 trace/log timeline，不再把 `work_units` 设为 required。
- 保留所有 profile 的 work-unit lifecycle projection；当 standard target 观察到缺失或异常的 work-unit authority 时，报告继续显示 section-level diagnostic，但不再单独改变 top-level health status。
- 保持 `heavy` 对 `work_units` 以及 ledger、receipt、output file、cache trail 和 dedup/provenance checks 的 required scope 不变。
- 更新 profile-table 与 verifier tests，明确 standard 的 optional work-unit observation 和 heavy 的 required authority 边界。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `experiment-observability`: EXO-002 的 standard health required scope 不再包含 work-unit lifecycle authority；heavy 保留该 required authority。

## Decision Boundary

已接受的 `openspec/specs/experiment-observability/spec.md` 是 profile policy 的 Source of Record；每个 selected run 的 native health report 是该 policy 在一个 target 上的 direct runtime fact。最短合法闭环是：profile table 按 accepted scope 标记 section requiredness -> verifier 继续读同一 work-unit authority -> top-level status 只汇总 required section issues。它删除一条超出 contract 的 blocking rule，而不增加状态、validator、fallback、scheduler 或 fixture。

这不引入新的 named state、projection、command 或 reader-facing view：现有 `work_units` projection 继续回答“若存在 work-unit authority，它的 lifecycle 是否可诊断”；`standard` 的 reader 可以在既有 required sections 处停止，`heavy` 的 reader 仍可把 work-unit provenance 当作闭合条件。用户已决定 high-frequency regression 只承诺快而广的 deterministic coverage；Agent 负责按批准 task 做机械实施和验证；Engine 仍由同一 verifier 裁决 profile-aware health status。

本 change 不修改 `DPT_FRAMEWORK/`，因此不需要 framework version bump。

## Impact

- `experiments_env/shared/health-report-schema.mjs`
- `experiments_env/shared/verify-bundle-health.mjs`，仅在实现需要明确 optional projection status 时调整
- `tests/schema/health-report-schema.test.mjs`
- `tests/integration/experiments_env/verify-bundle-health.test.mjs`
- `openspec/specs/experiment-observability/spec.md`（归档时同步已接受 EXO-002）
