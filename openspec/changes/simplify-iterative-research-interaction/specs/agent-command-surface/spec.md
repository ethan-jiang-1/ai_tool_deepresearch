> req: ACS-001

## MODIFIED Requirements

### Requirement: Command surfaces declare Agent-facing audience

Framework command surfaces SHALL state that framework commands are invoked by the Phase Agent or another Agent actor, not by a human or operator co-runner during the autonomous pipeline.

Within the autonomous pipeline, `Agent-facing` SHALL mean that when the user's recorded goal, current permissions, accepted contracts, and a legal command path already determine an ordinary action, the Agent executes the command and any reversible mechanical repair itself. Command surfaces SHALL NOT turn a repairable deterministic failure into instructions for the human to run ordinary pipeline commands, edit runtime authority, or carry out the remaining mechanical steps.

When a direct prerequisite blocks progress, Agent-facing guidance SHALL preserve the smallest blocker and nearest legal action for the Agent. If an accepted, authorized, reversible repair path already exists, the Agent SHALL perform it and rerun the same checkpoint. If no legal path exists, the Agent SHALL retain that boundary instead of inventing a transition, writing authority by hand, or creating an Engine-invisible parallel work path. Whether the boundary is expressed to the user SHALL obey the current lifecycle `stop` contract: HITL1/HITL2 MAY initiate the smallest authorized request; a non-terminal `stop: no` phase SHALL NOT initiate user-facing output from the blocker alone; an already-current relevant user-initiated turn SHALL be answered from direct facts and may include the smallest reached boundary without creating authority.

`Autonomous` SHALL mean Agent-driven execution under the recorded goal, accepted contracts, and Engine feedback without requiring a new human instruction. `Human-directed` SHALL mean that a semantic decision, correction, or maintenance/debug instruction originated from the human; it SHALL NOT itself be a lifecycle mode or permission token. HITL1 and HITL2 SHALL remain the only framework-initiated interactive in-run checkpoints where the framework invites and waits for a human semantic decision. Final SHALL remain terminal delivery rather than a third decision checkpoint.

A user MAY voluntarily initiate a normal conversation turn while a non-HITL phase is active, including active Final, and the Agent SHALL answer that turn rather than ignore it. Command docs SHALL distinguish this response from framework-initiated surfacing: the response SHALL NOT create a checkpoint, change `stop`, pause the run, persist arbitrary mid-run intent, authorize mutation/reentry, or expand host permission. If the requested action has no legal path at the current position, the Agent SHALL answer with the smallest missing-path boundary. The current node/status/authority and the applicable autonomous-continuation or terminal-delivery obligation SHALL remain unchanged absent an accepted path that actually changes them. Final-specific replies SHALL obey CDP-004: they do not create a Final question, progress, confirmation or repair loop, and only an explicit accepted post-final rerun may use the audited recovery path. A separate human-directed maintenance, recovery, or debug conversation SHALL remain out-of-band, not an additional lifecycle checkpoint or Final-owned repair loop. Command docs MAY distinguish that context, but SHALL NOT claim arbitrary state mutation, override, or reentry unless an accepted capability provides the Engine path and audit contract.

The helper-oriented execution posture SHALL NOT override an Engine verdict, silently change user intent, expand permission, or fabricate evidence, receipt, trace, or runtime state.

`Human-directed` SHALL describe the source of a decision or authorization, not transfer ordinary command execution back to the human. A human statement SHALL NOT by itself expand host permission, override an Engine verdict, or create a missing capability. For action responsibility, an accepted human-directed decision means the relevant contract-required decision/confirmation has been explicitly provided or recorded at an accepted owner/placement, current host permissions allow the action, and an existing legal Engine path supports it.

For the accepted post-final rerun path, the user-owned boundary SHALL be limited to the new rerun semantics/risk decision and any host-policy approval that cannot be delegated. The request file SHALL carry the decided reason/scope and expected Final lineage but SHALL NOT be described as verified identity, permission token or `human-directed` override flag. After that boundary, the Agent SHALL prepare/retain the request, run post-final recovery inspect/apply/recover, consume the legal rerun handoff through `enter-phase`, synchronize it through existing `advance-status --to hitl2_recorded`, run reentry/topic-state checks and continue the existing pipeline.

Before HITL2 recommends rerun as executable or records a clear rerun request, the Agent SHALL compare the current profile `rerun_count`, including the increment owned by `phase-rerun.md`, with the exact supported active `rerun_count_limit` rule returned by the phase-owned read-only ESM import of existing `loadGateDefinition('rerun-ready')`. The phase SHALL fail closed unless the loader-returned definition has the expected gate identity and exactly one expected rule identity/check/target with `less_than`, a positive-integer value, and an absent=>zero or nonnegative-integer current count. This decision-point availability check SHALL read the existing direct authorities, SHALL NOT raw-parse the definition, use `failure_message`, copy a numeric limit, write state/trace, or become a new wrapper, CLI, Gate, helper, verdict or persisted eligibility field; the existing rerun-ready Gate remains the formal legality authority.

If those direct facts show that another rerun cannot satisfy the active rule, the Agent SHALL NOT recommend or record an impossible rerun, invoke C5, reset the counter or enter a silent unpassable rerun. At HITL2 or in an already-current relevant user-initiated turn, the Agent SHALL express only the smallest new decision: whether to start a new bundle for the requested scope. If the active rule or current count cannot be read reliably, the Agent SHALL state that unavailable decision boundary rather than guess. A `stop: no` failure alone SHALL NOT initiate that request. If the user chooses the new-bundle path, ordinary bundle creation and execution return to the Agent.

When such a decision authorizes a destructive or irreversible action, the Agent SHALL execute the remaining authorized mechanical steps. If host policy requires a non-delegable human action, guidance SHALL identify only that action; it SHALL request it only at HITL1/HITL2 or in an already-current relevant user-initiated turn, and SHALL resume Agent execution afterward.

The discoverable command index SHALL contain a top-level audience statement before command tables. The statement SHALL say:

- commands are Agent-facing;
- ordinary authorized command execution and reversible mechanical repair belong to the Agent rather than a human co-runner;
- a blocked Agent retains the direct prerequisite and nearest legal action, executes an existing legal repair path itself, does not create ad-hoc authority when no path exists, and expresses the boundary to the user only when the current interaction placement authorizes it;
- HITL1 and HITL2 are the only framework-initiated points that invite and wait for a semantic decision; the one-time pre-pipeline trigger/entry selection is user-initiated and transfers control without another framework question;
- clear decisions at HITL1/HITL2 are distinct from autonomous execution, while a user-initiated normal conversation turn is answered without becoming a checkpoint, permission, pause state, durable intervention, or accepted mutation/reentry capability;
- human-directed identifies who decided, while ordinary command execution remains assigned to the Agent except for a host-required non-delegable human action;
- a human request does not by itself expand host permission, override an Engine verdict, or create a missing mutation/reentry capability;
- terminal Final delivery is allowed after final artifacts exist, but Final is not an interactive decision checkpoint, progress report, confirmation loop, or post-delivery repair surface;
- accepted post-final rerun records HITL2 rerun semantics through the narrow recovery operation, then returns entry/audit/rerun execution to the Agent rather than asking the human to co-run commands;
- unsupported post-final maintenance/debug remains a missing capability rather than becoming a generic override;
- non-terminal `stop: no` phases run autonomously and do not initiate user-facing surfacing; and
- command docs are operating surfaces for the Agent, not instructions for a human to run pipeline commands mid-stream.

Agent-facing framework docs SHALL NOT use `Agent/operator` or equivalent slash wording as a command audience unless the same sentence explicitly narrows `operator` to post-run inspection or out-of-band maintenance, not pipeline execution.

#### Scenario: Command index declares Agent audience

- **WHEN** the Phase Agent reads `DPT_FRAMEWORK/COMMANDS.md`
- **THEN** it SHALL see a top-level audience statement before the first command table
- **AND** that statement SHALL identify commands as Agent-facing
- **AND** it SHALL assign ordinary authorized commands and reversible mechanical repair to the Agent
- **AND** it SHALL identify HITL1 and HITL2 as the only framework-initiated in-run decision checkpoints
- **AND** it SHALL distinguish a user-initiated answerable conversation turn from another checkpoint or permission source
- **AND** it SHALL distinguish out-of-band maintenance/debug collaboration from an additional lifecycle checkpoint
- **AND** it SHALL distinguish terminal Final delivery from an interactive in-run checkpoint

#### Scenario: Agent handles a repairable deterministic blocker

- **WHEN** an ordinary pipeline command fails on a direct prerequisite and an accepted, authorized, reversible repair path exists
- **THEN** Agent-facing guidance SHALL identify the direct blocker and nearest legal action for the Agent
- **AND** the Agent SHALL perform the repair and rerun the same checkpoint
- **AND** the guidance SHALL NOT tell the human to run the repair commands or edit runtime authority

#### Scenario: Missing legal path does not create ad-hoc authority

- **WHEN** requested progress has no legal path under accepted contracts or Engine feedback remains failed
- **THEN** Agent-facing guidance SHALL retain the missing contract or failed boundary and obey the current lifecycle interaction placement before expressing it to the user
- **AND** it SHALL NOT invent a transition, hand-write authority, or create an Engine-invisible parallel work path

#### Scenario: Autonomous and human-directed authority remain distinct

- **WHEN** command docs describe autonomous execution, a HITL decision, a user-initiated conversation turn, or explicit human maintenance/recovery/debug collaboration
- **THEN** they SHALL distinguish Agent-driven autonomous action from a human-directed semantic decision
- **AND** they SHALL identify HITL1/HITL2 as the only framework-initiated in-run placements that wait for human decisions
- **AND** they SHALL allow a normal response to a user-initiated turn without naming it a third HITL
- **AND** they SHALL distinguish out-of-band maintenance/debug from an additional lifecycle checkpoint
- **AND** they SHALL NOT describe it as a Final-owned repair loop
- **AND** they SHALL NOT claim arbitrary override, mutation, or reentry exists without an accepted Engine contract

#### Scenario: User-initiated turn does not create command authority

- **WHEN** a user voluntarily sends a normal conversation message while a non-HITL phase, including active Final, is active
- **THEN** the Agent SHALL answer the message from current direct facts or state the smallest missing-path boundary
- **AND** command guidance SHALL NOT treat the message as permission to run a missing mutation/reentry path, edit authority, pause the lifecycle, or persist arbitrary intent
- **AND** absent an accepted task change/path, current node/status/authority and the applicable autonomous-continuation or terminal-delivery obligation SHALL remain unchanged

#### Scenario: Human decision returns execution to the Agent

- **WHEN** the required human decision/confirmation is explicit or recorded at an accepted owner, current host permission allows the action, and an existing legal Engine path supports it
- **THEN** the Agent SHALL execute the remaining authorized mechanical steps
- **AND** guidance SHALL NOT turn the human into the ordinary command runner
- **AND** if host policy requires one non-delegable human action, guidance SHALL identify only that action, request it only when the current interaction placement authorizes a user-facing request, and resume Agent execution afterward

#### Scenario: Post-final rerun decision returns the complete mechanical chain

- **WHEN** the user has initiated a post-final conversation and explicitly decided a rerun scope, and host permission allows the accepted operation
- **THEN** the Agent SHALL execute request preparation, inspect/apply/recover, phase entry, existing status sync, reentry/topic-state checks and the normal rerun pipeline
- **AND** SHALL ask the user only for a genuinely missing semantic/risk decision or host-required approval
- **AND** SHALL NOT ask the user to run framework commands or repeat the same rerun decision

#### Scenario: Human direction does not create authority by itself

- **WHEN** a human requests a mutation or reentry that has no accepted Engine path or exceeds current host permission
- **THEN** the Agent SHALL explain the missing permission or capability boundary
- **AND** it SHALL NOT treat the request alone as authority to hand-write runtime state or bypass the Engine verdict

#### Scenario: Request metadata is not an identity token

- **WHEN** a post-final request contains reason, scope or decision-source metadata
- **THEN** command guidance SHALL describe those fields as semantic/audit input and optimistic-concurrency binding
- **AND** SHALL NOT claim they cryptographically prove the human caller or expand host permission

#### Scenario: Exhausted rerun limit escalates one new decision

- **WHEN** the HITL2 decision-point check from current profile count plus the exact supported loader-returned active rule, or accepted post-final C5 inspect, proves the required next increment would fail the active rerun-count gate rule
- **THEN** at HITL2 or in an already-current relevant user-initiated turn, guidance SHALL ask only whether to start a new bundle for the requested scope
- **AND** a non-terminal `stop: no` failure alone SHALL NOT initiate that question
- **AND** guidance SHALL NOT recommend or record the known-impossible rerun first
- **AND** SHALL NOT ask the user to reset state or run commands
- **AND** after approval the Agent SHALL perform the new-bundle mechanical execution

#### Scenario: Operator wording is not a co-runner audience

- **WHEN** static validation scans Agent-facing framework command docs
- **THEN** unqualified `Agent/operator` command-audience wording SHALL fail validation
- **AND** wording that mentions operator inspection SHALL be allowed only when it is clearly post-run or diagnostic, not pipeline execution
