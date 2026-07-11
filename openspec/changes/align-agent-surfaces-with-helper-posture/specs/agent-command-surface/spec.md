> req: ACS-001

## MODIFIED Requirements

### Requirement: Command surfaces declare Agent-facing audience

Framework command surfaces SHALL state that framework commands are invoked by the Phase Agent or another Agent actor, not by a human or operator co-runner during the autonomous pipeline.

`Agent-facing` SHALL mean that, when the user's goal, current permissions, accepted contracts, and a legal command path already determine the action, the Agent executes ordinary commands and reversible mechanical repair itself. Command surfaces SHALL NOT turn a deterministic failure into instructions for the human to run ordinary pipeline commands, edit runtime authority, or carry out the remaining mechanical steps.

When a deterministic prerequisite blocks the requested progress, Agent-facing guidance SHALL direct the Agent to report the direct blocker and the nearest legal action. It SHALL request a human decision only when progress requires a new semantic choice, a destructive or irreversible action, or an expansion of permission or authority, and any request SHALL use an existing accepted interaction boundary. If no such boundary is available, the Agent SHALL report the block instead of opening a new confirmation loop. After an allowed decision is supplied, the Agent SHALL execute the remaining authorized mechanical steps.

This helper-oriented execution posture SHALL NOT create a new interactive checkpoint, authorize a transition absent from accepted contracts, override an Engine verdict, silently change user intent, or fabricate evidence, receipt, trace, or runtime state.

The discoverable command index SHALL contain a top-level audience statement before command tables. The statement SHALL say:

- commands are Agent-facing;
- ordinary authorized command execution and reversible mechanical repair belong to the Agent rather than a human co-runner;
- a blocked Agent reports the direct prerequisite and nearest legal action, and requests human input only at the semantic, destructive/irreversible, or permission/authority boundary through an existing accepted interaction boundary;
- HITL1 and HITL2 are the only interactive in-run checkpoints, except for the one-time pre-pipeline trigger/entry selection that transfers control to the Agent;
- terminal non-interactive Final delivery is allowed after final artifacts exist, but Final is not an interactive decision checkpoint, progress report, confirmation loop, or post-delivery repair surface;
- post-final feedback, when supported by content-delivery specs, re-enters through HITL2 repair/rerun rather than through a Final-owned loop;
- non-terminal `stop: no` phases run autonomously and silently; and
- command docs are operating surfaces for the Agent, not instructions for a human to run pipeline commands mid-stream.

Agent-facing framework docs SHALL NOT use `Agent/operator` or equivalent slash wording as a command audience unless the same sentence explicitly narrows `operator` to post-run inspection or out-of-band maintenance, not pipeline execution.

#### Scenario: Command index declares Agent audience

- **WHEN** the Phase Agent reads `DPT_FRAMEWORK/COMMANDS.md`
- **THEN** it SHALL see a top-level audience statement before the first command table
- **AND** that statement SHALL identify commands as Agent-facing
- **AND** it SHALL assign ordinary authorized commands and reversible mechanical repair to the Agent
- **AND** it SHALL identify HITL1 and HITL2 as the only interactive in-run checkpoints
- **AND** it SHALL distinguish terminal non-interactive Final delivery from an interactive in-run checkpoint

#### Scenario: Agent handles a repairable deterministic blocker

- **WHEN** an ordinary pipeline command fails on a direct prerequisite and an accepted, authorized, reversible repair path exists
- **THEN** Agent-facing guidance SHALL direct the Agent to state the direct blocker and nearest legal action
- **AND** the Agent SHALL perform the repair and rerun the same checkpoint
- **AND** the guidance SHALL NOT tell the human to run the repair commands or edit runtime authority

#### Scenario: Human decision is limited to an actual boundary

- **WHEN** further progress requires a new semantic choice, a destructive or irreversible action, or an expansion of permission or authority
- **THEN** the Agent SHALL present the smallest decision needed from the human
- **AND** that request SHALL use an existing accepted interaction boundary
- **AND** if no such boundary is available, the Agent SHALL report the block rather than create a new confirmation loop
- **AND** the request SHALL NOT imply that user consent can bypass an accepted transition
- **AND** after the decision is supplied, the Agent SHALL execute the remaining authorized mechanical steps

#### Scenario: Helper posture preserves deterministic authority

- **WHEN** the requested progress has no legal path under accepted contracts or Engine feedback remains failed
- **THEN** the Agent SHALL report that boundary instead of inventing a transition or overriding the verdict
- **AND** it SHALL NOT fabricate evidence, receipt, trace, or runtime state

#### Scenario: Operator wording is not a co-runner audience

- **WHEN** static validation scans Agent-facing framework command docs
- **THEN** unqualified `Agent/operator` command-audience wording SHALL fail validation
- **AND** wording that mentions operator inspection SHALL be allowed only when it is clearly post-run or diagnostic, not pipeline execution
