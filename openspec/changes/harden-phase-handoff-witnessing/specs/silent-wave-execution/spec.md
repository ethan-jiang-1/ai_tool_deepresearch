## ADDED Requirements

> req: SWE-003

### Requirement: Autonomous continuation contract and terminal delivery visibility

The silent execution contract SHALL include an autonomous continuation section explaining why continuing through the autonomous pipeline is the helpful behavior.

For this requirement, "autonomous continuation" means the behavior currently encoded by a non-terminal lifecycle `stop: no` phase: the Agent does not surface to the user, does not wait for user input, does not self-declare completion, and continues through the Markdown-controlled loop until gate pass and accepted `check.next` handoff.

The section SHALL state:

- final report delivery is guaranteed at the terminal Final phase after final artifacts are written;
- every completed wave improves evidence grounding, sourcing, and synthesis quality;
- high gate friction, user waiting time, or local confidence in partial data SHALL NOT authorize premature chat synthesis;
- early chat delivery during a non-terminal autonomous continuation phase is less helpful than completing the verified pipeline;
- the correct next action after a non-terminal gate pass is to consume `check.next` through the accepted handoff path.

This requirement is guidance for Agent behavior. It SHALL NOT replace Engine-side handoff witnessing, gate preflight, or trace-backed state checks.

#### Scenario: Agent sees final delivery reassurance

- **WHEN** the Agent reads `shared-silent-execution.md`
- **THEN** it SHALL see that final report delivery occurs at `phase-final`
- **AND** it SHALL see that non-terminal early synthesis is not a substitute for final delivery

#### Scenario: Gate friction does not authorize premature report

- **WHEN** a non-terminal autonomous continuation phase passes a gate after many attempts
- **THEN** the silent execution contract SHALL direct the Agent to continue through `check.next`
- **AND** it SHALL NOT permit asking the user whether the partial report is enough

#### Scenario: Autonomous continuation guidance is not the load-bearing checkpoint

- **WHEN** the silent execution contract includes autonomous continuation language
- **THEN** the system SHALL still rely on Engine trace checks for deterministic handoff truth
- **AND** prose SHALL NOT be treated as a replacement for `load_complete` or `gate_attempt(passed=true)` evidence
