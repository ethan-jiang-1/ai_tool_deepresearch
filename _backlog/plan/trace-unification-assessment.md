# 统一 trace 文件 — 只留 `rb_trace.jsonl`

> 状态: 待 review | 日期: 2026-06-28 | 来源: openspec explore 对话
>
> 消灭 `_logs/_trace_agq_cli.jsonl`、`_logs/_trace_subagent.jsonl`、`_logs/_trace.jsonl`，全部合并到 `rb_trace.jsonl`

---

## 现状：四份 trace 文件

| 文件 | 位置 | 域 | 写入者 | 读取者 |
|------|------|-----|--------|--------|
| `rb_trace.jsonl` | bundle root | 生命周期 + gate 裁决 | instantiate-run-bundle, gate-helpers, log-event --event, advance-status, new-disposable-bundle | gate CLIs, inspect-bundle, validate-bundle, ~30 playbooks |
| `_logs/_trace_agq_cli.jsonl` | `_logs/` | Queue 操作审计 | queue-manager.mjs only | queue-manager.mjs (trace: receipt), inspect-bundle --timeline, 1 playbook |
| `_logs/_trace_subagent.jsonl` | `_logs/` | Subagent relay 审计 | subagent-relay.mjs only | inspect-bundle --timeline only |
| `_logs/_trace.jsonl` | `_logs/` | 实验 playbook verdict | wff-playbook-utils recordCheck | verdict(), ~30 playbooks |

## 决定

**只留 `rb_trace.jsonl`（bundle root）。** `_logs/` 下的 trace 文件全部是过去式，消灭。

`rb_trace.jsonl` 的现有读写者 **不需要改动**。

---

## 需要改动的：三个待消灭的 trace

### 1. 消灭 `_logs/_trace_agq_cli.jsonl` → 迁入 `rb_trace.jsonl`

**写入者：`DPT_FRAMEWORK/engine/queue-manager.mjs`**

- 常量 `QUEUE.TRACE = '_logs/_trace_agq_cli.jsonl'`（line 109）→ 改为 `'rb_trace.jsonl'`
- `ensureTrace()` 中 `createTrace(bundleDir/QUEUE.TRACE)`（line 72）→ 自动跟随常量
- `ensureTrace()` 内部 `consoleEcho: false`，不调 `traceInit`（不清空文件），只追加 → 迁入 `rb_trace.jsonl` 后行为不变

**读取者：**
- `queue-manager.mjs:326` `checkReceipts()` 中 `trace:` receipt 检查 — 自动跟随 `QUEUE.TRACE`
- `inspect-bundle.mjs --timeline`（line 112）— 少读一个 sink，简化
- `experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md:330` — `grep -c 'queue_' $B/_logs/_trace_agq_cli.jsonl` → 改为 `grep -c 'queue_' $B/rb_trace.jsonl`

**改动量：1 行常量 + 1 个 playbook**

### 2. 消灭 `_logs/_trace_subagent.jsonl` → 迁入 `rb_trace.jsonl`

**写入者：`DPT_FRAMEWORK/engine/subagent-relay.mjs`**

- `ensureTrace()` 中 `createTrace(path.join(bundleDir, '_logs', '_trace_subagent.jsonl'), ...)`（line 91）→ 改为 `createTrace(path.join(bundleDir, 'rb_trace.jsonl'), ...)`
- 同样不调 `traceInit`，只追加 → 迁入后行为不变

**读取者：**
- `inspect-bundle.mjs --timeline` — 少读一个 sink
- 无其他生产代码读取

**改动量：1 行路径**

### 3. 消灭 `_logs/_trace.jsonl`（实验 verdict）→ 迁入 `rb_trace.jsonl`

**写入者：`experiments_env/shared/wff-playbook-utils.mjs` `recordCheck()`**

- `recordCheck(tracePath, ...)` 的 `tracePath` 参数由 playbook 调用方传入
- playbook 中调用 `recordCheck('$B/_logs/_trace.jsonl', ...)` → 改为 `recordCheck('$B/rb_trace.jsonl', ...)`

**读取者：`wff-playbook-utils.mjs` `verdict()` + ~30 playbooks**

- `verdict(tracePath)` 参数同样由 playbook 传入
- playbook 中调用 `verdict('$B/_logs/_trace.jsonl')` → 改为 `verdict('$B/rb_trace.jsonl')`

**改动量：~30 个 playbook 中的路径引用（机械替换）**

---

## 架构问题分析

### `createTrace` 实例共享

当前各模块对 trace 的写入方式不同：

| 模块 | 方式 | traceInit? |
|------|------|-----------|
| instantiate-run-bundle | `createTrace(rb_trace) → traceInit()` | **是（清空+写 run_start）** |
| new-disposable-bundle | 同上 | **是** |
| gate-helpers writeGateAttempt | 直接 `appendFileSync` | 否 |
| log-event --event | 直接 `writeFileSync({flag:'a'})` | 否 |
| advance-status | 直接 `writeFileSync({flag:'a'})` | 否 |
| queue-manager ensureTrace | `createTrace(...) → traceEntry()` | 否（lazy init，追加） |
| subagent-relay ensureTrace | 同上 | 否 |

**不冲突。** `traceInit` 只在 bundle 创建时调一次（清空旧文件写 `run_start`）。queue-manager 和 subagent-relay 的 `ensureTrace` 是 lazy init，只追加不清理。合并后各模块写同一个文件，追加模式互不干扰。

### `validate-bundle.mjs` schema 验证

当前 `TraceEntrySchema` 已是 passthrough：
```js
export const TraceEntrySchema = z.object({
  ts: z.string(),
  event: z.string(),
}).passthrough();
```
合并后事件类型增多（gate_attempt + check + queue_loaded + agent_runtime_started + ...），schema 不受影响。**不需要改。**

### `inspect-bundle.mjs --timeline` 简化

当前读 4 个 sink：`rb_trace.jsonl`、`_trace_agq_cli.jsonl`、`_trace_subagent.jsonl`、`run.log`。合并后只剩 2 个：`rb_trace.jsonl` + `run.log`。`SINK_LABELS` 中 `[queue]` 和 `[subagent]` 标签不再需要。

---

## 代价总览

| 改动 | 文件数 | 难度 |
|------|--------|------|
| `queue-manager.mjs` `QUEUE.TRACE` 常量 | 1 | 低（1 行） |
| `subagent-relay.mjs` `ensureTrace()` 路径 | 1 | 低（1 行） |
| `inspect-bundle.mjs --timeline` 简化 | 1 | 低（删代码） |
| `wff-playbook-utils.mjs` recordCheck/verdict 默认路径 | 1 | 低 |
| 实验 playbook `_logs/_trace.jsonl` → `rb_trace.jsonl` | ~30 | 中（机械替换，量大） |
| 实验 playbook `_trace_agq_cli.jsonl` → `rb_trace.jsonl` | 1 (case-211) | 低 |

**总计 ~35 文件。核心改动几乎是纯机械替换，无架构风险。**

---

## 实施顺序

1. 改 `queue-manager.mjs` 的 `QUEUE.TRACE` 常量
2. 改 `subagent-relay.mjs` 的 `ensureTrace()` 路径
3. 简化 `inspect-bundle.mjs --timeline`
4. 改 `wff-playbook-utils.mjs` 默认 trace 路径
5. 批量替换实验 playbook 中的 `_logs/_trace.jsonl` → `rb_trace.jsonl`
6. 更新 `command-experiments.md` 中 trace 路径描述（`_logs/_trace.jsonl` → `rb_trace.jsonl`）
7. 跑实验验证
