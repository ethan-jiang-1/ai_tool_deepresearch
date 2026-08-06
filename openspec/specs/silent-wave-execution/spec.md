# silent-wave-execution

> req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005, SWE-006

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
