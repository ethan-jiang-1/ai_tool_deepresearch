## ADDED Requirements

> req: ACS-001, ACS-002, ACS-003, ACS-004

### Requirement: Command surfaces declare Agent-facing audience

Framework command surfaces SHALL state that framework commands are invoked by the Phase Agent or another Agent actor, not by a human or operator co-runner during the autonomous pipeline.

The discoverable command index SHALL contain a top-level audience statement before command tables. The statement SHALL say:

- commands are Agent-facing;
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
- **AND** it SHALL identify HITL1 and HITL2 as the only interactive in-run checkpoints
- **AND** it SHALL distinguish terminal non-interactive Final delivery from an interactive in-run checkpoint

#### Scenario: Operator wording is not a co-runner audience

- **WHEN** static validation scans Agent-facing framework command docs
- **THEN** unqualified `Agent/operator` command-audience wording SHALL fail validation
- **AND** wording that mentions operator inspection SHALL be allowed only when it is clearly post-run or diagnostic, not pipeline execution

### Requirement: Entry docs distinguish trigger from command execution

The framework entry docs SHALL distinguish the human's one-time trigger action from the subsequent Agent-run command execution.

Dragging or pasting `RUN.md` into a conversation SHALL be framed as selecting the DPT_FRAMEWORK entry path and handing control to the Agent. It SHALL NOT imply that a human remains present to choose commands, run commands, answer mid-pipeline confirmations, receive progress updates, or decide whether partial output is enough.

Any pre-pipeline clarification outside HITL1/HITL2 SHALL be explicitly labeled as a pre-pipeline routing exception and SHALL NOT appear inside `stop: no` lifecycle phase instructions. If the entry path has already been selected by reading `RUN.md`, the default instruction SHALL be to proceed with the framework, not to ask whether to use it.

Bundle naming instructions SHALL frame naming as an Agent-derived or already-supplied command input. They SHALL NOT imply that the user must provide a bundle name during autonomous execution.

#### Scenario: Drag trigger hands control to the Agent

- **WHEN** the Agent reads `DPT_FRAMEWORK/RUN.md` or `DPT_FRAMEWORK/README.md`
- **THEN** drag-trigger wording SHALL identify the action as selecting the DPT_FRAMEWORK entry path
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT imply mid-pipeline human command execution

#### Scenario: Pre-pipeline question is explicit or absent

- **WHEN** static validation scans `DPT_FRAMEWORK/RUN.md`
- **THEN** any instruction to ask the user before starting SHALL be either absent after DPT_FRAMEWORK entry selection or explicitly labeled as pre-pipeline routing outside the autonomous lifecycle
- **AND** it SHALL NOT weaken the HITL1/HITL2-only interactive in-run boundary

#### Scenario: Bundle name is not a mid-pipeline user dependency

- **WHEN** the Agent reads `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md`
- **THEN** naming instructions SHALL describe an Agent-derived or already-provided `<name>` input
- **AND** they SHALL NOT require the user to provide a bundle name during autonomous execution

### Requirement: Command-surface wording drift is statically validated

The project SHALL include regression coverage or a static validator that checks Agent-facing command surfaces for the command audience and HITL-boundary contract.

The validator SHALL scan at least:

- `DPT_FRAMEWORK/COMMANDS.md`
- `DPT_FRAMEWORK/RUN.md`
- `DPT_FRAMEWORK/README.md`
- `DPT_FRAMEWORK/cli/README.md`
- `DPT_FRAMEWORK/command_playbook/*.md`
- lifecycle and shared workflow Markdown touched by this change

It SHALL verify required positive markers for Agent-facing audience, HITL1/HITL2-only interactive in-run checkpoints, terminal non-interactive Final delivery, post-final HITL2 repair/rerun routing, one-time trigger framing, and no mid-pipeline progress/confirmation framing. It SHALL also reject known drift phrases unless allowlisted with an explicit diagnostic/post-run meaning.

Allowlist entries SHALL be explicit and reviewable: file or glob, phrase class, allowed context, and reason. Operator wording MAY be allowlisted only for post-run diagnostics, maintenance, or out-of-band review, never for command co-runner audience during autonomous lifecycle execution.

The validator SHALL be deterministic and use Node.js built-ins only. It SHALL NOT attempt to judge prose quality beyond the defined phrase classes and required markers.

#### Scenario: Static validation catches implicit human presence

- **WHEN** an Agent-facing command doc says a user/operator should run a pipeline command or decide whether to continue during a non-HITL phase
- **THEN** the static validation SHALL fail
- **AND** the failure SHALL name the file and phrase class

#### Scenario: Static validation accepts diagnostic operator inspection

- **WHEN** a framework doc mentions operator inspection as post-run or diagnostic review
- **THEN** static validation SHALL NOT fail solely for that phrase
- **AND** the wording SHALL NOT describe the operator as a command co-runner during the autonomous pipeline

### Requirement: Phase-boundary terminology is discoverable

Guidance and Agent-facing docs SHALL make the conceptual distinction between phase transition, phase handoff, work completion, and witnessing discoverable without renaming existing machine-level fields, trace events, or CLI names.

The terminology canon SHALL define:

- `phase transition`: synchronization of runtime status such as `rb_status.json` current/next gate state;
- `phase handoff`: the Phase Agent consuming gate CLI `check.next` through the accepted loader/check path and entering the next Markdown control surface;
- `work completion`: target-phase artifacts and gate/content rules proving the target phase's work is done; and
- `witnessing`: Engine-written evidence that binds a deterministic gate output to the subsequent handoff, such as the ordered `gate_attempt(passed=true,next=<target>)` and route-bound `load_complete(entry=<target>)` pair.

The docs SHALL state that `enter-phase` / `load_complete` proves entry into the target node, not target-phase work completion. Existing machine names such as `phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `stop: no`, and capability names SHALL remain stable unless a separate migration changes them.

#### Scenario: Terminology canon names the boundary layers

- **WHEN** an Agent or maintainer reads the guidance glossary or execution-model terminology canon
- **THEN** it SHALL distinguish phase transition, phase handoff, work completion, and witnessing
- **AND** it SHALL preserve existing machine-level names as stable implementation vocabulary

#### Scenario: Command docs do not overclaim handoff witness

- **WHEN** command docs describe `enter-phase`
- **THEN** they SHALL describe it as consuming `check.next` and witnessing entry/loading of the next control surface
- **AND** they SHALL NOT describe it as completing the target phase's work
