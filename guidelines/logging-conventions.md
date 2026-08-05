---
guideline_id: logging-conventions
suite: deep-research-guidelines
title: Logging Conventions
status: effective
created: 2026-06-26
revised: 2026-07-25
role: system-level logging conventions for .mjs and .md diagnostic recording
scope: DEEP_RESEARCH_HARNESS/engine/logger.mjs, DEEP_RESEARCH_HARNESS/engine/trace.mjs, DEEP_RESEARCH_HARNESS/cli/log-event.mjs, DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs, DEEP_RESEARCH_HARNESS/workflows/nodes/phases/*.md
authority: guidance
defers_to:
  - guidelines/project-charter.md
siblings:
  - guidelines/project-charter.md
  - guidelines/evolution-abstraction-semantic-precision.md
  - guidelines/evolution-simple-reliable-control.md
  - guidelines/evolution-helper-oriented-agent.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
  - guidelines/command-experiments.md
---

# Guideline: logging_conventions — Current Guidance

> 状态: 生效 | 创建: 2026-06-26 | 修订: 2026-07-25 | 适用于: `DEEP_RESEARCH_HARNESS/engine/`, `DEEP_RESEARCH_HARNESS/cli/`, `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/`

## Purpose

定义系统级日志约定——跨 `.mjs`（JS engine/CLI）和 `.md`（Agent phase node）的诊断记录规范。建立在 `logger.mjs`（LOG-001/002/003/004/005）和 `trace.mjs`（TRW-001/002/003/004）之上。

## Dual-Channel Philosophy

| 通道 | 职责 | 格式 | 文件 |
|------|------|------|------|
| Log | 诊断解释，人读 | 自由文本（统一信封） | `_logs/run.log` |
| Trace | 审计真相，机器校验 | JSONL | `rb_trace.jsonl` |

Both files are current run bundle-root relative. `_logs/run.log` and `rb_trace.jsonl` refer to the selected `dpt_rb_*` or `dpt_disp_*` bundle for the current run or experiment, not repo root and not `DEEP_RESEARCH_HARNESS/`.

**Trace 是真相，Log 是解释。** 裁决（pass/fail）只能从 trace JSONL 来，log 自由文本不参与裁决。两个通道通过 `bundle` 字段缝合为单一时间线。

## Simple Observability Posture

Logging follows [`evolution-simple-reliable-control.md`](evolution-simple-reliable-control.md). Observability must shorten diagnosis, not become another controller or authority layer.

- One external operation should emit the smallest useful success/failure/rejection/exception facts; internal helper chatter stays out of log by default.
- Trace records accepted machine-verifiable events; log explains incidents. Do not require log + trace + cache projection to agree before a valid operation can pass.
- Recovery reads direct bundle state and trace first. Log may explain why, but SHALL NOT hold a hidden cursor, retry counter, completion state, or permission.
- A log write failure remains non-blocking. Adding observability must not lengthen the quality-control chain or create a new failure prerequisite.

## API Surface

### JS Engine/CLI

| 函数 | 用途 | 调用者 |
|------|------|--------|
| `createLogger({ file, level, bundle })` | 底层 logger factory | 不直接使用 |
| `logToRun(bundlePath, level, msg, detail?)` | 一次性写入，永不抛错 | gate CLI, instantiate-run-bundle |
| `createRunLogger(bundlePath)` | 返回 `{ info, warn, error, debug }` | queue-manager, work-unit lifecycle, gates |
| `readBundleName(bundlePath)` | 从 `rb_status.json` 读 `bundle` | 所有调用点 |

### Agent (`.md` phase node)

```bash
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <path> --level <LEVEL> --msg "<message>" [--detail '<json>']
```

Agent 从 `## Log` 段复制命令，不需要知道文件路径或格式。

## Unified Envelope Format (D6.1)

所有 `_logs/run.log` 行：
```
[ISO8601] LEVEL msg bundle=<name> {optional JSON detail}
```

信封由 `logToRun`/`createRunLogger`/`log-event.mjs`/`writeGateAttempt` 统一生成。`--timeline` 单 regex 解析。

## Level Conventions

| Level | 含义 | 典型场景 |
|-------|------|---------|
| `DEBUG` | 内部机制 | cache hit, work-unit retry/refill |
| `INFO` | 正常运行时 | gate PASS, phase START/END, enqueue |
| `WARN` | 可恢复异常 | gate FAIL, receipt 缺失, repair |
| `ERROR` | 非预期故障 | 文件未找到, schema 校验失败 |

## .mjs Patterns

**Gate CLI**: `writeGateAttempt(bundlePath, result);` — 一行。

**Engine**: `const log = createRunLogger(bundleDir); log.info('enqueue', { ... });`

**Agent**: 从 `## Log` 表复制 bash 命令。

## Engine Logger Activation (LOC-006 Closed Set)

Engine 模块的 log 输出遵循事故级诊断原则：**每个对外入口函数在成功/失败/拒绝/异常等关键出口记录原因，使事后能从 run.log 重建事故因果链。** 这不是全量 trace——trace 仍然记录所有内部事件作为判决权威，log 只记录事故现场需要的关键诊断点。

具体哪些 engine 函数对外暴露、每个函数记录哪些事件，由适用的 accepted logging contract 给出权威清单。本条 guideline 的核心约束是：

- **闭集原则**：只有 engine 对外的 hot-path 函数双写 log + trace。内部辅助函数、纯计算、schema 校验等 trace 点 SHALL NOT 自动产生 log 行。
- **事件粒度**：log 事件名应能区分"企图/成功/失败/拒绝/空/异常"——事故发生时单看 run.log 就能定位到具体函数的具体出口，不需要去 trace 交叉对照。
- **兼容性**：`detail.kind` 可保留粗粒度的诊断分类键（方便现有工具按大类过滤），但 log 消息本身用细粒度事件名（方便 grep 精确事故点）。

其余内部 trace 点 SHALL NOT 产生 log 行。

## MUST / MUST NOT

**MUST**:
- MUST 从 `rb_status.json` 读 `bundle`
- MUST 所有 log/trace 入口包含 `bundle` 字段
- MUST gate CLI 使用 `writeGateAttempt()`，禁止 inline `appendFileSync`
- MUST `writeGateAttempt()` 内部调用 `logToRun()` 使用统一信封
- MUST 每个 phase node 包含 `## Log` 段
- MUST 写失败时静默，不阻塞调用者
- MUST 让 log 只解释 direct operation outcome，不成为额外 pass/fail prerequisite

**MUST NOT**:
- MUST NOT 从 log 做 pass/fail 裁决
- MUST NOT 为所有 trace 点自动生成 log 行（只 closed-set 双写）
- MUST NOT 要求 log 行通过 schema 校验
- MUST NOT 让 log 失败影响正常执行路径
- MUST NOT 用 log 保存隐藏恢复状态、路由状态、retry authority 或 completion authority

## Related Guidance

- [Guidelines Index](README.md)
- [Project Charter](project-charter.md)
- [Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) — distinguish the reader-facing diagnostic question before adding a log or projection category.
- [Simple Reliable Control](evolution-simple-reliable-control.md)
- [Helper-Oriented Agent](evolution-helper-oriented-agent.md) — preserve the boundary between a decision request and ordinary Agent execution.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — "Trace 是真相，Log 是解释"
- [Command Experiments](command-experiments.md)
