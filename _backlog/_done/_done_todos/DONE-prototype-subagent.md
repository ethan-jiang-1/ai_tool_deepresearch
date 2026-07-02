# TODO: prototype-subagent real LLM path

> Status: real-subagent alignment | Priority: high | Updated: 2026-06-16
>
> OpenSpec change: `openspec/changes/prototype-subagent/`
>
> Final decision: `docs/feedback/final_real-subagent.md`

## Why

`prototype-gate-loop` verified the 1->1 repair loop. `prototype-gate-fork` verified 1->N branch routing. Deep research still needs the third capability: 1->N parallel research execution with **real LLM subagents**.

The important value is not merely parallelism. It is context isolation:

```text
Main Agent / Engine context
  - WorkflowState summary
  - gate and merge decisions
  - bounded slot contracts
  - validated result summaries only

Native LLM subagent contexts
  - search and reading noise
  - dead ends
  - role-specific tool use
  - bounded JSON result returned upward
```

Search and source reading can flood a context window with irrelevant material. The main agent should not carry raw pages, search trails, or failed attempts. Subagents do that work in isolated contexts and return only structured evidence.

## Architecture Principle

The project rule remains:

```text
Engine enforces rules.
LLM agents produce content.
```

For subagents this means:

- Engine owns dispatch, collect, merge, gate checks, repair routing, and stop authorization.
- Parent agent owns runtime spawning and Parent Relay writes.
- Subagents perform bounded research/verification/extraction and return strict JSON.
- Subagents do not mutate WorkflowState, pass gates, repair queues, or authorize stopping.

This is the EPSS shape we want:

```text
Persistent layer
  Engine + main agent
  clean state, audit trail, merge authority

Ephemeral layer
  native Codex / Claude Code subagent threads
  isolated context, role-specific tool harness

Boundary
  task.md + result.schema.json downward
  validated result.json upward
```

## Runtime Strategy

Use native agent runtimes as the only real subagent execution path.

Claude Code:

- project agents in `.claude/agents/*.md`
- role definition in Markdown + frontmatter
- dynamic task content passed at spawn time
- foreground or background subagents depending on experiment needs

Codex:

- `.codex/agents/*.toml` where the active surface supports project agents
- current Codex app path uses built-in `worker` / `explorer` plus dynamic prompts
- dynamic prompt carries the slot role, task path, schema path, and strict return contract

The role agent definition is stable. Slot work is dynamic.

## Parent Relay V1

V1 uses Parent Relay because it is the most portable path across Codex and Claude Code:

1. Engine writes a wave directory with `dispatch.json`.
2. Each slot receives `task.md` and `result.schema.json`.
3. Parent spawns one native LLM subagent per slot, up to the v1 concurrency cap of 3.
4. Each subagent reads the task and schema, performs bounded work, and returns strict JSON to the parent.
5. Parent validates the returned JSON.
6. Parent writes:
   - `result.json` as the primary machine contract
   - optional `result.md` as human summary
   - `_status.json` for lifecycle state
   - `_agent.json` for runtime metadata
7. Engine collects `result.json`, merges, and re-enters gate logic.

This keeps durable writes converged while still using real LLM subagent intelligence.

## Slot Contract

Expected slot files:

```text
_subagents/
  wave_01/
    dispatch.json
    slot_00/
      task.md
      result.schema.json
      result.json
      result.md        # optional
      _status.json
      _agent.json
```

`task.md` is bounded and slot-local. It must not include raw WorkflowState, gate internals, repair queues, or unrelated slot output.

`result.schema.json` is the collection authority for the slot.

`result.json` is the only primary machine-readable result. `result.md` is optional and must never be the only collection contract.

## Initial Agent Taxonomy

Define a small stable set of project-level agents.

V1:

- `dpt-source-intake`: retrieval/search/candidate discovery into bounded structured output
- `dpt-source-diagnostic`: source quality, webpage material, trust/tier, marketing risk, cross-verification need
- `dpt-claim-verifier`: critical claim support/weakening/uncertainty checks
- `dpt-evidence-extractor`: reusable evidence particles from selected candidates/sources

V1.5:

- `dpt-topic-scout`: topology delta, unmodeled dimensions, exploration/exploitation signals
- `dpt-synthesis-reviewer`: Wave 2 synthesis/readiness/must-answer coverage review

Do not explode taxonomy by source type. Source type belongs in `task.md`, not in the stable agent list.

## Trace Requirements

Real acceptance traces must prove native agent runtime usage and schema collection:

- `agent_spawn_requested`
- `agent_runtime_started`
- `agent_result_ready`
- `agent_result_received`
- `result_schema_validated`
- `collect_result`
- `merge_complete`

Trace should record role key, slot key, runtime platform, actor (`parent` or `subagent`), parent runtime agent id where available, subagent runtime agent id for imported receipt events, status, and validation outcome.

## Failure Handling

Partial failure is expected in research. A wave can still merge useful evidence when at least one slot succeeds.

Rules:

- missing or invalid `result.json` marks that slot failed
- timeout marks that slot failed
- one failed slot does not block merge
- all slots failed routes through existing repair semantics
- repair and gate decisions remain Engine-owned

## OpenSpec Alignment TODO

Update `openspec/changes/prototype-subagent` in place:

- `proposal.md`: scope the change to native LLM subagent orchestration and Parent Relay.
- `design.md`: describe runtime adapter behavior, stable role agents, dynamic slot contracts, result validation, and runtime trace.
- `tasks.md`: replace old proof tasks with real-path tasks for project agent definitions, prompt templates, schemas, Parent Relay, trace, and real experiment playbooks.
- specs:
  - `subagent-dispatch`: role agent key, dynamic task contract, concurrency cap 3
  - `subagent-slots`: `result.schema.json`, `result.json`, optional `result.md`, `_agent.json`
  - `subagent-collect`: `result.json` primary, schema validation, invalid result -> failed slot
  - `subagent-repair`: partial failure and Engine-owned authority boundaries
  - `agent-testing`: runtime-agent audit events and real simple/medium/complex playbooks

## Real Experiment Surface

The real experiment surface is:

- `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md`
- `DPT_FRAMEWORK/command_experiments/subagent/test-medium.md`
- `DPT_FRAMEWORK/command_experiments/subagent/test-complex.md`
- `experiments/prototype-subagent/*`

These files must stay aligned with the real LLM subagent architecture. They should contain only the native runtime + Parent Relay path and runtime-agent acceptance evidence.
