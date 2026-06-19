> req: LOG-001, LOG-002, LOG-003

## Purpose

定义极简结构化 logger——默认零配置，高级按需开文件。与 `trace.mjs` 互补（trace=审计 trail，logger=诊断 detail）。Logger 不替代 trace，也不写入 `rb_trace.jsonl`。

## ADDED Requirements

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
