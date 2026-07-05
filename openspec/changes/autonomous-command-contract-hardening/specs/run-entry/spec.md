## MODIFIED Requirements

> req: RUE-001

### Requirement: Entry point announces version

The RUN.md entry point SHALL display the framework version as a banner immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DPT_FRAMEWORK v<major>.<minor>**`. The concrete version in this banner SHALL match the latest repo-root `CHANGELOG.md` entry as required by `version-management` VEM-003; this requirement SHALL NOT hardcode an obsolete version after a version-management change has advanced the framework version.

#### Scenario: Agent reads RUN.md and sees current version

- **WHEN** an agent reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the first content after the title is a blockquote banner in the format `DPT_FRAMEWORK v<major>.<minor>`
- **AND** for this change's apply target, the banner SHALL state `DPT_FRAMEWORK v0.5`
- **AND** the banner appears before the trigger-context blockquote and before Section 0

## ADDED Requirements

> req: RUE-005

### Requirement: Entry trigger hands control to Agent-run framework execution

The `RUN.md` entry surface SHALL frame dragging, pasting, or otherwise providing `DPT_FRAMEWORK/RUN.md` as a one-time pre-pipeline trigger that selects the DPT_FRAMEWORK entry path and transfers control to the Agent.

After that entry path has been selected, `RUN.md` SHALL direct the Agent to proceed with framework execution rather than asking whether to use DPT_FRAMEWORK or a built-in research shortcut. Any routing clarification outside HITL1/HITL2 SHALL be explicitly labeled as a pre-pipeline exception before autonomous lifecycle execution begins, and SHALL NOT appear inside `stop: no` lifecycle phase instructions.

#### Scenario: Reading RUN.md means DPT_FRAMEWORK was selected

- **WHEN** the Agent reads `DPT_FRAMEWORK/RUN.md` as the run entry
- **THEN** the entry docs SHALL state that DPT_FRAMEWORK has been selected for this run
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT ask the user to confirm whether to use the framework

#### Scenario: Pre-pipeline exception is explicit

- **WHEN** entry docs include a clarification question before a bundle exists
- **THEN** the question SHALL be labeled as pre-pipeline routing outside autonomous lifecycle execution
- **AND** it SHALL NOT weaken the HITL1/HITL2-only interactive in-run boundary
