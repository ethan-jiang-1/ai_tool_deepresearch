# CLI Phase Transition

> req: CPT-001, CPT-002, CPT-003, CPT-004, CPT-005, CPT-006, CPT-007, CPT-008

## Purpose

Agent-facing CLI tools for phase transition: `advance-status` (advance `current_gate`/`next_gate` using `transitions.chain.json` as truth source) and `log-event --event` (write phase-completion trace events to `rb_trace.jsonl`).
## Requirements
### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

`advance-status.mjs` SHALL synchronize `rb_status.json` after a lifecycle gate pass using the existing trace-backed source-gate handoff rules and transition table.

For covered trace-backed handoffs, before mutating `rb_status.json` or appending `phase_transition`, the CLI SHALL verify that the route-bound handoff target matches the already loaded `rb_status.json#/current_node` and that the loaded node frontmatter is readable. On success, in addition to `status`, `current_gate`, and `next_gate`, the CLI SHALL return a small `continuation` object derived directly from that loaded current-node frontmatter:

- non-terminal `stop: no`: `interaction: prohibited`, `next_action: execute_loaded_node`;
- `stop: yes`: `interaction: required`, `next_action: wait_for_user_in_loaded_node`;
- terminal Final: `interaction: terminal_delivery`, `next_action: deliver_final_artifacts`.

The JSON `continuation` object SHALL be top-level, contain required `interaction` and `next_action` fields and a direct `node_ref` locator. It MAY include the synchronized source gate as `gate`, but SHALL NOT be nested inside status fields and SHALL NOT include confidence, policy decisions, retry trees, context estimates, or alternate route choices.

The cue SHALL NOT choose a node, execute Markdown, mutate additional state, or prove target-phase completion. If a covered handoff's `current_node` is missing, mismatched with the witnessed target, or has unreadable frontmatter, the CLI SHALL fail closed before mutation rather than guess.

For explicit bootstrap compatibility source sync where existing rules do not require a route-bound handoff, the CLI SHALL preserve current status synchronization behavior. It SHALL emit a loaded-node continuation cue only if `rb_status.json#/current_node` is non-null, matches the computed target node, and has readable frontmatter; otherwise it SHALL omit `continuation`, MAY include an explicit `continuation_diagnostic`, and SHALL NOT infer loaded-node execution from manifest/chain lookup alone.

#### Scenario: Advance into Wave1 returns execute cue

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed and `advance-status --to wave0_complete` succeeds
- **THEN** status SHALL synchronize normally
- **AND** stdout SHALL state that interaction is prohibited and Wave1 is the loaded node to execute

#### Scenario: Covered handoff with mismatched current_node fails before mutation

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed
- **AND** `rb_status.json#/current_node` is missing or names another node
- **WHEN** `advance-status --to wave0_complete` is called
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or append `phase_transition`

#### Scenario: Advance into HITL2 returns user-interaction cue

- **WHEN** Wave2 handoff to `phases/phase-hitl2.md` is witnessed and status sync succeeds
- **THEN** continuation SHALL state `interaction: required`
- **AND** it SHALL direct the Agent to the loaded HITL2 user loop

#### Scenario: Bootstrap compatibility does not guess loaded-node cue

- **WHEN** a bootstrap-compatible source sync succeeds without a covered route-bound handoff
- **AND** `rb_status.json#/current_node` is null or does not match the computed target node
- **THEN** status MAY synchronize according to the existing compatibility path
- **AND** stdout SHALL NOT claim that the target node is loaded or executable

#### Scenario: Readiness status sync returns terminal delivery cue

- **WHEN** readiness handoff to `phases/phase-final.md` is witnessed, Final has been loaded, and `advance-status --to readiness_passed` succeeds
- **THEN** status SHALL synchronize with `next_gate: "none"`
- **AND** continuation SHALL state `interaction: terminal_delivery` and `next_action: deliver_final_artifacts`

#### Scenario: Unknown gate still fails without mutation

- **WHEN** an unknown gate is passed to `advance-status`
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or trace

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

`enter-phase` SHALL continue to validate the latest trace-durable clean or degraded handoff, load the target dependency closure through `assessNode()`, write route-bound `load_complete`, and update `rb_status.json#/current_node` without mutating gate windows.

Successful stdout SHALL remain Agent-readable Markdown with stable file-boundary markers and no mixed JSON status envelope. After the loaded dependency closure, the CLI SHALL append one short generated continuation block derived from the target node frontmatter:

- non-terminal stop:no: user interaction prohibited; execute the loaded node now;
- stop:yes: user interaction required; follow the loaded HITL prompt;
- Final: terminal delivery only.

The generated block SHALL be a feedback projection, not a new authority surface, and SHALL not duplicate the full silent-execution contract. It SHALL be the final stdout content and use stable markers with short key/value lines:

```markdown
<!-- DPT_CONTINUATION_CUE_START -->
interaction: prohibited
next_action: execute_loaded_node
node_ref: phases/phase-wave1.md
<!-- DPT_CONTINUATION_CUE_END -->
```

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate has a valid degraded pass and matching next node
- **THEN** enter-phase SHALL accept the same route-binding conditions as a clean pass
- **AND** degraded context SHALL remain in `load_complete`

#### Scenario: stop:no rendered output ends with continuation cue

- **WHEN** enter-phase loads `phases/phase-wave1.md`
- **THEN** stdout SHALL include the normal loaded Markdown and autonomous header
- **AND** the final generated block SHALL prohibit user interaction and direct execution of Wave1

#### Scenario: stop:yes rendered output ends with interaction cue

- **WHEN** enter-phase loads HITL2
- **THEN** the final generated block SHALL state that user interaction is required

#### Scenario: Enter phase rejects unauthorized or stale route

- **WHEN** the target node is not authorized by the latest deterministic source-gate handoff
- **THEN** enter-phase SHALL exit non-zero
- **AND** it SHALL not append a successful continuation block, `load_complete`, or current-node update

#### Scenario: Current node write failure is partial entry failure

- **WHEN** loading succeeded but updating `current_node` fails
- **THEN** stdout SHALL be diagnostic JSON rather than successful Markdown
- **AND** no continuation cue SHALL claim successful entry

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs (CPT-004)

Source-gate `advance-status` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness only when all normal source-gate, target-node, and route-bound `load_complete` checks pass.

Successful status synchronization after a degraded handoff SHALL establish the normal source-gate status window for the target lifecycle phase. It SHALL preserve the degraded marker in diagnostics or trace context and SHALL NOT reinterpret degraded handoff as clean phase completion.

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

#### Scenario: Advance status preserves degraded handoff context

- **WHEN** `advance-status --bundle <bundle> --to wave0_complete` synchronizes after a route-bound degraded wave0 pass and target-node load
- **THEN** it SHALL write the normal source-gate status window
- **AND** it SHALL NOT clear `rb_status.json.current_node`
- **AND** diagnostics or trace context SHALL preserve that the source handoff was degraded

#### Scenario: Degraded marker alone is insufficient for status sync

- **WHEN** trace contains a degraded-looking event without `passed: true`, without non-null `next`, without route-bound source metadata, or without a matching later `load_complete`
- **THEN** `advance-status` SHALL reject it
- **AND** advice SHALL require rerunning the gate and consuming `check.next` through `enter-phase`

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

### Requirement: Phase status drift audit SHALL detect impossible current_gate/next_gate windows and manual bypass suspicion

The phase transition tooling SHALL provide an audit that compares `rb_status.json` with deterministic route evidence from `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json`. The audit SHALL identify status windows that are not authorized by the latest passed source gate, route-bound `load_complete`, and `phase_transition` evidence.

The audit SHALL be diagnostic and fail-closed. It SHALL NOT mutate `rb_status.json`, invent a degradation route, or treat manual edits as valid handoff evidence.

The audit SHALL expose a closed diagnostic outcome vocabulary so downstream advice and tests do not infer ad-hoc meanings. At minimum, outcomes SHALL include `passed`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, and `bootstrap_exception`. `bootstrap_exception` SHALL name the explicit compatibility exception that was applied; it SHALL NOT be a generic escape hatch.

#### Scenario: Status claims later phase without trace authorization

- **WHEN** `rb_status.json` claims `current_gate: "hitl2_recorded"` or `next_gate: "readiness_passed"`
- **AND** trace lacks the required passed wave1/wave2/HITL2 deterministic handoffs and route-bound phase entries
- **THEN** the audit SHALL report phase status drift
- **AND** diagnostics SHALL name the missing predecessor gate or entry witness

#### Scenario: Manual status edit suspicion is reported

- **WHEN** `rb_status.json` changes to a status window that cannot be derived from the latest passed deterministic handoff and `advance-status` trace
- **THEN** the audit SHALL report manual bypass suspicion
- **AND** it SHALL advise returning to the latest authorized phase target rather than continuing from the edited status

#### Scenario: Failed gate cannot authorize next phase status

- **WHEN** the latest `gate_attempt` for a source phase failed with `next: null`
- **AND** `rb_status.json` indicates a downstream phase window
- **THEN** the audit SHALL fail with an impossible status window diagnostic
- **AND** it SHALL NOT write a corrective status file

#### Scenario: Legal witnessed handoff passes audit

- **WHEN** trace contains a passed source gate with non-null `next`, a later route-bound `load_complete` for that target, and a matching `phase_transition`
- **AND** `rb_status.json` reflects the corresponding source-gate status window
- **THEN** the audit SHALL pass without drift diagnostics

#### Scenario: Bootstrap exception is explicit and narrow

- **WHEN** the audit accepts a bootstrap compatibility status window
- **THEN** the result SHALL use outcome `bootstrap_exception`
- **AND** diagnostics SHALL name the exact exception rather than treating arbitrary missing witnesses as acceptable

### Requirement: current_node records active loaded lifecycle control surface

`current_node` SHALL continue to record the most recently loaded lifecycle control surface after a clean or degraded source-gate handoff. It SHALL NOT prove target-phase work completion, SHALL NOT convert a degraded handoff into clean quality evidence, and SHALL NOT erase degraded quality context.

Before any lifecycle node has been successfully loaded by `enter-phase`, `current_node` MAY be `null` or absent for legacy bundles. New bundle templates SHALL use `current_node: null`.

`advance-status` SHALL preserve `current_node` when synchronizing `current_gate` / `next_gate`. It SHALL NOT clear `current_node` after source-gate status sync, because accepted handoff order loads the target node before synchronizing the source-gate status window.

#### Scenario: Current node survives degraded source-gate status sync

- **WHEN** Wave0 emits a degraded pass with `check.next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` succeeds
- **AND** `advance-status --bundle <bundle> --to wave0_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_node: "phases/phase-wave1.md"`
- **AND** the source-gate status window SHALL be synchronized normally
- **AND** degraded quality context SHALL remain available to downstream diagnostics

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

#### Scenario: Initial current node may be null

- **WHEN** a new bundle has not yet loaded a lifecycle control surface through `enter-phase`
- **THEN** `rb_status.json.current_node` MAY be `null`
- **AND** tools SHALL NOT infer the current phase solely from that null value

### Requirement: Phase transition tooling SHALL fail closed on failed or missing source-gate handoffs

Phase transition tooling SHALL NOT allow failed gates, missing handoff witnesses, manual status edits, artifact presence, or `current_node` alone to authorize downstream lifecycle state. `advance-status` SHALL continue to synchronize only the just-passed source gate after a trace-durable clean or degraded handoff has been consumed through a route-bound entry witness. The tooling SHALL NOT provide a broad force option that writes downstream `current_gate`, `next_gate`, or terminal state without the accepted handoff evidence chain.

The accepted evidence chain for covered lifecycle handoff remains:

`gate_attempt(passed=true,next=<target>)` -> later route-bound `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)` -> `advance-status --to <source_gate_enum>` -> matching `phase_transition`.

Degraded passes SHALL be accepted only when they satisfy the existing degraded handoff contract: `passed: true`, `degraded: true`, durable non-null `next`, route-bound entry witness, and no runtime-truth blocker.

#### Scenario: failed source gate cannot authorize downstream status

- **WHEN** the latest gate attempt for a source lifecycle phase failed with `passed: false` or `next: null`
- **AND** `advance-status` is invoked for that source gate or a downstream gate
- **THEN** `advance-status` SHALL exit non-zero with structured diagnostics
- **AND** it SHALL NOT mutate `rb_status.json`
- **AND** it SHALL NOT append `phase_transition`

#### Scenario: missing route-bound entry witness blocks status sync

- **WHEN** a source gate has `gate_attempt(passed=true,next=<target>)`
- **AND** `rb_trace.jsonl` lacks a later route-bound `load_complete` for that target bound to the same attempt
- **THEN** `advance-status --to <source_gate_enum>` SHALL fail closed
- **AND** advice SHALL name the required `enter-phase --bundle <bundle> --node <target>` path

#### Scenario: manual downstream status is diagnostic only

- **WHEN** `rb_status.json` claims a downstream status window that cannot be derived from the latest passed source gate, route-bound entry witness, and matching `phase_transition`
- **THEN** phase status audit SHALL report `status_drift`, `manual_bypass_suspected`, or `failed_gate_downstream_status`
- **AND** audit SHALL NOT repair the file or treat the edited status as authority

#### Scenario: premature final lifecycle state is rejected

- **WHEN** `rb_status.json` claims terminal or final-adjacent state
- **AND** trace lacks the required HITL2/readiness source-gate passes and readiness-to-final route-bound entry witness
- **THEN** transition tooling SHALL report missing lifecycle evidence
- **AND** it SHALL NOT treat final artifacts or `current_node: "phases/phase-final.md"` as a substitute for the missing handoff

#### Scenario: degraded source pass remains legal only with full route evidence

- **WHEN** a source gate emitted a degraded pass with `passed: true`, `degraded: true`, and non-null `next`
- **AND** a later route-bound `load_complete` consumes that exact attempt
- **AND** runtime-truth preconditions are satisfied
- **THEN** `advance-status --to <source_gate_enum>` MAY synchronize the normal source-gate status window
- **AND** diagnostics SHALL preserve degraded context rather than presenting it as a clean quality pass

#### Scenario: broad force advance is unavailable

- **WHEN** a caller attempts to bypass missing source-gate or route-bound entry evidence through a force-style status transition
- **THEN** transition tooling SHALL reject the invocation or treat it as unsupported
- **AND** no downstream lifecycle status SHALL be written by that bypass path
