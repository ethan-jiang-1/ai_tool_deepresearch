# TODO: phase-recover（失焦时从 bundle 真相重定位）

> 状态: 待设计（已对齐地基） | 优先级: 中–高 | 更新: 2026-07-09

## Why

长跑会丢 phase 身份：忘了自己在哪、`current_gate`/`next_gate`/`current_node` 不一致、或仍按过期 chat 上下文行动。恢复路径应从 **active bundle root 的真相** reload，帮 Agent 重新进入正确 phase。

## 地基对齐（2026-07-09）

| 旧期望 | 现状 |
|--------|------|
| 读 `START_FROM_HERE.md` | ❌ **已弃用** — 用 `BUNDLE_MAP.md` + `rb_status.json.current_node`（harden-run-entry-and-bundle-map） |
| `check-reentry.mjs` | ✅ 已有（诊断 + file-observability） |
| `operate-work-unit dry-submit` | ✅ **新增** — 恢复前可批量预检契约 |
| Engine 自动路由回正确 phase | ❌ 仍禁止 — Engine 不做隐藏 phase router |
| 与 timeout/REDO | ✅ 见 `_backlog/_done/_closed_plans/delegated-attempt-timeout-and-redo-postmortem.md` — v0.14–v0.16 已落防误杀与 audited late recovery；bundle 真相恢复仍是本 todo 的独立层 |

## Current Direction

Agent 调用、trace 知情：

- 读 `BUNDLE_MAP.md`、`rb_status.json`（含 `current_node`）、`rb_queue.json`、`rb_trace.jsonl`、相关 artifacts
- 从 trace 推断最后可信 gate / phase checkpoint
- 与 status / 当前 task 对比
- 产出 repair 指令；bundle 不一致时再请人帮

Engine 可提供确定性 helper 总结 status/trace mismatch，**不得**变成隐藏路由器。

可用 CLI 表面：`check-reentry.mjs`、`operate-work-unit dry-submit`。

## Design Questions

- 恢复是 prose 程序、专用 phase node，还是 gate-like CLI？
- 要不要 Engine 持久化 `last_completed_gate` 审计游标？
- 防反复 recover 的硬上限？
- 哪些不一致必须人介入？
- 与 delegated timeout / late-accept 策略如何分工？

## Non-Goals

- 不替代 HITL
- 不做跨进程 crash recovery
- Engine 不自动 route phase
- 不把 chat memory 当 runtime state

## Next Step

在 BUG-069 / work-unit 契约面稳定后 explore；文档与程序一律以 BUNDLE_MAP + `current_node` 为准，禁止再写 START_FROM_HERE。
