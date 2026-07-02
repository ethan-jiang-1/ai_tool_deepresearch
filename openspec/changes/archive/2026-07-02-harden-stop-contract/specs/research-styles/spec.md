# research-styles Delta Spec

> req: RES-004, RES-006

## MODIFIED Requirements

### Requirement: Phase MD references style-specific targets and uses unified Queue re-fill loop

The existing wave0/wave1/wave2 re-fill loop SHALL remain the execution model: fill Q, drain Q, check, identify gaps, re-fill Q, drain, re-check, and repeat until the relevant checkpoint passes or a legal degradation path is recorded.

For wave phases, active queue, thin queue, count-floor gap, placeholder-only output, exhausted search documentation, and Quality Self-Check gap are all work signals. They SHALL drive enqueue/claim/complete, supplementary task creation, strategy change, self-check, or gate rerun. They SHALL NOT be interpreted as permission to surface a stage summary, "nothing left" message, or "done so far" progress report.

The wave0/wave1/wave2 Stop Behavior wording MAY remain node-specific, because each wave optimizes a different quality target. The common invariant is that quality work continues inside the node until the gate/checkpoint passes or a legal silent holding path is reached.

For `stop: "no"` wave phases, no-progress after repeated re-fill attempts SHALL NOT escalate to a user-facing stop, write `rb_status.json` state `blocked`, or ask the user for a decision. Instead, the phase body SHALL instruct the Phase Agent to take a silent degradation path: document the failed search/refill attempts, record `silent_degradation` or `silent_gap` through an accepted trace/log surface, change strategy where possible, and continue only within the boundary accepted by the current gate/checkpoint.

Silent degradation SHALL NOT authorize phase transition. If the gate/checkpoint does not accept the degraded artifact state, the Phase Agent SHALL remain in the current phase and continue repair or change strategy. If the gate/checkpoint is structurally unpassable after legal strategies are exhausted, the Phase Agent SHALL record `silent_unpassable` through an accepted trace/log surface and enter the silent holding behavior defined by `silent-wave-execution`. The Phase Agent SHALL NOT load the next phase without gate CLI `check.next`.

#### Scenario: wave0 no-progress re-fill degrades silently

- **WHEN** wave0 count-floor re-fill has made no progress after the retry limit
- **THEN** the Phase Agent SHALL record `silent_degradation` or `silent_gap` through an accepted trace/log surface
- **AND** the Phase Agent SHALL NOT ask the user, report and stop, or write `rb_status.json` state `blocked`
- **AND** the Phase Agent SHALL NOT load wave1 unless the wave0 gate returns `check.next`

#### Scenario: wave1 no-progress re-fill degrades silently

- **WHEN** wave1 count-floor re-fill has made no progress after the retry limit
- **THEN** the Phase Agent SHALL record the exhausted search angles and degradation decision through an accepted trace/log surface
- **AND** the Phase Agent SHALL NOT ask the user for a decision
- **AND** the Phase Agent SHALL NOT load wave2 unless the wave1 gate returns `check.next`

#### Scenario: wave2 quality re-fill degrades silently

- **WHEN** wave2 Quality Self-Check still identifies a gap after repeated re-fill attempts
- **THEN** the Phase Agent SHALL record `silent_degradation` or `silent_gap` with gap impact
- **AND** the Phase Agent SHALL NOT surface to the user mid-phase
- **AND** the Phase Agent SHALL NOT treat degradation as a gate pass

#### Scenario: wave phase active work does not become idle reporting

- **WHEN** a wave phase has active queue items, thin queue state, count-floor gap, or Quality Self-Check gap
- **THEN** the Phase Agent SHALL continue the queue/refill/self-check loop using node-specific instructions
- **AND** the Phase Agent SHALL NOT produce a stage progress report or idle summary
- **AND** the Phase Agent SHALL NOT advance without the current gate/checkpoint returning `check.next`

### Requirement: Supplementary tasks SHALL NOT produce placeholder references

When supplementary task execution produces only placeholder references or documented failure reports, the Phase Agent SHALL treat that round as no-progress and enter the silent degradation path above. It SHALL delete placeholder references as before, preserve honest failure documentation, and SHALL NOT escalate to a user-facing stop from a `stop: "no"` wave phase.

#### Scenario: Placeholder-only supplementary round enters silent degradation

- **WHEN** Phase Agent drains supplementary task cards and all new reference files from this round have placeholder source URLs
- **THEN** placeholder reference files SHALL be deleted
- **AND** honest `suppl-failure-r{attempt}.md` documentation SHALL be preserved where present
- **AND** the Phase Agent SHALL record silent degradation instead of escalating to the user
