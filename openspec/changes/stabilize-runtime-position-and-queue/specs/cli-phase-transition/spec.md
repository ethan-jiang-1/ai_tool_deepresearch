## ADDED Requirements

> req: CPT-007

### Requirement: current_node records active loaded lifecycle control surface

The phase transition tooling SHALL maintain `rb_status.json#/current_node` as the canonical bundle-relative workflow node ref for the lifecycle control surface most recently loaded by a successful route-bound `enter-phase` call.

`current_node` SHALL answer "which phase Markdown should the Agent continue from?" It SHALL NOT replace `current_gate` / `next_gate`, SHALL NOT prove target phase work completion, and SHALL NOT authorize gate pass by itself.

`advance-status` SHALL preserve `current_node` when synchronizing `current_gate` / `next_gate`. It SHALL NOT clear `current_node` after source-gate status sync, because accepted handoff order loads the target node before synchronizing the source-gate status window.

#### Scenario: Current node survives source-gate status sync

- **WHEN** Wave0 passes with `check.next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` succeeds
- **AND** `advance-status --bundle <bundle> --to wave0_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_node: "phases/phase-wave1.md"`
- **AND** `current_gate` SHALL be `wave0_complete`
- **AND** `next_gate` SHALL be `wave1_complete`

#### Scenario: Current node is not phase completion evidence

- **WHEN** `rb_status.json.current_node` is `phases/phase-wave1.md`
- **THEN** tools SHALL treat it as the loaded control surface only
- **AND** they SHALL NOT treat it as evidence that Wave1 work or the Wave1 gate has completed

## MODIFIED Requirements

> req: CPT-003

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

The framework SHALL provide an Agent-facing `enter-phase.mjs` CLI for consuming a gate CLI `check.next` fileRef and rendering the next lifecycle node through the existing workflow loader.

Usage:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <fileRef>
```

- `--bundle` SHALL point to an existing runtime bundle containing `rb_trace.jsonl` and `rb_status.json`.
- `--node` SHALL be a workflow node fileRef such as `phases/phase-wave1.md`.
- `--node` SHALL match the `next` value from the latest passed deterministic `gate_attempt` trace event that has a non-null `next`. The CLI SHALL derive legal predecessor edges from `manifest.json` and `transitions.chain.json`, and that latest passed gate attempt SHALL name the predecessor gate and predecessor `currentNodeRef`.
- The CLI SHALL NOT accept older historical `gate_attempt.next` matches when a later passed deterministic gate attempt points elsewhere.
- The CLI SHALL NOT accept an older passed attempt for the same source gate/source node when a newer gate attempt for that source gate/source node failed or passed with a different `next`.
- The CLI SHALL call the existing `assessNode()` loader path with a trace bound to `<bundle>/rb_trace.jsonl`.
- The CLI SHALL preserve the existing loader trace events including `load_start`, `dependency_resolved`, and `load_complete`.
- The successful `load_complete` event SHALL include route-bound metadata naming the authorizing source gate, source node, target node, `handoff_source_attempt_index`, and `handoff_source_attempt_ts`. `handoff_source_attempt_index` SHALL be the zero-based JSONL event index of the authorizing `gate_attempt`; timestamp alone SHALL NOT be the primary reference for status/preflight validation.
- After the successful route-bound load and `load_complete` witness, the CLI SHALL update `rb_status.json#/current_node` to the loaded target node.
- On successful `current_node` write, the CLI SHALL render the loaded dependency closure in plan order as Agent-readable Markdown on stdout so the Phase Agent can read that Markdown into conversation context and continue the Agent-driven loop. The Markdown SHALL use stable file-boundary markers for each rendered file and SHALL NOT mix JSON status into successful stdout.
- On failure, including failure to write `current_node`, the CLI SHALL print diagnostic JSON, exit non-zero, and SHALL NOT report the phase entry as successful.
- The CLI SHALL NOT choose the next node, mutate `rb_status.json#/current_gate`, mutate `rb_status.json#/next_gate`, append `phase_transition`, run gate checks, drive the lifecycle loop, execute Markdown instructions, execute research work, or write phase artifacts.

#### Scenario: Enter phase emits load complete witness

- **WHEN** the latest passed deterministic handoff in trace is `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** `rb_trace.jsonl` SHALL contain a `load_complete` event with `entry: "phases/phase-wave1.md"`
- **AND** that `load_complete` event SHALL include `handoff_source_gate: "wave0-complete"`, `handoff_source_node: "phases/phase-wave0.md"`, `handoff_target_node: "phases/phase-wave1.md"`, `handoff_source_attempt_index`, and `handoff_source_attempt_ts`
- **AND** `rb_status.json` SHALL contain `current_node: "phases/phase-wave1.md"`
- **AND** stdout SHALL include the rendered Markdown content loaded by `assessNode()`
- **AND** `rb_status.json#/current_gate` and `rb_status.json#/next_gate` SHALL NOT be modified by `enter-phase`

#### Scenario: Enter phase rejects nodes not produced by gate routing

- **WHEN** `enter-phase.mjs --bundle <bundle> --node phases/phase-final.md` is called
- **AND** `rb_trace.jsonl` has no prior `gate_attempt(passed=true)` whose `next` is `phases/phase-final.md`
- **THEN** the CLI SHALL exit non-zero with a diagnostic error
- **AND** it SHALL NOT append `load_complete` for `phases/phase-final.md`
- **AND** it SHALL NOT update `rb_status.json.current_node`

#### Scenario: Enter phase rejects stale route match

- **WHEN** trace contains an old `gate_attempt(passed=true, next="phases/phase-wave1.md")`
- **AND** a later passed deterministic `gate_attempt` with non-null `next` points to a different node
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called when the latest passed deterministic handoff does not authorize that node
- **THEN** the CLI SHALL exit non-zero
- **AND** it SHALL NOT append a new `load_complete` for `phases/phase-wave1.md`
- **AND** it SHALL NOT update `rb_status.json.current_node`

#### Scenario: Enter phase rejects superseded pass

- **WHEN** trace contains `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** a newer `gate_attempt` for `gate="wave0-complete"` and `currentNodeRef="phases/phase-wave0.md"` fails or passes with a different `next`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** the CLI SHALL exit non-zero
- **AND** it SHALL NOT append a new `load_complete` for `phases/phase-wave1.md`
- **AND** it SHALL NOT update `rb_status.json.current_node`

#### Scenario: Enter phase separates Markdown success from JSON failure

- **WHEN** `enter-phase.mjs` succeeds
- **THEN** stdout SHALL be Agent-readable Markdown with stable file-boundary markers and no mixed JSON status envelope
- **WHEN** `enter-phase.mjs` fails
- **THEN** stdout SHALL be diagnostic JSON
- **AND** no handoff witness or `current_node` update SHALL be reported as successful

#### Scenario: Enter phase preserves autonomous continuation header injection

- **WHEN** `enter-phase.mjs` loads a manifest lifecycle autonomous continuation phase currently encoded as `stop: no`
- **THEN** the rendered Markdown SHALL include the autonomous continuation contract header injected by `assessNode()`
- **AND** the header SHALL appear before the phase body content returned to the Agent

#### Scenario: Enter phase preserves terminal delivery header injection

- **WHEN** `enter-phase.mjs` loads the terminal Final phase
- **THEN** the rendered Markdown SHALL include the terminal delivery contract header injected by `assessNode()`
- **AND** the header SHALL appear before the phase body content returned to the Agent
