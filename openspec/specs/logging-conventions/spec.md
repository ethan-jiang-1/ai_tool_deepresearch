# Logging Conventions

> req: LOC-001, LOC-002, LOC-003, LOC-004, LOC-005, LOC-006, LOC-007, LOC-008, LOC-009

## Purpose

定义系统级日志约定——跨 `.mjs`（JS engine/CLI）和 `.md`（Agent phase node）的诊断记录规范。在已有 `logger.mjs`（Logger capability）和 `trace.mjs`（Trace Writer capability）的基础上，建立"什么时候记、记什么、记到哪、用什么 level"的统一规则，使每次 run 的行为可追溯、可排障。

本 capability 不定义新的 logger API 或 trace API——只定义使用它们的约定。

## Requirements

### Requirement: Run ID generation and propagation

系统 SHALL 使用 bundle 名称作为 `bundle`——即 `dpt_rb_<name>` 中的 `<name>`，持久化在 `rb_status.json` 的 `bundle` 字段。Bundle 名称本就唯一、人可读、直接对应目录名。

所有写入 `rb_trace.jsonl`、`_logs/run.log` 的入口 SHALL 包含 `bundle` 字段，使四个 sink 可按 `bundle` + `ts` 缝合为单条时间线。

`bundle` SHALL 从 bundle 的 `rb_status.json` 读取——不靠进程内存、环境变量或命令行参数传递。

#### Scenario: Run ID is the bundle name

- **WHEN** `instantiate-run-bundle.mjs my-research` 创建新 bundle
- **THEN** `rb_status.json` SHALL 包含 `"bundle": "my-research"`
- **AND** bundle 目录为 `dpt_rb_my-research/`——`bundle` 直接对应目录名

#### Scenario: Gate attempt includes bundle

- **WHEN** `writeGateAttempt(bundlePath, result)` 被调用
- **THEN** 写入 `rb_trace.jsonl` 的 JSONL 入口 SHALL 包含 `bundle` 字段
- **AND** 写入 `_logs/run.log` 的 log 行 SHALL 包含 `bundle`
- **AND** `bundle` 的值 SHALL 与 `rb_status.json` 中的一致

#### Scenario: Engine trace entries include bundle

- **WHEN** `queue-manager.mjs` 或 `subagent-relay.mjs` 写入 trace 入口
- **THEN** 每个 JSONL 行 SHALL 包含 `bundle` 字段

### Requirement: Single diagnostic log file per bundle

每个 run bundle SHALL 有一个唯一的诊断日志文件 `<bundle>/_logs/run.log`。所有 `.mjs` 和 `.md` 来源的诊断记录 SHALL append 到同一文件，按时间戳顺序排列。

该文件 SHALL 为自由文本格式（`[ISO8601] LEVEL message bundle=<name> {optional JSON detail}`），不要求 schema 校验——但行信封（前导 `[ISO8601] LEVEL` 与 `bundle=`）SHALL 机器可解析，因为 `inspect-bundle --timeline` 靠它按 ts 缝合；只有 `message` 体与 detail JSON 是自由文本。信封由 `logToRun`/`createRunLogger`/`log-event.mjs` 统一生成，caller 不手写。

该文件 SHALL NOT 作为 pass/fail 裁决依据——裁决只从 `rb_trace.jsonl` 来。

#### Scenario: All gate attempts appear in one log file

- **WHEN** 一次 run 中多个 gate CLI 依次执行
- **THEN** 所有 gate attempt 的日志行 SHALL 出现在同一个 `_logs/run.log` 中，按时间戳排序

#### Scenario: Engine and gate log entries coexist

- **WHEN** `queue-manager.mjs` 写入 enqueue/claim 事件，`subagent-relay.mjs` 写入 slot 事件，gate CLI 写入 gate_attempt 事件
- **THEN** 所有三种来源的 log 行 SHALL 在同一个 `_logs/run.log` 文件中，按时间戳排序

### Requirement: Log level conventions

系统 SHALL 使用四级日志，含义如下：

| Level | 含义 | 典型场景 |
|-------|------|---------|
| `DEBUG` | 引擎内部机制，对运行时诊断不重要 | cache hit, slot refill, 文件读取 |
| `INFO` | 正常运行时事件，值得记录 | gate PASS, phase START/END, enqueue, dispatch |
| `WARN` | 可恢复异常，需关注但不阻塞运行 | gate FAIL, receipt 缺失, repair 触发 |
| `ERROR` | 非预期故障，可能阻塞运行 | 文件未找到, schema 校验失败, 加载失败 |

默认 level 为 `INFO`——正常运行时事件全量记录。`DEBUG` 仅在显式指定时启用。

#### Scenario: Normal gate pass logged at INFO

- **WHEN** gate CLI 调用 `writeGateAttempt()` 且 `check.passed === true`
- **THEN** 日志行 SHALL 以 `INFO` 级别记录

#### Scenario: Gate fail logged at WARN

- **WHEN** gate CLI 调用 `writeGateAttempt()` 且 `check.passed === false`
- **THEN** 日志行 SHALL 以 `WARN` 级别记录

#### Scenario: Engine error logged at ERROR

- **WHEN** engine 函数加载文件失败（如 `readFileSync` 抛出）
- **THEN** logger SHALL 以 `ERROR` 级别记录，包含文件路径和错误消息

### Requirement: One-shot log API

系统 SHALL 提供 `logToRun(bundlePath, level, msg, detail?)` 函数作为一次性日志写入接口。

该函数 SHALL：
- 自动从 `rb_status.json` 读取 `bundle`
- 自动构造目标路径 `<bundlePath>/_logs/run.log`，目录不存在时自动创建
- 按标准格式 `[ISO8601] LEVEL msg bundle=<name> {optional JSON detail}` 写入
- 不抛错——写失败时静默返回，不影响 caller

`bundlePath` SHALL 是该函数唯一需要的上下文参数——caller 不需要知道日志文件路径、格式或 bundle。

#### Scenario: One-shot log writes to run.log

- **WHEN** `logToRun(bundlePath, 'info', 'phase:wave0 START')` 被调用
- **THEN** `_logs/run.log` SHALL append 一行 `[ISO8601] INFO phase:wave0 START bundle=<name>`

#### Scenario: One-shot log with detail

- **WHEN** `logToRun(bundlePath, 'warn', 'repair triggered', { slot: '03', reason: 'schema fail' })` 被调用
- **THEN** 日志行 SHALL 包含 `{"slot":"03","reason":"schema fail"}` JSON detail

#### Scenario: One-shot log never throws

- **WHEN** `_logs/` 目录不可写
- **THEN** `logToRun()` SHALL 静默返回，不抛错

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

系统 SHALL 提供 `DPT_FRAMEWORK/cli/log-event.mjs` CLI，使 Agent 能通过 bash 命令写入 `_logs/run.log`，无需内联 JS。

CLI 参数：
- `--bundle <path>` (必选) — active bundle 路径
- `--level <debug|info|warn|error>` (必选) — 日志级别
- `--msg <string>` (必选) — 日志消息
- `--detail <json>` (可选) — JSON 格式的附加详情

成功时 exit(0)，失败时静默 exit(0)（不抛错，诊断不阻塞 agent flow）。

#### Scenario: Agent logs phase start via CLI

- **WHEN** Phase Agent 执行 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle dpt_rb_x --level info --msg "phase:wave0 START — 5 topics"`
- **THEN** `_logs/run.log` SHALL append 一行含 `INFO phase:wave0 START — 5 topics` 和 `bundle`

#### Scenario: Agent logs with detail via CLI

- **WHEN** Phase Agent 执行 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle dpt_rb_x --level warn --msg "repair" --detail '{"slot":"03","reason":"schema fail"}'`
- **THEN** 日志行 SHALL 包含 JSON detail

#### Scenario: CLI never fails the agent

- **WHEN** `--bundle` 指向的目录不存在
- **THEN** CLI SHALL exit(0)，不抛错阻塞 agent

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

`queue-manager.mjs` 和 `subagent-relay.mjs` SHALL 在入口处调用 `createRunLogger(bundleDir)` 获取 logger 实例。仅下列**闭集**事件同时写 trace 与 log（level 见括号）；其余内部 `traceEntry` 点 SHALL NOT 产生 log 行，避免 I/O 翻倍。

- **queue-manager**：`enqueue`(info) / `claim`(info) / `complete`(info) / `fail`(warn) / `preempt`(warn) / `refill`(info)
- **subagent-relay**：`slot_create`(info) / `dispatch`(info) / `result`(info) / `collect`(info) / `merge`(info)；repair 触发 `warn`

**判定规则**：以上述列出的 log 事件名为 closed-set——只有精确匹配这些事件名的 engine 生命周期点同时写 log + trace。任何未列出的 `traceEntry` 调用点（如 queue-manager 的 `queue_loaded`、`projection_rendered`、`receipt_checked` 等内部诊断事件）SHALL NOT 产生对应的 log 行。新增 trace 点时 default 不写 log，除非显式将事件名加入本 closed-set。

`createRunLogger(bundleDir)` SHALL 内部封装 `createLogger({ file: join(bundleDir, '_logs', 'run.log'), bundle })`——engine 只需 `bundleDir`，不需要知道日志文件路径或 bundle 获取方式。

#### Scenario: Queue manager logs closed event set

- **WHEN** `loadQueue(bundleDir)` 被调用
- **THEN** queue-manager SHALL 初始化 logger 指向 `_logs/run.log`
- **AND** 在 enqueue/claim/complete/refill 记 INFO、在 fail/preempt 记 WARN
- **AND** 其余内部 trace 点 SHALL NOT 产生 log 行

#### Scenario: Subagent relay logs closed event set

- **WHEN** subagent relay 开始处理 slot
- **THEN** relay SHALL 初始化 logger 指向 `_logs/run.log`
- **AND** 在 slot_create/dispatch/result/collect/merge 记 INFO、repair 触发记 WARN
- **AND** 其余内部 trace 点 SHALL NOT 产生 log 行

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
