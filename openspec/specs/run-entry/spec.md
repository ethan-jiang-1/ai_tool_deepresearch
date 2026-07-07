> req: RUE-001, RUE-002, RUE-004, RUE-005

## Purpose

定义 DPT_FRAMEWORK 入口文件 `RUN.md` 的行为规范：版本标识宣告、内置 research shortcut 覆盖指令、以及关联 agent 行为文件（CLAUDE.md / AGENTS.md / README.md）的同步一致性。

## Requirements

### Requirement: Entry point announces version

The RUN.md entry point SHALL display the framework version as a banner immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DPT_FRAMEWORK v<major>.<minor>**`. The concrete version in this banner SHALL match the latest repo-root `CHANGELOG.md` entry as required by `version-management` VEM-003; this requirement SHALL NOT hardcode an obsolete version after a version-management change has advanced the framework version.

#### Scenario: Agent reads RUN.md and sees current version

- **WHEN** an agent reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the first content after the title is a blockquote banner in the format `DPT_FRAMEWORK v<major>.<minor>`
- **AND** for this change's apply target, the banner SHALL state `DPT_FRAMEWORK v0.6`
- **AND** the banner appears before the trigger-context blockquote and before Section 0

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells the agent to NOT invoke any built-in `deep-research` skill or equivalent research shortcut when the agent's tool list contains such a shortcut.

The instruction SHALL:
- Appear as `## 0. 禁用内置捷径（最高优先）` after the version banner and before the original trigger-context blockquote and "确认引擎" section (Section 1)
- Use conditional-action phrasing (if-then) that directly binds to the agent's tool-calling behavior
- State that reading this file means the DPT_FRAMEWORK entry path has been selected and replaces any built-in research shortcut for this run

#### Scenario: Agent with built-in research shortcut reads RUN.md
- **WHEN** an agent whose tool list includes a `deep-research` skill or equivalent research shortcut reads `DPT_FRAMEWORK/RUN.md`
- **THEN** Section 0 SHALL instruct the agent not to invoke that built-in shortcut
- **AND** Section 0 SHALL instruct the agent to proceed with the DPT_FRAMEWORK flow described in Section 2

#### Scenario: Agent without built-in research shortcut reads RUN.md
- **WHEN** an agent whose tool list does NOT include a `deep-research` skill or equivalent research shortcut reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the Section 0 override instruction is a no-op
- **AND** the DPT_FRAMEWORK flow described in Section 2 remains the next execution path

### Requirement: Agent behavior files stay synchronized on skill override

When the skill-override instruction in RUN.md is updated, the same directive SHALL be reflected consistently across `DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/AGENTS.md`, and `DPT_FRAMEWORK/README.md`.

#### Scenario: Skill override language consistency
- **WHEN** RUN.md Section 0 instructs agents not to invoke built-in deep-research or equivalent research shortcuts
- **THEN** CLAUDE.md and AGENTS.md SHALL contain equivalent directive language
- **AND** README.md trigger rules SHALL reference the override instruction

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
