> req: RUE-002, RUE-004

## MODIFIED Requirements

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells
the Agent that reading `DEEP_RESEARCH_HARNESS/RUN.md` selects the Deep Research
Harness entry for that request. The Agent SHALL NOT invoke a built-in
`research` or `deep-research` skill, an equivalent one-shot research shortcut,
direct request-specific WebSearch/WebFetch, or manual evidence
collection/synthesis as a substitute for the selected Deep Research Harness
execution path.

The instruction SHALL:
- Appear as `## 0. 禁用内置捷径（最高优先）` after the version banner and before the original trigger-context blockquote and "确认引擎" section (Section 1)
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

### Requirement: Agent behavior files stay synchronized on skill override

When the entry-priority directive in RUN.md is updated, the same directive SHALL be reflected consistently across repo-root `CLAUDE.md`, repo-root `AGENTS.md`, `DEEP_RESEARCH_HARNESS/CLAUDE.md`, `DEEP_RESEARCH_HARNESS/AGENTS.md`, and `DEEP_RESEARCH_HARNESS/README.md`.

Repo-root behavior files SHALL contain a short high-priority rule: when the user expresses research, deep-research, investigation, or report intent and this repo's `DEEP_RESEARCH_HARNESS/` is the selected entry path, the Agent SHALL first read the selected entry surface. It SHALL NOT invoke generic `research` / `deep-research` / equivalent one-shot shortcuts, direct request-specific WebSearch/WebFetch, or manual evidence collection/synthesis before that entry routing is complete. The framework-local surfaces SHALL express the same priority while retaining their local pointers to the selected entry document.

#### Scenario: Entry-priority language stays consistent

- **WHEN** RUN.md Section 0 is updated with an entry-priority directive
- **THEN** repo-root `CLAUDE.md` and repo-root `AGENTS.md` SHALL contain equivalent repo-level routing language
- **AND** `DEEP_RESEARCH_HARNESS/CLAUDE.md` and `DEEP_RESEARCH_HARNESS/AGENTS.md` SHALL contain equivalent framework-local directive language
- **AND** `DEEP_RESEARCH_HARNESS/README.md` SHALL reference the directive and selected-entry route

#### Scenario: Root behavior files route before framework-local files load

- **WHEN** a fresh Agent session loads repo-root behavior files before reading `DEEP_RESEARCH_HARNESS/RUN.md`
- **AND** the user expresses research intent with `DEEP_RESEARCH_HARNESS/` selected or relevant
- **THEN** the root behavior files SHALL direct the Agent to the selected Deep Research Harness entry before any request-specific generic shortcut or direct research action
- **AND** they SHALL not present a generic research skill as an equivalent route
