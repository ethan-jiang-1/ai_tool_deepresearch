> req: RWP-018

## ADDED Requirements

### Requirement: Wave delegated drain loops SHALL route timeout through progress-aware preflight

Wave0, Wave1, and Wave2 phase Markdown SHALL instruct the Phase Agent to run progress-aware timeout preflight before terminalizing a delegated claimed work unit as timed out. Phase guidance SHALL not tell the Agent to close a claimed delegated attempt with `operate-work-unit timeout` solely because the initial wall-clock `deadline_at` has elapsed.

The delegated drain loop SHALL reconstruct in-flight work from bundle truth, actively poll or inspect work-unit readiness, submit ready attempts, repair rejected or repairable attempts, and use `timeout-preflight` for expired or stale attempts before terminal timeout. The Phase Agent SHALL follow preflight advice: submit submit-ready results, repair repairable same-`work_id` candidates, wait or continue polling recent-progress attempts, inspect/block invalid bindings, and call timeout only when preflight reports timeout-eligible or an explicit audited force timeout is chosen. Because false timeout eligibility exits non-zero by design, phase guidance SHALL tell the Agent to parse structured `timeout-preflight` stdout before deciding the next action.

Force timeout SHALL be documented as exceptional. Phase guidance SHALL NOT present `timeout --force` as the normal response to progress-positive work. If preflight recommends `block` or reports invalid binding, the phase guidance SHALL direct the Phase Agent to inspect/repair through Engine tooling or surface a blocker rather than forcing timeout to make the phase drain.

This timeout-preflight path SHALL preserve the existing phase boundaries: bounded top-up claim remains an Agent strategy, Sub-agents remain bounded high-I/O actors, formal submit remains the only delegated success boundary, and gates run only after queue demand and delegated in-flight attempts are drained. The guidance SHALL NOT add Engine-owned waiting, daemon polling, user-notification dependency, direct Phase-Agent search for delegated evidence, or an alternate delegated completion path.

#### Scenario: Wave0 timeout uses preflight first

- **WHEN** a Wave0 source-intake work unit appears expired or stale
- **THEN** `phase-wave0.md` SHALL instruct the Phase Agent to run `operate-work-unit timeout-preflight`
- **AND** it SHALL direct the Agent to submit, repair, wait, inspect, block, or timeout according to structured preflight advice

#### Scenario: Wave1 timeout uses preflight first

- **WHEN** a Wave1 topic-deepening work unit appears expired or stale
- **THEN** `phase-wave1.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** submit/repair advice SHALL preserve same-`work_id` repair, depth review, supplementary queue demand, and Phase-owned reference materialization boundaries

#### Scenario: Wave2 timeout uses preflight first

- **WHEN** a Wave2 targeted-evidence work unit appears expired or stale
- **THEN** `phase-wave2.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** the guidance SHALL preserve pure-synthesis versus targeted-evidence authority boundaries

#### Scenario: progress-positive attempts are not treated as drained

- **WHEN** timeout-preflight recommends submit, repair, wait, inspect, or block for an in-flight work unit
- **THEN** the phase guidance SHALL treat the phase as not drained
- **AND** the wave gate SHALL NOT be run as if delegated work were complete

#### Scenario: force timeout is exceptional

- **WHEN** timeout-preflight reports a progress-positive or invalid-binding attempt as not timeout-eligible
- **THEN** phase guidance SHALL NOT present `timeout --force` as the default drain action
- **AND** it SHALL instruct the Phase Agent to prefer submit, repair, wait, inspect, or blocker surfacing according to preflight advice

#### Scenario: no-progress timeout still returns to REDO

- **WHEN** timeout-preflight reports a no-progress attempt as timeout-eligible
- **THEN** phase guidance SHALL allow normal `operate-work-unit timeout`
- **AND** the retry path SHALL continue through queue demand, new work-unit claim, Sub-agent execution, submit, ledger, and gate
