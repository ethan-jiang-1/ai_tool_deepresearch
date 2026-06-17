# Experiment Report: prototype-subagent

## Current Direction

This experiment now targets real LLM subagents launched through native Codex / Claude Code runtimes.

The JavaScript in this directory is Engine-side harness only:

- dispatch wave-scoped slots
- write `task.md` and `result.schema.json`
- build spawn prompts
- import subagent-written runtime receipts
- validate Parent Relay results
- write `result.json`, optional `result.md`, `_status.json`, and `_agent.json`
- collect and merge validated results

It does not implement a fake subagent executor.

## Acceptance Path

The real playbooks are:

- `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md`
- `DPT_FRAMEWORK/command_experiments/subagent/test-medium.md`
- `DPT_FRAMEWORK/command_experiments/subagent/test-complex.md`

They require the parent coding agent to spawn native LLM subagents and relay strict JSON results into the slot files.

## Trace Events

The acceptance trace is based on runtime-agent and collection events:

- `agent_spawn_requested`
- `agent_runtime_started`
- `agent_result_ready`
- `agent_result_received`
- `result_schema_validated`
- `collect_result`
- `merge_complete`

Parent trace events include `actor: "parent"` and `parentRuntimeAgentId` when
available. Imported receipt events include `actor: "subagent"` and the
subagent `runtimeAgentId`.

## Key Guarantees

- `result.json` is the primary machine contract.
- `result.md` is optional human-readable summary only.
- Parent Relay owns durable result writes.
- Engine owns dispatch, collect, merge, gate, repair, and stop authority.
- Subagents must not mutate WorkflowState, pass gates, repair queues, decide queue integrity, or authorize stopping.
