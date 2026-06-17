# Agent Testing (workflow-load extension)
> req: AGT-004

Workflow-load 的 Agent 辅助半自动测试 playbook。复用 gate-loop/gate-fork/subagent 的三级复杂度模式，新增 workflow-load 专用 playbook。

## ADDED Requirements

### Requirement: Three-level workflow-load test playbooks
The workflow-load test playbooks SHALL be at three complexity levels: simple, medium, and complex. Each SHALL use its own bundle directory (`dpt_rb_test_wl_<level>/`) and trace file (`_trace_wl_<level>.jsonl`) for complete isolation.

#### Scenario: Simple workflow-load test observes one dynamic step
- **WHEN** a tester runs `command_experiments/workflow-load/test-simple.md`
- **THEN** it creates `dpt_rb_test_wl_simple/`, writes `_trace_wl_simple.jsonl`, advances one workflow step, and verifies that the step Markdown was not loaded before advance

#### Scenario: Medium workflow-load test observes dependencies and cache
- **WHEN** a tester runs `command_experiments/workflow-load/test-medium.md`
- **THEN** it uses `dpt_rb_test_wl_medium/`, advances multiple steps, verifies dependency-first execution, and verifies cache hit with repeated execution

#### Scenario: Complex workflow-load test observes error recovery
- **WHEN** a tester runs `command_experiments/workflow-load/test-complex.md`
- **THEN** it uses `dpt_rb_test_wl_complex/`, verifies missing dependency or cycle behavior, confirms cursor is unchanged after error, and then verifies a successful advance path

### Requirement: Workflow-load trace files use wl- prefix
The `trace.mjs` module for workflow-load SHALL use `wl-` source prefixes to distinguish workflow-load traces from gate-loop (`gl-`), gate-fork (`gf-`), and subagent (`gs-`) traces.

#### Scenario: Trace source prefixes are workflow-load-specific
- **WHEN** a workflow-load trace entry is written
- **THEN** the `source` field starts with `wl-`
