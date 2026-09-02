# silent-wave-execution

> req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005, SWE-006, SWE-007

## Purpose

Silent Wave Execution 定义了 Agent 在用户缺席（静默自主阶段）时的行为契约——在 wave0/1/2 执行期间完全自主、不浮出水面、遇错按降级优先级链自行处理、将 escalation 改写为降级并完整 trace、到达合法浮出水面点（HITL2）时汇总报告静默期积累的降级。
## Requirements
### Requirement: Silent wave execution contract

During a non-terminal lifecycle `stop: no` phase, repeated gate failure, gate pass, local completion, scope pressure, or fatigue SHALL NOT authorize framework-initiated user-facing surfacing, progress reporting, partial delivery, waiting for unrelated background workflows, or skipping required lifecycle phases.

At Agent decision points, deterministic checkpoint output SHALL expose a short continuation cue derived from the current node `stop` contract and direct checkpoint outcome. For stop:no gate results:

- pass with non-null `check.next` SHALL state `interaction: do_not_initiate` and `next_action: consume_check_next`;
- fail SHALL state `interaction: do_not_initiate` and `next_action: repair_and_rerun_gate`;
- `do_not_initiate` SHALL mean that the framework/Agent does not initiate a user-facing pause, question, acknowledgement, progress report, partial delivery, idle report, or continuation request; it SHALL NOT mean that the Agent ignores a user-initiated message already received through the normal conversation boundary;
- the cue SHALL not authorize routing, status mutation, completion, degraded handoff, root-cause classification, chat interception, or user-message classification beyond the existing gate result.

When emitted in gate JSON, the cue SHALL be a top-level `continuation` object with required `interaction` and `next_action` fields and direct locator fields such as `node_ref` and `gate`. It SHALL NOT be nested inside `check` or `routing`, and SHALL NOT include confidence, policy decisions, retry trees, context estimates, alternate route choices, user-message state, or pause state.

The cue SHALL read only direct outcome and node-frontmatter facts; it SHALL NOT derive a second verdict from `failed_rule_ids`, `masked_rule_ids`, inspect classifications, chat state, token pressure, or Agent intent. Stop:yes gate failures, including HITL capability failures, SHALL NOT be converted into autonomous stop:no continuation cues.

The silent execution priority chain remains repair, strategy change, legal degraded handoff, consume clean/degraded `check.next`, or silent hold. `surfacing_intent` remains diagnostic only for an Agent/framework-initiated prohibited surfacing path; replying to a user-initiated conversation turn SHALL NOT by itself be classified as prohibited surfacing intent.

#### Scenario: stop:no gate failure returns repair cue

- **WHEN** a stop:no gate fails without a user-initiated conversation turn
- **THEN** gate output SHALL state `interaction: do_not_initiate`
- **AND** the immediate next action SHALL be repair the named root cause and rerun the same gate
- **AND** the Agent SHALL NOT initiate a status reply, question, acknowledgement, or confirmation request

#### Scenario: stop:yes gate failure does not receive autonomous cue

- **WHEN** a stop:yes gate fails, including a missing or unavailable research-access observation
- **THEN** gate output SHALL NOT state `interaction: do_not_initiate`
- **AND** it SHALL preserve the existing user/HITL repair boundary

#### Scenario: stop:no gate pass returns continuation cue

- **WHEN** a stop:no gate passes with non-null `check.next`
- **THEN** gate output SHALL state `interaction: do_not_initiate`
- **AND** the immediate next action SHALL be consume `check.next` through the accepted handoff path
- **AND** the cue SHALL NOT forbid a response if a user-initiated message is already the current conversation turn

#### Scenario: no legal route means silent hold

- **WHEN** a gate remains blocked by runtime-truth failures and no degraded route is legal
- **THEN** the Agent SHALL NOT write final artifacts or initiate a user decision request
- **AND** it SHALL leave diagnostics or hold silently according to the contract

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

### Requirement: Stop:no surfacing intent SHALL be recorded before any prohibited user-facing pause when the Agent can identify the intent

If the Agent can identify that it is about to initiate a user-facing pause, question, progress report, partial delivery, acknowledgement, idle report, continuation request, or other prohibited surfacing during a non-terminal `stop: no` phase, it SHALL abort that framework-initiated path, record `surfacing_intent` when the accepted diagnostic surface is available, and follow the silent execution contract instead.

`surfacing_intent` remains diagnostic only and SHALL NOT authorize user-facing output, phase handoff, HITL interaction, final delivery, or status transition. A normal answer to a user-initiated conversation turn already received SHALL NOT be classified or recorded as prohibited surfacing solely because `stop: no` is active. The Engine SHALL NOT inspect conversation state to make this distinction; Agent-facing guidance applies the direction-aware contract.

#### Scenario: Surfacing intent does not authorize surfacing
- **WHEN** the Agent is in a non-terminal `stop: no` phase and intends on its own to ask whether to continue, present partial findings, acknowledge progress, or wait for user input
- **THEN** it SHALL abort that user-facing path
- **AND** it SHALL record `surfacing_intent` when the accepted diagnostic command is available
- **AND** it SHALL follow repair, strategy change, legal degraded handoff, continuation, or silent hold

#### Scenario: User-initiated reply is not prohibited surfacing intent
- **WHEN** a normal user message is already the current conversation turn during a non-terminal `stop: no` phase
- **THEN** the Agent SHALL answer under SWE-004
- **AND** it SHALL NOT record `surfacing_intent` solely because it answered that user-initiated turn
- **AND** the answer SHALL NOT create lifecycle, permission, mutation, pause, or routing authority

### Requirement: Stop:no delegated phases SHALL actively poll work-unit readiness after background spawn

During non-terminal `stop: no` phases with delegated work units in flight, the Phase Agent SHALL actively poll runtime work-unit surfaces after spawning background Sub-agents. It SHALL NOT wait for user continuation, background task notification, unrelated workflow state, chat context changes, or a user acknowledgement when bundle-root work-unit files can be inspected.

Successful work-unit claim output SHALL include a short static continuation cue with `next_action: inspect_and_poll_claimed_work`. The cue SHALL not infer readiness or complete work; it only puts the existing polling obligation at the immediate post-claim decision point. Because claim does not read the lifecycle node/frontmatter `stop`, it SHALL omit `interaction`; the loaded stop:no phase/header remains the direct authority that prohibits framework-initiated surfacing while polling.

The polling loop SHALL inspect result, receipt, output, cache, status, and deadline signals; submit ready attempts; repair or explicitly terminalize rejected attempts; and reconstruct in-flight work from bundle truth after context loss.

#### Scenario: completed background work is submitted without user nudge

- **WHEN** bundle-root work-unit files show a claimed attempt is ready
- **THEN** the Phase Agent SHALL submit it without waiting for the user or notification

#### Scenario: claim output points directly to polling

- **WHEN** one or more work units are successfully claimed in a stop:no phase
- **THEN** `next_action` SHALL direct immediate inspect/poll of the claimed work units
- **AND** claim output SHALL omit `interaction` rather than duplicate the loaded lifecycle phase's placement truth
- **AND** the cue SHALL NOT create an interaction authority or chat-state field

#### Scenario: task notification is not a continuation condition

- **WHEN** a Sub-agent notification has not appeared but work-unit files exist
- **THEN** the Phase Agent SHALL inspect runtime truth
- **AND** it SHALL NOT hold solely for notification

#### Scenario: rejected submit stays inside the silent loop

- **WHEN** active polling finds a result and submit rejects it
- **THEN** the Phase Agent SHALL repair the same attempt when possible or explicitly close it before replacement

#### Scenario: polling does not authorize surfacing

- **WHEN** no result is ready and deadlines have not expired
- **THEN** the Phase Agent SHALL continue polling or other eligible work
- **AND** it SHALL NOT initiate progress, idle, or continuation questions

### Requirement: Fatigue-path synthesis and completion claims SHALL consume lifecycle-integrity facts

At the fatigue threshold, before changing strategy, and before synthesizing any final-report content during a non-terminal `stop: no` phase, Agent-facing guidance SHALL direct the Agent to obtain and consume the current lifecycle-integrity verdict from the latest checkpoint output or the audit command. A verdict reporting `premature_final_present`, `plan_progress_tamper_suspected`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, or `failed_gate_downstream_status` SHALL route the Agent back to the named repair and never to synthesis. Reporting research completion to the user SHALL cite terminal lifecycle facts: terminal status plus an integrity `passed` verdict. A completion claim without that backing remains prohibited surfacing under the silent execution contract, whose contrary lifecycle facts are deterministically visible through the audit. The Engine SHALL NOT inspect conversation state to enforce the citation; Agent-facing guidance carries the duty, and static guidance validation SHALL check its presence. Legally reached terminal Final delivery remains governed by the existing delivery contract and is unaffected.

#### Scenario: Fatigue path consults integrity before synthesis

- **WHEN** a `stop: no` wave gate has failed at the fatigue threshold
- **THEN** guidance SHALL direct the Agent to consume the latest integrity verdict before any strategy change or content synthesis
- **AND** a verdict carrying a lifecycle drift outcome SHALL route to the named repair, not to final synthesis

#### Scenario: Completion claim requires terminal backing

- **WHEN** the Agent is about to report research completion to the user
- **THEN** guidance SHALL require citing terminal status plus an integrity `passed` verdict
- **AND** absent that backing the report SHALL NOT be made and the silent execution contract applies

#### Scenario: Static validation rejects unbacked completion guidance

- **WHEN** static validation scans silent-execution and delivery guidance
- **THEN** it SHALL find the integrity-consumption duty and the terminal-fact citation requirement
- **AND** it SHALL NOT find guidance that permits completion claims without terminal lifecycle facts

#### Scenario: Legal Final delivery is unaffected

- **WHEN** the lifecycle legally reached terminal Final with terminal status and an integrity `passed` verdict
- **THEN** existing delivery, publication, and feedback behavior SHALL remain unchanged
