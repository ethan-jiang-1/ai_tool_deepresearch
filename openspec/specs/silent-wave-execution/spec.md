# silent-wave-execution

> req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005, SWE-006

## Purpose

Silent Wave Execution 定义了 Agent 在用户缺席（静默自主阶段）时的行为契约——在 wave0/1/2 执行期间完全自主、不浮出水面、遇错按降级优先级链自行处理、将 escalation 改写为降级并完整 trace、到达合法浮出水面点（HITL2）时汇总报告静默期积累的降级。

## Requirements

### Requirement: Silent wave execution contract

During a non-terminal lifecycle `stop: no` phase, repeated gate failure, gate pass, local completion, scope pressure, or fatigue SHALL NOT authorize user-facing surfacing, progress reporting, partial delivery, waiting for unrelated background workflows, or skipping required lifecycle phases.

At Agent decision points, deterministic checkpoint output SHALL expose a short continuation cue derived from the current node `stop` contract and direct checkpoint outcome. For stop:no gate results:

- pass with non-null `check.next` SHALL state `interaction: prohibited` and `next_action: consume_check_next`;
- fail SHALL state `interaction: prohibited` and `next_action: repair_and_rerun_gate`;
- the cue SHALL not authorize routing, status mutation, completion, degraded handoff, or root-cause classification beyond the existing gate result.

When emitted in gate JSON, the cue SHALL be a top-level `continuation` object with required `interaction` and `next_action` fields and direct locator fields such as `node_ref` and `gate`. It SHALL NOT be nested inside `check` or `routing`, and SHALL NOT include confidence, policy decisions, retry trees, context estimates, or alternate route choices.

The cue SHALL read only direct outcome and node-frontmatter facts; it SHALL NOT derive a second verdict from `failed_rule_ids`, `masked_rule_ids`, inspect classifications, chat state, token pressure, or Agent intent. Stop:yes gate failures, including HITL capability failures, SHALL NOT be converted into autonomous stop:no continuation cues.

The silent execution priority chain remains repair, strategy change, legal degraded handoff, consume clean/degraded `check.next`, or silent hold. `surfacing_intent` remains diagnostic only.

#### Scenario: stop:no gate failure returns repair cue

- **WHEN** a stop:no gate fails
- **THEN** gate output SHALL say user interaction is prohibited
- **AND** the immediate next action SHALL be repair the named root cause and rerun the same gate

#### Scenario: stop:yes gate failure does not receive autonomous cue

- **WHEN** a stop:yes gate fails, including a missing or unavailable research-access observation
- **THEN** gate output SHALL NOT state `interaction: prohibited`
- **AND** it SHALL preserve the existing user/HITL repair boundary

#### Scenario: stop:no gate pass returns continuation cue

- **WHEN** a stop:no gate passes with non-null `check.next`
- **THEN** gate output SHALL say user interaction is prohibited
- **AND** the immediate next action SHALL be consume `check.next` through the accepted handoff path

#### Scenario: no legal route means silent hold

- **WHEN** a gate remains blocked by runtime-truth failures and no degraded route is legal
- **THEN** the Agent SHALL NOT write final artifacts or ask the user for a decision
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

### Requirement: Stop:no delegated phases SHALL actively poll work-unit readiness after background spawn

During non-terminal `stop: no` phases with delegated work units in flight, the Phase Agent SHALL actively poll runtime work-unit surfaces after spawning background Sub-agents. It SHALL NOT wait for user continuation, background task notification, unrelated workflow state, or chat context changes when bundle-root work-unit files can be inspected.

Successful work-unit claim output SHALL include a short static continuation cue with `interaction: prohibited` and `next_action: inspect_and_poll_claimed_work`. The cue SHALL not infer readiness or complete work; it only puts the existing polling obligation at the immediate post-claim decision point.

The polling loop SHALL inspect result, receipt, output, cache, status, and deadline signals; submit ready attempts; repair or explicitly terminalize rejected attempts; and reconstruct in-flight work from bundle truth after context loss.

#### Scenario: completed background work is submitted without user nudge

- **WHEN** bundle-root work-unit files show a claimed attempt is ready
- **THEN** the Phase Agent SHALL submit it without waiting for the user or notification

#### Scenario: claim output points directly to polling

- **WHEN** one or more work units are successfully claimed in a stop:no phase
- **THEN** claim output SHALL state that user interaction is prohibited
- **AND** `next_action` SHALL direct immediate inspect/poll of the claimed work units

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
- **AND** it SHALL NOT send progress, idle, or continuation questions
