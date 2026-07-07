## Why

`_backlog/bugs/BUG-057`、`BUG-044`、`BUG-056` 暴露的是同一层问题：run bundle 的 durable runtime truth 不足以稳定恢复和继续执行。当前 `rb_status.json` 不能直接回答“当前 phase node 是谁”，work-unit submit 成功后仍可能留下 stale `delegated_in_flight`，而 queue enqueue 又把 `queue_item_id` 命名约定当成 topic 身份权威，阻止合法的补充任务进入队列。

这三个缺陷必须先于 gate 降级、Wave1/Wave2 深度修复和并行吞吐优化处理；否则后续 change 会建立在不可靠的 status/queue 基础上。

## What Changes

- `rb_status.json` 增加 nullable `current_node` 运行时字段，用于记录当前已加载、Agent 应继续读取的 lifecycle phase node；新 bundle 初始为 `null`，首次成功 `enter-phase` 后写入具体 node。
- `enter-phase.mjs` 成功消费 route-bound handoff 后同步写入 `rb_status.json#/current_node`，但不接管 `current_gate` / `next_gate` gate window 权威。
- `advance-status.mjs` 在同步 source-gate status window 时保留 `current_node`，不得清除它；当前 accepted flow 是先 `enter-phase`，再 `advance-status`。
- Bundle 模板、`START_FROM_HERE.md`、active-bundle command guidance、reentry/diagnostic surfaces 应把 `current_node` 作为 durable reentry coordinate 公开给 Agent 和人类操作者。
- `operate-work-unit submit` 成功路径必须在返回前 reload/verify queue durable state，确认 bound `queue_item_id` 已移出 `delegated_in_flight` 并进入 terminal history；验证失败时 submit 不得静默成功。
- Queue topic validation 改为以显式 `payload.topic_slug` / `lineage.topic_slug` 为 topic identity authority。`queue_item_id` 解析只用于缺少显式 slug 时的 fallback，不得因 ID suffix 与显式 slug 不一致而阻止合法 supplementary task。
- Scope lock：本 change 不实现 gate degraded handoff、不移除 `content_dedup` blocking、不恢复 Wave1/Wave2 深度协议、不启用并行 claim。那些分别属于后续 `simple-gate-quality-loop`、`restore-wave-depth-contracts`、`harden-run-entry-and-agent-discipline`。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-phase-transition`: `enter-phase` 增加 current-node status sync；`advance-status` 保留 current-node。
- `runtime-reentry-debuggability`: reentry/debugging 可从 `rb_status.json.current_node` 定位当前 phase node。
- `bundle-start-from-here`: bundle boot entry 说明 `current_node` 是续跑坐标之一。
- `agent-command-surface`: active-bundle resume guidance uses non-null `current_node` instead of inferring the active phase from `current_gate` alone.
- `cmd-bundle-instantiation`: status template includes nullable `current_node` in the initial bundle state.
- `delegated-work-units`: successful submit must durably complete the bound queue demand and verify queue state before returning success.
- `agentic-queue`: queue demand identity and topic-scoped supplementary task behavior stay queue-owned and structured.
- `queue-input-validation`: explicit topic slug fields override queue-item-id-derived slug fallback for validation.
- `run-entry`: `DPT_FRAMEWORK/RUN.md` version banner is updated to the proposal-declared `v0.6`.
- `version-management`: repo-root `CHANGELOG.md` remains the single version-history authority; stale `DPT_FRAMEWORK/CHANGELOG.md` is removed to avoid dual changelog confusion.

## Impact

- Affected framework/repo areas during apply: `DPT_FRAMEWORK/schema/contracts/status.mjs`, `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl`, `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl`, `DPT_FRAMEWORK/command_playbook/start-research.md`, `DPT_FRAMEWORK/cli/enter-phase.mjs`, `DPT_FRAMEWORK/cli/advance-status.mjs`, `DPT_FRAMEWORK/cli/check-reentry.mjs` or related reentry helpers, `DPT_FRAMEWORK/cli/operate-queue.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, repo-root `CHANGELOG.md`, stale `DPT_FRAMEWORK/CHANGELOG.md` removal, and `DPT_FRAMEWORK/RUN.md`.
- Affected test/playbook assets during apply: `tests/schema/contracts/status.test.mjs`, `tests/integration/cli/instantiate-run-bundle.test.mjs`, `tests/integration/cli/validate-bundle.test.mjs`, `tests/integration/cli/enter-phase.test.mjs`, `tests/integration/cli/advance-status.test.mjs`, `tests/integration/cli/check-reentry.test.mjs`, `tests/engine/command-contract-docs.test.mjs`, `tests/engine/version-management.test.mjs`, `tests/engine/work-unit-submit.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs`, `tests/integration/cli/operate-queue-validation.test.mjs`, `experiments_env/shared/new-disposable-bundle.mjs`, `experiments_env/shared/work-unit-playbook-utils.mjs`, `experiments_env/shared/run-fixture-backed-case.mjs`, and `experiments_playbook/exp_handoff-witnessing/case-501-standard-handoff-witnessing.mjs`.
- No new npm dependencies. Implementation remains Node.js >=20, pure ESM, using existing `zod`, `yaml`, and Node built-ins.
- Versioning: DPT_FRAMEWORK behavior and Agent-facing contracts change; target framework version `v0.6`, with repo-root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` banner updated during apply, and stale `DPT_FRAMEWORK/CHANGELOG.md` removed.
