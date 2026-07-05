## ADDED Requirements

> req: CPT-003, CPT-004

### Requirement: Enter phase CLI witnesses lifecycle node entry

The framework SHALL provide an Agent-facing `enter-phase.mjs` CLI for consuming a gate CLI `check.next` fileRef and rendering the next lifecycle node through the existing workflow loader.

Usage:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <fileRef>
```

- `--bundle` SHALL point to an existing runtime bundle containing `rb_trace.jsonl`.
- `--node` SHALL be a workflow node fileRef such as `phases/phase-wave1.md`.
- `--node` SHALL match the `next` value from the latest passed deterministic `gate_attempt` trace event that has a non-null `next`. The CLI SHALL derive legal predecessor edges from `manifest.json` and `transitions.chain.json`, and that latest passed gate attempt SHALL name the predecessor gate and predecessor `currentNodeRef`.
- The CLI SHALL NOT accept older historical `gate_attempt.next` matches when a later passed deterministic gate attempt points elsewhere.
- The CLI SHALL NOT accept an older passed attempt for the same source gate/source node when a newer gate attempt for that source gate/source node failed or passed with a different `next`.
- The CLI SHALL call the existing `assessNode()` loader path with a trace bound to `<bundle>/rb_trace.jsonl`.
- The CLI SHALL preserve the existing loader trace events including `load_start`, `dependency_resolved`, and `load_complete`.
- The successful `load_complete` event SHALL include route-bound metadata naming the authorizing source gate, source node, target node, and trace-order or timestamp reference for the source `gate_attempt`.
- On success, the CLI SHALL render the loaded dependency closure in plan order as Agent-readable Markdown on stdout so the Phase Agent can read that Markdown into conversation context and continue the Agent-driven loop. The Markdown SHALL use stable file-boundary markers for each rendered file and SHALL NOT mix JSON status into successful stdout.
- On failure, the CLI SHALL print diagnostic JSON, exit non-zero, and SHALL NOT append `load_complete`.
- The CLI SHALL NOT choose the next node, mutate `rb_status.json`, run gate checks, drive the lifecycle loop, execute Markdown instructions, execute research work, or write phase artifacts.

#### Scenario: Enter phase emits load complete witness

- **WHEN** the latest passed deterministic handoff in trace is `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** `rb_trace.jsonl` SHALL contain a `load_complete` event with `entry: "phases/phase-wave1.md"`
- **AND** that `load_complete` event SHALL include `handoff_source_gate: "wave0-complete"`, `handoff_source_node: "phases/phase-wave0.md"`, and `handoff_target_node: "phases/phase-wave1.md"` or equivalent route-bound metadata
- **AND** stdout SHALL include the rendered Markdown content loaded by `assessNode()`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Enter phase rejects nodes not produced by gate routing

- **WHEN** `enter-phase.mjs --bundle <bundle> --node phases/phase-final.md` is called
- **AND** `rb_trace.jsonl` has no prior `gate_attempt(passed=true)` whose `next` is `phases/phase-final.md`
- **THEN** the CLI SHALL exit non-zero with a diagnostic error
- **AND** it SHALL NOT append `load_complete` for `phases/phase-final.md`

#### Scenario: Enter phase rejects stale route match

- **WHEN** trace contains an old `gate_attempt(passed=true, next="phases/phase-wave1.md")`
- **AND** a later passed deterministic `gate_attempt` with non-null `next` points to a different node
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called when the latest passed deterministic handoff does not authorize that node
- **THEN** the CLI SHALL exit non-zero
- **AND** it SHALL NOT append a new `load_complete` for `phases/phase-wave1.md`

#### Scenario: Enter phase rejects superseded pass

- **WHEN** trace contains `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** a newer `gate_attempt` for `gate="wave0-complete"` and `currentNodeRef="phases/phase-wave0.md"` fails or passes with a different `next`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** the CLI SHALL exit non-zero
- **AND** it SHALL NOT append a new `load_complete` for `phases/phase-wave1.md`

#### Scenario: Enter phase separates Markdown success from JSON failure

- **WHEN** `enter-phase.mjs` succeeds
- **THEN** stdout SHALL be Agent-readable Markdown with stable file-boundary markers and no mixed JSON status envelope
- **WHEN** `enter-phase.mjs` fails
- **THEN** stdout SHALL be diagnostic JSON
- **AND** no handoff witness SHALL be written

#### Scenario: Enter phase preserves autonomous continuation header injection

- **WHEN** `enter-phase.mjs` loads a manifest lifecycle autonomous continuation phase currently encoded as `stop: no`
- **THEN** the rendered Markdown SHALL include the autonomous continuation contract header injected by `assessNode()`
- **AND** the header SHALL appear before the phase body content returned to the Agent

#### Scenario: Enter phase preserves terminal delivery header injection

- **WHEN** `enter-phase.mjs` loads the terminal Final phase
- **THEN** the rendered Markdown SHALL include the terminal delivery contract header injected by `assessNode()`
- **AND** the header SHALL appear before the phase body content returned to the Agent

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs

`advance-status.mjs` SHALL fail closed before mutating `rb_status.json` when the requested status synchronization cannot be backed by trace evidence.

`--to <gate>` SHALL name the just-passed source gate being synchronized into `rb_status.json`. It SHALL NOT name the next phase's gate. For example, after `wave0-complete` passes and returns `check.next: "phases/phase-wave1.md"`, the correct status sync is:

```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <bundle> --to wave0_complete
```

Before writing `current_gate`, `next_gate`, or `phase_transition`, the CLI SHALL read `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json` and verify:

- the source gate named by `--to` is the latest passed deterministic `gate_attempt` event with a non-null `next`;
- the source gate maps to a source node in `manifest.json`;
- the matching passed gate attempt's `next` is a legal deterministic outgoing target for the source node in `transitions.chain.json`;
- the CLI uses the matching passed gate attempt's actual `next` as the target node instead of choosing a default outcome such as `passed` over `rerun`; and
- when the target node is a non-initial lifecycle node, `rb_trace.jsonl` contains a later `load_complete` event with `entry` equal to that target node.

On failure, the CLI SHALL print JSON with `status: "error"`, a short `reason`, and `advice[]` naming the missing trace condition and the appropriate `enter-phase --bundle <path> --node <targetNode>` remedy when a node entry witness is missing. When the user appears to have supplied the next phase gate instead of the source gate, advice SHALL name the source-gate `advance-status --to <source_gate_enum>` command. It SHALL exit non-zero and SHALL NOT mutate `rb_status.json` or append `phase_transition`.

The existing success output shape SHALL be preserved.

Successful status synchronization SHALL establish a source-gate status window for the next lifecycle phase. After source gate `G` passes and its deterministic transition points to target node `N`, `advance-status --to <G enum>` SHALL set:

- `rb_status.json#/current_gate` to the just-passed source gate enum;
- `rb_status.json#/next_gate` to the target node's gate enum, or `"none"` when the target node is terminal Final.

Downstream lifecycle gates SHALL NOT require `current_gate` to already equal their own gate enum before they pass. For a non-entry lifecycle node, the active status window before its gate pass is `current_gate == <legal predecessor source gate enum>` and `next_gate == <this node's gate enum>`, derived from `manifest.json` and `transitions.chain.json`. This status-window contract applies to deterministic handoffs from setup onward, including setup→seed-topics, seed-topics→wave0, wave0→wave1, wave1→wave2, wave2→HITL2, HITL2→readiness, readiness→final, and rerun→seed-topics. The instantiation/HITL1 bootstrap status shape remains a compatibility exception unless separately migrated.

For multi-outcome source nodes such as HITL2, status synchronization SHALL be tied to the actual deterministic target emitted into `gate_attempt.next`. A HITL2 proceed handoff and a HITL2 rerun handoff are distinct witnessed routes; `advance-status` SHALL NOT infer one from profile fields or hardcoded outcome preference.

#### Scenario: Advance status rejects source gate that is not the latest handoff

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **AND** the latest passed deterministic `gate_attempt` with non-null `next` is not for `gate: "wave0-complete"`
- **THEN** the CLI SHALL exit non-zero with `status: "error"`
- **AND** `rb_status.json` SHALL NOT be modified
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Advance status rejects superseded source pass

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **AND** an older `wave0-complete` pass points to `phases/phase-wave1.md`
- **AND** a newer `wave0-complete` attempt failed or passed with a different `next`
- **THEN** the CLI SHALL exit non-zero with `status: "error"`
- **AND** `rb_status.json` SHALL NOT be modified
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Advance status rejects missing phase entry witness

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called after the latest passed deterministic handoff is `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` has no `load_complete` for `phases/phase-wave1.md`
- **THEN** the CLI SHALL exit non-zero with advice to run `enter-phase --bundle <bundle> --node phases/phase-wave1.md`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Advance status rejects next-gate enum used as source gate

- **WHEN** wave0 has passed and `check.next` is `phases/phase-wave1.md`
- **AND** `advance-status.mjs --bundle <bundle> --to wave1_complete` is called before the wave1 gate has passed
- **THEN** the CLI SHALL exit non-zero because `wave1-complete` is not the passed source gate being synchronized
- **AND** advice SHALL name `advance-status --bundle <bundle> --to wave0_complete` as the source-gate status sync after `enter-phase`

#### Scenario: Advance status succeeds after witnessed handoff

- **WHEN** trace contains `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** a later `load_complete(entry="phases/phase-wave1.md")` exists in trace
- **AND** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **THEN** `rb_status.json` SHALL be updated using the existing chain lookup behavior
- **AND** stdout SHALL retain `{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }`
- **AND** a `phase_transition` trace event SHALL be appended

#### Scenario: Advance status follows actual multi-edge target

- **WHEN** trace contains a passed deterministic handoff from a multi-outcome source node whose `next` is `phases/phase-rerun.md`
- **AND** a later `load_complete(entry="phases/phase-rerun.md")` exists in trace
- **AND** `advance-status.mjs --bundle <bundle> --to hitl2_recorded` is called for that selected deterministic branch
- **THEN** `advance-status` SHALL validate `phases/phase-rerun.md` as the actual target from trace
- **AND** it SHALL NOT replace the target with the source node's default `passed` transition

#### Scenario: Status window enables the next lifecycle gate

- **WHEN** wave1 has passed with `check.next: "phases/phase-wave2.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave2.md` has written a later `load_complete(entry="phases/phase-wave2.md")`
- **AND** `advance-status.mjs --bundle <bundle> --to wave1_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"`
- **AND** the wave2 gate SHALL treat that pair as the valid active status window for `phases/phase-wave2.md`
- **AND** the wave2 gate SHALL NOT require `current_gate: "wave2_complete"` before wave2 itself passes

#### Scenario: Terminal target sets next gate to none after witnessed final entry

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-final.md` has written a later `load_complete(entry="phases/phase-final.md")`
- **AND** `advance-status.mjs --bundle <bundle> --to readiness_passed` succeeds
- **THEN** `rb_status.json` SHALL contain `current_gate: "readiness_passed"` and `next_gate: "none"`
