---
guideline_id: logging-conventions
suite: deep-research-guidelines
title: Logging Conventions
status: effective
created: 2026-06-26
role: system-wide logging and trace conventions — when to log, what to log, how to log, where to log
scope: all .mjs files in DPT_FRAMEWORK/, all .md phase nodes in workflows/nodes/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/README.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Logging Conventions

> 状态: 生效 | 创建: 2026-06-26 | 用途: 系统级日志与 trace 使用约定——宪法级指导

---

## Purpose

Logging 的目标不是“多写几行输出”。它的目标是保护长程静默 run 的可恢复性：当对话上下文丢失、Agent 换人、或任务中途恢复时，新的 Agent 必须能从 active bundle 重建当前状态、审计历史和排障线索。

本文件定义 `DPT_FRAMEWORK/` 下 `.mjs` 和 workflow `.md` 如何使用 log 与 trace。它只讲指导原则和安全边界；具体 API 签名、schema 字段、CLI flags、trace event contract 仍由 accepted specs 和 executable implementation 决定。

---

## File Position

This file can decide:

- When to use Log (`_logs/run.log`) vs Trace (`rb_trace.jsonl`).
- Which bundle files an Agent must trust when recovering a run after context loss.
- Level selection rules (info/warn/error/debug).
- The single-log-file-per-bundle principle and bundle identity convention.

This file cannot decide:

- API signatures, schema fields, or CLI flags — spec territory.
- Current run state, gate outcomes, queue contents — runtime territory.
- Implementation internals of any module.

---

## 1. Runtime Continuity First

Active bundle 是长程 run 的恢复边界。Agent 续跑时，先重载 bundle 文件，再决定下一步；不能靠聊天记忆、progress summary、console output 或 `_logs/run.log` 推断当前状态。

每个 Phase-Agent-facing runtime surface SHOULD keep the active bundle visible when it matters: `START_FROM_HERE.md` names the bundle root, phase nodes and queue projections use `<bundle>` placeholders, and gate/queue/log commands pass `<bundle>` explicitly. 这不是让 Markdown 拥有状态权威，而是给长程 MD controller 一个高信噪比的 runtime-context anchor，防止跑着跑着忘记“我在哪个 bundle 里”。

三类 runtime memory 必须分清：

| Surface | Owns | Recovery role |
|---------|------|---------------|
| `rb_status.json`, `rb_queue.json`, `rb_profile.yaml`, `rb_plan.md` | 当前控制状态、队列、用户意图、计划输入 | 续跑时先读；决定“现在在哪里、下一步该碰哪个 gate/task” |
| `rb_trace.jsonl` | append-only runtime audit / verdict evidence | 判断 gate/check 是否真实发生；pass/fail 和审计从这里找 |
| `_logs/run.log` | 人类可读诊断解释 | 排障、重建 timeline、理解为什么失败；不能授权继续 |

`_cache/` 和 Markdown projections 可以帮助 Agent 阅读状态，但不是 authority。若 projection、log 和 control files 冲突，reload control files 与 trace，按 Engine/CLI verdict 处理。

---

## 2. Two-Channel Architecture

此原则来自 `framework-runtime-boundary.md` § "Trace is Truth, Log is Explanation"。

| | Trace (`rb_trace.jsonl`) | Log (`_logs/run.log`) |
|---|---|---|
| 角色 | 权威审计 trail | 诊断 |
| 裁决 | 是——pass/fail 从这里判 | 否——只辅助排障 |
| 格式 | 结构化 JSONL，Zod 校验 | 自由文本 `[ISO8601] LEVEL msg bundle=<name> {detail}` |
| 写者 | `writeGateAttempt()`, `traceEntry()` | `logToRun()`, `createRunLogger()`, `log-event.mjs` |

两通道不合并。`bundle` 字段让它们可缝合为单一时间线。

---

## 3. Bundle Identity

系统不凭空生成标识符。Bundle 的名字就是它的身份。

```
instantiate-run-bundle.mjs my-research
  → 创建 dpt_rb_my-research/
  → 写入 rb_status.json: { "bundle": "my-research" }
```

`bundle` 字段持久化在 `rb_status.json`。所有 log 行和 trace JSONL 入口自动包含它——`logToRun()` 和 `createRunLogger()` 内部读取，caller 无需传入。

看到 `bundle=my-research` 就知道目录是 `dpt_rb_my-research/`。

`bundle` 不是日志专用字段。它是 runtime identity：多个独立 `node` 进程、Phase Agent、gate CLI、queue engine、relay engine 都必须围绕同一个 active bundle 写入和恢复。不要用环境变量、聊天记忆或临时变量传递 run identity。

Sub-agent 可以知道 bundle root 和 `_logs/run.log` 的存在，用于短程任务内写入诊断 log 或 bundle-relative artifacts；这不是 continuity 风险的重点。长程 active-bundle anchor 主要服务 Phase Agent / MD controller。

---

## 4. Usage Entrypoints

三个入口，按场景选：

| 函数 | 场景 | 调用者 |
|------|------|--------|
| `writeGateAttempt(bundlePath, result)` | Gate CLI 写 log + trace | Gate CLI（已有，不动） |
| `logToRun(bundlePath, level, msg, detail?)` | 一次性记一笔 | 任何 JS |
| `createRunLogger(bundlePath)` → `{info,warn,error,debug}` | Engine 频繁记 | queue-manager, subagent-relay |
| `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --level <LEVEL> --msg "..."` | Agent bash | Phase Agent via `## Log` 段 |

这些名字是使用路线，不是本 guideline 定义的 API contract。实现细节以 specs 和 code 为准。

**原则**：`bundlePath` 是全系统命令的通用参数，不是日志引入的。路径、格式、`bundle` 应封装在函数内部。caller 不需要知道 `_logs/run.log` 在哪，也不应该手写 `rb_trace.jsonl`。

---

## 5. Agent/Engine Boundary

```
Engine (JS) 写               Agent (MD) 写
─────────────────────        ─────────────────────
gate attempt                 phase START/END
queue enqueue/claim/complete  HITL decision
subagent slot lifecycle      关键决策点
repair iteration
error/exception
```

**Engine 侧**：`writeGateAttempt()` 和 `createRunLogger()` 自动记录。开发者不需要额外操作。

**Agent 侧**：Phase node 的 `## Log` 段给出可复制的 `log-event.mjs` bash 命令。Agent 不手写 JS——复制命令执行。

`## Log` 是诊断便利，不是 authority。Phase START/END log 不能证明 phase 完成，不能替代 gate CLI，不能替代 `rb_trace.jsonl` 中的 gate/check evidence，也不能授权 Agent 停止或进入下一 phase。

---

## 6. Level Conventions

| Level | 语义 | 触发条件 |
|-------|------|---------|
| `info` | 正常事件 | gate PASS, phase 起止, enqueue, dispatch, slot lifecycle |
| `warn` | 可恢复异常 | gate FAIL, receipt 缺失, repair 触发 |
| `error` | 非预期故障 | 文件未找到, schema 校验失败, 加载失败 |
| `debug` | 内部机制 | cache hit/miss, slot refill（仅 development/repair 启用） |

默认 `info`。**MUST**：gate FAIL 记 `warn`，NOT `info`。

---

## 7. Decision Table

| 事件 | Log | Trace |
|------|-----|-------|
| Gate attempt | ✅ INFO/WARN | ✅ `gate_attempt` |
| Phase START/END | ✅ INFO | — |
| Queue enqueue/claim/complete/fail | ✅ INFO/WARN | ✅ `check`/`queue_*` |
| Subagent slot lifecycle | ✅ INFO | ✅ `slot_create`/`dispatch_*` |
| Repair iteration | ✅ WARN | —（Phase 2） |
| HITL decision | ✅ INFO | —（Phase 2） |
| Error/exception | ✅ ERROR | — |
| Run start/end | ✅ INFO | ✅ `run_start`/`run_end` |

---

## 8. Write Failure Semantics

Diagnostic logging is best effort. `_logs/run.log` 写失败不应阻塞 gate result、queue operation 或 Agent flow。

Trace/audit 缺失不能被解释成成功。若 `rb_trace.jsonl` 缺失、不可写、不可解析，或缺少应有的 gate/check event，恢复中的 Agent 必须把它当作 audit risk，通过 validate/inspect/gate feedback 暴露并修复；不能用 log 行、console output 或 chat summary 补账。

---

## MUST

- MUST use `_logs/run.log` as the single diagnostic log file per bundle.
- MUST use `rb_status.json` / `rb_queue.json` / `rb_profile.yaml` / `rb_plan.md` plus `rb_trace.jsonl` as recovery authority after context loss.
- MUST use `rb_trace.jsonl` as the source of pass/fail audit evidence — `console.log`, chat memory, and `_logs/run.log` are never verdict.
- MUST use `writeGateAttempt()` for all gate CLI trace/log output — no inline `appendFileSync` to `rb_trace.jsonl`.
- MUST include `bundle` in every log line and trace entry — the logging functions handle this automatically.
- MUST keep diagnostic log write failures non-blocking.
- MUST treat missing/unparseable trace as audit risk during recovery or inspection.

## MUST NOT

- MUST NOT use `console.log` as verdict.
- MUST NOT use chat memory, progress summaries, or `_logs/run.log` as current run state.
- MUST NOT merge log and trace into one file.
- MUST NOT require callers to know `_logs/run.log` path or format.
- MUST NOT let diagnostic logging errors propagate into Agent flow.
- MUST NOT treat a log line as proof that a gate passed, a receipt exists, or a phase completed.
- MUST NOT write runtime log entries into `DPT_FRAMEWORK/`.
- MUST NOT require new dependencies — logging uses only `node:fs` and `node:path`.

---

## Related Guidance

- `framework-runtime-boundary.md` § "Trace is Truth, Log is Explanation" — 本文档的哲学基础。
- `project-charter.md` — Agent (MD) 与 Engine (JS/CLI) 权威分工。
- `command-experiments.md` — "Console output explains the verdict; trace data decides it."
- `openspec/specs/logger/spec.md` — `logger.mjs` API specification.
- `openspec/specs/trace-writer/spec.md` — `trace.mjs` API specification.
