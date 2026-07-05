## MODIFIED Requirements

> req: SWE-001

### Requirement: Silent wave execution contract

Silent wave execution wording SHALL use canonical phase-boundary terminology when describing gate boundaries and silent degradation.

Silent degradation, `silent_gap`, and `silent_unpassable` SHALL NOT be described as broad `phase transition` authority. The wording SHALL distinguish that these markers:

- do not authorize phase handoff, next-node loading, or consuming a target phase control surface;
- do not authorize `rb_status.json` source-gate status synchronization; and
- do not prove target-phase work completion.

The existing silent behavior remains unchanged: if the current gate/checkpoint does not accept the degraded artifact state, the Phase Agent continues repair or strategy change inside the current phase, records accepted diagnostics where allowed, and holds silently when structurally unpassable. Only gate CLI `check.next` plus the accepted handoff path can authorize entering the next phase.

#### Scenario: Silent degradation cannot cross phase boundary

- **WHEN** a `stop: no` phase records `silent_degradation`, `silent_gap`, or `silent_unpassable`
- **THEN** docs SHALL say the Agent remains in the current phase unless a gate emits `check.next`
- **AND** docs SHALL NOT describe those markers as authorizing handoff, status synchronization, or target work completion

## ADDED Requirements

> req: SWE-004

### Requirement: Silent autonomous execution has no implicit human co-runner

Silent autonomous execution SHALL be framed as Agent-run execution with no implicit human or operator co-runner inside non-terminal lifecycle phases.

During a run, HITL1 and HITL2 SHALL be the only interactive in-run checkpoints. Terminal non-interactive Final delivery is allowed after final artifacts exist, but it is not an interactive checkpoint, progress report, confirmation loop, or post-delivery repair surface. Post-final feedback, when supported by accepted content-delivery specs, re-enters through HITL2 repair/rerun rather than through a Final-owned loop. The one-time pre-pipeline drag/paste trigger is outside the lifecycle loop and does not imply that a human remains available to run commands, answer confirmations, receive progress reports, decide whether partial output is enough, or choose the next phase during `stop: no` execution.

Agent-facing silent execution docs SHALL preserve the existing allowance for unsolicited user messages during silent phases as a single-turn interruption that does not stop the Agent. That allowance SHALL NOT be generalized into asking the user questions, requesting confirmation, or treating the user as an in-loop operator.

#### Scenario: Non-terminal stop:no phase has no human fallback

- **WHEN** the Agent is inside a non-terminal lifecycle `stop: no` phase
- **THEN** docs SHALL instruct it to continue, repair, degrade, hold silently, or run the appropriate gate
- **AND** docs SHALL NOT instruct it to ask the user whether to continue or whether partial output is sufficient

#### Scenario: User interruption is not command transfer

- **WHEN** the user sends an unsolicited message during silent execution
- **THEN** the Agent MAY handle the interruption according to the silent execution contract
- **AND** the docs SHALL still require the Agent to continue autonomous execution rather than hand command execution back to the user
