> req: AGQ-028

## MODIFIED Requirements

### Requirement: Phase drain includes queue demand and in-flight attempts

> Scope note (criterion partition): the drain classification in this
> requirement is a queue-freshness fact keyed on `deadline_at` (Source of
> Record: the drain expired filter in
> `DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs`). It is a
> different deterministic fact from work-unit timeout *eligibility*, which is
> decided by the effective idle lease (`lease_anchor_at + idle_timeout_ms`)
> and owned by the `agent/delegated-work-units` requirement "Timeout
> terminalization SHALL be guarded by progress-aware preflight". The two
> criteria govern two different operations and SHALL NOT be read as one
> shared expiration semantics or substituted for each other.

The Agentic Queue system SHALL report a phase as drained only when the phase has no unclaimed queue demand and no non-terminal or expired delegated in-flight attempt.

#### Scenario: expired attempt blocks drain

- **WHEN** a wave has no remaining unclaimed delegated queue items
- **AND** `delegated_in_flight` contains a claimed work unit whose `deadline_at` has passed
- **THEN** queue inspect SHALL report the phase as not drained
- **AND** the Main Agent SHALL resolve the attempt through submit, fail, timeout, or abandon before the wave gate may be run
