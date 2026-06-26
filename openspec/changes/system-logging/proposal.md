## Why

项目有完整的 logger（`engine/logger.mjs`，LOG-001/002/003 spec + 76行测试）和 trace writer（`engine/trace.mjs`，TRW-001/002 spec），但生产代码零使用。10 个 gate CLI 中 8 个绕过共享审计 helper 直接 inline `appendFileSync` 写 `rb_trace.jsonl`，跳过 `_logs/run.log`——导致两个文件记录永久漂移。引擎注入点（LOG-003）已就位但无人传 logger。`traceInit`/`traceSummary` 生产从不调用。4 个 sink 无 bundle 无法缝合。`inspect-bundle.mjs` 只看文件存在不看内容。

这不是 greenfield 设计——基础设施和 charter 哲学（"Trace 是真相，Log 是解释"）都已经在了。问题是半成品没接上。后续所有功能（repair、fork、HITL、evidence pipeline）的排障都依赖日志能读、trace 可信。在这个基础建设补上之前，越往后欠的债越多。

参考来源：`_backlog/todo-system-logging.md`（用户原话："上线后的日志实在太重要了，我们看怎么把这事儿做对"）。

## What Changes

- **统一 gate 写路径**：8 个 inline gate CLI 改用共享 `writeGateAttempt()`，消灭 `_logs/run.log` 与 `rb_trace.jsonl` 漂移
- **激活 logger.mjs**：`queue-manager.mjs` 和 `subagent-relay.mjs` 加 `createRunLogger()` 并行于已有 `ensureTrace()`；gate CLI 统一走 `writeGateAttempt()` 自动获得 log 输出
- **加 bundle 跨 sink 缝合**：bundle 实例化时生成 `bundle` 写入 `rb_status.json`，所有 log/trace 入口读取并写入
- **激活死 trace 方法**：`traceInit`/`run_start` 在 bundle 创建时调用，`traceSummary` 通过 `inspect-bundle --summary` 暴露
- **建立 .mjs / .md 日志约定**：新增 `guidelines/logging-conventions.md`——level 选择、log vs trace 边界、.mjs 代码模式、.md phase node 日志段约定
- **扩展 inspect-bundle 为可观测性入口**：`--summary`（pass/fail 表）、`--timeline`（跨 sink 时间线）、`--log`（tail 日志）

## Capabilities

### New Capabilities

- `logging-conventions`: 系统级日志约定——跨 .mjs 和 .md 的诊断记录规范。覆盖 bundle 生成与传播、单一诊断日志文件原则、level 选择约定、gate 写路径统一、engine logger 激活、phase node ## Log 段格式、inspect-bundle 可观测性扩展

### Modified Capabilities

- `logger`: 新增 LOG-004——bundle 实例化时写首条 log 行；LOG-005——`logToRun()` 一次性 API + `createRunLogger()` 工厂
- `trace-writer`: 新增 TRW-003——trace 入口包含 bundle 字段；TRW-004——`traceInit` 写 `run_start` 在 bundle 创建时激活、`traceSummary` 经 `inspect-bundle --summary` 激活（`run_end` 终态 marker 延至 Phase 2，见 design OQ#4）
- `gate-skeleton`: 扩展 GSK-005——**所有** gate CLI MUST 使用 `writeGateAttempt()`，禁止 inline `appendFileSync` 写 trace

## Impact

- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — `writeGateAttempt()` 加 bundle 读取逻辑
- `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs`（8 个）— inline trace → `writeGateAttempt()`
- `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` — 生成 bundle，写入 `rb_status.json`，调用 `traceInit`
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — 加 `createRunLogger()`
- `DPT_FRAMEWORK/engine/subagent-relay.mjs` — 加 `createRunLogger()`
- `DPT_FRAMEWORK/cli/inspect-bundle.mjs` — 扩展 `--summary`/`--timeline`/`--log`
- `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl` — 加 `bundle` 字段
- `DPT_FRAMEWORK/schema/contracts/status.mjs` — `StatusSchema` 加 `bundle: z.string()`
- `guidelines/logging-conventions.md` — **新文件**
- `guidelines/README.md` — 更新 reading order
- `guidelines/framework-runtime-boundary.md` — 加前向指针
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-*.md`（10 个）— 加 `## Log` 段
- `openspec/specs/logger/spec.md` — 加 LOG-004
- `openspec/specs/trace-writer/spec.md` — 加 TRW-003, TRW-004
- `openspec/specs/gate-skeleton/spec.md` — 扩展 GSK-005
- `openspec/governance/req-registry.yaml` — 登记新 requirement ID
- `experiments_playbook/exp_system-logging/` — **新目录**：command experiment（group 7），2 个 case 验证完整 logging 闭环
- `experiments_env/prototype-system-logging/` — fixture 目录（如需要）
