## MODIFIED Requirements

> req: RES-004

### Requirement: Phase MD references style-specific targets and uses unified Queue re-fill loop

Research-style phase wording SHALL preserve the existing Queue re-fill loop while using canonical phase-boundary terminology for silent degradation.

Silent degradation, `silent_gap`, and no-progress refill handling SHALL NOT be described as authorizing a phase transition in the broad historical sense. The wording SHALL instead distinguish the two forbidden boundary effects:

- silent degradation SHALL NOT authorize phase handoff or loading the next phase control surface; only gate CLI `check.next` consumed through the accepted handoff path can do that; and
- silent degradation SHALL NOT authorize source-gate status synchronization in `rb_status.json`; status synchronization remains governed by `advance-status` and its accepted preconditions.

The existing behavior remains unchanged: if the gate/checkpoint does not accept the degraded artifact state, the Phase Agent remains in the current phase, repairs or changes strategy, records accepted silent diagnostics where allowed, and does not ask the user for a decision.

#### Scenario: Silent degradation is not boundary authority

- **WHEN** wave0/wave1/wave2 refill work records `silent_degradation` or `silent_gap`
- **THEN** the docs SHALL state that the Agent remains in the current phase unless the current gate emits `check.next`
- **AND** the docs SHALL NOT describe degradation as authorizing phase handoff, next-node loading, or `advance-status` synchronization
