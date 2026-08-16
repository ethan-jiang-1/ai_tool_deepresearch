> req: SWE-004

## MODIFIED Requirements

### Requirement: Silent autonomous execution has no implicit human co-runner

Silent autonomous execution SHALL NOT treat the user, unrelated background
workflows, Harness waiting states, or user acknowledgement as a continuation
prerequisite for non-terminal `stop: "no"` phases. HITL1 and HITL2 SHALL remain
the only Harness-initiated in-run checkpoints where the Harness invites and
waits for a lifecycle semantic decision. Final SHALL remain the terminal
delivery exception: it publishes before waiting, then invites feedback about
the delivered artifact while remaining outside Gate/HITL decision semantics.

The silent contract SHALL distinguish these surfaces:

- **non-terminal Harness-initiated**: while no user turn is being answered, the
  Agent SHALL NOT initiate status, progress, partial delivery, question,
  approval, acknowledgement, idle, or continuation output from a non-terminal
  `stop: "no"` phase; it SHALL continue, repair, degrade, consume a legal
  handoff, or hold silently;
- **non-terminal user-initiated**: an already-current user message SHALL be
  answered without creating checkpoint, permission, mutation/reentry authority,
  pause, durable intent, or a promise that arbitrary mid-run scope took effect;
  and
- **terminal Final**: whenever direct lineage/inventory facts show that the
  current legal Final lineage has no bound report, the Agent SHALL publish and
  present immediately—bundle base after empty-primary entry admission or global
  next version after a later rerun whose new Final load admitted the exact prior
  inventory, in both cases only after the exact Readiness status synchronization;
  after each committed report it MAY initiate a concise feedback
  invitation and wait, then publish a bounded presentation revision from
  existing verified evidence. This exception SHALL not authorize a Gate,
  outgoing transition, status change, HITL2 mapping, new research, or persisted
  satisfaction state.

Chinese-first guidance SHALL apply only on an already-authorized user-facing
surface. It SHALL not authorize non-terminal surfacing. Outer task/Harness
notifications SHALL not count as user turns or continuation dependencies.

A user request SHALL NOT by itself expand host permission or override Engine
facts. In Final, clear presentation feedback is an accepted semantic input for
one report revision; feedback requiring new sources, Topics, evidence,
conclusions, or research-profile changes SHALL use the accepted post-final
rerun owner. When no accepted path exists, the Agent SHALL state the smallest
boundary without fabricating success.

#### Scenario: Background workflow is not a continuation dependency

- **WHEN** the Agent is inside a non-terminal `stop: "no"` phase
- **AND** an unrelated workflow or waiting message exists outside Harness authority
- **THEN** the Agent SHALL continue, repair, degrade, or hold according to current bundle truth
- **AND** it SHALL not wait for that external message as a lifecycle condition

#### Scenario: Language preference does not authorize a silent-phase reply

- **WHEN** a non-terminal `stop: "no"` phase has prefer-Chinese guidance but no current user turn
- **THEN** the Agent SHALL not initiate status, progress, question, approval, or acknowledgement

#### Scenario: Stale single-turn status allowance is rejected

- **WHEN** static validation scans silent-execution guidance
- **THEN** it SHALL reject both blanket non-terminal surfacing and an absolute rule that received user turns must be ignored
- **AND** it SHALL recognize terminal Final as the explicit deliver-first feedback exception

#### Scenario: User-initiated turn is answered without becoming HITL

- **WHEN** a user voluntarily sends a current message during a non-terminal `stop: "no"` phase
- **THEN** the Agent SHALL answer from direct facts or state the smallest missing-path boundary
- **AND** the answer SHALL not create a checkpoint, state, permission, route, or durable intervention

#### Scenario: User-initiated supplemental scope does not imply durable intervention

- **WHEN** a user asks to add or redirect research during a non-terminal `stop: "no"` phase
- **THEN** the Agent SHALL not claim the request was persisted or applied without an accepted owner
- **AND** it SHALL not invent a request queue, pause state, mutation path, or HITL2 decision

#### Scenario: Final may invite feedback after delivery

- **WHEN** a primary Final report commits
- **THEN** the Agent MAY present it, invite bounded presentation feedback, and wait
- **AND** this SHALL not weaken silence for any non-terminal phase or create a third HITL

#### Scenario: Final delivery-pending lineage cannot wait

- **WHEN** Final is legally loaded and synchronized with no report bound to the current lineage, whether an admitted empty first inventory or an admitted zero-append return after accepted rerun
- **THEN** the Agent SHALL publish and present the required base or next global version before inviting or awaiting feedback
- **AND** `stop: "yes"` SHALL not be interpreted as generic pre-execution waiting

#### Scenario: Static guidance distinguishes initiation from reply

- **WHEN** validation scans silent guidance and injected headers
- **THEN** it SHALL find non-terminal no-initiation, current-turn reply, and terminal Final deliver-first refinement as distinct contracts
- **AND** it SHALL not add chat interception, a message queue, pause state, or interaction controller
