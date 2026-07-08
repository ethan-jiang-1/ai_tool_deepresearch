> req: SWE-006

## ADDED Requirements

### Requirement: Stop:no delegated phases SHALL actively poll work-unit readiness after background spawn

During non-terminal `stop: no` phases with delegated work units in flight, the Phase Agent SHALL actively poll runtime work-unit surfaces after spawning background Sub-agents. It SHALL NOT wait for user continuation, background task notification, unrelated workflow state, or chat context changes when bundle-root work-unit files can be inspected.

The active polling loop SHALL periodically inspect claimed work-unit directories or `operate-work-unit inspect` output for result, receipt, output, cache, status, and deadline signals. When a claimed attempt is ready, the Phase Agent SHALL run `operate-work-unit submit` promptly. If submit rejects, it SHALL repair the same attempt when possible or explicitly close it with `fail`, `timeout`, or `abandon` before retrying or claiming replacements.

Polling SHALL be bounded by each work-unit deadline and phase guidance. A lack of task notification SHALL NOT be a continuation blocker, and a received task notification SHALL NOT be treated as authority without submit/gate validation.

The polling loop SHALL be reconstructable from runtime bundle truth. A scratch list of spawned work IDs MAY be used for convenience, but loss of chat memory or task notification SHALL NOT orphan in-flight attempts. Phase guidance SHALL teach the Phase Agent to recover the in-flight set from work-unit directories, queue delegated-in-flight state, work-unit indexes/manifests, or inspect output before deciding whether to submit, terminalize, claim more, or run a gate.

#### Scenario: completed background work is submitted without user nudge

- **WHEN** a background Sub-agent has written a candidate result, runtime receipt, declared outputs, and cache trails for a claimed work unit
- **THEN** the Phase Agent SHALL detect readiness through active polling or inspect feedback
- **AND** it SHALL submit the work unit without waiting for the user to say "continue"

#### Scenario: task notification is not a continuation condition

- **WHEN** a Sub-agent notification has not appeared in chat context
- **AND** bundle-root work-unit files show that a claimed attempt may be ready
- **THEN** the Phase Agent SHALL inspect and submit from runtime truth
- **AND** it SHALL NOT hold solely for a notification event

#### Scenario: in-flight polling survives chat memory loss

- **WHEN** the Phase Agent re-enters a delegated stop:no phase without a reliable scratch list of spawned work IDs
- **AND** runtime bundle files show delegated attempts still in flight
- **THEN** the Phase Agent SHALL reconstruct the in-flight set from bundle truth or inspect output
- **AND** it SHALL continue poll/submit/repair/terminalize work rather than asking the user what was spawned

#### Scenario: rejected submit stays inside the silent loop

- **WHEN** active polling finds a result and `operate-work-unit submit` rejects it
- **THEN** the Phase Agent SHALL use submit diagnostics to repair the same attempt when possible
- **AND** if the attempt cannot continue, it SHALL close the attempt explicitly before claiming replacement work

#### Scenario: polling does not authorize surfacing

- **WHEN** polling finds no ready result yet but deadlines have not expired
- **THEN** the Phase Agent SHALL continue polling or work on other eligible in-flight attempts
- **AND** it SHALL NOT send a progress report, idle report, or continuation question during the non-terminal `stop: no` phase
