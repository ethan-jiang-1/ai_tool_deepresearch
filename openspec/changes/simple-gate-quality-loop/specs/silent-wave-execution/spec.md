## MODIFIED Requirements

> req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005

### Requirement: Silent wave execution contract

During a non-terminal lifecycle `stop: no` phase, repeated gate failure or fatigue SHALL NOT authorize user-facing surfacing, progress reporting, partial report delivery, waiting for unrelated background workflows, or skipping required lifecycle phases.

The silent execution contract SHALL direct the Agent through this priority chain:

1. repair deterministic blockers that have clear Engine feedback;
2. change strategy when the same repair is not converging;
3. request or consume a legal degraded gate handoff when deterministic runtime-truth preconditions are satisfied and only degradation-eligible quality rules remain;
4. continue through `enter-phase` and `advance-status` when a clean or degraded `check.next` is available; or
5. hold silently with trace/log diagnostics when no legal repair or degraded route exists.

#### Scenario: No legal route means silent hold

- **WHEN** a gate remains blocked by runtime-truth failures and no degraded route is legal
- **THEN** the Agent SHALL NOT write final artifacts
- **AND** it SHALL leave diagnostics in accepted trace/log surfaces or hold silently according to the silent execution contract

### Requirement: Fatigue resistance in silent execution contract

Fatigue guidance SHALL state that gate failure is not an emergency and repeated gate failure is not permission to surface. At fatigue threshold, the Agent SHALL self-check, change strategy, request or consume a legal degraded handoff when eligible, or hold silently when no legal route exists.

#### Scenario: Fatigue does not surface to user

- **WHEN** a `stop: no` wave gate has failed at fatigue threshold
- **THEN** the Agent-facing guidance SHALL prohibit asking the user, sending a progress report, presenting partial findings, or waiting for unrelated background workflows
- **AND** it SHALL instruct the Agent to follow repair, strategy change, degraded handoff, or silent hold

### Requirement: Autonomous continuation contract and terminal delivery visibility (SWE-003)

Autonomous continuation SHALL mean continuing through the legal lifecycle chain, not jumping to the terminal report goal. The Agent SHALL NOT write `final/` artifacts or synthesize a final report before the legal readiness-to-final handoff and Final node entry.

#### Scenario: Degraded continuation still follows phase chain

- **WHEN** a degraded Wave0 handoff is available
- **THEN** the Agent SHALL consume `check.next` through `enter-phase`
- **AND** it SHALL continue to Wave1 rather than skipping Wave1, Wave2, HITL2, or readiness

#### Scenario: Final shortcut remains prohibited

- **WHEN** a non-terminal `stop: no` phase has high gate friction or local confidence in partial findings
- **THEN** the Agent SHALL continue through the accepted handoff path or hold silently
- **AND** it SHALL NOT write final artifacts before the legal Final path

### Requirement: Silent autonomous execution has no implicit human co-runner

Silent autonomous execution SHALL NOT treat the user, unrelated background workflows, or harness waiting states as a co-runner for non-terminal `stop: no` phases. HITL1 and HITL2 remain the only interactive in-run checkpoints, and terminal Final delivery remains the only terminal delivery exception after final artifacts exist.

#### Scenario: Background workflow is not a continuation dependency

- **WHEN** the Agent is inside a non-terminal `stop: no` phase
- **AND** an unrelated dynamic workflow or harness waiting message exists outside DPT framework authority
- **THEN** the Agent SHALL NOT wait for it as a phase continuation condition
- **AND** it SHALL continue, repair, degrade, or hold silently according to DPT runtime truth

### Requirement: Stop:no surfacing intent SHALL be recorded before any prohibited user-facing pause when the Agent can identify the intent

If the Agent can identify that it is about to surface during a non-terminal `stop: no` phase, it SHALL treat that path as prohibited and follow the silent execution contract instead. Surfacing intent remains diagnostic only and SHALL NOT authorize user-facing output, phase handoff, HITL interaction, final delivery, or status transition.

#### Scenario: Surfacing intent does not authorize surfacing

- **WHEN** the Agent is in a non-terminal `stop: no` phase
- **AND** it intends to ask the user whether to continue, present partial findings, or wait for input
- **THEN** it SHALL abort the user-facing surfacing path
- **AND** it SHALL follow repair, strategy change, legal degraded handoff, or silent hold
