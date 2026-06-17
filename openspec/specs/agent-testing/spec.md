# Agent Testing
> req: AGT-001, AGT-002, AGT-003

## Purpose

Agent 辅助的半自动测试体系。每个 prototype-{component} 通过 `DPT_FRAMEWORK/command_experiments/<component>/` 的三级 playbook (simple/medium/complex) 验证, 每级使用独立 bundle 与独立 trace 隔离。trace source 前缀按组件区分: gate-loop `gl-`, gate-fork `gf-`, subagent `gs-`。

## Requirements

### Requirement: gate-loop 三级测试 playbook (AGT-001)
gate-loop 的 Agent 辅助测试 playbook SHALL 为三级: simple (Gate + 1 segment)、medium (Gate + Repair + 2 segments)、complex (完整端到端)。每级 SHALL 使用独立 bundle 目录 (`dpt_rb_test_gl_<level>/`) 和独立 trace 文件 (`_trace_gl_<level>.jsonl`) 实现完全隔离。

#### Scenario: Simple test runs independently
- **WHEN** 测试者运行 `command_experiments/gate-loop/test-simple.md`
- **THEN** 创建 `dpt_rb_test_gl_simple/`, 写入 `_trace_gl_simple.jsonl`, 验证 PASS (~4 events)

#### Scenario: Medium test runs independently
- **WHEN** 测试者运行 `command_experiments/gate-loop/test-medium.md`
- **THEN** 使用 `dpt_rb_test_gl_medium/` 和 `_trace_gl_medium.jsonl`, 与 simple 隔离

#### Scenario: Complex test runs independently
- **WHEN** 测试者运行 `command_experiments/gate-loop/test-complex.md`
- **THEN** 含 Check, Gate, Repair, 4 segments, C&I, 全在独立 bundle 和 trace

### Requirement: Trace 系统支持命名 trace 文件 (AGT-001)
`trace.mjs` 模块 SHALL 提供 `setTraceFile()` 和 `getTraceFile()` 声明全局 trace 文件。每个测试脚本 SHALL 按进程调用 `setTraceFile()`。Segment SHALL 通过 `traceEntry()` 自动 trace, 不硬编码文件名。

#### Scenario: 每个测试独立 trace 文件
- **WHEN** simple test 设 `setTraceFile('dpt_rb_test_gl_simple/_trace_gl_simple.jsonl')` 且 medium test 设 `setTraceFile('dpt_rb_test_gl_medium/_trace_gl_medium.jsonl')`
- **THEN** simple test 的 event 只写 `_trace_gl_simple.jsonl`, medium 只写 `_trace_gl_medium.jsonl`, 无交叉污染

### Requirement: gate-fork 三级测试 playbook (AGT-002)
gate-fork 的 Agent 辅助测试 playbook SHALL 为三级 (simple/medium/complex), 每级使用独立 bundle (`dpt_rb_test_gf_<level>/`) 和独立 trace (`_trace_gf_<level>.jsonl`)。SHALL 复用 gate-loop 的 trace.mjs API (setTraceFile/traceEntry/traceCleanup), trace source 前缀为 `gf-`。

#### Scenario: Simple gate-fork test 验证单分支路由
- **WHEN** 测试者运行 `command_experiments/gate-fork/test-simple.md`
- **THEN** 创建 `dpt_rb_test_gf_simple/`, 写入 `_trace_gf_simple.jsonl`, 验证 Gate 单分支路由 PASS (~4 events)

#### Scenario: Medium gate-fork test 验证分叉 + 汇聚修复
- **WHEN** 测试者运行 `command_experiments/gate-fork/test-medium.md`
- **THEN** 使用 `dpt_rb_test_gf_medium/` 和 `_trace_gf_medium.jsonl`, 验证 Fork 多路分发 + Converge 共享修复, 与 simple 隔离 (~9 events)

#### Scenario: Complex gate-fork test 覆盖完整 pipeline + C&I
- **WHEN** 测试者运行 `command_experiments/gate-fork/test-complex.md`
- **THEN** 使用 `dpt_rb_test_gf_complex/`, 验证 Fork → Converge → C&I 反馈 → 动态加载全流程 (~17 events)

### Requirement: Three-level real subagent test playbooks
The real subagent test playbooks SHALL be the existing `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md`, `test-medium.md`, and `test-complex.md` files. Each SHALL use its own bundle directory and trace file for isolation. Each SHALL use native Codex / Claude Code subagent runtime where available.

#### Scenario: Simple real subagent test runs one intake agent
- **WHEN** a tester runs `command_experiments/subagent/test-simple.md`
- **THEN** it dispatches one `dpt-source-intake` slot, spawns one native LLM subagent, validates `result.json`, collects the result, and verifies PASS

#### Scenario: Medium real subagent test runs intake and diagnostic agents
- **WHEN** a tester runs `command_experiments/subagent/test-medium.md`
- **THEN** it dispatches `dpt-source-intake` and `dpt-source-diagnostic`, spawns both before collect, validates both results or records failure, and verifies partial-failure tolerance

#### Scenario: Complex real subagent test covers parallel completion and partial failure
- **WHEN** a tester runs `command_experiments/subagent/test-complex.md`
- **THEN** it dispatches intake, verifier, and extractor slots, runs up to 3 native subagents concurrently, handles one failed or invalid result, merges successful slots, and re-enters gate evaluation

### Requirement: Runtime-agent trace events prove real execution path
The real subagent audit trace SHALL include runtime-agent events imported from subagent-written runtime receipts. Required event names are `agent_spawn_requested`, `agent_runtime_started`, `agent_result_ready`, `agent_result_received`, `result_schema_validated`, `collect_result`, and `merge_complete`.

#### Scenario: Trace includes native spawn and result events
- **WHEN** a real subagent playbook completes
- **THEN** its trace includes `agent_spawn_requested`, `agent_runtime_started`, `agent_result_ready`, and `agent_result_received` for each slot
- **AND** parent events identify `actor: "parent"`
- **AND** imported receipt events identify `actor: "subagent"` and include the subagent `runtimeAgentId`

#### Scenario: Trace includes schema validation before collection
- **WHEN** a slot result is collected
- **THEN** the trace includes `result_schema_validated` before `collect_result`

#### Scenario: Trace proves merge after collection
- **WHEN** all slots are terminal or timed out
- **THEN** the trace includes `merge_complete` after collection events

### Requirement: Runtime-agent evidence is mandatory
The real subagent test suite SHALL require subagent-written runtime receipts and validated Parent Relay outputs for real LLM subagent acceptance.

#### Scenario: Missing runtime-agent evidence is rejected
- **WHEN** a playbook completes without native runtime-agent events
- **THEN** it does not satisfy AGT-003 real-subagent acceptance
