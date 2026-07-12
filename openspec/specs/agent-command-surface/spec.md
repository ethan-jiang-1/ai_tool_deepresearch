# Agent Command Surface

> req: ACS-001, ACS-002, ACS-003, ACS-004

## Purpose

Define the Agent-facing audience contract for framework command surfaces. Framework commands are invoked by the Phase Agent or another Agent actor, not by a human or operator co-runner during the autonomous pipeline. This capability establishes the discoverable command audience, entry-doc trigger semantics, static validation coverage, and phase-boundary terminology canon.

## Requirements

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

### Requirement: Entry docs distinguish trigger from command execution

The framework entry docs SHALL distinguish the human's one-time trigger action from the subsequent Agent-run command execution.

Before that trigger, root entry documentation SHALL expose a human-facing setup path that covers the existing Node/npm installation baseline, Coding Agent permission preparation for supported Claude Code and Codex surfaces, configuration verification, and the DPT_FRAMEWORK trigger. Permission preparation SHALL be framed as a pre-pipeline human decision with explicit risk and opt-in boundaries, not as a command that the Agent can grant to itself.

Human-facing permission setup SHALL remain outside `DPT_FRAMEWORK/command_playbook/`. Agent-facing `RUN.md` MAY name the setup prerequisite and its location, but after `RUN.md` selects the DPT_FRAMEWORK entry path it SHALL NOT ask the human to become a permission or command co-runner during a non-HITL lifecycle phase.

The setup path SHALL distinguish reviewed/interactive posture from explicitly opted-in autonomous research posture. It SHALL NOT copy ignored local permission history into a committed allowlist, silently expand committed project configuration, represent unrestricted/full-access permissions as risk-free defaults, or imply that `dry-submit` or a nonexistent gate `--non-interactive` flag grants host permissions.

Dragging or pasting `RUN.md` into a conversation SHALL be framed as selecting the DPT_FRAMEWORK entry path and handing control to the Agent. It SHALL NOT imply that a human remains present to choose commands, run commands, answer mid-pipeline confirmations, receive progress updates, or decide whether partial output is enough.

Any pre-pipeline clarification outside HITL1/HITL2 SHALL be explicitly labeled as a pre-pipeline routing exception and SHALL NOT appear inside `stop: no` lifecycle phase instructions. If the entry path has already been selected by reading `RUN.md`, the default instruction SHALL be to proceed with the framework, not to ask whether to use it.

Bundle naming instructions SHALL frame naming as an Agent-derived or already-supplied command input. They SHALL NOT imply that the user must provide a bundle name during autonomous execution.

#### Scenario: Human setup is discoverable before the trigger

- **WHEN** a human reads the root entry documentation before selecting DPT_FRAMEWORK
- **THEN** the documentation SHALL provide a discoverable setup path for installation and Coding Agent permissions
- **AND** it SHALL distinguish reviewed approval posture from any explicitly opted-in autonomous research posture
- **AND** it SHALL direct the human to complete and verify permission setup before the framework trigger
- **AND** it SHALL name the risk/opt-in boundary instead of promising prompt-free execution under every host or organization policy

#### Scenario: Permission setup does not create a human pipeline co-runner

- **WHEN** the Agent reads `DPT_FRAMEWORK/RUN.md` after entry selection
- **THEN** any permission prerequisite SHALL be described as pre-trigger setup
- **AND** the Agent SHALL NOT ask the human to approve ordinary lifecycle commands or reconfigure the host during non-HITL `stop: no` execution
- **AND** human-facing permission instructions SHALL NOT be placed in `DPT_FRAMEWORK/command_playbook/`

#### Scenario: Permission preflight does not overclaim validation tools

- **WHEN** a human reads the setup path before the trigger
- **THEN** `dry-submit` MAY be documented only as a work-unit submit contract preflight
- **AND** the docs SHALL NOT describe `dry-submit` as validating network, shell, file-write, approval-policy, or host permission readiness
- **AND** the docs SHALL NOT claim that a gate `--non-interactive` flag exists

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

For `DPT_FRAMEWORK/COMMANDS.md`, it SHALL keep the existing audience/HITL/Final/trigger markers and add only three stable helper-oriented marker groups:

- ordinary authorized command execution and reversible mechanical repair remain Agent-owned;
- human-directed identifies the decision source without transferring the command-runner role or creating host permission/Engine capability; and
- in-run HITL decisions are distinct from out-of-band maintenance/debug collaboration and from any accepted mutation/reentry capability.

Across all scanned surfaces, the validator SHALL continue to reject known drift phrases unless allowlisted with an explicit diagnostic/post-run meaning. The positive-marker contract SHALL NOT require every command playbook to repeat the top-level audience statement or encode every ACS-001 sentence as an exact substring assertion.

Allowlist entries SHALL be explicit and reviewable: file or glob, phrase class, allowed context, and reason. Operator wording MAY be allowlisted only for post-run diagnostics, maintenance, or out-of-band review, never for command co-runner audience during autonomous lifecycle execution.

The validator SHALL reuse the existing command-contract documentation regression surface, remain deterministic, and use Node.js built-ins only. It SHALL NOT add a prose-quality classifier or attempt to judge wording beyond the defined phrase classes and required stable markers.

#### Scenario: Static validation catches implicit human presence

- **WHEN** an Agent-facing command doc says a user/operator should run a pipeline command or decide whether to continue during a non-HITL phase
- **THEN** the static validation SHALL fail
- **AND** the failure SHALL name the file and phrase class

#### Scenario: Static validation requires a small stable helper contract

- **WHEN** `DPT_FRAMEWORK/COMMANDS.md` omits one of the three helper-oriented marker groups
- **THEN** the existing command-contract documentation regression SHALL fail
- **AND** the failure SHALL name the missing stable marker
- **AND** individual command playbooks SHALL NOT be required to duplicate the full top-level audience statement
- **AND** the regression SHALL NOT grow a phrase class or exact marker for every normative sentence in ACS-001

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
- `witnessing`: Engine-written evidence that binds a deterministic gate output to the subsequent handoff, such as the ordered `gate_attempt(passed=true,next=<target>)` and route-bound `load_complete(entry=<target>)` pair; and
- `current_node`: when non-null, the durable `rb_status.json` coordinate for the lifecycle Markdown control surface most recently loaded by successful route-bound `enter-phase`.

The docs SHALL state that `enter-phase` / `load_complete` proves entry into the target node, not target-phase work completion. Existing machine names such as `phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `stop: no`, and capability names SHALL remain stable unless a separate migration changes them.

Agent-facing resume guidance, including command playbooks for an already-existing active bundle, SHALL prefer non-null `rb_status.json.current_node` as the phase Markdown coordinate. It SHALL NOT tell the Agent to infer the active phase from `current_gate` alone. If `current_node` is `null` or absent, guidance SHALL direct the Agent to existing `BUNDLE_MAP.md`, trace, and reentry diagnostics rather than guessing the phase from the gate window. Legacy `START_FROM_HERE.md` SHALL be named only as deprecated fallback for old bundles.

#### Scenario: Terminology canon names the boundary layers

- **WHEN** an Agent or maintainer reads the guidance glossary or execution-model terminology canon
- **THEN** it SHALL distinguish phase transition, phase handoff, work completion, and witnessing
- **AND** it SHALL preserve existing machine-level names as stable implementation vocabulary

#### Scenario: Command docs do not overclaim handoff witness

- **WHEN** command docs describe `enter-phase`
- **THEN** they SHALL describe it as consuming `check.next` and witnessing entry/loading of the next control surface
- **AND** they SHALL NOT describe it as completing the target phase's work

#### Scenario: Existing active bundle guidance uses current node

- **WHEN** an Agent-facing command playbook describes resuming an already-existing bundle
- **THEN** it SHALL tell the Agent to use non-null `rb_status.json.current_node` as the preferred phase Markdown coordinate
- **AND** it SHALL distinguish `current_node` from `current_gate` and `next_gate`
- **AND** it SHALL NOT tell the Agent to judge the current phase from `current_gate` alone

#### Scenario: Missing current node falls back to diagnostics

- **WHEN** an existing bundle has `rb_status.json.current_node: null` or no `current_node`
- **THEN** resume guidance SHALL direct the Agent to existing `BUNDLE_MAP.md`, trace, and reentry diagnostics
- **AND** it SHALL NOT guess the phase from `current_gate` alone
