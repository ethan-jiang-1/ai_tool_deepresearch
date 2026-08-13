> req: RUE-001, RUE-002

## RENAMED Requirements

- FROM: `### Requirement: Entry point announces Harness version`
- TO: `### Requirement: Entry point excludes internal version projection`

## MODIFIED Requirements

### Requirement: Entry point excludes internal version projection

The RUN.md entry point SHALL begin with its title and SHALL NOT display an
internal Harness `v<major>.<minor>` banner. It SHALL NOT derive a current entry
instruction, execution route, or compatibility conclusion from repo-root
`CHANGELOG.md` headings.

`RUN.md` answers the selected-entry reader's current operational question. Root
changelog, Git, and governed OpenSpec archives may retain human historical
context, but none replaces the entry route or becomes an execution authority.

#### Scenario: Agent reads RUN.md and sees current version

> **@deprecated name** - Retained as the historical scenario anchor. The
> current entry contract removes the internal version projection.

- **WHEN** an Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` as the selected
  new-research entry
- **THEN** the document contains no `DEEP_RESEARCH_HARNESS v<major>.<minor>`
  banner
- **AND** its current operational instruction does not depend on the latest
  repo-root changelog heading
- **AND** the Agent can proceed through the documented entry route without
  interpreting internal release history

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells the Agent that reading `DEEP_RESEARCH_HARNESS/RUN.md` selects the Deep Research Harness entry for that request. The Agent SHALL NOT invoke a built-in `research` or `deep-research` skill, an equivalent one-shot research shortcut, direct request-specific WebSearch/WebFetch, or manual evidence collection/synthesis as a substitute for the selected Deep Research Harness execution path.

The instruction SHALL:
- Appear as `## 0. 禁用内置捷径（最高优先）` immediately after the title and before the original trigger-context blockquote and "确认引擎" section (Section 1)
- Use conditional-action phrasing (if-then) that directly binds to the Agent's tool-calling behavior
- State that `RUN.md` selection replaces generic research shortcuts for the request and directs the Agent to the Deep Research Harness execution path described in Section 2
- Distinguish the pre-entry/substitute prohibition from the research capability probe and later research work that an entered phase separately authorizes

#### Scenario: Agent reads RUN.md with generic research surfaces available

- **WHEN** an Agent whose tool list includes `research`, `deep-research`, an equivalent one-shot shortcut, or atomic search/fetch tools reads `DEEP_RESEARCH_HARNESS/RUN.md` for a selected request
- **THEN** Section 0 SHALL direct the Agent not to use those surfaces as a substitute for the Deep Research Harness execution path
- **AND** it SHALL direct the Agent to proceed with the Deep Research Harness execution path described in Section 2
- **AND** it SHALL not prohibit a capability probe or research action that a later entered phase explicitly authorizes

#### Scenario: Agent reads RUN.md without a generic research shortcut

- **WHEN** an Agent without a built-in research shortcut reads `DEEP_RESEARCH_HARNESS/RUN.md` for a selected request
- **THEN** the shortcut-specific portion of Section 0 SHALL be a no-op
- **AND** the Deep Research Harness execution path described in Section 2 SHALL remain the next execution path
