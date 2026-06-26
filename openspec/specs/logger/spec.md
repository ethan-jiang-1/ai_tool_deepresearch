# Logger

> req: LOG-001, LOG-002, LOG-003, LOG-004, LOG-005

## Purpose

定义极简结构化 logger——默认零配置，高级按需开文件。与 `trace.mjs` 互补（trace=审计 trail，logger=诊断 detail）。Logger 不替代 trace，也不写入 `rb_trace.jsonl`。

## Requirements

### Requirement: Logger default zero-config usage

`createLogger()` 无参数时 SHALL 返回 console-only logger，所有输出到 `console.log/warn/error`。

每个 log entry SHALL 包含 ISO 8601 时间戳、level 标签（DEBUG/INFO/WARN/ERROR）、message 和可选的 JSON detail。

#### Scenario: Default logger writes to console

- **WHEN** `const log = createLogger(); log.info('test', { key: 'val' });`
- **THEN** console 输出 SHALL 包含 `[2026-...] INFO test {"key":"val"}` 格式的行

#### Scenario: Default logger respects level filter

- **WHEN** `const log = createLogger({ level: 'warn' }); log.info('should not show'); log.warn('should show');`
- **THEN** `info` 消息 SHALL NOT 出现在 console 或文件，`warn` 消息 SHALL 出现

### Requirement: Logger file output via option

`createLogger({ file: '<path>' })` SHALL 在指定路径 append 日志行。文件目录 SHALL 自动创建（`mkdir recursive`）。

`file` option 缺失时 SHALL NOT 写任何文件——仅 console 输出。

#### Scenario: Logger with file writes to path

- **WHEN** `const log = createLogger({ file: 'dpt_rb_x/_logs/run.log' }); log.warn('disk full', { remaining: 0 });`
- **THEN** `dpt_rb_x/_logs/run.log` 文件 SHALL 包含 `[2026-...] WARN disk full {"remaining":0}` 行
- **AND** console SHALL 同步输出相同内容

### Requirement: Logger injection pattern in engine

Engine 公共函数 SHALL 接受 `logger = null` optional trailing parameter。

`logger = null` 时 SHALL 静默跳过所有 log 调用——不抛错、不输出。

`logger` 传入时 SHALL 使用 `logger.debug/info/warn/error` 记录 engine 内部事件。

#### Scenario: Logger null is silent no-op

- **WHEN** `assessNode('phases/phase-wave0.md', state, runtime, trace, null)` 被调用
- **THEN** 所有内部 `if (logger) logger.xxx(...)` 调用 SHALL 被跳过，无任何输出

#### Scenario: Logger injected records engine events

- **WHEN** `assessNode('phases/phase-wave0.md', state, runtime, trace, logger)` 被调用
- **THEN** engine SHALL 在关键节点（entry、file read、dep resolved、load complete/failed）通过 logger 记录事件

### Requirement: Run-scoped logger creation at bundle initialization

`instantiate-run-bundle.mjs` SHALL 在创建新 bundle 时调用 `logToRun(bundlePath, 'info', 'run_start')` 写入首条日志行。

此后，gate CLI 通过 `writeGateAttempt(bundlePath, result)`（内部改用 `logToRun`）写入日志；engine 通过 `createRunLogger(bundleDir)` 获取 logger 实例写入日志。

`logToRun()` SHALL 自动从 `rb_status.json` 读取 `bundle` 并写入每行。caller 无需手动传入 `bundle`。

#### Scenario: Bundle creation writes first log line

- **WHEN** `instantiate-run-bundle.mjs <name>` 成功创建 bundle
- **THEN** `_logs/run.log` SHALL 包含首行 `[ISO8601] INFO run_start bundle=my-research`

#### Scenario: Subsequent log entries share same bundle

- **WHEN** gate CLI 或 engine 在 run 生命周期中向 `_logs/run.log` 写入
- **THEN** 所有行 SHALL 包含与首行相同的 `bundle`

### Requirement: One-shot log function and run-scoped logger factory

`logger.mjs` SHALL 导出两个便捷函数，封装 `_logs/run.log` 路径约定：

1. **`logToRun(bundlePath, level, msg, detail?)`** — 一次性写入。自动从 `rb_status.json` 读取 `bundle`，构造 `[ISO8601] LEVEL msg bundle=<name> {detail}` 格式，append 到 `<bundlePath>/_logs/run.log`。目录不存在时自动创建。写失败时静默返回，不抛错。

2. **`createRunLogger(bundlePath)`** — 返回 `{ info, warn, error, debug }` 实例。内部调用 `createLogger({ file: join(bundlePath, '_logs', 'run.log'), bundle })`，`bundle` 从 `rb_status.json` 自动读取。返回的 logger 所有方法自动包含 `bundle`。

两个函数 SHALL NOT 引入新依赖——仅使用 `logger.mjs` 已有的 `node:fs`、`node:path` 导入。

#### Scenario: logToRun one-shot usage

- **WHEN** `logToRun(bundlePath, 'info', 'phase:wave0 START')` 被调用
- **THEN** `_logs/run.log` SHALL append 一行，包含时间戳、INFO level、消息和 bundle
- **AND** caller SHALL NOT 需要知道日志文件路径或格式

#### Scenario: createRunLogger for engines

- **WHEN** `const log = createRunLogger(bundleDir)` 被调用
- **THEN** `log.info('enqueue', { work_id })` SHALL 写入含 bundle 的日志行
- **AND** caller SHALL NOT 需要传入 `bundle` 或构造文件路径
