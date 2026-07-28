## MODIFIED Requirements

### Requirement: Phase-boundary terminology separates transition, handoff, completion, and witnessing

The `cli-phase-transition` capability SHALL use the canonical phase-boundary
terminology shared by guidance and Agent-facing docs.

For this capability:

- `phase transition` means status synchronization in `rb_status.json`, recorded by the `phase_transition` trace event after `advance-status` succeeds;
- `phase handoff` means the Phase Agent consuming either gate CLI `check.next` or the one accepted `post_final_reentry` exceptional handoff through `enter-phase` and receiving the next Markdown control surface;
- `work completion` means the target phase's own artifacts and gate/content rules prove that target phase's work is done; and
- `witnessing` means Engine-written evidence that binds one accepted handoff authority to a later route-bound load: normally `gate_attempt(passed=true,next=<target>)` followed by `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)`, or narrowly `post_final_reentry(action=post_final_rerun,target=<target>)` followed by `load_complete(entry=<target>, handoff_source_event_id=<same event>)`.

The exceptional terminology SHALL NOT imply that a post-Final HITL2 gate ran or
passed. It names a recorded HITL2 `rerun` decision checkpoint consumed through
the existing loader and status owner. No arbitrary event, caller-declared
context, profile prose, artifact presence or `current_node` alone SHALL qualify
as witnessing.

`advance-status` SHALL NOT be described as entering, loading, or executing the
next phase. `enter-phase` / `load_complete` SHALL NOT be described as
completing the target phase's work. Machine-level names such as
`phase_transition`, `advance-status`, `enter-phase`, `load_complete`,
`current_gate`, and `next_gate` SHALL remain stable unless a separate OpenSpec
change changes them.

For a normal passed gate, Agent-facing entry guidance SHALL present the complete
accepted sequence: consume `check.next` with `enter-phase`, synchronize the
just-passed source gate with `advance-status --to <source_gate_enum>`, then
execute the loaded target phase. Guidance SHALL NOT omit the source-gate status
synchronization, reverse the two lifecycle operations, or present entry alone
as authorization to claim target work completion.

#### Scenario: Advance status is state transition only

- **WHEN** `advance-status.mjs` succeeds after a witnessed deterministic route
- **THEN** its docs and diagnostics SHALL describe the result as synchronizing `rb_status.json`
- **AND** they SHALL NOT claim that `advance-status` entered or completed the target phase

#### Scenario: Enter phase witnesses entry only

- **WHEN** `enter-phase.mjs --node <check.next>` succeeds
- **THEN** its docs and diagnostics SHALL describe `load_complete` as a route-bound entry witness for the target Markdown control surface
- **AND** they SHALL NOT claim the target phase's work is complete

#### Scenario: Normal entry guidance completes source-gate synchronization before target execution

- **WHEN** a generic Agent-facing playbook instructs a passed normal lifecycle gate handoff
- **THEN** it SHALL order `enter-phase --node <check.next>` before `advance-status --to <source_gate_enum>`
- **AND** it SHALL direct execution of the loaded target phase only after that source-gate synchronization

#### Scenario: Post-final witnessing does not impersonate gate completion

- **WHEN** `enter-phase` consumes a valid `post_final_reentry` and writes its route-bound rerun load
- **THEN** docs and diagnostics SHALL describe the event/load pair as the accepted exceptional handoff witness
- **AND** SHALL NOT claim that a post-Final HITL2 gate attempt ran, passed or completed rerun work

#### Scenario: Machine names remain stable

- **WHEN** docs introduce the conceptual terms `phase transition`, `phase handoff`, `work completion`, and `witnessing`
- **THEN** existing CLI names, trace event names, status fields, and schema fields SHALL remain unchanged
- **AND** any future machine-level rename SHALL require a separate OpenSpec change
