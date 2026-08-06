> req: SWE-004

## MODIFIED Requirements

### Requirement: Silent autonomous execution has no implicit human co-runner

Silent autonomous execution SHALL NOT treat the user, unrelated background workflows, harness waiting states, or user acknowledgement as a continuation prerequisite for non-terminal `stop: no` phases. HITL1 and HITL2 SHALL remain the only framework-initiated interactive in-run checkpoints where the framework invites and waits for a semantic decision, and terminal Final delivery SHALL remain the only terminal delivery exception after final artifacts exist.

The silent contract SHALL distinguish two directions:

- **framework-initiated**: while no user-initiated message is being answered, the Agent SHALL NOT initiate a status reply, progress report, partial delivery, question, approval request, acknowledgement, idle report, or continuation request from a non-terminal `stop: no` phase; it SHALL continue, repair, degrade, consume a legal handoff, or hold silently;
- **user-initiated**: when a user message is already the current normal conversation turn, the Agent SHALL answer that message rather than ignore it. The answer SHALL NOT turn the current node into HITL, create a checkpoint, permission, mutation/reentry authority, pause/interrupt lifecycle, or durable mid-run intent. If the requested action has no legal path at the current position, the answer SHALL state that smallest boundary. If the user has not separately changed the task through an existing accepted path, the pre-existing autonomous continuation obligation and current projected `next_action` SHALL remain unchanged. This contract does not claim asynchronous scheduling or prove that post-answer execution already occurred.

Any Chinese-first or prefer-Chinese guidance SHALL apply only to an already-authorized user-facing response. Language preference SHALL NOT independently authorize the Agent/framework to initiate status, progress, partial-delivery, question, approval, or acknowledgement output. An outer harness/task notification SHALL NOT be treated as a user-initiated conversation turn and SHALL NOT become a continuation dependency.

A user request SHALL NOT by itself expand host permission, override an Engine verdict, hand-author runtime state, or create a missing mutation/reentry capability. When an accepted path can consume the request, the Agent SHALL execute the remaining legal mechanics; when no accepted path exists, the Agent SHALL state the smallest boundary without fabricating success. This requirement does not promise that an arbitrary mid-run message will be persisted or take effect in the current run.

#### Scenario: Background workflow is not a continuation dependency

- **WHEN** the Agent is inside a non-terminal `stop: no` phase
- **AND** an unrelated dynamic workflow or harness waiting message exists outside Deep Research Harness authority
- **THEN** the Agent SHALL NOT wait for it as a phase continuation condition
- **AND** it SHALL continue, repair, degrade, or hold silently according to runtime truth in the current run bundle

#### Scenario: Language preference does not authorize a silent-phase reply

- **WHEN** the Agent is inside a non-terminal `stop: no` phase
- **AND** prefer-Chinese guidance exists without a user-initiated conversation turn
- **THEN** the Agent SHALL NOT infer permission to initiate a user-facing status, progress, question, approval request, or acknowledgement
- **AND** it SHALL follow the existing silent continuation, repair, degradation, or hold contract

#### Scenario: Stale single-turn status allowance is rejected

- **WHEN** static validation scans `shared-silent-execution.md`
- **THEN** it SHALL reject both a blanket permission for Agent-initiated single-turn status/acknowledgement output and an absolute rule that every user-initiated turn must be ignored
- **AND** it SHALL require the direction-aware contract: no framework-initiated surfacing, but a normal received user turn is answered without new authority

#### Scenario: User-initiated turn is answered without becoming HITL

- **WHEN** the user voluntarily sends a message and that message is the current normal conversation turn while a non-terminal `stop: no` phase is active
- **THEN** the Agent SHALL answer the message from current direct facts or state the smallest missing-path boundary
- **AND** the answer SHALL NOT create a third HITL, change `stop`, authorize profile/topic/state mutation, select a route, or create permission
- **AND** absent a separately accepted task change, the existing autonomous continuation obligation and projected `next_action` SHALL remain unchanged
- **AND** this scenario SHALL NOT be used as evidence of asynchronous interruption transport or observed post-answer execution

#### Scenario: User-initiated supplemental scope does not imply durable intervention

- **WHEN** a user-initiated message asks to add or redirect research while the current node is a non-HITL `stop: no` phase
- **THEN** the Agent SHALL NOT claim that the request has been persisted or applied unless an existing accepted owner/path actually records and applies it
- **AND** the Agent SHALL NOT invent a request queue, pause state, mutation path, or HITL2 decision from the message alone
- **AND** if no existing path is legal at that position, the Agent SHALL state that smallest boundary

#### Scenario: Static guidance distinguishes initiation from reply

- **WHEN** static validation scans `shared-silent-execution.md` and the injected autonomous header
- **THEN** it SHALL find an explicit prohibition on framework-initiated surfacing
- **AND** it SHALL NOT find an absolute rule that the user is unavailable or that a user-initiated normal conversation turn must be ignored
- **AND** it SHALL NOT add a mid-run message queue, pause state, or interrupt controller
