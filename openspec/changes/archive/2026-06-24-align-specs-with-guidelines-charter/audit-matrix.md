# Audit Matrix

This file records the implementation-time classification for `align-specs-with-guidelines-charter`.

## Search Commands

- Pre-edit broad scan:
  `rg -n "MD controller|MD Controller|main-agent|Main Agent|主 Agent|parent Agent|parent agent|Parent Relay|parentRuntimeAgentId|actor: \"parent\"|actor: 'parent'|three-layer|三层编排|三道编排|三层架构|retired queue filename|gate-definition\.mjs|gate\.mjs|\btarget\b|\bAgent\b" openspec/specs DPT_FRAMEWORK -g '*.md' -g '*.mjs'`
- Duplicate heading scan:
  `rg -n '^### Requirement:' openspec/specs/agentic-queue/spec.md`
- Verification scans:
  `rg -n 'MD controller|MD Controller|Main-Agent|主 Agent|parent Agent|parent agent|gate-definition\.mjs|retired queue filename|three-layer|三层编排|三道编排|三层架构' openspec/specs DPT_FRAMEWORK -g '*.md' -g '*.mjs'`
  `rg -n 'main-agent|sub-agent|Parent Relay|parentRuntimeAgentId|actor: "parent"|actor: '\''parent'\''' openspec/specs DPT_FRAMEWORK -g '*.md' -g '*.mjs'`
  `rg -n '\bAgent\b|subagent|Subagent|sub-agent|Sub-agent' DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0-subagent.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1-subagent.md DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`

## Classification

| Surface | Class | Apply Action |
|---------|-------|--------------|
| `openspec/specs/agentic-queue/spec.md` duplicate `Queue state and item schema are structured` | duplicate requirement | Keep one consolidated active copy; remove the stale duplicate copy after preserving the newer `targets` semantics. |
| `openspec/specs/agentic-queue/spec.md` duplicate `Producer rule source_intake_fan_in` | duplicate requirement + conceptual prose | Keep one consolidated active copy; preserve `targets` wire example and Phase Agent / Sub-agent prose. |
| `openspec/specs/agentic-queue/spec.md` duplicate `Producer rule seed_topic_materialize` | duplicate requirement + conceptual prose | Keep one consolidated active copy; preserve `targets: { controller: "main-agent" }` wire example and Phase Agent prose. |
| `openspec/specs/*` modified capabilities listed in proposal | conceptual prose / verified fact drift | Align only the modified requirement blocks from the delta specs. |
| `openspec/specs/schema-core/spec.md` queue task-card scenario | verified fact drift | Update required field prose from legacy `target` to current `targets`; no schema enum changes. |
| `openspec/specs/research-wave-phase-content/spec.md` Wave0/seed/Wave1/Wave2 phase prose | conceptual prose + current wire examples | Use Phase Agent / Sub-agent in execution prose; preserve `--actor main-agent` and `targets.controller: "main-agent"` examples as current wire values. |
| `openspec/specs/wave1-intake/spec.md` deepening / backfill prose | conceptual prose + current wire examples | Use Phase Agent / Sub-agent in prose; keep task-card JSON wire examples unchanged. Requirement heading names were preserved. |
| `openspec/specs/subagent-collect/spec.md`, `subagent-dispatch/spec.md` collect-as-return prose | conceptual prose + parent protocol boundary | Use Phase Agent for collector workflow authority and Sub-agent for slot work; preserve Parent Relay runtime/protocol language outside conceptual prose. Requirement heading names were preserved. |
| `openspec/specs/workflow-directory-contract/spec.md` stale `gate-definition.mjs` | verified fact drift | Retire nonexistent contract prose; document gate definition JSON directory plus `gate.mjs` transition-table contract. |
| `openspec/specs/wave2-synthesis/spec.md` remaining lower-case `sub-agent` prose | active accepted spec variant outside this change's modified capability list | Left unchanged in this pass. It is not historical/archive, but this apply kept to the reviewed capability list; align through a later explicit OpenSpec delta if desired. |
| `openspec/specs/agent-testing/spec.md`, `subagent-slots/spec.md`, `research-wave-gate-implementation/spec.md` Parent Relay / subagent hits | parent runtime/protocol term or out-of-scope accepted capabilities | Preserve. These are runtime/protocol acceptance terms or accepted specs outside the current modified capabilities. |
| `DPT_FRAMEWORK/README.md` stale `gate-definition.mjs` | verified fact drift + Agent-facing README | Correct prose only; no file/schema created. |
| `DPT_FRAMEWORK/cli/README.md` `Agent（MD controller）` | DPT allowlist candidate | Clarify as Markdown control surface / Phase Agent reading CLI feedback. |
| `DPT_FRAMEWORK/engine/gate-loop.mjs`, `gate-fork.mjs`, `workflow-chain.mjs`, `subagent-relay.mjs` old MD controller wording | DPT allowlist candidate | Comment-only terminology cleanup; no behavior changes. |
| `DPT_FRAMEWORK/workflows/nodes/phases/*.md`, selected shared nodes | Agent-facing workflow Markdown | Align conceptual prose around Phase Agent / Sub-agent while preserving JSON/CLI wire values. |
| `DPT_FRAMEWORK/schema/contracts/queue.mjs`, `operate-queue.mjs`, `queue-manager.mjs` executable `main-agent` values | wire/API example | Preserve unchanged. |
| `DPT_FRAMEWORK/engine/subagent-relay.mjs` generated task text using `parent agent` / Parent Relay | parent runtime/protocol term | Preserve. It describes the runtime parent relay protocol presented to a spawned actor, not a conceptual Phase Agent identity. |
| `Parent Relay`, `actor: "parent"`, `parentRuntimeAgentId` | parent runtime/protocol term | Preserve. No runtime metadata or trace value is renamed. |
| Archives / `_backlog` | historical surface | Not edited in this change. |

## Residual Cleanup Classification

| Surface | Class | Apply Action |
|---------|-------|--------------|
| `guidelines/agentic-execution-model.md` old `target` example and retired queue filename diagram fragment | guideline source-map drift | Direct guideline fix: use current `targets` / `targets.delegates` terminology and canonical `rb_queue.json`. |
| `guidelines/framework-runtime-boundary.md` `gate.mjs` as gate definition schema | guideline fact drift | Direct guideline fix: state that `gate.mjs` is the gate transition-table contract; gate definition JSON remains under `schema/gate_definitions/`. |
| `guidelines/agentic-subagent-mechanism.md`, `guidelines/agentic-queue-mechanism.md` old `target: sub-agent` prose | guideline terminology drift | Direct guideline fix: use `targets.delegates.to: "sub-agent"` and direct Phase Agent execution phrasing while preserving `"main-agent"` as wire value where mentioned. |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2-subagent.md` conceptual `Main-agent` prose | Agent-facing DPT prose | Align to `Phase Agent`; no YAML frontmatter, schema, CLI, or engine behavior changed. |
| `experiments_playbook/exp_wfn_seedtopic/test-simple-seedtopics-queue-loop.md` old `target: main-agent` prose | Agent-readable experiment prose + stale queue field | Align to `targets.controller: "main-agent"` and describe `"main-agent"` as current wire value. |
| `experiments_playbook/exp_wfn_wave0/test-heavy-wave0-happy-path.md`, `exp_wfn_wave1/test-heavy-wave1-batch-subagent.md`, `exp_wfn_wave2/test-heavy-wave2-subagent-search.md` conceptual `main-agent` prose | Agent-readable experiment prose | Align conceptual prose to `Phase Agent`; preserve JSON/CLI wire examples. |
| `experiments/prototype-agentic-queue/EXPERIMENT.md` retired prototype-only queue filename | retired prototype history | Remove the literal retired filename and point readers only to canonical `rb_queue.json`. |
| `guidelines/agentic-execution-model.md`, `guidelines/agentic-queue-mechanism.md` broad `target` wording | guideline terminology drift | Tighten broad prose to `targets` / delegation so readers do not infer a legacy `task.target` field. |
| `experiments_playbook/RUN.md`, `experiments_playbook/exp_wfn_wave2/test-simple-wave2-synthesis-happy-path.md` `main-agent 执行` prose | Agent-readable experiment prose | Align conceptual execution wording to `Phase Agent`; keep `main-agent` only as an explicit current CLI actor wire value. |

## Duplicate Requirement Resolution

`openspec/specs/agentic-queue/spec.md` now has 16 requirement headings and no duplicate same-name requirement headings. The stale duplicate copies were consolidated as follows:

- `Queue state and item schema are structured`: retained the current `targets`/`TargetSpec` copy and preserved the older "valid queue item passes schema" and "missing core field is rejected" scenarios in the consolidated copy.
- `Producer rule source_intake_fan_in`: retained the current `targets.delegates` copy, restored `_cache/search-results/` in `writes_to`, and aligned conceptual prose to Phase Agent / Sub-agent while preserving `"main-agent"` / `"sub-agent"` wire values.
- `Producer rule seed_topic_materialize`: retained the current `targets: { controller: "main-agent" }` copy, restored the V12-aligned seed-topic field/body expectations, and aligned conceptual prose to direct Phase Agent execution.

## Remaining Hit Policy

Remaining active-surface hits are accepted only when they are one of:

- current schema/CLI/task-card wire values (`"main-agent"`, `"sub-agent"`, `--actor main-agent`);
- explicit compatibility notes explaining wire values as current executable strings;
- parent runtime/protocol terms (`Parent Relay`, `actor: "parent"`, `parentRuntimeAgentId`);
- active accepted specs outside this change's reviewed modified capability list, recorded above for later follow-up;
- Agent-facing / Agent-readable generic surface terms where they refer to documents, projections, playbooks, or actor-generic guidance rather than the Phase Agent role.

## Explicit Non-Changes

- No schema enum, CLI actor value, engine behavior, fixture, runtime metadata, trace actor, or runtime file-name migration.
- `rb_queue.json` remains canonical; no alternate queue compatibility or backup path is introduced.
