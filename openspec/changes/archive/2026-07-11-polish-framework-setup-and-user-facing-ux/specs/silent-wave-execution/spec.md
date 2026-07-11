> req: SWE-004

## MODIFIED Requirements

### Requirement: Silent autonomous execution has no implicit human co-runner

Silent autonomous execution SHALL NOT treat the user, unrelated background workflows, or harness waiting states as a co-runner for non-terminal `stop: no` phases. HITL1 and HITL2 remain the only interactive in-run checkpoints, and terminal Final delivery remains the only terminal delivery exception after final artifacts exist.

Any Chinese-first or prefer-Chinese guidance SHALL apply only after a separate accepted contract already authorizes user-facing output. Language preference SHALL NOT authorize a status reply, progress reply, partial delivery, question, approval request, or acknowledgement during a non-terminal `stop: no` phase, including when a user message or outer harness notification appears while the phase is running.

Existing shared silent guidance that permits a single-turn status reply, status acknowledgement, or similar user-facing response to an active user message during a non-terminal `stop: no` phase SHALL be removed or rewritten as prohibited behavior. Recording the message for later HITL2 consideration MAY remain allowed only through accepted runtime truth/diagnostic surfaces, not through a chat acknowledgement.

#### Scenario: Background workflow is not a continuation dependency

- **WHEN** the Agent is inside a non-terminal `stop: no` phase
- **AND** an unrelated dynamic workflow or harness waiting message exists outside DPT framework authority
- **THEN** the Agent SHALL NOT wait for it as a phase continuation condition
- **AND** it SHALL continue, repair, degrade, or hold silently according to DPT runtime truth

#### Scenario: Language preference does not authorize a silent-phase reply

- **WHEN** the Agent is inside a non-terminal `stop: no` phase
- **AND** it sees prefer-Chinese guidance together with a user message, approval prompt, or harness notification
- **THEN** it SHALL NOT infer permission to send a user-facing status or acknowledgement
- **AND** it SHALL follow the existing silent continuation, repair, degradation, or hold contract

#### Scenario: Stale single-turn status allowance is rejected

- **WHEN** static validation scans `shared-silent-execution.md`
- **THEN** it SHALL NOT find guidance that allows a non-terminal `stop: no` phase to answer a user message with a single-turn status reply, acknowledgement, or status notice
- **AND** any user-provided supplemental research information SHALL be deferred to accepted runtime/HITL2 handling without immediate chat response
