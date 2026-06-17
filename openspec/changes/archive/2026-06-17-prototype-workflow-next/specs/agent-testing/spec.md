# Agent Testing (workflow-next extension)
> req: AGT-004

Workflow-next 的 Agent 辅助半自动测试 playbook。复用 gate-loop/gate-fork/subagent 的三级复杂度模式，新增 workflow-next 专用 single-entry loader playbook。

## ADDED Requirements

### Requirement: Three-level workflow-next test playbooks
The workflow-next test playbooks SHALL be at three complexity levels: simple, medium, and complex. Each SHALL use its own bundle directory (`dpt_rb_test_wl_<level>/`) and trace file (`_trace_wl_<level>.jsonl`) for complete isolation.

#### Scenario: Simple workflow-next test observes one self-contained entry
- **WHEN** a tester runs `command_experiments/exp_workflow-next/test-simple.md`
- **THEN** it creates `dpt_rb_test_wl_simple/`, writes `_trace_wl_simple.jsonl`, calls `loadNextMarkdown('wave-entry.md', ...)`, and verifies that Markdown was not loaded before that call

#### Scenario: Medium workflow-next test observes dependencies and cache
- **WHEN** a tester runs `command_experiments/exp_workflow-next/test-medium.md`
- **THEN** it uses `dpt_rb_test_wl_medium/`, verifies dependency-first execution, and verifies cache hit with repeated execution across multiple explicit `loadNextMarkdown()` calls

#### Scenario: Complex workflow-next test observes error recovery
- **WHEN** a tester runs `command_experiments/exp_workflow-next/test-complex.md`
- **THEN** it uses `dpt_rb_test_wl_complex/`, verifies missing dependency, cycle, and malformed frontmatter behavior, confirms no Markdown executes on those errors, and then verifies a successful load path on the same runtime

### Requirement: Workflow-next trace files use wl- prefix
The `trace.mjs` module for workflow-next SHALL use `wl-` source prefixes to distinguish workflow-next traces from gate-loop (`gl-`), gate-fork (`gf-`), and subagent (`gs-`) traces.

#### Scenario: Trace source prefixes are workflow-next-specific
- **WHEN** a workflow-next trace entry is written
- **THEN** the `source` field starts with `wl-`
