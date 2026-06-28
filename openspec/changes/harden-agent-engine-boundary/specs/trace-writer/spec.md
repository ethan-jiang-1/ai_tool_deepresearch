# Trace Writer (delta)

> req: TRW-005

## ADDED Requirements

### Requirement: Single rb_trace.jsonl SHALL be the only trace file

系统 SHALL 只维护一份 trace 文件：bundle root 下的 `rb_trace.jsonl`。`_logs/` 目录下的以下 trace 文件 SHALL 被消灭：

- `_logs/_trace_agq_cli.jsonl` — queue-manager.mjs 的 queue 操作审计 trace
- `_logs/_trace_subagent.jsonl` — subagent-relay.mjs 的 subagent relay 审计 trace
- `_logs/_trace.jsonl` — wff-playbook-utils.mjs 的实验 verdict trace

所有 trace 写入者 SHALL 统一写 `rb_trace.jsonl`（追加模式，互不干扰）：

- `instantiate-run-bundle.mjs` / `new-disposable-bundle.mjs`：bundle 创建时 `traceInit()`（清空+写 `run_start`）
- `gate-helpers.mjs` `writeGateAttempt()`：gate attempt 追加
- `log-event.mjs --event`：check event 追加
- `advance-status.mjs`：phase 状态变更 event 追加
- `queue-manager.mjs` `ensureTrace()`：queue 生命周期 event 追加
- `subagent-relay.mjs` `ensureTrace()`：subagent relay event 追加
- `wff-playbook-utils.mjs` `recordCheck()`：实验 verdict check event 追加

`inspect-bundle.mjs --timeline` SHALL 从读 4 个 sink 简化为读 2 个（`rb_trace.jsonl` + `_logs/run.log`）。

#### Scenario: All trace events land in single rb_trace.jsonl

- **WHEN** bundle 经历了完整的 create → queue operations → subagent spawn → gate checks → verdict 生命周期
- **THEN** 所有 trace event（run_start、queue_claimed、queue_completed、agent_runtime_started、gate_attempt、check）SHALL 都在 `rb_trace.jsonl` 中
- **AND** `_logs/_trace_agq_cli.jsonl` SHALL NOT 存在
- **AND** `_logs/_trace_subagent.jsonl` SHALL NOT 存在
- **AND** `_logs/_trace.jsonl` SHALL NOT 存在

#### Scenario: Multiple writers appending don't interfere

- **WHEN** `queue-manager.mjs` 和 `subagent-relay.mjs` 和 `gate-helpers.mjs` 各自追加 event 到 `rb_trace.jsonl`
- **THEN** 各 event 的 JSONL 行 SHALL 保持完整且不交错（每行是独立 JSON object）
- **AND** `rb_trace.jsonl` SHALL 仍可通过 `TraceSchema` 逐行验证

#### Scenario: inspect-bundle --timeline reads fewer sinks

- **WHEN** `inspect-bundle.mjs --timeline` 运行
- **THEN** it SHALL 只读 `rb_trace.jsonl` 和 `_logs/run.log`
- **AND** `SINK_LABELS` 中 `[queue]` 和 `[subagent]` 标签 SHALL NOT 出现

## MODIFIED Requirements

### Requirement: Trace entries include bundle field

所有写入 `rb_trace.jsonl` 的 JSONL 入口 SHALL 包含 `bundle` 字段。`bundle` 的值 SHALL 从 bundle 的 `rb_status.json` 读取。

此要求适用于所有写入 `rb_trace.jsonl` 的模块：

- `writeGateAttempt()` 写入的 `gate_attempt` 事件
- `queue-manager.mjs` 写入的队列生命周期事件
- `subagent-relay.mjs` 写入的 subagent 生命周期事件

`bundle` SHALL 不通过函数参数显式传递——读取逻辑封装在写入函数内部，从 `rb_status.json` 自动获取。

#### Scenario: Gate attempt trace includes bundle

- **WHEN** `writeGateAttempt(bundlePath, result)` 写入 trace 入口
- **THEN** 每行 JSONL SHALL 包含 `"bundle": "my-research"` 字段

#### Scenario: Queue trace includes bundle

- **WHEN** `queue-manager.mjs` 的 `traceEntry()` 写入事件到 `rb_trace.jsonl`
- **THEN** 每行 JSONL SHALL 包含 `"bundle": "my-research"` 字段

#### Scenario: Subagent trace includes bundle

- **WHEN** `subagent-relay.mjs` 的 `traceEntry()` 写入事件到 `rb_trace.jsonl`
- **THEN** 每行 JSONL SHALL 包含 `"bundle": "my-research"` 字段

#### Scenario: bundle survives across independent CLI processes

- **WHEN** 多个独立 `node` 进程（gate CLI）在同一 bundle 上运行
- **THEN** 所有 trace 入口的 `bundle` SHALL 相同
- **AND** `bundle` SHALL 与 `rb_status.json` 中持久化的值一致
