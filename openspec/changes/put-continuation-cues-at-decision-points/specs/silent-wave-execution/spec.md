> req: SWE-001, SWE-006

## MODIFIED Requirements

### Requirement: Silent wave execution contract

During a non-terminal lifecycle `stop: no` phase, repeated gate failure, gate pass, local completion, scope pressure, or fatigue SHALL NOT authorize user-facing surfacing, progress reporting, partial delivery, waiting for unrelated background workflows, or skipping required lifecycle phases.

At Agent decision points, deterministic checkpoint output SHALL expose a short continuation cue derived from the current node `stop` contract and direct checkpoint outcome. For stop:no gate results:

- pass with non-null `check.next` SHALL state `interaction: prohibited` and `next_action: consume_check_next`;
- fail SHALL state `interaction: prohibited` and `next_action: repair_and_rerun_gate`;
- the cue SHALL not authorize routing, status mutation, completion, degraded handoff, or root-cause classification beyond the existing gate result.

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
