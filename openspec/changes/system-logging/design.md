## Context

项目当前有两套互补的日志/追踪系统，但均处于"半建成"状态：

```
┌─────────────────────────────────────────────────────────┐
│                    当前状态                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  logger.mjs (LEVELED LOGGER)                             │
│  ┌─────────────────────────────────────┐                │
│  │ createLogger({level, file})          │   ✅ 实现完整    │
│  │ → { debug, info, warn, error }       │   ✅ 测试齐全    │
│  │                                     │   ❌ 零生产导入   │
│  │ LOG-003 注入点 (workflow-chain.mjs)  │   ❌ 无人传参    │
│  │   assessNode(logger=null)            │                │
│  │   loadMarkdownFile(logger=null)      │                │
│  │   ...共 5 个函数                     │                │
│  └─────────────────────────────────────┘                │
│                                                         │
│  trace.mjs (TRACE FACTORY)                               │
│  ┌─────────────────────────────────────┐                │
│  │ createTrace(filePath, opts)          │   ✅ API 完整   │
│  │ → { traceInit, traceEntry,           │   ⚠️  仅 traceEntry 生产使用│
│  │     traceSummary, traceCleanup }     │   ❌ traceInit/traceSummary/traceCleanup 死│
│  └─────────────────────────────────────┘                │
│                                                         │
│  gate CLIs (10 个)                                      │
│  ┌─────────────────────────────────────┐                │
│  │ 2 个用 writeGateAttempt()            │   ✅ 写双 sink  │
│  │ 8 个 inline appendFileSync           │   ❌ 只写 trace,│
│  │   → 跳过 _logs/run.log               │     跳过 log    │
│  └─────────────────────────────────────┘                │
│                                                         │
│  4 个 Sink — 零 correlation                              │
│  ┌──────────────────────────────────────────────┐       │
│  │ rb_trace.jsonl       ← gate CLI + helper     │       │
│  │ _trace_subagent.jsonl ← subagent-relay.mjs   │       │
│  │ _trace_agq_cli.jsonl  ← queue-manager.mjs    │       │
│  │ _logs/run.log         ← writeGateAttempt()   │       │
│  │                           （仅 2 个 gate）    │       │
│  │  🚫 无 bundle，无法缝合                        │       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│  inspect-bundle.mjs                                      │
│  ┌─────────────────────────────────────┐                │
│  │ 仅检查 14 个文件/目录存在性           │   ❌ 不读内容   │
│  │ 不渲染任何日志或 trace 内容           │                │
│  └─────────────────────────────────────┘                │
│                                                         │
│  charter 哲学已定调                                       │
│  ┌─────────────────────────────────────┐                │
│  │ Trace 是真相，Log 是解释              │   ✅ 方向明确   │
│  │ (framework-runtime-boundary.md:251)  │   ❌ 未执行    │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

**约束**：
- 不新建依赖、不重写已有模块 API（`logger.mjs` 和 `trace.mjs` 接口不变）
- 所有运行时状态写入 active bundle，不写回 `DPT_FRAMEWORK/`
- Charter 哲学 "Trace 是真相，Log 是解释" 不推翻，在此框架内填空
- 不引入进程级全局单例——每个 gate CLI 是独立 `node` 进程，bundle 标识必须持久化在 bundle 目录内的 `rb_status.json`

## Goals / Non-Goals

**Goals:**
1. 激活 `logger.mjs` 进入生产——engine 使用 `createLogger({ file })` 写入 `_logs/run.log`
2. 统一 gate 写路径——10 个 gate CLI 全走 `writeGateAttempt()`，消灭 log/trace 漂移
3. 加 `bundle`——生成在 bundle 实例化时，持久化在 `rb_status.json`，注入所有 sink 入口
4. 激活死 trace 方法——`traceInit`/`run_start` + `traceSummary` 进入 run 生命周期
5. 建立日志约定文档——`guidelines/logging-conventions.md`，覆盖 .mjs 和 .md 两种场景
6. 扩展 `inspect-bundle.mjs`——`--summary`（pass/fail）、`--timeline`（跨 sink 时间线）

**Non-Goals:**
- 不引入实时 streaming / daemon / WebSocket
- 不做 log rotation 或 retention policy
- 不做全局 telemetry / 跨 run 聚合（per-bundle only，charter 要求 trace 留在 bundle）
- 不引入 breaking changes to `logger.mjs` 或 `trace.mjs`。加可选 `bundle` option（向后兼容）或通过 engine 侧 wrapper 注入 `bundle` 不算 breaking——现有 caller 不经修改继续工作
- 不要求 log 行格式通过 schema 校验（log 是人读自由文本，trace 才是机器可校验）
- 不做 `traceCleanup()` 生产使用（删 trace 是反审计的，仅测试 teardown 用）
- 不激活 `workflow-chain.mjs` 的 LOG-003 注入点——节点加载引擎的诊断日志留待后续 change。本 change 的 engine 激活（LOC-006）仅覆盖 `queue-manager.mjs` 与 `subagent-relay.mjs`

**显式延至 Phase 2 的 backlog 条目**（`_backlog/todo-system-logging.md` 要求但本 change 不覆盖——均在 Phase 2 或后续 change 处理）：
- fork/branch 决策 trace（`classifyBranch`/`forkRouter` 当前零 trace/log；`_backlog` §"Repair loop"）
- HITL1/HITL2 决策内容审计（选了什么 topics、什么 rationale，当前仅 gate outcome；`_backlog` §"HITL1/HITL2 决策"）
- 全事件 timing/duration 数据（`started_at`/`ended_at` 成对标记；`_backlog` §"Timing/duration"）
- error/exception → trace 事件桥接（`_backlog` §"Errors/exceptions"）
- phase transition `node_exec` 事件激活（`_backlog` §"Phase 转移/lifecycle"）
- `run_end` 终态 marker（需先有终态 CLI/engine 钩子；design OQ#4）
- Sink B/C（`_trace_subagent.jsonl`, `_trace_agq_cli.jsonl`）per-event-type Zod schema（design OQ#3）
- gate-integrity 复核（trace ↔ gate result 一致性，`_backlog` §"读回/可观测性"）

## Core API Design

### 零负担原则：bundlePath 已在手上，封装其余一切

`--bundle` / `bundlePath` 是本框架所有命令的通用参数（Charter: "MUST pass the active bundle path explicitly"）。Gate CLI、engine、Agent——每个参与者本来就有它。日志不引入新参数。

**封装掉的东西**：`_logs/run.log` 路径、`new Date().toISOString()` 时间戳、`bundle` 从 `rb_status.json` 读取、目录 `mkdirSync` 自动创建、`[ts] LEVEL msg bundle=xxx {detail}` 格式、try/catch 静默不抛错。

### API Surface

```
logToRun(bundlePath, level, msg, detail?)        ← 一次性。谁都能用。
createRunLogger(bundlePath)                       ← 返回 { info, warn, error, debug }。engine hot path。
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <p> --level INFO --msg "..."  ← Agent bash 接口。

底层不动：
createLogger({ file, level, bundle })              ← 已有 building block。加可选 bundle option。
writeGateAttempt(bundlePath, result)              ← 已有。gate 专用（同时写 log + trace），内部改用 logToRun。
```

### 每个场景的代码

| 场景 | 代码 |
|------|------|
| Gate CLI | `writeGateAttempt(bundlePath, result)` — 1行，已有 |
| Engine 频繁记 | `const log = createRunLogger(bundleDir); log.info('enqueue', { work_id })` — 入口1行 |
| JS 偶尔记一笔 | `logToRun(bundlePath, 'info', 'phase:wave0 START')` — 1行 |
| Agent 记一笔 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --level info --msg "phase:wave0 START"` — 1个bash |
| Agent 记一笔带 detail | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --level warn --msg "repair triggered" --detail '{"slot":"03"}'` |

## Decisions

### D1. 日志不合并——保持 Log + Trace 双通道，加 bundle 缝合

**选型**：维持 `_logs/run.log`（诊断）和 `rb_trace.jsonl`（审计）两个独立文件，不加第三个统一文件。

**理由**：
- Charter 已定调 "Trace 是真相，Log 是解释"——两通道边界有哲学依据
- 两个已有文件格式和使用者不同（log = 人读自由文本，trace = 机器校验 JSONL）
- 合并会迫使 audit-critical 事件和诊断细节共享同一 schema，既不满足机器校验也不满足人读
-   bundle 让两者可缝合，不合并也能重建完整时间线

**替代方案已排除**：统一单文件（违背 charter）、扔掉 log 只要 trace（失去诊断能力）

### D2. bundle 在 `rb_status.json` 持久化，不在进程内存

**选型**：`bundle` 直接使用 bundle 名称（`dpt_rb_<name>` 中的 `<name>`），在 `instantiate-run-bundle.mjs` 创建 bundle 时写入 `rb_status.json`。不需要生成新标识符——bundle 已经有名字了。

**理由**：
- Bundle 名称本来就唯一（重复创建直接报错退出），人可读，直接对应目录名
- 看到日志里的 `bundle=my-research` 就知道是 `dpt_rb_my-research/`——不需要查映射表
- 不需要 `crypto.randomUUID()`——`bundleName` 是 `instantiate-run-bundle.mjs` 已有的参数
- `rb_status.json` 是 bundle 的 phase/gate 状态摘要——`bundle` 是自然扩展
- `writeGateAttempt()` 已接受 `bundlePath` 参数，读 `rb_status.json` 零额外参数

**替代方案已排除**：UUID（人读不了，无法对应回目录）、环境变量（项目禁止 `process.env`）、命令行参数（每个 caller 都要传，容易遗漏）

### D3. Engine logger 激活：`createRunLogger(bundleDir)` 并行 `ensureTrace()`

**选型**：在 `queue-manager.mjs` 和 `subagent-relay.mjs` 已有 `ensureTrace(bundleDir)` 旁，在入口处调用 `createRunLogger(bundleDir)`（来自 `logger.mjs` 的新导出）获取 logger 实例。`createRunLogger` 内部读 `bundle`，创建绑定 `_logs/run.log` 的 logger。

```
存量：
  let _trace = null;
  function ensureTrace(bundleDir) { if (!_trace && bundleDir) { _trace = createTrace(...); } }
  function traceEntry(event, detail) { if (_trace) _trace.traceEntry(event, detail); }

新增：
  import { createRunLogger } from './logger.mjs';
  let _log = null;
  // 在 loadQueue / 第一个 public 函数入口：
  if (!_log && bundleDir) _log = createRunLogger(bundleDir);
  // 在关键生命周期点：
  _log.info('enqueue', { work_id, slot });      // 已有的 traceEntry() 旁边
  _log.warn('repair', { trigger, iterations });  // repair 路径（在调用方，非 convergeRepair 内部）
```

`createRunLogger(bundleDir)` 封装了 `createLogger({ file: join(bundleDir, '_logs', 'run.log'), bundle })`——engine 只需 bundleDir，不需要知道 log 文件路径或 bundle 怎么取的。

**Repair trace（charter MUST）**：`subagent-relay.mjs` 的两个 repair 触发点——`forkAndStageSubagents()`（fork 判定非 pass 时）和 `collectAndMergeSubagentResults()`（全部 subagent 失败时）——当前零 trace/log。LOC-006 closed-set 中 repair 触发 `_log.warn()`（人读），同时 SHALL 调用 `traceEntry('repair', { trigger, outcome, iterations, ... })`（机器审计）。注意 `convergeRepair()` 本身不持有 `slot`/`reason`（它操作整个 workflow state，不对应单个 slot）；trace 应在两个**调用方**插入——调用方有 trigger 上下文（`fork_reject` / `all_subagents_failed`），并在 `convergeRepair()` 返回后拿到 `outcome` 和 `iterations`。Charter `framework-runtime-boundary.md:278` MUST 要求 repair events 进入 `rb_trace.jsonl`——单有 log 不满足 charter。

### D4. Gate 写路径统一：强制走 `writeGateAttempt()`，统一 log 格式

**选型**：8 个 inline gate CLI 删除 inline `appendFileSync` 块，改为调用已有的 `writeGateAttempt(bundlePath, result)`。`writeGateAttempt()` 内部扩展：从 `rb_status.json` 读 `bundle` 并注入 log 和 trace 入口。

```
改造前（8 个 gate 的模式）：
  try {
    const tracePath = join(bundlePath, 'rb_trace.jsonl');
    const traceEntry = JSON.stringify({ ts, event: 'gate_attempt', gate, passed, ... });
    appendFileSync(tracePath, traceEntry + '\n');
  } catch {}

改造后（统一为 1 行）：
  writeGateAttempt(bundlePath, result);
```

**理由**：
- GSK-005 已定义 `writeGateAttempt()` 为"the shared helper"——只是 8 个 gate 没用
- `writeGateAttempt()` 同时写 `_logs/run.log` 和 `rb_trace.jsonl`——换用即消灭漂移
- 纯重构，零新概念，gate 已 import gate-helpers（它们只是没 import `writeGateAttempt` 这个符号）

**Log 格式统一至 `logToRun` 信封**：重构后 `writeGateAttempt()` 内部 SHALL 调用 `logToRun()` 写 log 行，而非手写 `appendFileSync`。Gate 特定信息（`gate`, `passed`, `currentNodeRef`, `next`, `inspect_count`, `advice_count`）进入 `detail` JSON；`msg` 固定为 `"gate_attempt"`。这确保 `writeGateAttempt` 产生的 log 行与 engine（`createRunLogger`）和 Agent（`log-event.mjs`）共享同一 D6.1 信封格式——`--timeline` 解析器只需一条 regex 路径。

**额外清理**：`readiness-passed.mjs` 的本地 `readAllTraceEvents()` 替换为 gate-helpers 的共享 `readTraceEvents()`

### D5. .md 日志约定：`log-event.mjs` CLI + `## Log` 段

**选型**：两层覆盖——

1. **自动记录**（JS 侧）：gate CLI 走 `writeGateAttempt()` 自动产生 log；engine 通过 `createRunLogger()` 自动记录生命周期事件。Phase Agent 无需手动写这些。

2. **Agent 手动记录**（MD 侧）：Phase Agent 通过 `log-event.mjs` CLI 写 log——一个 bash 命令，零 JS 知识。Phase node 的 `## Log` 段给出具体命令。

Phase node `## Log` 段格式：

```markdown
## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `log-event.mjs --bundle <bundle> --level info --msg "phase:wave0 START — N topics in registry"` |
| Phase 结束 | `log-event.mjs --bundle <bundle> --level info --msg "phase:wave0 END — N/N topics passed, gate: PASS"` |
```

Agent 只需复制 bash 命令——不需要知道日志格式、文件路径、bundle。

**Runtime coordinates header（queue projection 隐式提醒）**：Phase Agent 在长程循环里反复读 queue projection（`current-task.md`）。在 `render()` 产出的 projection epigraph 行中加一行 runtime coordinates——填入 `bundleDir`（`render()` 已有参数），提醒 Agent `--bundle <bundleDir>` 是所有 CLI 命令的必需参数。这与 `## Log` 段互补：`## Log` 告诉 Agent **记什么**，runtime header 告诉 Agent **往哪记**。成本极低（`render()` 输出加 2-3 行 Markdown），不改变 queue 语义。

### D6. `inspect-bundle.mjs` 可观测性扩展：三级视图

**选型**：不新建独立 log viewer，扩展现有 `inspect-bundle.mjs`：

```
inspect-bundle <bundle>              # 不变：文件存在性检查
inspect-bundle <bundle> --summary    # 新增：读 rb_trace.jsonl 输出 pass/fail 表
inspect-bundle <bundle> --timeline   # 新增：缝合所有 sink 按 ts 输出时间线
inspect-bundle <bundle> --log        # 新增：tail _logs/run.log 内容
```

`--summary` 使用已有的 `createTrace(bundlePath).traceSummary()`（现在终于在生产环境中调用）。`--timeline` 读取所有 4 个 sink 文件，按 ts 排序 merge 输出。

**理由**：
- `inspect-bundle.mjs` 已是 post-mortem 入口——自然扩展
- `traceSummary()` 已写好且测试过——只差调用
- 不引入新的 CLI 入口，降低认知负担

### D6.1 Log 行统一信封（确保 `--timeline` 单一路径解析）

`_logs/run.log` 的所有写入路径——`logToRun()`、`createRunLogger()`、`log-event.mjs`、以及重构后的 `writeGateAttempt()`（内部调用 `logToRun`）——SHALL 产生统一的信封格式：

```
[<ISO8601>] <LEVEL> <msg> bundle=<name> {<optional JSON detail>}
```

"自由文本"仅指 `<msg>` 体与 detail JSON——**信封**（前导 `[ts] LEVEL`、`bundle=` 标记）MUST 机器可解析且格式一致。`--timeline` 解析器只需一条 regex：`/^\[([^\]]+)\] (\w+) (.+?) bundle=(\S+)(?: (\{.*\}))?$/`。`--timeline` 遇无法解析前导 ts 的行 → 原样插入尾部并标 `[unparsed]`，不 crash。

这与 LOC-002 "不要求 schema 校验" 不冲突：校验指裁决语义（pass/fail 不从 log 判），信封格式是写入约定（由 4 个统一生成点保证，caller 不手写）。

### D7. Level 约定

**选型**：

| Level | 含义 | 典型场景 |
|-------|------|---------|
| `debug` | 引擎内部机制，对运行时诊断不重要 | "cache hit: phase-wave0.md", "slot_3 refilled from pool" |
| `info` | 正常运行时事件，值得记录 | "gate:wave0 PASS", "phase:setup START", "queue enqueued 3 items" |
| `warn` | 可恢复异常，需关注但不阻塞 | "gate:wave0 FAIL", "slot_02 receipt missing, repair created" |
| `error` | 非预期故障 | "load failed: file not found", "schema validation failed" |

默认 level 为 `info`——正常事件全量记录。`debug` 仅在显式指定时启用（development/repair 场景）。

### D8. bundle 存活不变量

`bundle` 一经 `instantiate-run-bundle.mjs` 写入 `rb_status.json`，在该 run 生命周期内 MUST NOT 丢失。当前唯一程序化写入路径是 `instantiate-run-bundle.mjs`（已通过 `StatusSchema.parse()` 保护）；其余 `rb_status.json` 的修改由 Agent 手动执行（根据 phase node MD 指令）。程序化写入路径 MUST 经 `StatusSchema.parse()`（task 3.1 已含 `bundle: z.string()`），禁止用局部对象整体覆盖。Agent 手动编辑的损坏风险通过 `bundle=<unknown>` fallback 防御——`logToRun`/`createRunLogger`/`writeGateAttempt` 读不到 `bundle` 时记 `bundle=<unknown>` 并不阻断（诊断优先），但这是异常信号，`--timeline` 应标注。task 3.4 审计所有程序化 status 写入路径确保此不变量。

### D9. 共享 `readBundleName(bundlePath)` —— 单一读取点

`bundle` 从 `rb_status.json` 的读取逻辑（`readFileSync` + `JSON.parse` + try/catch + `<unknown>` fallback）出现在 5 个位置：`logToRun()`、`createRunLogger()`、`writeGateAttempt()`、queue-manager 的 traceEntry wrapper、subagent-relay 的 traceEntry wrapper。虽逻辑简单，但 5 个独立 try/catch/fallback 是不一致的风险点。

**选型**：提取 `readBundleName(bundlePath)` → `string` 到 `gate-helpers.mjs`（与 `writeGateAttempt`/`readTraceEvents` 同文件）。所有 5 个调用点 import 这一个 helper。实现：先读 `rb_status.json`，成功则返回 `bundle` 字段（fallback 到 `<unknown>`），文件缺失/非法 JSON 则返回 `<unknown>`。永不抛错。

**理由**：
- 5 个调用点共享同一逻辑，修改 fallback 行为时只改一处
- `gate-helpers.mjs` 已是共享 infrastructure 的自然归属（`writeGateAttempt`、`readTraceEvents` 均在此）
- `logToRun` 和 `createRunLogger` 在 `logger.mjs` 中，import `readBundleName` 不引入循环依赖（`gate-helpers.mjs` import `logger.mjs` 的 `logToRun`；`logger.mjs` import `gate-helpers.mjs` 的 `readBundleName`？不对——会有循环依赖）

**循环依赖解决方案**：`readBundleName` 放在 `logger.mjs` 中 export（与 `logToRun`/`createRunLogger` 同文件）。这是它最自然的归属——`logger.mjs` 已有 `node:fs` + `node:path`，`readBundleName` 只是 `readFileSync` + `JSON.parse`。`gate-helpers.mjs` 和 engine 代码 import from `logger.mjs`（已有 import 路径，不新增）。

## Risks / Trade-offs

- **[并发写冲突]** 多个独立 `node` 进程 append 同一 `_logs/run.log` → Node.js `appendFileSync` 在 POSIX 上对小于 `PIPE_BUF` 的写入是原子的；log 行远小于此值。风险低。
- **[写失败静默吞]** `writeGateAttempt()` 的 log/trace 写入在 try/catch 内静默失败（不阻塞 gate）→ 设计意图是"诊断不阻塞判决"。接受这个 trade-off 但需在 guidelines 中注明：如果 trace 文件不存在，check 可能缺少证据。
- **[Token 消耗]** `## Log` 段增加 phase node MD 长度 → 控制在 5-8 行内，不显著增加。
- **[`logger.mjs` 单实例]** `createLogger` 每次调用返回新实例——多进程场景下无共享状态问题。如果同一进程内多次创建指向同一文件，会产生重复 `[ts]` 行但不会冲突。当前架构每个 gate CLI 只创建一次，无此问题。
- **[traceSummary 内存]** 大 trace 文件全量读入内存 → 当前单次 run 的 trace 条目在数十到数百量级，远不到内存瓶颈。后续可加 streaming parse if needed。

## Open Questions

1. **Phase Agent 手动写 log 的可靠性**：Agent 可能忘记写 `## Log` 段要求的日志点。两个低成本的 Phase 1 兜底：(a) `writeGateAttempt()` 已持有 `currentNodeRef`（如 `phases/phase-wave0.md`），可自动 deriving `phase` 字段写入 trace entry——每个 gate_attempt 自带 phase 边界标记，不依赖 Agent 手动 log；(b) runtime coordinates header（D5）让 Agent 每次读 queue projection 时看到 `--bundle` 路径，消除"忘记 bundle 值"这一子风险。follow-up：在 `inspect-bundle --timeline` 增加"缺失 phase START/END"提示（Phase 2），作为遵从度的被动观测，而非 gate 阻断。

2. **`_trace_subagent.jsonl` 和 `_trace_agq_cli.jsonl` 是否也合并进 `rb_trace.jsonl`？**→ 暂不合并。三者服务不同域（gate/subagent/queue），物理分离 + bundle 缝合已足够。合并增加 schema 复杂度且打破域边界。

3. **是否需要 per-event-type Zod schema for all trace entries？**→ 暂不。audit-critical（gate、repair、HITL、phase transition）在后续 Phase 2 做 schema；诊断性事件宽松。本 change 聚焦 Phase 1 约定激活。

4. **`run_end` marker（Phase 2）**：终态 `run_end` trace 事件需要确定性终态钩子。Phase 1 范围内 final phase 无 gate、Agent 仅能写 `_logs/run.log`，无写 `rb_trace.jsonl` 的入口。本 change 只交付 `run_start`（TRW-004）；`run_end` 连同"run_end 后无 gate_attempt"的不变量留待 Phase 2（需引入终态 CLI 或 engine 钩子）。

5. **可观测性的自检**：log/trace 写失败静默（见 Risks），意味着本 change 建的可观测性可能静默不工作。follow-up：考虑 `inspect-bundle` 在 `_logs/run.log` 为空或缺 `run_start` 时给 warning（不改变 exit code 语义）。

6. **与 `plan-hostfile-sections` change 的交互**：两个 change 都修改了 `gate-helpers.mjs`（`plan-hostfile-sections` 新增 `writePlanProgress`/`readTraceEvents`/`readBundlePlan` 等函数；本 change 修改 `writeGateAttempt`）。已验证无 merge conflict（碰不同函数、不同行范围）。`instantiate-run-bundle.mjs` 仅本 change 修改（写 `bundle` + `traceInit` + `logToRun`），`plan-hostfile-sections` 未动此文件。两个 change 的 `writeGateAttempt()` 和 `writePlanProgress()` 在 gate CLI 调用点（如 `check-gate-setup-ready.mjs`）共存——语义独立、不冲突。建议实现时确认 import 顺序和函数签名无意外交互。
