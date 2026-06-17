# Design: prototype-subagent

## Context

The prior prototype work proved useful Engine-side mechanics: slot directories, lifecycle status, collection, merge, and partial-failure handling. The real-subagent path now needs a clean boundary between those Engine mechanics and the actual agent runtime.

This design uses native Codex / Claude Code LLM subagents. The parent agent launches and receives results from those runtime agents. The Engine still owns workflow semantics.

## Goals / Non-Goals

Goals:

- Dispatch bounded subagent slots after a pass gate.
- Use stable project-level role agents plus dynamic per-slot task/schema files.
- Spawn multiple native LLM subagents concurrently, with v1 cap of 3.
- Use Parent Relay to validate returned JSON and write slot artifacts.
- Collect `result.json` as the primary machine contract.
- Preserve partial-failure-tolerant merge and all-failed repair routing.
- Trace native runtime-agent lifecycle events.

Non-goals:

- Do not accept non-runtime executors as real subagent proof.
- Do not use host execution details as acceptance evidence.
- Do not let subagents mutate WorkflowState, pass gates, repair queues, or authorize stopping.
- Do not solve final evidence ranking, deduplication, or report synthesis quality here.

## Runtime Adapter

The runtime adapter is a thin platform boundary operated by the parent agent:

```text
Engine dispatch
  -> parent runtime adapter
  -> native LLM subagent
  -> strict JSON result returned to parent
  -> parent validates and writes slot files
  -> Engine collect/merge/gate
```

Claude Code path:

- stable role agents live in `.claude/agents/*.md`
- dynamic task and schema paths are passed in the spawn prompt
- foreground or background execution may be used
- background execution is used for concurrency experiments

Codex path:

- stable role agents live in `.codex/agents/*.toml`
- Codex experiments use the same DPT role-agent taxonomy as Claude Code, plus explicit per-slot dynamic prompt
- the prompt names the DPT role, slot path, schema path, and strict return contract

The adapter does not make gate or merge decisions. It only maps a `SlotConfig` to a platform spawn request and relays the returned JSON.

## Environment Setup Command

Before running the real subagent experiments, the project needs its preset role-agent files installed. This is done by an Agent command playbook:

```text
DPT_FRAMEWORK/command_playbook/setup-real-subagents.md
```

The command prepares:

- `.claude/agents/<role>.md`
- `.codex/agents/<role>.toml`

for the stable role taxonomy. It creates the directories if missing and updates only DPT-managed files marked with `DPT managed: real-subagent`. If a target file already exists without that marker, the command reports a collision and stops instead of overwriting user-managed agent definitions.

This setup command does not run real experiments, spawn agents, or write slot results.

## Real Experiment Surface

The real experiment surface is:

- `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md`
- `DPT_FRAMEWORK/command_experiments/subagent/test-medium.md`
- `DPT_FRAMEWORK/command_experiments/subagent/test-complex.md`
- `experiments/prototype-subagent/*`

These files are in scope for this change. They must use the native runtime + Parent Relay path and runtime-agent acceptance evidence.

## Agent Taxonomy

Stable v1 project agents:

- `dpt-source-intake`
- `dpt-source-diagnostic`
- `dpt-claim-verifier`
- `dpt-evidence-extractor`

V1.5 agents:

- `dpt-topic-scout`
- `dpt-synthesis-reviewer`

Do not create separate project agents for every source type. Source type and query detail belong in `task.md`.

## Slot Contract

Wave directory layout:

```text
_subagents/
  wave_01/
    dispatch.json
    slot_00/
      task.md
      result.schema.json
      result.json
      result.md
      _status.json
      _agent.json
```

Required files written before spawn:

- `dispatch.json`: wave manifest and slot list
- `task.md`: bounded slot-local task
- `result.schema.json`: strict JSON schema for the expected result
- `_status.json`: initial lifecycle status

Files written by Parent Relay after native subagent return:

- `result.json`: primary machine-readable result
- `result.md`: optional human summary
- `_status.json`: terminal success/failure status
- `_agent.json`: runtime metadata such as platform, agent type/name, runtime id where available, spawn/completion timestamps, validation result

`result.md` is never a primary collection contract.

## Data Flow

```text
SubagentWorkflowState
  current_gate/ref_count/ref_floor/topicReadiness/subagent_wave
        |
        v
  forkRouter(state)
        |
        +-- non-pass --> convergeRepair(state)
        |
        v pass
  subagentDispatch(state, baseDir)
        |
        +-- writes dispatch.json
        +-- writes task.md per slot
        +-- writes result.schema.json per slot
        +-- writes runtime receipt nonce per slot
        +-- writes _status.json pending per slot
        |
        v
  Parent Relay
        |
        +-- emits agent_spawn_requested
        +-- spawns native Codex / Claude Code LLM subagent
        +-- subagent writes runtime-receipt.jsonl
        +-- imports receipt as agent_runtime_started / agent_result_ready
        +-- receives strict JSON
        +-- emits agent_result_received
        +-- validates against result.schema.json
        +-- emits result_schema_validated
        +-- writes result.json / optional result.md / _status.json / _agent.json
        |
        v
  collectResults(slots, baseDir)
        |
        +-- reads _status.json
        +-- reads result.json
        +-- invalid/missing result.json => failed slot
        |
        v
  mergeResults(results, state)
        |
        +-- merges successful evidence counts/results
        +-- records failed slots
        +-- increments subagent_wave
        +-- sets subagent_all_failed when appropriate
        |
        +-- all failed --> convergeRepair(merged)
        |
        v
  checkAndReflect -> forkRouter
```

## Dispatch Decisions

`dispatchMap` remains Engine-owned and flat. A pass branch maps to an ordered list of `SlotConfig` entries.

`SlotConfig` includes:

- `key`: slot key, unique within the wave
- `slotIndex`: deterministic slot directory index
- `roleAgentKey`: stable role agent key, such as `dpt-source-intake`
- `taskDescription`: bounded task summary
- optional `modelHint`: advisory only; runtime may ignore it
- optional `timeoutMs`: collection timeout for the slot

The dispatch implementation must reject waves above the v1 concurrency cap of 3 active slots unless the cap is explicitly changed in a later design.

## Parent Relay Decisions

Parent Relay is v1's cross-platform portability layer.

Responsibilities:

- spawn native LLM subagents
- wait for completion or timeout
- receive strict JSON from the subagent
- validate against `result.schema.json`
- write slot artifacts
- emit runtime trace events

Non-responsibilities:

- no WorkflowState mutation
- no gate pass/fail decision
- no repair queue mutation
- no stop authorization
- no evidence merge decision

Parent Relay may mark a slot failed when the subagent fails, times out, returns non-JSON, or returns JSON that fails schema validation.

## Result Contract

The minimum logical result shape is:

```json
{
  "slotKey": "slot_00",
  "roleAgentKey": "dpt-source-intake",
  "status": "done",
  "summary": "Bounded summary without raw search noise.",
  "evidenceCount": 2,
  "references": [
    {
      "title": "Source title",
      "url": "https://example.com/source",
      "quote": "Short relevant quote or fact.",
      "relevance": "Why this source matters."
    }
  ],
  "confidence": 0.75,
  "notes": []
}
```

Failed slots use the same schema with `status: "failed"`, `evidenceCount: 0`, empty `references`, and bounded `notes`.

The concrete `result.schema.json` is generated per slot so tasks can tighten fields without changing the collection mechanism.

## Collection And Merge

Engine collect reads all declared slots. It does not inspect raw subagent work. It accepts only validated `result.json` files written by Parent Relay.

Rules:

- done status plus valid `result.json` produces a successful `SlotResult`
- failed status produces a failed `SlotResult`
- missing `result.json` for a done slot is treated as failed
- schema-invalid `result.json` is treated as failed
- empty result arrays do not imply all failed
- all declared slots failed sets `subagent_all_failed: true`
- partial failure merges successful slots and records failed slots

Merge remains deliberately simple for the prototype. Later changes can add deduplication, conflict labeling, and synthesis review.

## Trace

Trace must prove native runtime-agent usage and collection validity:

- `agent_spawn_requested`
- `agent_runtime_started`
- `agent_result_ready`
- `agent_result_received`
- `result_schema_validated`
- `collect_result`
- `merge_complete`

Trace metadata should include wave index, slot key, role agent key, platform, actor (`parent` or `subagent`), parent runtime agent id where available, subagent runtime agent id for imported receipt events, status, and validation outcome.

## Runtime Surface

The real experiment surface must stay narrow and unambiguous: native runtime spawn prompts, Parent Relay validation/write helpers, slot contracts, and Engine collect/merge code. Non-runtime execution artifacts must not appear in this surface as alternatives, examples, or acceptance evidence.

## Risks / Trade-offs

- **Codex custom agent availability differs by surface.** The accepted real path still uses the DPT role-agent taxonomy; if a surface needs an adapter, it must preserve the role key and per-slot prompt contract rather than substituting generic fallback semantics.
- **Parent Relay means the parent writes result files.** This is intentional for v1 because it keeps durable writes converged and works across Codex and Claude Code.
- **Schema validation can reject useful prose.** The subagent prompt must require strict JSON only; optional human prose belongs in `result.md` after validation.
- **Partial failure can reduce evidence breadth.** This is acceptable for prototype; all-failed still routes to repair.
