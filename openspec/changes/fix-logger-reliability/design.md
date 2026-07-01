## Context

生产 bundle 的 `_logs/run.log` 49 次 complete 只 1 条记录。根因：`logEvent()` 只在 happy path 上，engine 入口/出口/错误路径全静默，sub-agent 完全没参与。

## Goals / Non-Goals

**Goals:**
1. Engine 每个入口函数记 entry log，每个 return 路径记原因
2. Gate fail + repair attempt + inspect/advice 反馈记 log
3. Sub-agent spawn prompt 给具体指令：搜索/抓取/写文件/出错时记什么
4. Logger 初始化 heartbeat

**Non-Goals:**
- 不改变 logger 格式或 level 体系
- 不添加新 transport
- 不改变 trace 系统

## Design

### Layer 1: Engine 出入口全覆盖

队列操作（`queue-manager.mjs`）：

```
enqueue()    → entry: logEvent('info', 'enqueue', {work_id, slot|refill_pool})
claim()      → entry: logEvent('info', 'claim_attempt', {work_id})
               success: 已有 logEvent('info', 'claim', ...)
               empty:   logEvent('warn', 'claim_empty', {queue_health})
complete()   → entry: logEvent('info', 'complete_attempt', {work_id, delegated})
               validate_fail: logEvent('warn', 'complete_reject', {work_id, reason})
               receipt_fail:  logEvent('warn', 'complete_receipt_fail', {work_id, receipt})
               success: 已有 logEvent('info', 'complete', ...) + logEvent('info', 'ledger_append', ...)
fail()       → entry: logEvent('info', 'fail_attempt', {work_id, reason})
               success: 已有 logEvent('warn', 'fail', ...)
preempt()    → entry: logEvent('info', 'preempt_attempt', {work_id, slot, reason})
               success: 已有 logEvent('warn', 'preempt', ...)
saveQueue()  → entry: logEvent('info', 'queue_save', {queue_id, queue_health})
loadQueue()  → entry: logEvent('info', 'queue_load', {queue_id, existed})
```

Sub-agent relay（`subagent-relay.mjs`）：

```
stageSubagentSlots()     → logEvent('info', 'relay_stage', {waveIndex, slotCount})
commitSlotResult()       → entry: logEvent('info', 'relay_commit_attempt', {slotKey})
                            schema_fail: logEvent('warn', 'relay_commit_schema_fail', {slotKey, error})
                            path_escape: logEvent('warn', 'relay_commit_path_escape', {slotKey, path})
                            success: logEvent('info', 'relay_commit', {slotKey, status})
collectAndMerge()        → entry: logEvent('info', 'relay_collect', {slotCount})
                            all_failed: logEvent('warn', 'relay_all_failed', {slotCount})
                            merge: logEvent('info', 'relay_merge', {ref_count, branch})
forkRouter()             → logEvent('info', 'fork', {branch, ref_count, ref_floor})
convergeRepair()         → entry: logEvent('info', 'repair_attempt', {outcome})
                            stalled: logEvent('warn', 'repair_stalled', {iterations})
                            success: logEvent('info', 'repair_done', {outcome, iterations})
```

### Layer 2: Gate 反馈记 log

Gate CLI 执行后记一行（已有的 `writeGateAttempt` 只写 trace，不加 log）：

```
gate executed → logEvent(gate.passed ? 'info' : 'warn', 'gate_attempt',
                 {gate, passed, inspect_count, advice_count})
```

Phase Agent 做 repair 时记：

```
repair loop → logEvent('info', 'repair_loop', {gate, attempt, action})
```

### Layer 3: Sub-agent 具体指令

`buildSpawnPrompt()` 追加以下具体指令（替换现在的"只写 runtime receipt"）：

```
Diagnostic logging: Append lines to _logs/run.log in the bundle root.
Format: [ISO8601] LEVEL subagent <slotKey> <message>

Log these events:
- When you start work: "subagent <slotKey> search_start query=<q>"
- After each WebSearch: "subagent <slotKey> search_done results=<N>"
- After each WebFetch: "subagent <slotKey> fetch_done url=<U> status=<ok|blocked>"
- When you write a file: "subagent <slotKey> file_written path=<P>"
- When you hit an error: "subagent <slotKey> ERROR <description>"
- When work is complete: "subagent <slotKey> work_done files=<N> confidence=<C>"

Use level INFO for normal progress, WARN for blocked fetches or degraded results,
ERROR for failures that prevent completion.

Do NOT log: raw page content, full search result bodies, or private reasoning.
```

### Layer 4: Heartbeat

`createRunLogger()` 末尾加一行：

```javascript
log.info('logger_ready', { pid: process.pid });
```
