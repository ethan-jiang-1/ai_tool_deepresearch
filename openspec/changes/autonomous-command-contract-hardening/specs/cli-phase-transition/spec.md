## ADDED Requirements

> req: CPT-005

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
