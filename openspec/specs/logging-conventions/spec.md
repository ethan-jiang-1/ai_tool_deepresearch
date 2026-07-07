# Logging Conventions

> req: LOC-001, LOC-002, LOC-003, LOC-004, LOC-005, LOC-006, LOC-007, LOC-008, LOC-009, LOC-010, LOC-011

## Purpose

定义系统级日志约定——跨 `.mjs`（JS engine/CLI）和 `.md`（Agent phase node）的诊断记录规范。在已有 `logger.mjs`（Logger capability）和 `trace.mjs`（Trace Writer capability）的基础上，建立"什么时候记、记什么、记到哪、用什么 level"的统一规则，使每次 run 的行为可追溯、可排障。

本 capability 不定义新的 logger API 或 trace API——只定义使用它们的约定。
## Requirements
### Requirement: Run ID generation and propagation

The system SHALL use the bundle name as `bundle`, persisted in `rb_status.json`. All entries written to `rb_trace.jsonl` and `_logs/run.log` SHALL include the bundle field so diagnostic sinks can be stitched into a single timeline by `bundle` and `ts`.

`bundle` SHALL be read from active bundle state, normally `rb_status.json`, not from chat memory, process memory, environment variables, or implicit shell state.

#### Scenario: Run ID is the bundle name

- **WHEN** `instantiate-run-bundle.mjs my-research` creates a new bundle
- **THEN** `rb_status.json` SHALL contain `"bundle": "my-research"`
- **AND** bundle directory naming SHALL remain consistent with that bundle identifier

#### Scenario: Engine trace entries include bundle

- **WHEN** queue, work-unit, or gate Engine code writes trace entries
- **THEN** each JSONL row SHALL include the bundle identifier

### Requirement: Single diagnostic log file per bundle

Each run bundle SHALL have one diagnostic log file at `<bundle>/_logs/run.log`. All `.mjs` and `.md` diagnostic records SHALL append to that file in timestamp order.

The file SHALL be free-text with a machine-parseable envelope. It SHALL NOT be a pass/fail verdict source; verdicts come from `rb_trace.jsonl`, gate output, or accepted verdict artifacts.

#### Scenario: All gate attempts appear in one log file

- **WHEN** multiple gate CLIs run in one bundle
- **THEN** all gate attempt log lines SHALL appear in the same `_logs/run.log`

#### Scenario: Engine and Agent log entries coexist

- **WHEN** queue, work-unit, gate, and phase-doc logging all occur in one run
- **THEN** their diagnostic log lines SHALL append to the same bundle log file

### Requirement: Log level conventions

Log levels SHALL preserve their existing meanings for runtime diagnostics. Examples SHALL use work-unit, queue, gate, cache, and file-observability events when describing delegated work. Delegated examples SHALL identify `work_id`, `queue_item_id`, `kind`, or `receipt_nonce` instead of non-work-unit channel fields.

#### Scenario: delegated debug example uses work-unit context

- **WHEN** a delegated diagnostic is logged at DEBUG
- **THEN** the example detail SHALL name work-unit binding context

### Requirement: One-shot log API

`logToRun(bundlePath, level, msg, detail?)` SHALL remain the one-shot bundle log helper. Delegated examples SHALL use work-unit detail fields and SHALL NOT teach non-work-unit delegated channels as production logging context.

#### Scenario: one-shot log records work-unit detail

- **WHEN** `logToRun()` is used for delegated repair or submit diagnostics
- **THEN** the detail object SHALL carry work-unit identity where available

### Requirement: Run-scoped logger for engine hot paths

系统 SHALL 提供 `createRunLogger(bundlePath)` 函数，返回绑定到 bundle `_logs/run.log` 的 logger 实例 `{ info, warn, error, debug }`。

该函数 SHALL：
- 内部调用 `createLogger({ file: join(bundlePath, '_logs', 'run.log'), bundle })`——`bundle` 从 `rb_status.json` 自动读取
- 返回的 logger 实例所有方法自动包含 `bundle`
- 目录不存在时 `createLogger` 内部自动创建

#### Scenario: Engine creates run-scoped logger

- **WHEN** `const log = createRunLogger(bundleDir)` 在 engine 入口被调用
- **THEN** `log` SHALL 是包含 `info`, `warn`, `error`, `debug` 四个方法的对象

#### Scenario: All engine log entries include bundle

- **WHEN** `log.info('enqueue', { work_id: 'wave0-source-foo' })` 被调用
- **THEN** 日志行 SHALL 自动包含 `bundle`，caller 无需传入

### Requirement: Agent log CLI

The Agent-facing log CLI SHALL allow Phase Agents and sub-agents to write bundle diagnostic records without inline JavaScript. Delegated examples SHALL bind work-unit identity and accepted log levels.

#### Scenario: sub-agent log CLI uses work-unit fields

- **WHEN** a sub-agent writes a diagnostic event
- **THEN** the CLI detail JSON SHALL include assigned work-unit identity and receipt nonce where available

### Requirement: Phase node log convention

每个 phase node Markdown 文件（`workflows/nodes/phases/phase-*.md`）SHALL 包含 `## Log` 段，声明该 phase 需要记录的日志点。

`## Log` 段 SHALL 引用 `log-event.mjs` CLI 作为记录手段——不让 Agent 手写 JS 格式字符串。

格式要求：
- 声明记录命令：`node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`
- 以表格列出至少 2 个日志点：phase START 和 phase END，直接给出可复制的 bash 命令
- 额外的 phase 特定日志点（如"每个 topic 完成"、"queue refill"）在表格中列出

#### Scenario: Phase node declares log commands

- **WHEN** Phase Agent 读取 `phase-wave0.md`
- **THEN** 文件 SHALL 包含 `## Log` 段，列出可直接复制的 `log-event.mjs` 命令

#### Scenario: Agent copies log command

- **WHEN** Phase Agent 开始执行某 phase
- **THEN** Agent SHALL 复制 `## Log` 段中的 bash 命令并执行，无需构造格式字符串或路径

### Requirement: Logger activation in engines

Engine modules for queue, work-unit lifecycle, ledger append, gate provenance, and file observability SHALL activate `createRunLogger` at bundle-aware entrypoints and SHALL emit accident-grade attempt/outcome diagnostics for public hot-path functions. Non-success paths SHALL include the reason before returning or throwing when a run-scoped logger is available.

Gate CLIs SHALL use `writeGateAttempt()` as the only gate logging entrypoint for pass/fail results. Early invalid input/config errors SHALL also be logged when a bundle path is available. Failure diagnostic artifact paths SHALL be discoverable from run.log detail.

#### Scenario: Work-unit operations log at function granularity

- **WHEN** a work-unit claim, submit, fail, timeout, abandon, retry, inspect, or late-submit rejection occurs
- **THEN** run log diagnostics SHALL identify the operation, result, and available work-unit binding context

### Requirement: Inspect-bundle observable extension

`inspect-bundle.mjs` SHALL 支持三级视图：

1. **默认（无 flag）**：保持现有行为——验证 15 个必需文件/目录存在性（含新增的 `_logs/run.log`）
2. **`--summary`**：读取 `rb_trace.jsonl`，调用 `traceSummary()`，输出 `{ events: N, passed: N, failed: N }` 及每个 gate 的 pass/fail 表。额外输出 `_logs/run.log` 的行数统计（`log: N lines (M info / K warn / E error / D debug)`）；若行数为 0，输出 `[warning] _logs/run.log is empty — logging may be silently failing` 提示（不改变 exit code）
3. **`--timeline`**：读取全部 4 个 sink 文件，按 `bundle` + `ts` 缝合为单一时间线输出
4. **`--log`**：输出 `_logs/run.log` 全部内容（类 tail）

所有新 flag SHALL 不影响默认行为的 exit code 语义（0 = bundle 完整）。

#### Scenario: Summary flag prints pass/fail table with log health

- **WHEN** `inspect-bundle <bundle> --summary` 被调用
- **THEN** stdout SHALL 输出每个 gate_attempt 事件的 gate 名称、pass/fail、时间戳
- **AND** SHALL 输出汇总行 `{ events: N, passed: N, failed: N }`
- **AND** SHALL 输出 `_logs/run.log` 行数统计（`log: N lines`）
- **AND** 若行数为 0，SHALL 输出 `[warning]` 提示日志可能静默失败（不改变 exit code）

#### Scenario: Timeline flag stitches all sinks

- **WHEN** `inspect-bundle <bundle> --timeline` 被调用
- **THEN** stdout SHALL 输出按时间戳排序的所有 sink 入口
- **AND** 每行 SHALL 标注来源 sink（trace/log/subagent/queue）

#### Scenario: Log flag prints run.log content

- **WHEN** `inspect-bundle <bundle> --log` 被调用
- **THEN** stdout SHALL 输出 `_logs/run.log` 的全部内容

### Requirement: Long-running phases SHALL leave enough log and diagnostic evidence for post-mortem debugging

Sub-agent execution and Agent-side repair loops SHALL be included in the long-running phase diagnostic scope. Work-unit task and spawn prompts SHALL contain explicit logging instructions naming specific events to log, including search start, search done, fetch done, file written, error, and work complete. Delegated logging examples SHALL bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: Sub-agent spawn prompt includes logging instructions

- **WHEN** a work-unit prompt is generated
- **THEN** the prompt SHALL include diagnostic logging examples that bind the assigned work unit
- **AND** command examples SHALL use accepted log levels and the bundle's log-event CLI path

### Requirement: log-event always-zero behavior is a documented exit-code exception

`log-event.mjs` SHALL remain a documented diagnostic/logging exception to the framework CLI exit-code convention.

The command MAY exit `0` even when the requested diagnostic log or trace write cannot be completed, because logging failure must not block Agent flow unless a separate accepted contract makes a specific trace write load-bearing. This always-zero behavior SHALL be visible in the top-level command contract and CLI implementer docs so Agent callers do not infer that every non-gate utility reports failures through the same numeric exit behavior.

This exception SHALL NOT authorize hand-writing trace, faking load-bearing gate evidence, or ignoring accepted trace requirements. Load-bearing gate attempts, handoff witnesses, and status synchronization remain governed by their own accepted specs.

#### Scenario: Logging failure does not block Agent flow

- **WHEN** `log-event.mjs` cannot append a diagnostic log line
- **THEN** it MAY still exit `0`
- **AND** the failure SHALL NOT be treated as proof that a load-bearing trace event was written

#### Scenario: Exception inventory names log-event

- **WHEN** the Agent reads the framework CLI exit-code convention
- **THEN** it SHALL see `log-event.mjs` listed as an always-zero diagnostic exception
- **AND** the docs SHALL distinguish that exception from gate, handoff, and status synchronization evidence

