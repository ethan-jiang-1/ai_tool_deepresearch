> req: ACS-001, ACS-003

## MODIFIED Requirements

### Requirement: Command surfaces declare Agent-facing audience

Framework command surfaces SHALL state that framework commands are invoked by the Phase Agent or another Agent actor, not by a human or operator co-runner during the autonomous pipeline.

Within the autonomous pipeline, `Agent-facing` SHALL mean that when the user's recorded goal, current permissions, accepted contracts, and a legal command path already determine an ordinary action, the Agent executes the command and any reversible mechanical repair itself. Command surfaces SHALL NOT turn a repairable deterministic failure into instructions for the human to run ordinary pipeline commands, edit runtime authority, or carry out the remaining mechanical steps.

When a direct prerequisite blocks progress, Agent-facing guidance SHALL direct the Agent to report the smallest blocker and nearest legal action. If an accepted, authorized, reversible repair path already exists, the Agent SHALL perform it and rerun the same checkpoint. If no legal path exists, the Agent SHALL report that boundary instead of inventing a transition, writing authority by hand, or creating an Engine-invisible parallel work path.

`Autonomous` SHALL mean Agent-driven execution under the recorded goal, accepted contracts, and Engine feedback without a new human instruction. `Human-directed` SHALL mean an explicit human semantic decision, correction, or maintenance/debug instruction. HITL1 and HITL2 SHALL remain the only interactive in-run checkpoints that receive human-directed decisions. A separate human-directed maintenance, recovery, or debug conversation SHALL be described as out-of-band, not as an additional lifecycle checkpoint or a Final-owned repair loop. Command docs MAY distinguish that context, but SHALL NOT claim that arbitrary state mutation, override, or reentry is available unless an accepted capability provides the Engine path and audit contract.

The helper-oriented execution posture SHALL NOT override an Engine verdict, silently change user intent, expand permission, or fabricate evidence, receipt, trace, or runtime state.

`Human-directed` SHALL describe the source of a decision or authorization, not transfer ordinary command execution back to the human. A human statement SHALL NOT by itself expand host permission, override an Engine verdict, or create a missing capability. For action responsibility, an accepted human-directed decision means the relevant contract-required decision/confirmation has been explicitly provided or recorded, current host permissions allow the action, and an existing legal Engine path supports it.

When such a decision authorizes a destructive or irreversible action, the Agent SHALL execute the remaining authorized mechanical steps. If host policy requires a non-delegable human action, guidance SHALL request only that action and SHALL resume Agent execution afterward.

The discoverable command index SHALL contain a top-level audience statement before command tables. The statement SHALL say:

- commands are Agent-facing;
- ordinary authorized command execution and reversible mechanical repair belong to the Agent rather than a human co-runner;
- a blocked Agent reports the direct prerequisite and nearest legal action, executes an existing legal repair path itself, and does not create ad-hoc authority when no path exists;
- HITL1 and HITL2 are the only interactive in-run checkpoints, except for the one-time pre-pipeline trigger/entry selection that transfers control to the Agent;
- human-directed decisions at HITL1/HITL2 are distinct from autonomous execution, while out-of-band maintenance/debug is distinct from both an in-run checkpoint and an accepted mutation/reentry capability;
- human-directed identifies who decided, while ordinary command execution remains assigned to the Agent except for a host-required non-delegable human action;
- a human request does not by itself expand host permission, override an Engine verdict, or create a missing mutation/reentry capability;
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
- **AND** it SHALL distinguish autonomous execution from human-directed decisions at HITL1/HITL2
- **AND** it SHALL distinguish out-of-band maintenance/debug collaboration from an additional lifecycle checkpoint
- **AND** it SHALL distinguish terminal non-interactive Final delivery from an interactive in-run checkpoint

#### Scenario: Agent handles a repairable deterministic blocker

- **WHEN** an ordinary pipeline command fails on a direct prerequisite and an accepted, authorized, reversible repair path exists
- **THEN** Agent-facing guidance SHALL direct the Agent to state the direct blocker and nearest legal action
- **AND** the Agent SHALL perform the repair and rerun the same checkpoint
- **AND** the guidance SHALL NOT tell the human to run the repair commands or edit runtime authority

#### Scenario: Missing legal path does not create ad-hoc authority

- **WHEN** requested progress has no legal path under accepted contracts or Engine feedback remains failed
- **THEN** the Agent SHALL report the missing contract or failed boundary
- **AND** it SHALL NOT invent a transition, hand-write authority, or create an Engine-invisible parallel work path

#### Scenario: Autonomous and human-directed authority remain distinct

- **WHEN** command docs describe autonomous execution, a HITL decision, or explicit human maintenance, recovery, or debug collaboration
- **THEN** they SHALL distinguish Agent-driven autonomous action from a human-directed decision
- **AND** they SHALL identify HITL1/HITL2 as the only in-run placements for human-directed interaction
- **AND** they SHALL distinguish out-of-band maintenance/debug from an additional lifecycle checkpoint
- **AND** they SHALL NOT describe it as a Final-owned repair loop
- **AND** they SHALL NOT claim arbitrary override, mutation, or reentry exists without an accepted Engine contract

#### Scenario: Human decision returns execution to the Agent

- **WHEN** the required human decision/confirmation is explicit or recorded, current host permission allows the action, and an existing legal Engine path supports it
- **THEN** the Agent SHALL execute the remaining authorized mechanical steps
- **AND** guidance SHALL NOT turn the human into the ordinary command runner
- **AND** if host policy requires one non-delegable human action, guidance SHALL request only that action and resume Agent execution afterward

#### Scenario: Human direction does not create authority by itself

- **WHEN** a human requests a mutation or reentry that has no accepted Engine path or exceeds current host permission
- **THEN** the Agent SHALL explain the missing permission or capability boundary
- **AND** it SHALL NOT treat the request alone as authority to hand-write runtime state or bypass the Engine verdict

#### Scenario: Operator wording is not a co-runner audience

- **WHEN** static validation scans Agent-facing framework command docs
- **THEN** unqualified `Agent/operator` command-audience wording SHALL fail validation
- **AND** wording that mentions operator inspection SHALL be allowed only when it is clearly post-run or diagnostic, not pipeline execution

### Requirement: Command-surface wording drift is statically validated

The project SHALL include regression coverage or a static validator that checks Agent-facing command surfaces for the command audience and HITL-boundary contract.

The validator SHALL scan at least:

- `DPT_FRAMEWORK/COMMANDS.md`
- `DPT_FRAMEWORK/RUN.md`
- `DPT_FRAMEWORK/README.md`
- `DPT_FRAMEWORK/cli/README.md`
- `DPT_FRAMEWORK/command_playbook/*.md`
- lifecycle and shared workflow Markdown touched by this change

For `DPT_FRAMEWORK/COMMANDS.md`, it SHALL verify required positive markers for Agent-facing audience, Agent-owned ordinary authorized execution and repair, human-directed decision source without human command-runner transfer, human direction not creating host permission or missing capability, autonomous versus human-directed authority, HITL1/HITL2 as the only in-run placements for human-directed interaction, out-of-band maintenance/debug as non-lifecycle collaboration, terminal non-interactive Final delivery, post-final HITL2 repair/rerun routing, one-time trigger framing, and no mid-pipeline progress/confirmation framing. Across all scanned surfaces, it SHALL reject known drift phrases unless allowlisted with an explicit diagnostic/post-run meaning. The positive-marker contract SHALL NOT require every command playbook to repeat the top-level audience statement.

Allowlist entries SHALL be explicit and reviewable: file or glob, phrase class, allowed context, and reason. Operator wording MAY be allowlisted only for post-run diagnostics, maintenance, or out-of-band review, never for command co-runner audience during autonomous lifecycle execution.

The validator SHALL reuse the existing command-contract documentation regression surface, remain deterministic, and use Node.js built-ins only. It SHALL NOT add a prose-quality classifier or attempt to judge wording beyond the defined phrase classes and required stable markers.

#### Scenario: Static validation catches implicit human presence

- **WHEN** an Agent-facing command doc says a user/operator should run a pipeline command or decide whether to continue during a non-HITL phase
- **THEN** the static validation SHALL fail
- **AND** the failure SHALL name the file and phrase class

#### Scenario: Static validation requires helper-oriented audience markers

- **WHEN** `DPT_FRAMEWORK/COMMANDS.md` omits Agent-owned ordinary execution, human-directed decision-source semantics, the no-permission/no-capability-by-request boundary, autonomous/human-directed authority distinction, or HITL/out-of-band placement distinction
- **THEN** the existing command-contract documentation regression SHALL fail
- **AND** the failure SHALL name the missing stable marker
- **AND** individual command playbooks SHALL NOT be required to duplicate the full top-level audience statement

#### Scenario: Static validation accepts diagnostic operator inspection

- **WHEN** a framework doc mentions operator inspection as post-run or diagnostic review
- **THEN** static validation SHALL NOT fail solely for that phrase
- **AND** the wording SHALL NOT describe the operator as a command co-runner during the autonomous pipeline
