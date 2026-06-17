# Proposal: prototype-subagent

## Why

`prototype-gate-loop` proved the 1->1 repair loop. `prototype-gate-fork` proved 1->N branch routing. Deep research also needs 1->N parallel execution where multiple bounded research tasks run in isolated LLM contexts.

The real value of subagents is context isolation plus role-specific harness. Source search, webpage reading, claim checking, and evidence extraction can consume large context budgets and produce noisy intermediate material. The main agent and Engine should only receive bounded structured results, not raw search trails.

This change realigns `prototype-subagent` to real LLM subagents launched through native Codex / Claude Code runtimes. Native runtime agents plus Parent Relay are the only accepted execution path.

## What Changes

- Define a real subagent orchestration contract based on native runtime agents:
  - Claude Code project agents: `.claude/agents/*.md`
  - Codex project agents: `.codex/agents/*.toml`
  - both runtimes use the same DPT role-agent taxonomy and per-slot dynamic prompt
- Use stable project-level role agents and dynamic per-slot inputs:
  - `task.md`
  - `result.schema.json`
  - runtime spawn prompt
- Add `DPT_FRAMEWORK/command_playbook/setup-real-subagents.md` to prepare the required project-local agent definitions for Codex and Claude Code.
- Rewrite the existing real experiment surface in place:
  - `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md`
  - `DPT_FRAMEWORK/command_experiments/subagent/test-medium.md`
  - `DPT_FRAMEWORK/command_experiments/subagent/test-complex.md`
  - `experiments/prototype-subagent/*`
- Use Parent Relay v1:
  - parent spawns native LLM subagent
  - subagent writes slot-local `runtime-receipt.jsonl`
  - subagent returns strict JSON to parent
  - parent imports the runtime receipt, validates, and writes `result.json`, optional `result.md`, `_status.json`, and `_agent.json`
- Make `result.json` the primary collection contract.
- Add runtime-agent trace checks:
  - `agent_spawn_requested`
  - `agent_runtime_started`
  - `agent_result_ready`
  - `agent_result_received`
  - `result_schema_validated`
  - `collect_result`
  - `merge_complete`
- Preserve Engine-owned dispatch, collect, merge, gate, repair, and stop-authorization semantics.

## Prototype Scope

This prototype validates orchestration shape and authority boundaries on the existing real experiment surface:

- dispatch of one or more role-agent slots after a pass gate
- dynamic slot task/schema generation
- concurrent native-agent spawning with v1 cap of 3
- strict result schema validation before collection
- partial-failure-tolerant merge
- all-failed repair routing through existing Engine semantics

This prototype does not attempt to validate source quality, ranking quality, or final report synthesis quality. Those belong to later deep-research capability changes.

Non-runtime execution paths are outside this proposal's real-subagent acceptance criteria and must not remain on the real experiment surface.

## Prototype Acceptance Hypotheses

This change is successful if the experiment proves these claims:

- **H1**: The existing `command_experiments/subagent/*.md` playbooks dispatch bounded slot contracts and drive native LLM subagents through Parent Relay.
- **H2**: The parent can request multiple native subagent spawns before collect, up to the v1 concurrency cap of 3.
- **H3**: Each subagent result is received by the parent as strict JSON and validated against the slot's `result.schema.json`.
- **H4**: The parent writes validated `result.json` plus `_status.json` and `_agent.json`; `result.md` is optional only.
- **H5**: Engine collect reads `result.json`, records invalid or missing results as failed slots, and merges successful results.
- **H6**: Partial slot failure remains non-fatal; all slots failed routes through existing repair semantics.
- **H7**: Audit trace proves native agent runtime usage through runtime-agent events.

This change proves native runtime orchestration and validated result relay. It does not attempt to prove any lower-level host execution property.

## Capabilities

### New Capabilities

- `subagent-dispatch`: Gate pass declares bounded subagent slots with role agent keys, task files, schema files, wave isolation, and concurrency cap. **Req: SUD-001**
- `subagent-slots`: Slot lifecycle and file contract, including `task.md`, `result.schema.json`, `runtime-receipt.jsonl`, `result.json`, optional `result.md`, `_status.json`, and `_agent.json`. **Req: SUS-001**
- `subagent-collect`: Parent Relay writes validated results; Engine collects `result.json` as the primary machine contract and merges successful slots. **Req: SUC-001**
- `subagent-repair`: Failed or invalid slots are handled without giving subagents repair, gate, queue, or stop authority. **Req: SUR-001**
- `cmd-subagent-environment`: Agent command playbook that installs/synchronizes project-level Codex and Claude Code role-agent definitions before real experiments run. **Req: CSE-001**

### Modified Capabilities

- `agent-testing`: Add real-subagent playbooks for simple, medium, and complex native-agent runtime tests. The audit focus is subagent-written runtime receipt, result, and validation trace events. **Req: AGT-003**

## Impact

- Aligns `prototype-subagent` with the project rule: Engine enforces workflow rules; LLM agents produce bounded content.
- Provides a cross-platform path that can work in Codex and Claude Code with native runtime agents.
- Establishes `result.json` as the durable collection contract in the real experiment directories.
