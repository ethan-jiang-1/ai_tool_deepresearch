## Why

生产 bundle 的 `_logs/run.log` 49 次 `complete()` 只 1 条记录，0 条 `ledger_append`。根因：`logEvent()` 只放在 happy path 上——engine 入口/出口/错误路径全静默，gate fail 和 repair attempt 不记 log，sub-agent spawn prompt 完全没提 `_logs/run.log`。整个系统目前没有可用的诊断日志。

## What Changes

- **Engine 出入口全覆盖**：`enqueue/claim/complete/fail/preempt/saveQueue/loadQueue` 每个入口记 entry log，每个 return 路径记原因。`stageSubagentSlots/commitSlotResult/collectAndMerge/convergeRepair/forkRouter` 同样全覆盖
- **Gate 反馈记 log**：gate attempt（pass 或 fail）记一行，repair loop 记 attempt 和 action
- **Sub-agent 具体指令**：`buildSpawnPrompt()` 追加 6 种具体事件（搜索开始/搜索完成/抓取完成/文件写入/错误/工作完成），每种给格式示例，说清楚用什么 level、不记什么
- **Heartbeat**：`createRunLogger()` 初始化时写 `logger_ready` + pid
- **不改变**：logger 文件格式、level 体系、appendFileSync 机制

## Capabilities

### New Capabilities
- *无*

### Modified Capabilities
- `logger`: LOG-004（修改：heartbeat 加入现有 run-scoped logger 初始化）、LOG-006（新增：Engine hot-path 全覆盖）、LOG-007（新增：sub-agent spawn prompt 含 run.log 指令）
- `logging-conventions`: LOC-006（修改：Engine 激活范围扩大）、LOC-010（新增：sub-agent 纳入 long-running phase 诊断范围，注册到 registry）

## Impact

- `DPT_FRAMEWORK/engine/queue-manager.mjs` — 所有队列操作函数加 entry/exit log
- `DPT_FRAMEWORK/engine/subagent-relay.mjs` — 所有 relay 函数加 entry/exit log + `buildSpawnPrompt()` 加 sub-agent 指令
- `DPT_FRAMEWORK/engine/logger.mjs` — `createRunLogger` 加 heartbeat
- `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` — gate attempt 加 log（或在 gate-helpers 的 `writeGateAttempt` 里加）
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` — 更新 sub-agent logging 约定
