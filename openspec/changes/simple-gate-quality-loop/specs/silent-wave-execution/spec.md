## MODIFIED Requirements

> req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005

### Requirement: Stop:no fatigue SHALL continue silently through repair, degradation, or hold without surfacing or phase skipping

During a non-terminal lifecycle `stop: no` phase, repeated gate failure or fatigue SHALL NOT authorize user-facing surfacing, progress reporting, partial report delivery, waiting for unrelated background workflows, or skipping required lifecycle phases.

The silent execution contract SHALL direct the Agent through this priority chain:

1. repair deterministic blockers that have clear Engine feedback;
2. change strategy when the same repair is not converging;
3. request or consume a legal degraded gate handoff when deterministic runtime-truth preconditions are satisfied and only degradation-eligible quality rules remain;
4. continue through `enter-phase` and `advance-status` when a clean or degraded `check.next` is available; or
5. hold silently with trace/log diagnostics when no legal repair or degraded route exists.

The Agent SHALL NOT write `final/` artifacts or synthesize a final report before the legal readiness-to-final handoff and Final node entry.

#### Scenario: Fatigue does not surface to user

- **WHEN** a `stop: no` wave gate has failed at fatigue threshold
- **THEN** the Agent-facing guidance SHALL prohibit asking the user, sending a progress report, or presenting partial findings
- **AND** it SHALL instruct the Agent to follow repair, strategy change, degraded handoff, or silent hold

#### Scenario: Degraded continuation still follows phase chain

- **WHEN** a degraded Wave0 handoff is available
- **THEN** the Agent SHALL consume `check.next` through `enter-phase`
- **AND** it SHALL continue to Wave1 rather than skipping Wave1, Wave2, HITL2, or readiness

#### Scenario: No legal route means silent hold, not final shortcut

- **WHEN** a gate remains blocked by runtime-truth failures and no degraded route is legal
- **THEN** the Agent SHALL NOT write final artifacts
- **AND** it SHALL leave diagnostics in accepted trace/log surfaces or hold silently according to the silent execution contract
