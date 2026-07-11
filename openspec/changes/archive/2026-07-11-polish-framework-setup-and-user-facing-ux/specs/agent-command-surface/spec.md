> req: ACS-002

## MODIFIED Requirements

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
