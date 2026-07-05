## MODIFIED Requirements

> req: RWG-010

### Requirement: Wave2 phase-internal feedback checks are distinct from phase boundary gate

Wave2 phase-internal feedback wording SHALL preserve the distinction between advisory in-phase checks and the phase-boundary gate while using canonical phase-boundary terminology.

Phase-internal feedback checks SHALL continue to return `{ check, inspect, advice }` for Phase Agent repair, SHALL NOT block phase advancement by themselves, and SHALL NOT automatically drive workflow, spawn sub-agents, mutate queue state, load another phase, or synchronize `rb_status.json`.

The `wave2-complete` gate remains the phase-boundary gate. Its pass/fail result controls whether the Agent may proceed to the accepted handoff path: a pass may emit `check.next`, after which the Phase Agent must consume that target through `enter-phase` or another accepted loader/check path before source-gate status synchronization. A failing gate blocks phase handoff and status synchronization until repaired and rerun.

Existing wording such as "Gate check controls phase transition" SHALL be revised to distinguish gate pass, phase handoff, and status synchronization rather than using `phase transition` as a broad synonym for all boundary movement.

#### Scenario: Gate check controls boundary authorization, not hidden movement

- **WHEN** Phase Agent runs `check-gate-wave2-complete.mjs` at phase end
- **THEN** a passing gate MAY emit `check.next` for the accepted handoff path
- **AND** `passed: false` SHALL block phase handoff and source-gate status synchronization
- **AND** docs SHALL NOT describe the gate as directly loading the next phase or completing HITL2 work
