> req: POF-006

## ADDED Requirements

### Requirement: Post-final rerun entry diagnostics SHALL target the derived incoming checkpoint

`check-reentry` invoked for a post-final rerun entry SHALL accept either a gate
enum (for example `hitl2_recorded`) or a phase ref (for example
`phases/phase-rerun.md`) as its `--at` target; the mechanical acceptance and
resolution of each form remain owned by the existing check-reentry contract.
This requirement owns only the post-final-specific target selection: a phase
ref SHALL be read as the statement that the target phase's readiness has
already been established on the current chain (`--at phase-rerun` therefore
means `rerun_ready` has already passed). Immediately after ReopenResearchPass
entry plus `advance-status --to hitl2_recorded` have completed, the correct
incoming checkpoint for the reentry diagnostic SHALL be `hitl2_recorded` (the
event-plus-load derived window); `rerun_ready` SHALL NOT be targeted at that
point because the later normal handoff — not the exceptional post-final
handoff — is what establishes it.

#### Scenario: Reentry diagnostic targets the derived window after entry sync

- **WHEN** ReopenResearchPass entry plus `advance-status --to hitl2_recorded` have completed and the Phase Agent runs the reentry diagnostic for the rerun intake
- **THEN** `--at` SHALL target `hitl2_recorded`
- **AND** it SHALL NOT target `rerun_ready`, which only the later normal rerun handoff establishes

#### Scenario: Phase-ref shorthand reads as passed readiness

- **WHEN** the diagnostic is invoked with `--at phase-rerun`
- **THEN** that target SHALL be read as "the current chain has already passed `rerun_ready`"
- **AND** it SHALL NOT be used as the incoming checkpoint immediately after entry and status synchronization
