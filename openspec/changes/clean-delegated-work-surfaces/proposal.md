## Why

`replace-subagent-relay-with-work-units` archived the mechanism replacement, but active current surfaces still contain old relay/slot production wording. This is now specification noise: future coding agents may read `openspec/specs`, framework docs, tests, or playbooks and infer that `drive-relay-slot`, `_subagents/wave_NN/slot_MM`, `subagent-relay`, `slot_result_ref`, or `subagent_slot_presence` are still production paths.

This change is a hygiene change, not a compatibility change. The project is rolling forward; old relay/slot production paths should disappear from current guidance instead of being preserved as fallbacks.

## What Changes

- **BREAKING cleanup**: active current guidance SHALL expose one delegated production path only: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate.
- Active main specs SHALL stop carrying old relay/slot wording in positive production descriptions, including stale Purpose text after archive/sync.
- Hygiene validation SHALL scan current specs, framework surfaces, tests, guidelines, and `experiments_playbook/`, while excluding `openspec/changes/archive/` as historical record.
- Current runnable experiment playbooks SHALL use `operate-work-unit claim/submit` or valid non-delegated queue paths. Old relay/slot playbooks, tests, and helper code SHALL be assessed one by one: migrate them when they still prove a current work-unit behavior; remove them from current repo surfaces when they no longer have current proof or diagnostic value.
- Legacy/backlog labeling is only a temporary review classification. It SHALL NOT become a permanent parking lot for obsolete relay/slot production examples.
- Experiment edits under `experiments_playbook/` SHALL preserve `guidelines/command-experiments.md`: Markdown remains the Agent Flow controller, and inline JS stays a thin deterministic checkpoint.
- `openspec/changes/archive/` SHALL NOT be edited, audited as a problem source, or cleaned by this change.
- No runtime compatibility layer is added for relay/slot paths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delegated-work-units`: clarify that all current specs/docs/tests/playbooks outside `openspec/changes/archive/` must teach the work-unit path only.
- `requirement-traceability`: extend project hygiene gates so stale retired production terms are rejected on current surfaces while archived change history is ignored.
- `playbook-runner`: clarify that current runner surfaces cannot treat old relay/slot playbooks as current proof.
- `agent-testing`: align real sub-agent experiment requirements with work-unit-only execution and remove relay/slot as an accepted current experiment path.
- `subagent-directory-contract`: ensure the capability reads as a work-unit envelope/directory contract, not `_subagents/` relay slot authority.
- `subagent-node-contract`: ensure sub-agent task/result/lifecycle requirements bind to work units and not old relay driver/task generation.
- `subagent-dispatch`: ensure dispatch means Engine work-unit claim and prompt handoff, not bounded relay slots.
- `agent-output-declaration`: ensure output declarations are work-unit submit ledger rows, not relay slot result declarations.
- `framework-engine`: ensure framework engine/import guidance names work-unit helpers and hygiene, not subagent relay mechanisms.
- `repair-loop`: remove the stale implementation anchor to `subagent-relay.mjs` while preserving deterministic repair-loop semantics.

## Impact

- OpenSpec change artifacts: proposal, design, tasks, and delta specs under `openspec/changes/clean-delegated-work-surfaces/`.
- Later apply phase will touch only current surfaces outside `openspec/changes/archive/`: `openspec/specs` through archive/sync, `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`, focused tests, current docs, and relevant `experiments_playbook` runner/playbook surfaces. It may remove obsolete current-surface files when review shows they have no current work-unit proof or diagnostic value.
- No new npm dependencies.
- No framework runtime version bump is required because production run-bundle behavior is not changing; this is specification, hygiene, and experiment-surface cleanup.
