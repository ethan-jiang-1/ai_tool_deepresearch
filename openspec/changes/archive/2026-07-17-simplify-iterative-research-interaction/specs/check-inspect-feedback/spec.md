> req: CHI-001

## MODIFIED Requirements

### Requirement: Feedback drives reflection and correction

The diagnostic from Inspect or a formal Gate SHALL be returned to the active Markdown Controller or LLM as structured feedback. Every formal Gate Controller SHALL inspect top-level `hints[]`, including `repair_kind`, before using compatible `inspect[]` or `advice[]` prose. A hint SHALL remain a read-only projection of the Engine's direct finding; it SHALL NOT create permission, state authority, a new route, or an automatic mutation.

When a primary hint has `repair_kind: agent_action|engine_operation`, names an authorized mutable surface or existing legal Engine operation, and requires no new semantic/risk decision, the Agent SHALL perform that mechanical action and rerun the exact checkpoint named by `rerun`. The Controller SHALL NOT ask the user to execute ordinary pipeline commands or reconstruct `repair_kind`/`write_to` from error text, `rule.target`, or source inspection.

`repair_kind` SHALL determine action responsibility, not interaction timing. The three non-mechanical kinds SHALL retain distinct modalities rather than being collapsed into one generic escalation:

- `user_decision` identifies the smallest semantic/risk/permission decision. HITL1 or HITL2 MAY ask only for that decision and wait for it when the current accepted HITL boundary owns it;
- `external_action` identifies only the genuinely non-delegable external prerequisite. HITL1 or HITL2 MAY request that action when the current accepted HITL boundary permits it, and legal mechanics SHALL return to the Agent after the prerequisite is satisfied; and
- `missing_contract` states the exact unavailable capability or owner boundary. It SHALL NOT be phrased as a user decision, approval or acknowledgement request, and the Controller SHALL NOT wait for a user response as though one could satisfy the absent contract.

HITL1 and HITL2 SHALL remain the only lifecycle surfaces that authorize those framework-initiated requests and waits. During a non-terminal `stop: no` phase, any of the three hints SHALL remain the smallest honest Agent-facing boundary but SHALL NOT by itself authorize a question, approval request, status/progress/partial-delivery output, or waiting for user acknowledgement; the Agent SHALL continue any other legal same-check repair, degradation or handoff, or hold silently at the current checkpoint.

To keep one feedback truth usable at every lifecycle placement, Inspect/Gate producer-supplied `repair` and action-bearing `advice[]` for those three kinds SHALL identify the smallest boundary and its existing owner or unavailable contract, but SHALL NOT command immediate user contact, HITL reentry, approval, surfacing, or acknowledgement wait. The structured `rerun` coordinate remains the single exact checkpoint instruction; compatibility prose SHALL NOT duplicate a competing command or contradict it. The producer SHALL NOT suppress or relabel a direct finding merely to obtain a different interaction placement, and SHALL NOT inspect conversation state to choose wording. If direct facts and an accepted contract instead show that the producer assigned the wrong action owner, it SHALL correct the finding to the existing mechanical owner rather than preserve a false human escalation.

When a relevant user-initiated normal conversation turn is already current, the Agent SHALL answer from direct facts and, if the requested action reaches an unavailable path, state only that boundary. The answer SHALL NOT create decision, permission, mutation/reentry, pause, or routing authority. After a decision or external prerequisite is satisfied through an accepted surface, legal mechanical execution SHALL return to the Agent. Corrected state SHALL re-enter the same Check/Gate unless an accepted contract explicitly names another checkpoint.

#### Scenario: Controller executes an authorized Gate repair

- **WHEN** a formal Gate fails with one hint whose `repair_kind` is `agent_action` or `engine_operation` and whose `write_to` names the corresponding authorized surface or operation
- **THEN** the active Markdown Controller SHALL have the Agent perform that repair and invoke the exact `rerun` command
- **AND** it SHALL NOT ask the user to run the command or infer a different repair path from generic advice

#### Scenario: User receives only the semantic decision boundary

- **WHEN** a HITL1 or HITL2 Gate hint has `repair_kind: user_decision` and identifies a missing recorded human decision rather than a mechanical artifact repair
- **THEN** the Controller SHALL ask only for that decision
- **AND** after the decision is recorded, the Agent SHALL resume the legal Gate workflow

#### Scenario: Missing contract is stated rather than asked

- **WHEN** a HITL1 or HITL2 Gate hint has `repair_kind: missing_contract`
- **THEN** the Controller SHALL state the exact unavailable capability or owner boundary
- **AND** it SHALL NOT ask the user to approve, acknowledge or confirm the missing capability as though a response could create it
- **AND** it SHALL NOT wait for acknowledgement before preserving that boundary

#### Scenario: Stop:no feedback does not initiate interaction

- **WHEN** a non-terminal `stop: no` Gate or Inspect result has `repair_kind: user_decision`, `external_action`, or `missing_contract`
- **THEN** the Controller SHALL retain the smallest boundary in Agent-facing feedback without initiating a user question, approval request, status output, or acknowledgement wait from that hint alone
- **AND** a relevant user-initiated normal conversation turn SHALL be answered from direct facts and, if it reaches an unavailable path, only the smallest boundary, without changing current checkpoint or lifecycle authority

#### Scenario: Hint consumption does not create authority

- **WHEN** a hint has `repair_kind: engine_operation` and names a status, trace, ledger, receipt, hash or queue blocker
- **THEN** the Controller SHALL invoke the accepted Engine-owned operation or report `missing_contract`
- **AND** it SHALL NOT directly edit deterministic authority because the hint exists

#### Scenario: Existing mechanical owner is not escalated as a new decision

- **WHEN** a finding reports a missing derived value whose semantic input is already recorded and whose accepted Engine operation can regenerate it
- **THEN** the producer SHALL identify that existing operation as `engine_operation`
- **AND** it SHALL NOT preserve or invent `user_decision` solely because the failure occurs in a later phase

#### Scenario: Feedback loop corrects and passes

- **WHEN** Check fails, Inspect generates diagnostic, and repair uses it to fix state
- **THEN** the corrected state passes Check on re-validation
