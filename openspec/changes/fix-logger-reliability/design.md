## Context

生产 bundle 的 `_logs/run.log` 49 次 complete 只 1 条记录。根因是事故现场因果链断裂：engine happy path 有少量摘要，失败前、gate early error、repair loop、sub-agent 运行中事件、diagnostic artifact pointer 都不稳定。

## Goals / Non-Goals

**Goals:**
1. Engine hot path 记录事故级 attempt/outcome/reject/failed/empty/exception 事件，失败前写原因
2. Gate 通过 `writeGateAttempt()` 统一写 pass/fail/early error，并把 failure diagnostic path 写入 log detail
3. Phase repair loop 记录 start/action/done/escalated/degraded
4. Sub-agent spawn prompt 给具体 `log-event.mjs` 命令：搜索/抓取/写文件/出错时记什么
5. Logger 初始化 heartbeat

**Non-Goals:**
- 不改变 logger 格式或 level 体系
- 不添加新 transport
- 不改变 trace 系统

## Design

### Layer 1: Engine 事故级 hot-path 覆盖

队列操作（`queue-manager.mjs`）：

```
enqueue()    → queue_enqueue_attempt / queue_enqueue_done
claim()      → queue_claim_attempt / queue_claim / queue_claim_empty
complete()   → queue_complete_attempt / queue_complete_reject / queue_complete_receipt_fail / queue_complete
fail()       → queue_fail_attempt / queue_fail
preempt()    → queue_preempt_attempt / queue_preempt / queue_preempt_reject
saveQueue()  → queue_save_attempt / queue_save_done / queue_save_exception
loadQueue()  → queue_load_attempt / queue_load_done / queue_load_exception
```

Sub-agent relay（`subagent-relay.mjs`）：

```
stageSubagentSlots()          → relay_stage_attempt / relay_stage_empty / relay_stage_done / relay_stage_exception
recordAgentSpawnRequested()   → relay_spawn_requested
ingestAgentReceipt()          → relay_receipt_ingest_attempt / relay_receipt_ingest_done / relay_receipt_ingest_failed
commitSlotResult()            → relay_commit_attempt / relay_commit_schema_fail / relay_commit_path_escape / relay_commit
collectAndMergeSubagentResults() → relay_collect_attempt / relay_all_failed / relay_merge / relay_refork_done
forkRouter()                  → relay_fork
convergeRepair()              → repair_attempt / repair_stalled / repair_done
```

All diagnostic detail SHOULD use stable fields where available: `kind`, `phase`, `gate`, `work_id`, `slotKey`, `attempt`, `outcome`, `reason`, `diagnostic_path`, `inspect_count`, `advice_count`.

### Layer 2: Gate 共享入口

Gate CLIs already call `writeGateAttempt()` for normal results. This change keeps that as the only gate logging entrypoint and adds two refinements:

```
normal result → writeGateAttempt(bundlePath, result)
early invalid/config result → emitGateResult(result, { bundlePath: args.bundle })
failure diagnostic → writeGateAttempt() includes diagnostic_path in run.log detail
```

### Layer 3: Phase repair loop 诊断

Phase Agent 做 repair 时通过 `log-event.mjs` 记：

```
repair_loop_start     {phase, gate, attempt, inspect_count, reason}
repair_action         {phase, gate, attempt, action, work_id}
repair_loop_done      {phase, gate, attempt, outcome}
repair_escalated      {phase, gate, attempt, reason}
repair_degraded       {phase, gate, attempt, reason}
```

### Layer 4: Sub-agent 具体指令

`buildSpawnPrompt()` 追加以下具体指令，使用现有 CLI，不让 sub-agent 手写 log envelope：

```
Diagnostic logging: write to the parent bundle run log via:
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <level> --msg "<message>" --detail '<json>'

Log these events:
- search_start
- search_done
- fetch_done
- file_written
- error
- work_done

Use level INFO for normal progress, WARN for blocked fetches or degraded results,
ERROR for failures that prevent completion.

Do NOT log: raw page content, full search result bodies, or private reasoning.
```

### Layer 5: Heartbeat

`createRunLogger()` 末尾加一行：

```javascript
log.info('logger_ready', { pid: process.pid });
```

Heartbeat may not be the first line in a bundle because `run_start` can be written by instantiation first, and multiple engine modules may initialize run-scoped loggers in one process.
