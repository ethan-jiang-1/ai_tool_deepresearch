## MODIFIED Requirements

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells the Agent that reading `DEEP_RESEARCH_HARNESS/RUN.md` as the selected entry for the user's research request selects the Deep Research Harness entry for that request, and that the Agent's own proactive reading of `RUN.md` as non-research task context (for example, during framework code exploration or documentation review, without a user research intent and without the user providing `RUN.md` as the entry) SHALL NOT by itself select the entry, transfer control to the Harness execution flow, or authorize starting the research flow. The Agent SHALL NOT invoke a built-in `research` or `deep-research` skill, an equivalent one-shot research shortcut, direct request-specific WebSearch/WebFetch, or manual evidence collection/synthesis as a substitute for the selected Deep Research Harness execution path.

The instruction SHALL:
- Appear as `## 0. 禁用内置捷径（最高优先）` immediately after the title and before the original trigger-context blockquote and "确认引擎" section (Section 1)
- Use conditional-action phrasing (if-then) that directly binds to the Agent's tool-calling behavior
- State that `RUN.md` selection replaces generic research shortcuts for the request and directs the Agent to the Deep Research Harness execution path described in Section 2
- State that the Harness entry selection for a request comes from the user's research intent with `DEEP_RESEARCH_HARNESS/` selected or the user's providing `RUN.md` as the entry, and distinguish that selection from the Agent's own proactive context reading
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

#### Scenario: Agent reads RUN.md proactively without a research request

- **WHEN** an Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` on its own initiative as non-research task context, without a user research intent and without the user providing `RUN.md` as the entry
- **THEN** Section 0 SHALL distinguish that context reading from selected-entry reading
- **AND** the entry text SHALL NOT by itself instruct the Agent to start the research execution flow
- **AND** the Agent SHALL NOT treat that reading alone as entry selection for the request
