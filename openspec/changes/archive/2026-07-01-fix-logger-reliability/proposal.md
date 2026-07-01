## Why

生产 bundle 的 `_logs/run.log` 49 次 `complete()` 只 1 条记录，0 条 `ledger_append`。根因不是单纯“日志少”，而是事故现场因果链断裂：engine 入口/出口/错误路径不稳定，gate early error 与 diagnostic artifact 指针不完整，repair loop 和 sub-agent 执行过程缺少可检索事件。现场出错时，run.log 无法回答“在哪个 phase/queue/gate/sub-agent、当时状态、失败原因、下一步 repair 动作”。

## What Changes

- **Engine 事故级覆盖**：`enqueue/claim/complete/fail/preempt/saveQueue/loadQueue` 与 relay hot path 记录 attempt/done/reject/failed/empty/exception 等稳定事件；失败前写原因
- **Gate 共享入口**：以 `writeGateAttempt()` 为唯一 gate logging 入口，覆盖 pass/fail、invalid input/config error、diagnostic artifact path、inspect/advice count
- **Repair loop 留痕**：phase nodes 在 gate fail 后记录 repair loop start/action/done/escalated/degraded，尤其 wave0/wave1/wave2 supplementary loop
- **Sub-agent 具体指令**：`buildSpawnPrompt()` 用现有 `log-event.mjs` CLI 指示 6 种具体事件（搜索开始/搜索完成/抓取完成/文件写入/错误/工作完成），说明 level 与禁止记录内容
- **Heartbeat**：`createRunLogger()` 初始化时写 `logger_ready` + pid
- **Guideline 对齐**：`guidelines/logging-conventions.md` 的核心原则仍有效，但 LOC-006 旧 closed-set 已过时；本 change 的 accepted spec 同步后必须更新 guideline，避免继续指导实现使用摘要级日志
- **不改变**：logger 文件格式、level 体系、appendFileSync 机制

## Capabilities

### New Capabilities
- *无*

### Modified Capabilities
- `logger`: LOG-004（修改：heartbeat 加入现有 run-scoped logger 初始化）、LOG-006（新增：Engine hot-path 事故级覆盖）、LOG-007（新增：sub-agent spawn prompt 使用 log-event CLI）
- `logging-conventions`: LOC-006（修改：closed-set 摘要升级为事故级诊断事件集）、LOC-010（新增：repair loop 与 sub-agent 纳入 long-running phase 诊断范围）

## Impact

- `DPT_FRAMEWORK/engine/queue-manager.mjs` — 队列 hot path 按事故级 closed-set 写 attempt/outcome/reject/fail/empty/exception log
- `DPT_FRAMEWORK/engine/subagent-relay.mjs` — relay bundle-aware callers 按事故级 closed-set 写 lifecycle/receipt/commit/repair log + `buildSpawnPrompt()` 加 sub-agent 指令
- `DPT_FRAMEWORK/engine/logger.mjs` — `createRunLogger` 加 heartbeat
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — gate attempt、early error、failure diagnostic pointer 统一写 log
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-*.md` 与 shared repair/subagent docs — 更新 repair loop、terminal/degraded gate fail 与 sub-agent logging 约定
- `guidelines/logging-conventions.md` — 当允许修改 change 目录外文件时，将旧 LOC-006 摘要清单替换为 accepted accident-grade event set，并保留 trace/log authority 原则
