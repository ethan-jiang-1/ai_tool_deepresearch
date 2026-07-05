# CLI Phase Transition

> req: CPT-001, CPT-002, CPT-003, CPT-004, CPT-005

## Purpose

Agent-facing CLI tools for phase transition: `advance-status` (advance `current_gate`/`next_gate` using `transitions.chain.json` as truth source) and `log-event --event` (write phase-completion trace events to `rb_trace.jsonl`).

## Requirements

### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

An `advance-status.mjs` CLI SHALL be provided for the Agent to synchronize `rb_status.json` `current_gate` and `next_gate` after a lifecycle gate pass.

Usage: `node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to <gate>`

- `--to <gate>` SHALL be a valid `CurrentGate` snake_case enum value (e.g., `seed_topics_ready`).
- For covered deterministic lifecycle handoffs, `--to <gate>` SHALL name the just-passed source gate being synchronized, not the next phase's gate.
- The CLI SHALL set `current_gate` to the `--to` value only after all required preconditions for that transition have passed.
- The CLI SHALL compute `next_gate` from the target node of the validated transition: for covered trace-backed handoffs, the target node SHALL be the actual `gate_attempt.next` emitted by the source gate and validated against `transitions.chain.json`; for explicit bootstrap compatibility exceptions, the existing manifest + `transitions.chain.json` lookup MAY be used.
- The CLI SHALL NOT choose a default outcome such as `passed` over `rerun` when a covered source gate has emitted a concrete `gate_attempt.next`.
- If the target node is terminal Final, `next_gate` SHALL be set to `"none"`.
- The CLI SHALL write a `phase_transition` event to `rb_trace.jsonl` with fields `ts`, `bundle`, `event: "phase_transition"`, `from` (previous `current_gate`), `to` (new `current_gate`), and `next` (new `next_gate`) only after a successful status synchronization.
- On success, the CLI SHALL print `{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }` to stdout and exit 0.
- On failure (unknown gate, chain lookup failure, missing bundle, missing source gate pass, mismatched target, missing route-bound entry witness, or any other failed precondition), the CLI SHALL print a JSON error object to stdout, exit non-zero, and SHALL NOT mutate `rb_status.json` or append `phase_transition`.

#### Scenario: Advance from setup_ready to seed_topics_ready after witnessed setup handoff

- **WHEN** setup has passed with `check.next: "phases/phase-seed-topics.md"`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-seed-topics.md` has written the route-bound entry witness required by CPT-004
- **AND** `advance-status.mjs --bundle <bundle> --to setup_ready` is called
- **THEN** `rb_status.json` SHALL be updated to `current_gate: "setup_ready"`, `next_gate: "seed_topics_ready"`
- **AND** the computation SHALL use the validated target node from the source gate trace, with manifest and transition-table lookup used to map that target node to `next_gate`
- **AND** a `phase_transition` trace event SHALL be appended to `rb_trace.jsonl`

#### Scenario: Advance to terminal gate sets next_gate to none after witnessed final entry

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-final.md` has written the route-bound final entry witness required by CPT-004
- **AND** `advance-status.mjs --bundle <bundle> --to readiness_passed` is called
- **THEN** `next_gate` SHALL be set to `"none"`
- **AND** the CLI SHALL NOT infer terminal status from manifest order alone

#### Scenario: Unknown gate fails with error

- **WHEN** `advance-status.mjs --bundle <bundle> --to nonexistent_gate` is called
- **THEN** the CLI SHALL print a JSON error to stdout and exit non-zero
- **AND** no status or phase-transition trace mutation SHALL occur

### Requirement: Log event CLI supports phase-completion trace events

The existing `log-event.mjs` CLI SHALL be extended with a `--event` parameter for writing trace events to `rb_trace.jsonl`.

- When `--event` is provided, the CLI SHALL write to `rb_trace.jsonl` (not `_logs/run.log`).
- The JSONL line SHALL contain `ts` (ISO8601), `bundle` (read from `rb_status.json`), `event` (value of `--event`), and optionally `detail` (parsed from `--detail` JSON).
- When `--event` is NOT provided, the CLI SHALL retain its existing behavior.
- When both `--event` and `--msg`/`--level` are present, `--event` SHALL take precedence.

#### Scenario: Write phase completion trace event

- **WHEN** `log-event.mjs --bundle <bundle> --event seed_topics_completion` is called
- **THEN** a JSONL line with `"event": "seed_topics_completion"` SHALL be appended to `rb_trace.jsonl`
- **AND** `_logs/run.log` SHALL NOT be modified

#### Scenario: Existing behavior preserved when --event is absent

- **WHEN** `log-event.mjs --bundle <bundle> --level info --msg "phase done"` is called
- **THEN** the line SHALL be written to `_logs/run.log` in the existing format
- **AND** `rb_trace.jsonl` SHALL NOT be modified

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

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
- The successful `load_complete` event SHALL include route-bound metadata naming the authorizing source gate, source node, target node, `handoff_source_attempt_index`, and `handoff_source_attempt_ts`. `handoff_source_attempt_index` SHALL be the zero-based JSONL event index of the authorizing `gate_attempt`; timestamp alone SHALL NOT be the primary reference for status/preflight validation.
- On success, the CLI SHALL render the loaded dependency closure in plan order as Agent-readable Markdown on stdout so the Phase Agent can read that Markdown into conversation context and continue the Agent-driven loop. The Markdown SHALL use stable file-boundary markers for each rendered file and SHALL NOT mix JSON status into successful stdout.
- On failure, the CLI SHALL print diagnostic JSON, exit non-zero, and SHALL NOT append `load_complete`.
- The CLI SHALL NOT choose the next node, mutate `rb_status.json`, run gate checks, drive the lifecycle loop, execute Markdown instructions, execute research work, or write phase artifacts.

#### Scenario: Enter phase emits load complete witness

- **WHEN** the latest passed deterministic handoff in trace is `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** `rb_trace.jsonl` SHALL contain a `load_complete` event with `entry: "phases/phase-wave1.md"`
- **AND** that `load_complete` event SHALL include `handoff_source_gate: "wave0-complete"`, `handoff_source_node: "phases/phase-wave0.md"`, `handoff_target_node: "phases/phase-wave1.md"`, `handoff_source_attempt_index`, and `handoff_source_attempt_ts`
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

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs (CPT-004)

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
- when the target node is a non-initial lifecycle node, `rb_trace.jsonl` contains a later route-bound `load_complete` event with `entry` equal to that target node and `handoff_source_attempt_index` pointing to the same authorizing `gate_attempt`.

On failure, the CLI SHALL print JSON with `status: "error"`, a short `reason`, and `advice[]` naming the missing trace condition and the appropriate `enter-phase --bundle <path> --node <targetNode>` remedy when a node entry witness is missing. When the user appears to have supplied the next phase gate instead of the source gate, advice SHALL name the source-gate `advance-status --to <source_gate_enum>` command. It SHALL exit non-zero and SHALL NOT mutate `rb_status.json` or append `phase_transition`.

The existing success output shape SHALL be preserved.

Successful status synchronization SHALL establish a source-gate status window for the next lifecycle phase. After source gate `G` passes and its deterministic transition points to target node `N`, `advance-status --to <G enum>` SHALL set:

- `rb_status.json#/current_gate` to the just-passed source gate enum;
- `rb_status.json#/next_gate` to the target node's gate enum, or `"none"` when the target node is terminal Final.

Downstream lifecycle gates SHALL NOT require `current_gate` to already equal their own gate enum before they pass. For a non-entry lifecycle node, the active status window before its gate pass is `current_gate == <legal predecessor source gate enum>` and `next_gate == <this node's gate enum>`, derived from `manifest.json` and `transitions.chain.json`. This status-window contract applies to deterministic handoffs from setup onward, including setup→seed-topics, seed-topics→wave0, wave0→wave1, wave1→wave2, wave2→HITL2, HITL2→readiness, HITL2→rerun, readiness→final, and rerun→seed-topics. Bootstrap inbound entries for instantiation, HITL1, and setup remain compatibility exceptions unless separately migrated, and any validator exception SHALL name them explicitly.

The bootstrap compatibility exception for setup is narrow. Legacy/bootstrap status may establish `current_gate: "setup_ready"` and `next_gate: "seed_topics_ready"` as setup's pre-pass status window, because setup inbound is not migrated by this change. That same status pair SHALL NOT be treated as proof that setup→seed-topics has been witnessed. After the `setup-ready` gate itself passes, the covered setup→seed-topics handoff still requires the real `gate_attempt.next`, `enter-phase --node phases/phase-seed-topics.md`, and source-gate `advance-status --to setup_ready` path.

For multi-outcome source nodes such as HITL2, status synchronization SHALL be tied to the actual deterministic target emitted into `gate_attempt.next`. A HITL2 proceed handoff and a HITL2 rerun handoff are distinct witnessed routes; `advance-status` SHALL NOT infer one from profile fields or hardcoded outcome preference. The HITL2 gate CLI SHALL be responsible for emitting the selected deterministic route into `gate_attempt.next`; tests SHALL NOT satisfy this requirement by hand-writing a `gate_attempt` trace event.

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

#### Scenario: Advance status rejects unbound phase entry witness

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called after the latest passed deterministic handoff is `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` contains a later `load_complete(entry="phases/phase-wave1.md")` whose `handoff_source_attempt_index` is missing or points to a different `gate_attempt`
- **THEN** the CLI SHALL exit non-zero with advice to rerun `enter-phase --bundle <bundle> --node phases/phase-wave1.md`
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

#### Scenario: Setup bootstrap status does not replace covered setup handoff

- **WHEN** bootstrap compatibility has established `current_gate: "setup_ready"` and `next_gate: "seed_topics_ready"` before the setup gate passes
- **THEN** that status pair MAY enable the setup gate's own legacy/bootstrap checks
- **BUT** it SHALL NOT authorize seed-topics entry by itself
- **AND** after setup passes, seed-topics entry SHALL still require setup's real `gate_attempt.next`, route-bound `enter-phase` witness, and source-gate `advance-status --to setup_ready`

#### Scenario: Terminal target sets next gate to none after witnessed final entry

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-final.md` has written a later `load_complete(entry="phases/phase-final.md")`
- **AND** `advance-status.mjs --bundle <bundle> --to readiness_passed` succeeds
- **THEN** `rb_status.json` SHALL contain `current_gate: "readiness_passed"` and `next_gate: "none"`

### Requirement: Phase-boundary terminology separates transition, handoff, completion, and witnessing

The `cli-phase-transition` capability SHALL use the canonical phase-boundary terminology shared by guidance and Agent-facing docs.

For this capability:

- `phase transition` means status synchronization in `rb_status.json`, recorded by the `phase_transition` trace event after `advance-status` succeeds;
- `phase handoff` means the Phase Agent consuming gate CLI `check.next` through `enter-phase` or another accepted loader/check path and receiving the next Markdown control surface;
- `work completion` means the target phase's own artifacts and gate/content rules prove that target phase's work is done; and
- `witnessing` means Engine-written evidence that binds a passed deterministic gate route to a later route-bound load, such as `gate_attempt(passed=true,next=<target>)` followed by `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)`.

`advance-status` SHALL NOT be described as entering, loading, or executing the next phase. `enter-phase` / `load_complete` SHALL NOT be described as completing the target phase's work. Machine-level names such as `phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `current_gate`, and `next_gate` SHALL remain stable unless a separate migration changes them.

#### Scenario: Advance status is state transition only

- **WHEN** `advance-status.mjs` succeeds after a witnessed deterministic route
- **THEN** its docs and diagnostics SHALL describe the result as synchronizing `rb_status.json`
- **AND** they SHALL NOT claim that `advance-status` entered or completed the target phase

#### Scenario: Enter phase witnesses entry only

- **WHEN** `enter-phase.mjs --node <check.next>` succeeds
- **THEN** its docs and diagnostics SHALL describe `load_complete` as a route-bound entry witness for the target Markdown control surface
- **AND** they SHALL NOT claim the target phase's work is complete

#### Scenario: Machine names remain stable

- **WHEN** docs introduce the conceptual terms `phase transition`, `phase handoff`, `work completion`, and `witnessing`
- **THEN** existing CLI names, trace event names, status fields, and schema fields SHALL remain unchanged
- **AND** any future machine-level rename SHALL require a separate OpenSpec change
