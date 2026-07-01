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

`run.log` 不变成全量 trace；它记录事故现场需要的稳定诊断事件。事件名是 closed-set，但这个 closed-set 替换 accepted LOC-006 里的旧摘要清单。

Event naming contract:

- Log message/event name SHALL be the fine-grained event, e.g. `queue_enqueue_attempt`.
- `detail.kind` SHALL be the broad diagnostic kind from `DIAGNOSTIC_KINDS` when one exists, e.g. `queue_enqueue`.
- If no broad diagnostic kind exists, `detail.kind` SHALL equal the fine-grained event name.
- This preserves compatibility with existing broad diagnostic tooling while making run.log grep-friendly for exact accident events.
- Implementations SHOULD use one local mapping/helper per module for event-to-kind selection so tests can assert both the fine-grained message and the broad `detail.kind` contract. This change does not require every fine-grained event to be added to `DIAGNOSTIC_KINDS`; broad kinds such as `queue_enqueue`, `queue_claim`, `queue_complete`, `queue_fail`, `ledger_append`, and `gate_failure_detail` remain the compatibility keys.

Queue event contract:

| Function | Events | Level | Required detail |
|----------|--------|-------|-----------------|
| `enqueue` | `queue_enqueue_attempt`, `queue_enqueue_done`, `queue_enqueue_exception` | INFO/ERROR | `kind`, `work_id?`, `slot?`, `target?`, `reason?` |
| `claim` | `queue_claim_attempt`, `queue_claim_done`, `queue_claim_empty`, `queue_claim_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `actor?`, `queue_health?`, `stop_authorization_state?`, `reason?` |
| `complete` | `queue_complete_attempt`, `queue_complete_reject`, `queue_complete_receipt_fail`, `queue_complete_done`, `queue_complete_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `delegated?`, `reason?`, `receipt?` |
| `fail` | `queue_fail_attempt`, `queue_fail_reject`, `queue_fail_done`, `queue_fail_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `reason?` |
| `preempt` | `queue_preempt_attempt`, `queue_preempt_reject`, `queue_preempt_done`, `queue_preempt_exception` | INFO/WARN/ERROR | `kind`, `work_id?`, `slot?`, `reason?`, `unsafeCurrent?` |
| `saveQueue` | `queue_save_attempt`, `queue_save_done`, `queue_save_exception` | INFO/ERROR | `kind`, `queue_id?`, `queue_health?`, `reason?` |
| `loadQueue` | `queue_load_attempt`, `queue_load_done`, `queue_load_exception` | INFO/ERROR | `kind`, `queue_id?`, `existed?`, `reason?` |
| delegated ledger | `ledger_append_attempt`, `ledger_append_done`, `ledger_append_exception` | INFO/ERROR | `kind`, `work_id?`, `slot_result_ref?`, `reason?` |

Relay event contract:

| Function/caller | Events | Level | Required detail |
|-----------------|--------|-------|-----------------|
| `stageSubagentSlots` | `relay_stage_attempt`, `relay_stage_empty`, `relay_stage_done`, `relay_stage_exception` | INFO/WARN/ERROR | `kind`, `branch?`, `waveIndex?`, `slotCount?`, `reason?` |
| `recordAgentSpawnRequested` | `relay_spawn_attempt`, `relay_spawn_requested`, `relay_spawn_exception` | INFO/ERROR | `kind`, `slotKey?`, `roleAgentKey?`, `platform?`, `runtimeMode?`, `reason?` |
| `ingestAgentReceipt` | `relay_receipt_ingest_attempt`, `relay_receipt_ingest_done`, `relay_receipt_ingest_failed`, `relay_receipt_ingest_exception` | INFO/WARN/ERROR | `kind`, `slotKey?`, `roleAgentKey?`, `receiptPath?`, `reason?` |
| `commitSlotResult` | `relay_commit_attempt`, `relay_commit_schema_fail`, `relay_commit_path_escape`, `relay_commit_done`, `relay_commit_exception` | INFO/WARN/ERROR | `kind`, `slotKey?`, `roleAgentKey?`, `status?`, `reason?`, `path?` |
| `collectAndMergeSubagentResults` | `relay_collect_attempt`, `relay_collect_empty`, `relay_all_failed`, `relay_merge_done`, `relay_refork_done`, `relay_collect_exception` | INFO/WARN/ERROR | `kind`, `slotCount?`, `ref_count?`, `branch?`, `reason?` |
| bundle-aware callers of `forkRouter` | `relay_fork_attempt`, `relay_fork_done`, `relay_fork_exception` | INFO/ERROR | `kind`, `branch?`, `ref_count?`, `ref_floor?`, `reason?` |
| bundle-aware callers of `convergeRepair` | `repair_attempt`, `repair_stalled`, `repair_done`, `repair_exception` | INFO/WARN/ERROR | `kind`, `outcome?`, `iterations?`, `reason?` |

Pure function boundary: `forkRouter()` and `convergeRepair()` remain pure unless their API is explicitly changed. In this change, log these decisions from existing bundle-aware callers (`forkAndStageSubagents()` and `collectAndMergeSubagentResults()`), not by forcing pure state transforms to discover a bundle.

Queue logger availability boundary: queue functions that do not receive `bundleDir` (`enqueue`, `claim`, `preempt`) log only after a run-scoped logger has been initialized through a bundle-aware entrypoint such as `loadQueue`, `saveQueue`, `complete`, `fail`, or the queue CLI. Pure in-memory queue calls without an initialized logger are not required to write `run.log`. `render()` SHOULD NOT be used as a logger-initialization guarantee unless its implementation is explicitly changed to initialize the run-scoped logger.

All diagnostic detail uses stable fields where available: `kind`, `phase`, `gate`, `work_id`, `slotKey`, `attempt`, `outcome`, `reason`, `diagnostic_path`, `inspect_count`, `advice_count`.

Exception events are for unexpected throws or validation/IO failures that would otherwise erase the last local context. They should be emitted from `catch` blocks with a sanitized `reason` and any identifiers already available; required identifiers are optional on exception events because schema parsing may have failed before trusted ids exist.

### Layer 2: Gate 共享入口

Gate CLIs already call `writeGateAttempt()` for normal results. This change keeps that as the only gate logging entrypoint and adds two refinements:

```
normal result → writeGateAttempt(bundlePath, result)
early invalid/config result → emitGateResult(result, { bundlePath: args.bundle })
failure diagnostic → writeGateAttempt() includes diagnostic_path in run.log detail
```

Gate ordering must be deterministic and must not leave run.log pointing at a missing diagnostic artifact:

1. `writeGateAttempt()` computes the failure diagnostic path before writing failure diagnostics.
2. On failed gates, it attempts to write `_diagnostics/gates/<iso>-<gate>.json` first.
3. If the diagnostic artifact write succeeds, the failed `gate_attempt` log detail includes `diagnostic_path`, and the compact trace diagnostic pointer uses the same path.
4. If diagnostic artifact write fails, the failed `gate_attempt` log detail includes `diagnostic_write_failed: true` and MUST NOT include `diagnostic_path`.

Implementation shape: `writeGateFailureDiagnostic()` should return a small status object such as `{ ok, path?, reason? }` instead of forcing `writeGateAttempt()` to infer success from side effects. `writeGateAttempt()` then uses that status to choose between `diagnostic_path` and `diagnostic_write_failed`.

Early error behavior:

| Error | Bundle known? | run.log behavior |
|-------|---------------|------------------|
| missing `--bundle` | no | no run.log write possible |
| missing `--current-node` | yes | `emitGateResult(result, { bundlePath })` writes `gate_attempt` |
| gate definition/config error | yes | `emitGateResult(result, { bundlePath })` writes `gate_attempt` |
| node/gate binding mismatch | yes | same shared gate path |

`parseGateCliArgs()` must preserve a provided `--bundle` value in error returns so wrappers can pass it to `emitGateResult(result, { bundlePath })`.

### Layer 3: Phase repair loop 诊断

Phase Agent 做 autonomous repair/retry 时通过 `log-event.mjs` 记。Scope is every phase node with autonomous gate repair/retry behavior, including instantiation, setup, hitl1, hitl2 repair branch, seed-topics, wave0, wave1, wave2, readiness, and terminal/degraded gate-fail handling in rerun. Wave supplementary loops receive the most detailed attempt/action/done events because they are the highest-volume repair path.

```
repair_loop_start     {phase, gate, attempt, inspect_count, reason}
repair_action         {phase, gate, attempt, action, work_id}
repair_loop_done      {phase, gate, attempt, outcome}
repair_escalated      {phase, gate, attempt, reason}
repair_degraded       {phase, gate, attempt, reason}
```

Terminal gate failures that are not autonomously repairable (for example `rerun-ready` fail after limits/config checks) still log the gate failure through `writeGateAttempt()` and SHOULD log `repair_escalated` or `repair_degraded` before stopping so run.log explains why no repair loop followed.

### Layer 4: Sub-agent 具体指令

`buildSpawnPrompt()` 追加以下具体指令，使用现有 CLI，不让 sub-agent 手写 log envelope：

```
Diagnostic logging: write to the parent bundle run log via:
node <absolute-path-to-DPT_FRAMEWORK>/cli/log-event.mjs --bundle <absolute-bundle-root> --level <info|warn|error> --msg "<event>" --detail '<json>'

Log these events:
- search_start
- search_done
- fetch_done
- file_written
- error
- work_done

Use lowercase CLI levels: `info` for normal progress, `warn` for blocked fetches or degraded results,
and `error` for failures that prevent completion.

Do NOT log: raw page content, full search result bodies, or private reasoning.
```

Spawn prompt examples must use copyable commands with:
- absolute bundle root from `baseDir`
- absolute `log-event.mjs` path derived as the path to `DPT_FRAMEWORK/cli/log-event.mjs`
- lowercase `--level info|warn|error` values accepted by `log-event.mjs`
- `--msg` equal to the event name (`search_start`, `fetch_done`, etc.)
- `--detail` JSON containing at minimum `kind`, `slotKey`, and `roleAgentKey`
- shell-safe single-quoted JSON examples

### Layer 5: Heartbeat

`createRunLogger()` 末尾加一行：

```javascript
log.info('logger_ready', { pid: process.pid });
```

Heartbeat may not be the first line in a bundle because `run_start` can be written by instantiation first, and multiple engine modules may initialize run-scoped loggers in one process.

### Layer 6: Guideline alignment

`guidelines/logging-conventions.md` remains valid for stable principles: trace is verdict authority, run.log is diagnostic explanation, log failures must not block execution, and callers must not hand-write log envelopes. Its LOC-006 closed-set summary is outdated because it names summary events (`enqueue`, `claim`, `complete`, etc.) that cannot reconstruct incident causality.

When implementation scope is opened beyond this change directory, update that guideline in the same change sequence as the accepted spec sync:

- preserve the trace/log authority boundary and unified `_logs/run.log` envelope
- replace the old engine LOC-006 closed set with the accident-grade LOG-006 event set
- state that event names are fine-grained while `detail.kind` may remain a broad compatibility key
- point readers to accepted OpenSpec specs for concrete event names and required fields
