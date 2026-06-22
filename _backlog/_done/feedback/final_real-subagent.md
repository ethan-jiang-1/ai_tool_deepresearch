# Final Decision Record: Real LLM Subagents

> Scope: `openspec/changes/prototype-subagent`
> Date: 2026-06-16
> Source: Codex final synthesis for the real-subagent direction

## Decision

`prototype-subagent` must use **real LLM subagents** launched by the native agent runtimes of Codex and Claude Code. The design starts from those runtimes and their agent harnesses: separate LLM context, tool policy, skills/MCP, sandbox/permission behavior, lifecycle visibility, and result return.

There is a single accepted execution path: native runtime agents plus Parent Relay.

## Stable Harness

Use stable project-level role agents where the runtime supports them:

- Claude Code: `.claude/agents/*.md`
- Codex: `.codex/agents/*.toml` where supported
- Current Codex app path: built-in `worker` / `explorer` agents plus dynamic spawn prompts until custom project agents are available through the active runtime surface

Role agents define the durable harness: role identity, allowed tools, skill/MCP surface, safety constraints, and output expectations. They are not created per slot.

## Dynamic Per-Run Contract

Per-run and per-slot variability enters through files and prompts generated for the specific wave:

- `task.md`: bounded human-readable task for the slot
- `result.schema.json`: strict machine-readable output contract
- spawn prompt: runtime-specific instruction telling the native subagent what to read, what to return, and what not to do

The subagent receives only the bounded task contract. It does not receive WorkflowState, gate internals, other slot raw work, repair queues, or stop authority.

## Parent Relay V1

Use **Parent Relay** for v1:

1. Engine declares slots and writes `dispatch.json`, `task.md`, and `result.schema.json`.
2. Parent agent spawns native LLM subagents through Codex / Claude Code runtime.
3. Subagent performs the bounded task in its isolated context, writes a slot-local runtime receipt, and returns strict JSON to the parent.
4. Parent imports and validates the runtime receipt, then validates the JSON against `result.schema.json`.
5. Parent writes `result.json`, optional `result.md`, `_status.json`, and `_agent.json`.
6. Engine collects, merges, and gate-checks.

This preserves write convergence: subagents contribute intelligence; parent and Engine own durable workspace writes and workflow state transitions.

## Concurrency

The parent may spawn multiple subagents concurrently. V1 caps concurrency at **3** active slots per wave. Collect runs after all slots complete or timeout.

## Initial Agent Taxonomy

Keep the stable taxonomy small. Do not create one agent per source type.

V1 agents:

- `dpt-source-intake`: retrieval, search, and candidate discovery into bounded structured output
- `dpt-source-diagnostic`: source quality, webpage materiality, trust/tier, marketing risk, and cross-verification need
- `dpt-claim-verifier`: support, weakening, contradiction, and uncertainty checks for critical claims
- `dpt-evidence-extractor`: reusable evidence particles from selected candidates and sources

V1.5 agents:

- `dpt-topic-scout`: topology delta, unmodeled dimensions, and exploration/exploitation signals
- `dpt-synthesis-reviewer`: Wave 2 synthesis readiness and must-answer coverage review

## Engine Boundaries

Subagents must not mutate WorkflowState, pass gates, repair queues, decide queue integrity, or authorize stopping.

Engine-owned semantics remain unchanged:

- dispatch
- collect
- merge
- gate checks
- repair routing
- stop authorization

## Runtime Trace

Acceptance traces should prove native agent runtime usage. Parent-authored spawn
records are useful operational metadata, but runtime proof must come from
slot-local receipts written by the native subagent itself. Use runtime-agent events:

- `agent_spawn_requested`
- `agent_runtime_started`
- `agent_result_ready`
- `agent_result_received`
- `result_schema_validated`
- `collect_result`
- `merge_complete`

Parent events SHOULD include `actor: "parent"` and `parentRuntimeAgentId` when
the runtime exposes a parent id. Imported subagent receipt events MUST include
`actor: "subagent"` and the subagent `runtimeAgentId`.

Audit success means the system used Codex / Claude Code native subagent runtime and produced validated `result.json` outputs.

## Prototype Implications

Update `openspec/changes/prototype-subagent` so the real path is clean:

- Keep acceptance language focused on native runtime spawn, result return, schema validation, collection, and merge.
- Make `result.json` the primary collection contract; `result.md` is optional human-readable summary only.
- Rewrite the existing real experiment surface in place:
  - `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md`
  - `DPT_FRAMEWORK/command_experiments/subagent/test-medium.md`
  - `DPT_FRAMEWORK/command_experiments/subagent/test-complex.md`
  - `experiments/prototype-subagent/*`
- Preserve Engine-owned dispatch/collect/merge semantics.

Non-runtime execution artifacts are outside the recommended architecture and must not remain on the real experiment path.
