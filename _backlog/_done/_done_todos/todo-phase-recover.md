# TODO: phase-recover（失焦时从 bundle 真相重定位）

> 状态: DONE（2026-07-22） | 原优先级: 中–高 | 最后同步: v0.40

## 结案依据

本 TODO 的 Agent-facing recovery path 已由当前 framework 交付，而不是仍缺一套新程序：

- `DPT_FRAMEWORK/RUN.md`、`command_playbook/start-research.md` 和 `shared-silent-execution.md` 已要求从 `BUNDLE_MAP.md`、`rb_status.json.current_node`、`rb_queue.json`、`rb_trace.jsonl` 重载，禁止用 chat memory 或 `current_gate` 猜 phase；
- `check-reentry.mjs --bundle <path> --at <target>` 已读取 bundle/control facts 并输出 `recovery.root_findings[]`。每个 `reachable` root 最多给一个 sanctioned nearest action，`missing_contract` 明确停止；
- post-Final 的唯一例外由 `operate-post-final-recovery inspect|apply|recover`、`check-reentry` 和既有 rerun path 承接；已提交 work-unit declaration 的窄恢复仍由 `recover-declaration` 承接。

因此不新增 trace cursor、generic recovery router、recover retry limit 或第二套 phase ownership。未来若出现当前 recovery contract 无法解释的真实 bundle drift，应以该直接缺口单独提出 change。

## Why

长跑会丢 phase 身份：忘了自己在哪、`current_gate`/`next_gate`/`current_node` 不一致、或仍按过期 chat 上下文行动。恢复路径应从 **active bundle root 的真相** reload，帮 Agent 重新进入正确 phase。

## 地基对齐（2026-07-15）

| 旧期望 | 现状 |
|--------|------|
| 读 `START_FROM_HERE.md` | ❌ **已弃用** — 用 `BUNDLE_MAP.md` + `rb_status.json.current_node`（harden-run-entry-and-bundle-map） |
| `check-reentry.mjs` | ✅ 已有（诊断 + file-observability） |
| `operate-work-unit dry-submit` | ✅ **新增** — 恢复前可批量预检契约 |
| Engine 自动路由回正确 phase | ❌ 仍禁止 — Engine 不做隐藏 phase router |
| 与 timeout/REDO | ✅ v0.14–v0.16 已落防误杀与 audited late recovery；bundle 真相恢复仍是本 todo 的独立层 |
| **repair-rerun 新增 infra** | |

### repair-rerun 已落地的基础设施

| 模块 | 做了什么 | 与本 todo 的关系 |
|------|---------|-----------------|
| `engine/consistency-validator.mjs` | workflow package 全量校验（manifest、gate binding、transition、dependency、contract） | 恢复前可验证 package 完整性 |
| `engine/helpers/post-final-recovery.mjs` | 最终产物恢复逻辑 | 已覆盖 post-final 场景 |
| `engine/helpers/handoff-helpers.mjs` | phase 间 handoff 状态检查 | 恢复时可验证 handoff 一致性 |
| `engine/helpers/canonical-topic-state.mjs` | topic 权威状态读取 | 恢复时读 topic 真相 |
| `cli/operate-work-unit recover-declaration` | 从 owners + hash 重建丢失的 ledger row | 恢复时修复声明丢失 |
| Gate hints 系统 | 每个 gate 失败返回结构化 `hints[]`（含 `repair_kind`、`missing_fact`、`write_to`、`rerun`） | Agent 不再需要读 engine 源码才能知道怎么修 |

### 仍然缺失

- **Agent-facing 恢复程序**：Agent 调用的 step-by-step 恢复流程（读 BUNDLE_MAP → 推推断最后可信 checkpoint → 对比 status → 产出 repair 指令）
- **trace→checkpoint 映射**：从 `rb_trace.jsonl` 推断最后可信 gate/phase 的确定性 helper
- **防反复 recover 硬上限**：避免无限恢复循环
- **不一致升级路径**：哪些 bundle 不一致必须人介入，哪些可自动修

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

先盘点 repair-rerun 已落地的 infra（post-final-recovery、consistency-validator、recover-declaration、handoff-helpers、gate hints）→ 确认哪些恢复路径已有 Engine 支持 → 再 `/opsx:explore` 补 Agent-facing 恢复程序 + trace→checkpoint 映射 + 防反复 recover 硬上限。

文档与程序一律以 BUNDLE_MAP + `current_node` 为准，禁止再写 START_FROM_HERE。
