# Agent Testing (real subagent extension)

> req: AGT-003

Subagent test playbooks SHALL prove native LLM agent runtime usage and Parent Relay collection. Acceptance evidence SHALL be runtime-agent events plus validated `result.json` outputs.

## ADDED Requirements

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
