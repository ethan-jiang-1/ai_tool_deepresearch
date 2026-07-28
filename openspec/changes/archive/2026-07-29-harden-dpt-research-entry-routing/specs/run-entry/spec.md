> req: RUE-002, RUE-004, RUE-006

## MODIFIED Requirements

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells the Agent that reading `DPT_FRAMEWORK/RUN.md` selects the DPT framework entry for that request. The Agent SHALL NOT invoke a built-in `research` or `deep-research` skill, an equivalent one-shot research shortcut, direct request-specific WebSearch/WebFetch, or manual evidence collection/synthesis as a substitute for the selected DPT flow.

The instruction SHALL:
- Appear as `## 0. 禁用内置捷径（最高优先）` after the version banner and before the original trigger-context blockquote and "确认引擎" section (Section 1)
- Use conditional-action phrasing (if-then) that directly binds to the Agent's tool-calling behavior
- State that `RUN.md` selection replaces generic research shortcuts for the request and directs the Agent to the DPT flow described in Section 2
- Distinguish the pre-entry/substitute prohibition from the research capability probe and later research work that an entered phase separately authorizes

#### Scenario: Agent reads RUN.md with generic research surfaces available

- **WHEN** an Agent whose tool list includes `research`, `deep-research`, an equivalent one-shot shortcut, or atomic search/fetch tools reads `DPT_FRAMEWORK/RUN.md` for a selected request
- **THEN** Section 0 SHALL direct the Agent not to use those surfaces as a substitute for the DPT flow
- **AND** it SHALL direct the Agent to proceed with the DPT_FRAMEWORK flow described in Section 2
- **AND** it SHALL not prohibit a capability probe or research action that a later entered phase explicitly authorizes

#### Scenario: Agent reads RUN.md without a generic research shortcut

- **WHEN** an Agent without a built-in research shortcut reads `DPT_FRAMEWORK/RUN.md` for a selected request
- **THEN** the shortcut-specific portion of Section 0 SHALL be a no-op
- **AND** the DPT_FRAMEWORK flow described in Section 2 SHALL remain the next execution path

### Requirement: Agent behavior files stay synchronized on skill override

When the entry-priority directive in RUN.md is updated, the same directive SHALL be reflected consistently across repo-root `CLAUDE.md`, repo-root `AGENTS.md`, `DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/AGENTS.md`, and `DPT_FRAMEWORK/README.md`.

Repo-root behavior files SHALL contain a short high-priority rule: when the user expresses research, deep-research, investigation, or report intent and this repo's `DPT_FRAMEWORK/` is the selected entry path, the Agent SHALL first read the selected entry surface. It SHALL NOT invoke generic `research` / `deep-research` / equivalent one-shot shortcuts, direct request-specific WebSearch/WebFetch, or manual evidence collection/synthesis before that entry routing is complete. The framework-local surfaces SHALL express the same priority while retaining their local pointers to the selected entry document.

#### Scenario: Entry-priority language stays consistent

- **WHEN** RUN.md Section 0 is updated with an entry-priority directive
- **THEN** repo-root `CLAUDE.md` and repo-root `AGENTS.md` SHALL contain equivalent repo-level routing language
- **AND** `DPT_FRAMEWORK/CLAUDE.md` and `DPT_FRAMEWORK/AGENTS.md` SHALL contain equivalent framework-local directive language
- **AND** `DPT_FRAMEWORK/README.md` SHALL reference the directive and selected-entry route

#### Scenario: Root behavior files route before framework-local files load

- **WHEN** a fresh Agent session loads repo-root behavior files before reading `DPT_FRAMEWORK/RUN.md`
- **AND** the user expresses research intent with `DPT_FRAMEWORK/` selected or relevant
- **THEN** the root behavior files SHALL direct the Agent to the selected DPT entry before any request-specific generic shortcut or direct research action
- **AND** they SHALL not present a generic research skill as an equivalent route

### Requirement: Explicit existing bundle routes before the new-run default

Root and framework-local Agent routing surfaces SHALL distinguish an explicitly supplied, reachable existing run bundle from a new research request. When the user explicitly supplies or opens a bundle directory (or its `RUN_BUNDLE.md` or `BUNDLE_MAP.md`) in the selected DPT workspace and asks to continue, inspect, supplement or question that bundle, the routing surface SHALL direct the Agent to the canonical existing-bundle continuation playbook before `RUN.md`, `start-research`, generic research shortcuts, direct request-specific search/fetch, or manual synthesis.

When both `RUN_BUNDLE.md` and `BUNDLE_MAP.md` are present, `RUN_BUNDLE.md` SHALL be read first as the primary entry point.

This condition SHALL require an explicit user-provided bundle/path and a reachable containing directory. It SHALL NOT be satisfied by filesystem scanning, a bare filename, or a copied/unreachable directory. In those cases, the Agent retains the direct framework-context boundary. When the condition is absent, selected DPT new-research routing SHALL use `RUN.md` before later workflow instructions or research work.

The distinction SHALL be synchronized across repo-root `AGENTS.md` and `CLAUDE.md`, framework `AGENTS.md` and `CLAUDE.md`, and relevant framework entry/command guidance. It SHALL NOT add a lifecycle checkpoint, host trigger, permission, mutation, or rerun authority.

#### Scenario: Explicit existing bundle prevents a second bundle and pre-entry research

- **WHEN** a user explicitly provides a reachable existing bundle in a selected DPT workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation playbook before `RUN.md` or `start-research`
- **AND** it SHALL NOT create a new bundle, invoke a generic research shortcut, or perform request-specific direct research before that playbook is read

#### Scenario: Selected new research starts at RUN.md

- **WHEN** a user makes a selected DPT research request without an explicitly supplied, reachable existing bundle
- **THEN** root/framework routing SHALL direct the Agent to read `RUN.md` before `start-research`, a generic shortcut, or request-specific direct research work
- **AND** `RUN.md` SHALL remain free to delegate to its existing workflow instructions

#### Scenario: Discovered bundle does not select a route

- **WHEN** a bundle is discovered by scanning, named without being supplied, or cannot establish its reachable bundle/framework context
- **THEN** routing SHALL NOT select that bundle or execute its continuation commands
- **AND** it SHALL NOT treat `RUN_BUNDLE.md` content as host trigger, framework authentication, permission, or reentry authority
