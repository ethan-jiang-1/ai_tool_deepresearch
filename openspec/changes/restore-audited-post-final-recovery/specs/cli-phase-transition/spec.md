> req: CPT-003, CPT-004, CPT-005, CPT-006, CPT-008

## MODIFIED Requirements

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

`enter-phase` SHALL continue to validate the latest trace-durable clean or degraded handoff, load the target dependency closure through `assessNode()`, write route-bound `load_complete`, and update `rb_status.json#/current_node` without mutating gate windows.

The accepted handoff vocabulary SHALL contain exactly two Engine-written classes:

- the existing latest legal passed `gate_attempt` with non-null `next`; and
- one `post_final_reentry` event produced by the accepted post-final recovery operation, whose closed action is `post_final_rerun`, whose recorded HITL2 decision outcome is `rerun`, and whose target/window are resolved through the existing transition table and manifest helpers.

The exceptional event SHALL bind its request digest, operation id, previous readiness→Final handoff/load lineage, expected profile/terminal-status/final-inventory facts, transition-table resolution and derived target status window. Before phase entry it SHALL be accepted only when those facts remain current, re-resolving HITL2 outcome `rerun` produces the recorded target/window, the event is not superseded, `rb_profile.yaml` matches the committed recovery profile, and `rb_status.json` remains the terminal Final window. After a route-bound rerun `load_complete` exists, `advance-status` SHALL validate the immutable event and that exact load witness before writing the derived `hitl2_recorded → rerun_ready` window. Downstream consumers SHALL then require event+load+phase_transition+current rerun window. Arbitrary trace text, C5-local/caller-supplied target nodes, `human-directed` flags and hand-written gate attempts SHALL NOT become handoff authority.

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

For a post-final recovery handoff, route-bound `load_complete` SHALL reference the recovery event identity and lineage rather than pretending a HITL2 gate attempt occurred. Existing source-gate handoff behavior SHALL remain unchanged.

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate has a valid degraded pass and matching next node
- **THEN** enter-phase SHALL accept the same route-binding conditions as a clean pass
- **AND** degraded context SHALL remain in `load_complete`

#### Scenario: Post-final recovery enters the existing rerun node

- **WHEN** the latest legal handoff is a valid non-superseded `post_final_reentry` event bound to the current Final lineage and target status/profile bytes
- **AND** the Agent invokes `enter-phase --node phases/phase-rerun.md`
- **THEN** enter-phase SHALL load the existing rerun dependency closure and append a route-bound `load_complete` referencing the recovery operation/event
- **AND** it SHALL NOT write or claim a synthetic `gate_attempt`

#### Scenario: Forged exceptional event is rejected

- **WHEN** a `post_final_reentry` trace object has an unsupported action/target, wrong Final lineage, mismatched current profile/status bytes, missing operation binding or stale supersession
- **THEN** enter-phase SHALL reject the target without `load_complete` or `current_node` mutation
- **AND** one direct inspect/advice item SHALL identify the failed binding

#### Scenario: Legal entry exposes existing status synchronization

- **WHEN** enter-phase has consumed a valid recovery event and written its route-bound rerun load while updating `current_node` to `phases/phase-rerun.md`
- **THEN** the event/load lineage SHALL authorize only existing `advance-status --to hitl2_recorded` as the next status action
- **AND** downstream topic-state/reentry SHALL remain blocked until the derived rerun window and phase_transition exist

#### Scenario: stop:no rendered output ends with continuation cue

- **WHEN** enter-phase loads `phases/phase-wave1.md`
- **THEN** stdout SHALL include the normal loaded Markdown and autonomous header
- **AND** the final generated block SHALL prohibit user interaction and direct execution of Wave1

#### Scenario: stop:yes rendered output ends with interaction cue

- **WHEN** enter-phase loads HITL2
- **THEN** the final generated block SHALL state that user interaction is required

#### Scenario: Enter phase rejects unauthorized or stale route

- **WHEN** the target node is not authorized by the latest deterministic source-gate or accepted post-final recovery handoff
- **THEN** enter-phase SHALL exit non-zero
- **AND** it SHALL not append a successful continuation block, `load_complete`, or current-node update

#### Scenario: Current node write failure is partial entry failure

- **WHEN** loading succeeded but updating `current_node` fails
- **THEN** stdout SHALL be diagnostic JSON rather than successful Markdown

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs (CPT-004)

Source-gate `advance-status` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness only when all normal source-gate, target-node, and route-bound `load_complete` checks pass.

The accepted post-final exception SHALL allow `advance-status --to hitl2_recorded` without a synthetic HITL2 gate attempt only when a valid `post_final_reentry` event records HITL2 outcome `rerun`, its target/window re-resolve through the existing transition table/manifest, and a later route-bound rerun `load_complete` references that exact event. The CLI SHALL preserve this exceptional source kind in `phase_transition` diagnostics. No other source gate, action or target SHALL use this exception.

Successful status synchronization after a degraded or accepted exceptional handoff SHALL establish the normal source-gate status window for the target lifecycle phase. It SHALL preserve degraded/recovery context in diagnostics or trace and SHALL NOT reinterpret either handoff as a gate attempt that did not occur.

`--to <gate>` SHALL normally name the just-passed source gate being synchronized into `rb_status.json`. For the accepted C5 path, `--to hitl2_recorded` SHALL name the existing HITL2 decision checkpoint semantics recorded by the recovery event; it SHALL NOT claim that `check-gate-hitl2-recorded.mjs` ran post-Final. It SHALL NOT name the next phase's gate.

Before writing `current_gate`, `next_gate`, or `phase_transition`, the CLI SHALL read `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json` and verify one accepted witness class:

- normal: the source gate named by `--to` is the latest passed deterministic `gate_attempt` with non-null `next`, its actual target is legal, and a later route-bound load points to that gate attempt; or
- post-final: `--to` is `hitl2_recorded`, the latest legal handoff is a valid non-superseded `post_final_reentry` whose recorded HITL2 `rerun` outcome resolves to the actual target, and a later route-bound load points to that event.

For both classes the CLI SHALL use the actual/resolved target instead of choosing a default branch, derive the target gate from manifest, require `rb_status.json#/current_node` to equal the loaded target, and reject stale/unbound load witnesses. Existing normal gate-attempt parsing and degraded semantics SHALL remain unchanged.

On failure, the CLI SHALL print JSON with `status: "error"`, a short `reason`, and `advice[]` naming the missing trace condition and the appropriate `enter-phase` or owner remedy. It SHALL exit non-zero and SHALL NOT mutate `rb_status.json` or append `phase_transition`.

The existing success output shape SHALL be preserved.

Successful status synchronization SHALL establish a source-gate status window for the next lifecycle phase. After accepted source checkpoint `G` points to target node `N`, `advance-status --to <G enum>` SHALL set:

- `rb_status.json#/current_gate` to the accepted source gate/checkpoint enum;
- `rb_status.json#/next_gate` to the target node's gate enum, or `"none"` when the target node is terminal Final.

Downstream lifecycle gates SHALL NOT require `current_gate` to already equal their own gate enum before they pass. For a non-entry lifecycle node, the active status window before its gate pass is `current_gate == <legal predecessor source gate enum>` and `next_gate == <this node's gate enum>`, derived from `manifest.json` and `transitions.chain.json`. The accepted C5 event reuses the existing HITL2→rerun window and SHALL NOT add a new gate/window enum.

The bootstrap compatibility exception for setup remains narrow and unchanged.

For multi-outcome HITL2, normal status synchronization SHALL remain tied to the actual target emitted into `gate_attempt.next`. Post-final status synchronization SHALL remain tied to the target obtained by re-resolving the event's recorded HITL2 `rerun` outcome. Neither path SHALL infer the target from free-form profile prose or hardcoded outcome preference.

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
- **AND** the latest accepted handoff is neither the named normal source gate nor an allowed post-final HITL2 exception
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
- **AND** `rb_trace.jsonl` contains a later `load_complete(entry="phases/phase-wave1.md")` whose binding is missing or points to a different handoff
- **THEN** the CLI SHALL exit non-zero with advice to rerun `enter-phase --bundle <bundle> --node phases/phase-wave1.md`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Advance status rejects next-gate enum used as source gate

- **WHEN** wave0 has passed and `check.next` is `phases/phase-wave1.md`
- **AND** `advance-status.mjs --bundle <bundle> --to wave1_complete` is called before the wave1 gate has passed
- **THEN** the CLI SHALL exit non-zero because `wave1-complete` is not the accepted source gate being synchronized
- **AND** advice SHALL name `advance-status --bundle <bundle> --to wave0_complete`

#### Scenario: Advance status succeeds after witnessed handoff

- **WHEN** trace contains `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** a later route-bound `load_complete(entry="phases/phase-wave1.md")` exists in trace
- **AND** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **THEN** `rb_status.json` SHALL be updated using the existing chain lookup behavior
- **AND** stdout SHALL retain `{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }`
- **AND** a `phase_transition` trace event SHALL be appended

#### Scenario: Advance status follows actual multi-edge target

- **WHEN** trace contains a passed deterministic handoff from a multi-outcome source node whose `next` is `phases/phase-rerun.md`
- **AND** a later route-bound `load_complete(entry="phases/phase-rerun.md")` exists in trace
- **AND** `advance-status.mjs --bundle <bundle> --to hitl2_recorded` is called for that selected deterministic branch
- **THEN** `advance-status` SHALL validate `phases/phase-rerun.md` as the actual target from trace
- **AND** it SHALL NOT replace the target with the source node's default `passed` transition

#### Scenario: Post-final recovery uses existing status synchronization

- **WHEN** a valid `post_final_reentry` records the HITL2 `rerun` resolution, `enter-phase` writes the route-bound rerun load, and `advance-status --to hitl2_recorded` is called
- **THEN** the CLI SHALL write `current_gate: hitl2_recorded`, `next_gate: rerun_ready` and preserve `current_node: phases/phase-rerun.md`
- **AND** SHALL append one normal `phase_transition` carrying exceptional handoff context
- **AND** SHALL NOT require or fabricate a post-Final HITL2 gate attempt

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
- `phase handoff` means the Phase Agent consuming either gate CLI `check.next` or the one accepted `post_final_reentry` exceptional handoff through `enter-phase` and receiving the next Markdown control surface;
- `work completion` means the target phase's own artifacts and gate/content rules prove that target phase's work is done; and
- `witnessing` means Engine-written evidence that binds one accepted handoff authority to a later route-bound load: normally `gate_attempt(passed=true,next=<target>)` followed by `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)`, or narrowly `post_final_reentry(action=post_final_rerun,target=<target>)` followed by `load_complete(entry=<target>, handoff_source_event_id=<same event>)`.

The exceptional terminology SHALL NOT imply that a post-Final HITL2 gate ran or passed. It names a recorded HITL2 `rerun` decision checkpoint consumed through the existing loader and status owner. No arbitrary event, caller-declared context, profile prose, artifact presence or `current_node` alone SHALL qualify as witnessing.

`advance-status` SHALL NOT be described as entering, loading, or executing the next phase. `enter-phase` / `load_complete` SHALL NOT be described as completing the target phase's work. Machine-level names such as `phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `current_gate`, and `next_gate` SHALL remain stable unless a separate migration changes them.

#### Scenario: Advance status is state transition only

- **WHEN** `advance-status.mjs` succeeds after a witnessed deterministic route
- **THEN** its docs and diagnostics SHALL describe the result as synchronizing `rb_status.json`
- **AND** they SHALL NOT claim that `advance-status` entered or completed the target phase

#### Scenario: Enter phase witnesses entry only

- **WHEN** `enter-phase.mjs --node <check.next>` succeeds
- **THEN** its docs and diagnostics SHALL describe `load_complete` as a route-bound entry witness for the target Markdown control surface
- **AND** they SHALL NOT claim the target phase's work is complete

#### Scenario: Post-final witnessing does not impersonate gate completion

- **WHEN** `enter-phase` consumes a valid `post_final_reentry` and writes its route-bound rerun load
- **THEN** docs and diagnostics SHALL describe the event/load pair as the accepted exceptional handoff witness
- **AND** SHALL NOT claim that a post-Final HITL2 gate attempt ran, passed or completed rerun work

#### Scenario: Machine names remain stable

- **WHEN** docs introduce the conceptual terms `phase transition`, `phase handoff`, `work completion`, and `witnessing`
- **THEN** existing CLI names, trace event names, status fields, and schema fields SHALL remain unchanged
- **AND** any future machine-level rename SHALL require a separate OpenSpec change

### Requirement: Phase status drift audit SHALL detect impossible current_gate/next_gate windows and manual bypass suspicion

The phase transition tooling SHALL provide an audit that compares `rb_status.json` with deterministic route evidence from `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json`. Normal lifecycle windows SHALL remain authorized by the latest passed source gate, route-bound `load_complete`, and `phase_transition` evidence.

An accepted prepared post-final workspace SHALL short-circuit partial profile symptoms as `post_final_recovery_pending` with only the exact recover action. After event-last commit, the accepted `post_final_reentry` exception SHALL be evaluated through the same pure event parser used by handoff validation. Before rerun load, event-backed terminal status/current Final node SHALL be classified as `post_final_reentry_pending_load`. After route-bound rerun `load_complete` changes current node but before status sync, event+load with the still-terminal gate window SHALL be classified as `post_final_reentry_pending_status_sync`. After existing `advance-status` writes the derived rerun window and `phase_transition`, the exceptional handoff SHALL pass. Any mismatch, unsupported event, missing binding or caller-edited lookalike SHALL remain drift/manual-bypass evidence.

The audit SHALL be diagnostic and fail-closed. It SHALL NOT mutate `rb_status.json`, invent a degradation route, or treat manual edits as valid handoff evidence.

The audit SHALL expose a closed diagnostic outcome vocabulary so downstream advice and tests do not infer ad-hoc meanings. At minimum, outcomes SHALL include `passed`, `post_final_recovery_pending`, `post_final_reentry_pending_load`, `post_final_reentry_pending_status_sync`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, and `bootstrap_exception`. Exceptional outcomes SHALL name the exact accepted workspace/event contract; none SHALL be a generic escape hatch.

#### Scenario: Status claims later phase without trace authorization

- **WHEN** `rb_status.json` claims `current_gate: "hitl2_recorded"` or `next_gate: "readiness_passed"`
- **AND** trace lacks the required normal handoff or accepted post-final recovery event/load evidence
- **THEN** the audit SHALL report phase status drift
- **AND** diagnostics SHALL name the missing predecessor/recovery witness

#### Scenario: Manual status edit suspicion is reported

- **WHEN** `rb_status.json` changes to a status window that cannot be derived from the latest passed deterministic handoff/transition or accepted post-final recovery event stage
- **THEN** the audit SHALL report manual bypass suspicion
- **AND** it SHALL advise returning to the latest authorized owner/action rather than continuing from the edited status

#### Scenario: Failed gate cannot authorize next phase status

- **WHEN** the latest `gate_attempt` for a source phase failed with `next: null`
- **AND** no accepted post-final recovery event applies
- **AND** `rb_status.json` indicates a downstream phase window
- **THEN** the audit SHALL fail with an impossible status window diagnostic
- **AND** it SHALL NOT write a corrective status file

#### Scenario: Legal witnessed handoff passes audit

- **WHEN** trace contains a passed source gate with non-null `next`, a later route-bound `load_complete` for that target, and a matching `phase_transition`
- **AND** `rb_status.json` reflects the corresponding source-gate status window
- **THEN** the audit SHALL pass without drift diagnostics

#### Scenario: Post-final event pending load is explicit

- **WHEN** a valid event-last C5 commit exists under unchanged terminal Final status but `enter-phase` has not yet written its route-bound load
- **THEN** the audit SHALL report `post_final_reentry_pending_load`
- **AND** its only next action SHALL be the exact rerun `enter-phase` command

#### Scenario: Prepared post-final workspace masks partial profile drift

- **WHEN** an accepted post-final workspace exists after profile commit and before event append
- **THEN** the audit SHALL report `post_final_recovery_pending`
- **AND** its only next action SHALL be the exact recover command
- **AND** it SHALL NOT emit a competing manual-bypass repair

#### Scenario: Route-bound post-final handoff awaits status sync

- **WHEN** a valid post-final recovery event has a route-bound rerun load, current node is rerun, and gate fields still show terminal Final
- **THEN** the audit SHALL report `post_final_reentry_pending_status_sync`
- **AND** its only next action SHALL be `advance-status --to hitl2_recorded`

#### Scenario: Route-bound and synchronized post-final handoff passes audit

- **WHEN** a valid post-final recovery event has a route-bound rerun load and matching exceptional `phase_transition`
- **AND** status/current-node match the derived rerun window
- **THEN** the audit SHALL pass without requiring a synthetic gate attempt
- **AND** SHALL preserve recovery event context in diagnostics

#### Scenario: Bootstrap exception is explicit and narrow

- **WHEN** the audit accepts a bootstrap compatibility status window
- **THEN** the result SHALL use outcome `bootstrap_exception`
- **AND** diagnostics SHALL name the exact exception rather than treating arbitrary missing witnesses as acceptable

### Requirement: Phase transition tooling SHALL fail closed on failed or missing source-gate handoffs

Phase transition tooling SHALL NOT allow failed gates, missing handoff witnesses, manual status edits, artifact presence, or `current_node` alone to authorize downstream lifecycle state. Normal `advance-status` SHALL continue to synchronize only the just-passed source gate after a trace-durable clean or degraded handoff has been consumed through a route-bound entry witness. The only exception SHALL be `advance-status --to hitl2_recorded` after an accepted `post_final_reentry(action=post_final_rerun)` has been consumed through its route-bound rerun entry witness; this synchronizes the existing HITL2 `rerun` decision checkpoint semantics and SHALL NOT claim that a post-Final HITL2 gate ran. The tooling SHALL NOT provide a broad force option that writes downstream `current_gate`, `next_gate`, or terminal state without one of these closed accepted evidence chains.

The accepted evidence chains for covered lifecycle handoff SHALL be exactly:

- normal: `gate_attempt(passed=true,next=<target>)` -> later route-bound `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)` -> `advance-status --to <source_gate_enum>` -> matching `phase_transition`; or
- post-final: valid non-superseded `post_final_reentry(action=post_final_rerun,target=<resolved HITL2 rerun target>)` -> later route-bound `load_complete(entry=<target>, handoff_source_event_id=<same event>)` -> `advance-status --to hitl2_recorded` -> matching exceptional-context `phase_transition` and the existing `hitl2_recorded -> rerun_ready` window.

The post-final chain SHALL re-resolve the recorded HITL2 `rerun` outcome through `transitions.chain.json` and manifest/status-window helpers, require the event/load/current-node bindings defined by `POF-003` and `CPT-003/004`, and remain unavailable to every other action, target, source checkpoint or caller-provided route. Event+load without the matching status synchronization SHALL be a pending stage, not downstream lifecycle authority.

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

- **WHEN** `rb_status.json` claims a downstream status window that cannot be derived from the latest accepted normal or post-final handoff, route-bound entry witness, and matching `phase_transition`
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

#### Scenario: accepted post-final chain remains narrow and complete

- **WHEN** a valid `post_final_reentry` is bound to the latest terminal Final lineage and a later route-bound rerun load consumes that exact event
- **AND** `advance-status --to hitl2_recorded` validates the existing HITL2 `rerun` resolution
- **THEN** it MAY append the matching exceptional-context `phase_transition` and establish the existing rerun window
- **AND** it SHALL NOT require or fabricate a post-Final `gate_attempt`

#### Scenario: incomplete post-final chain cannot authorize topic or rerun work

- **WHEN** a valid `post_final_reentry` exists with no route-bound load, or event+load exist without the matching `phase_transition` and rerun status window
- **THEN** transition tooling SHALL expose only the exact pending `enter-phase` or `advance-status --to hitl2_recorded` action
- **AND** downstream topic mutation, reentry success and rerun work SHALL remain unauthorized

#### Scenario: broad force advance is unavailable

- **WHEN** a caller attempts to bypass missing source-gate or route-bound entry evidence through a force-style status transition
- **THEN** transition tooling SHALL reject the invocation or treat it as unsupported
- **AND** no downstream lifecycle status SHALL be written by that bypass path
