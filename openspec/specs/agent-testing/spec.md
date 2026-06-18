# Agent Testing
> req: AGT-001, AGT-002, AGT-003

## Purpose

Agent 辅助的半自动测试体系。每个 engine（位于 `DPT_FRAMEWORK/engine/`）通过 `experiments_playbook/exp_<component>/` 的三级 playbook (simple/medium/complex) 验证, 每级使用独立 `dpt_disp_*` disposable bundle 与独立 trace 隔离。trace 统一由 `DPT_FRAMEWORK/engine/trace.mjs` 的 `createTrace()` 工厂创建，每个 playbook 持有自己的 trace 实例。新 playbook 的 trace verdict event SHALL use `check`; legacy `verify` events are not accepted for new verdict contracts.

## Requirements

### Requirement: gate-loop 三级测试 playbook (AGT-001)
gate-loop 的 Agent 辅助测试 playbook SHALL 为三级: simple (Gate + 1 node)、medium (Gate + Repair + 2 nodes)、complex (完整端到端)。每级 SHALL 使用独立 disposable bundle 目录 (`dpt_disp_gl_<level>/`) 和独立 trace 文件 (`_trace_gl_<level>.jsonl`) 实现完全隔离。

#### Scenario: Simple test runs independently
- **WHEN** 测试者运行 `experiments_playbook/exp_gate-loop/test-simple.md`
- **THEN** 创建 `dpt_disp_gl_simple/`, 写入 `_trace_gl_simple.jsonl`, 基于 `check` events 验证 PASS (~4 events)

#### Scenario: Medium test runs independently
- **WHEN** 测试者运行 `experiments_playbook/exp_gate-loop/test-medium.md`
- **THEN** 使用 `dpt_disp_gl_medium/` 和 `_trace_gl_medium.jsonl`, 与 simple 隔离

#### Scenario: Complex test runs independently
- **WHEN** 测试者运行 `experiments_playbook/exp_gate-loop/test-complex.md`
- **THEN** 含 Check, Gate, Repair, 4 nodes, C&I, 全在独立 bundle 和 trace

### Requirement: Trace 系统支持独立 trace 实例 (AGT-001)
`DPT_FRAMEWORK/engine/trace.mjs` 模块 SHALL 提供 `createTrace(filePath, options?)` 工厂函数，每次调用返回独立的 trace 实例（无共享状态）。每个测试脚本 SHALL 调用 `createTrace()` 创建自己的 trace 实例。Node SHALL 通过 `trace.traceEntry()` 自动 trace, 不硬编码文件名。

#### Scenario: 每个测试独立 trace 文件
- **WHEN** simple test 设 `const trace = createTrace('dpt_disp_gl_simple/_trace_gl_simple.jsonl')` 且 medium test 设 `const trace = createTrace('dpt_disp_gl_medium/_trace_gl_medium.jsonl')`
- **THEN** simple test 的 event 只写 `_trace_gl_simple.jsonl`, medium 只写 `_trace_gl_medium.jsonl`, 无交叉污染

### Requirement: gate-fork 三级测试 playbook (AGT-002)
gate-fork 的 Agent 辅助测试 playbook SHALL 为三级 (simple/medium/complex), 每级使用独立 disposable bundle (`dpt_disp_gf_<level>/`) 和独立 trace (`_trace_gf_<level>.jsonl`)。SHALL 复用 `DPT_FRAMEWORK/engine/trace.mjs` 的 `createTrace()` 工厂 API。

#### Scenario: Simple gate-fork test 验证单分支路由
- **WHEN** 测试者运行 `experiments_playbook/exp_gate-fork/test-simple.md`
- **THEN** 创建 `dpt_disp_gf_simple/`, 写入 `_trace_gf_simple.jsonl`, 基于 `check` events 验证 Gate 单分支路由 PASS (~4 events)

#### Scenario: Medium gate-fork test 验证分叉 + 汇聚修复
- **WHEN** 测试者运行 `experiments_playbook/exp_gate-fork/test-medium.md`
- **THEN** 使用 `dpt_disp_gf_medium/` 和 `_trace_gf_medium.jsonl`, 验证 Fork 多路分发 + Converge 共享修复, 与 simple 隔离 (~9 events)

#### Scenario: Complex gate-fork test 覆盖完整 pipeline + C&I
- **WHEN** 测试者运行 `experiments_playbook/exp_gate-fork/test-complex.md`
- **THEN** 使用 `dpt_disp_gf_complex/`, 验证 Fork → Converge → C&I 反馈 → 动态加载全流程 (~17 events)

### Requirement: Three-level real subagent test playbooks (AGT-003)
The real subagent test playbooks SHALL be the existing `experiments_playbook/exp_subagent/test-simple.md`, `test-medium.md`, and `test-complex.md` files. Each SHALL use its own `dpt_disp_gs_<level>/` disposable bundle directory and trace file for isolation. Each SHALL use native Codex / Claude Code subagent runtime where available.

#### Scenario: Simple real subagent test runs one intake agent
- **WHEN** a tester runs `experiments_playbook/exp_subagent/test-simple.md`
- **THEN** it dispatches one `dpt-source-intake` slot, spawns one native LLM subagent, validates `result.json`, collects the result, and verifies PASS

#### Scenario: Medium real subagent test runs intake and diagnostic agents
- **WHEN** a tester runs `experiments_playbook/exp_subagent/test-medium.md`
- **THEN** it dispatches `dpt-source-intake` and `dpt-source-diagnostic`, spawns both before collect, validates both results or records failure, and verifies partial-failure tolerance

#### Scenario: Complex real subagent test covers parallel completion and partial failure
- **WHEN** a tester runs `experiments_playbook/exp_subagent/test-complex.md`
- **THEN** it dispatches intake, verifier, and extractor slots, runs up to 3 native subagents concurrently, handles one failed or invalid result, merges successful slots, and re-enters gate evaluation

### Requirement: Runtime-agent trace events prove real execution path (AGT-003)
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

### Requirement: Runtime-agent evidence is mandatory (AGT-003)
The real subagent test suite SHALL require subagent-written runtime receipts and validated Parent Relay outputs for real LLM subagent acceptance.

#### Scenario: Missing runtime-agent evidence is rejected
- **WHEN** a playbook completes without native runtime-agent events
- **THEN** it does not satisfy AGT-003 real-subagent acceptance
