# Trace Writer (Delta)

> req: TRW-003, TRW-004

## ADDED Requirements

### Requirement: Trace entries include bundle field

所有写入 `rb_trace.jsonl` 的 JSONL 入口 SHALL 包含 `bundle` 字段。`bundle` 的值 SHALL 从 bundle 的 `rb_status.json` 读取。

此要求适用于：
- `writeGateAttempt()` 写入的 `gate_attempt` 事件
- `queue-manager.mjs` 写入的队列生命周期事件（`_trace_agq_cli.jsonl`）
- `subagent-relay.mjs` 写入的 subagent 生命周期事件（`_trace_subagent.jsonl`）

`bundle` SHALL 不通过函数参数显式传递——读取逻辑封装在写入函数内部，从 `rb_status.json` 自动获取。

#### Scenario: Gate attempt trace includes bundle

- **WHEN** `writeGateAttempt(bundlePath, result)` 写入 trace 入口
- **THEN** 每行 JSONL SHALL 包含 `"bundle": "my-research"` 字段

#### Scenario: Queue trace includes bundle

- **WHEN** `queue-manager.mjs` 的 `traceEntry()` 写入事件
- **THEN** 每行 JSONL SHALL 包含 `"bundle": "my-research"` 字段

#### Scenario: Subagent trace includes bundle

- **WHEN** `subagent-relay.mjs` 的 `traceEntry()` 写入事件
- **THEN** 每行 JSONL SHALL 包含 `"bundle": "my-research"` 字段

#### Scenario: bundle survives across independent CLI processes

- **WHEN** 多个独立 `node` 进程（gate CLI）在同一 bundle 上运行
- **THEN** 所有 trace 入口的 `bundle` SHALL 相同
- **AND** `bundle` SHALL 与 `rb_status.json` 中持久化的值一致

### Requirement: Run start trace marker

系统 SHALL 在 run 生命周期起点写入 trace marker 事件：bundle 实例化时，`instantiate-run-bundle.mjs` 调用 `createTrace(...).traceInit('deep_research_run', { bundle })`，写入 `run_start` 事件到 `rb_trace.jsonl` 首行。

`run_start` SHALL 始终是 `rb_trace.jsonl` 的第一行。

> 终态 `run_end` marker 不在本 change 范围——Phase 1 无写 `rb_trace.jsonl` 的终态钩子（final phase 无 gate、Agent 仅能写 `_logs/run.log`）。`run_end` 连同"run_end 后无 gate_attempt"不变量留待 Phase 2，见 design Open Question #4。

#### Scenario: run_start is first line of trace file

- **WHEN** `instantiate-run-bundle.mjs` 创建新 bundle
- **THEN** `rb_trace.jsonl` 的第一行 SHALL 为 `{"ts":"...","event":"run_start","label":"deep_research_run","bundle":"my-research"}`
