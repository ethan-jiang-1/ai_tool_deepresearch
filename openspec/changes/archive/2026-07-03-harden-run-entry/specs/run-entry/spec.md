> req: RUE-001, RUE-002, RUE-004

## ADDED Requirements

### Requirement: Entry point announces version

The RUN.md entry point SHALL display the framework version as a banner immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DPT_FRAMEWORK v<major>.<minor>**`.

#### Scenario: Agent reads RUN.md and sees version
- **WHEN** an agent reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the first content after the title is a blockquote banner stating `DPT_FRAMEWORK v0.1`
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
