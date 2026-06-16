# Agent Testing

> req: AGT-001

Agent 辅助的半自动测试。3 级 playbook (simple/medium/complex)，独立 bundle (`dpt_rb_test_gl_*`)，独立 trace (`_trace_gl_*.jsonl`)。

## ADDED Requirements

### Requirement: Three-level test playbooks with independent traces
The test playbooks SHALL be at three complexity levels: simple (Gate + 1 segment), medium (Gate + Repair + 2 segments), complex (full end-to-end). Each SHALL use its own bundle directory (`dpt_rb_test_gl_<level>/`) and trace file (`_trace_gl_<level>.jsonl`) for complete isolation.

#### Scenario: Simple test runs independently
- **WHEN** a tester runs `command_experiments/test-gate-loop-simple.md`
- **THEN** it creates `dpt_rb_test_gl_simple/`, writes `_trace_gl_simple.jsonl`, and verifies PASS (4 events)

#### Scenario: Medium test runs independently
- **WHEN** a tester runs `command_experiments/test-gate-loop-medium.md`
- **THEN** it uses `dpt_rb_test_gl_medium/` and `_trace_gl_medium.jsonl`, isolated from simple

#### Scenario: Complex test runs independently
- **WHEN** a tester runs `command_experiments/test-gate-loop-complex.md`
- **THEN** it includes Check, Gate, Repair, 4 segments, C&I — all in separate bundle and trace

### Requirement: Trace system supports named trace files
The `trace.mjs` module SHALL provide `setTraceFile()` and `getTraceFile()` for global trace file declaration. Each test script SHALL call `setTraceFile()` per process. Segments SHALL auto-trace via `traceEntry()` without hardcoding filenames.

#### Scenario: Independent trace files per test
- **WHEN** simple test sets `setTraceFile('dpt_rb_test_gl_simple/_trace_gl_simple.jsonl')` and medium test sets `setTraceFile('dpt_rb_test_gl_medium/_trace_gl_medium.jsonl')`
- **THEN** events from simple test write to `_trace_gl_simple.jsonl` only, medium test writes to `_trace_gl_medium.jsonl` only — no cross-contamination
