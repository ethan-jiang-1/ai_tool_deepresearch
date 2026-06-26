# Logger (Delta)

> req: LOG-004, LOG-005

## ADDED Requirements

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
