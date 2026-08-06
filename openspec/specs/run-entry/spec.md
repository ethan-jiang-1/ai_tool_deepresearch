> req: RUE-001, RUE-002, RUE-004, RUE-005, RUE-006

## Purpose

定义 DEEP_RESEARCH_HARNESS 入口文件 `RUN.md` 的行为规范：版本标识宣告、内置 research shortcut 覆盖指令、以及关联 agent 行为文件（CLAUDE.md / AGENTS.md / README.md）的同步一致性。
## Requirements
### Requirement: Entry point announces version

The RUN.md entry point SHALL display the framework version as a banner immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DEEP_RESEARCH_HARNESS v<major>.<minor>**`. The concrete version in this banner SHALL match the latest repo-root `CHANGELOG.md` entry as required by `version-management` VEM-003. Historical change-specific target versions SHALL remain in archived proposals/changelog entries, not as a permanent current-version assertion in the accepted requirement.

#### Scenario: Agent reads RUN.md and sees current version

- **WHEN** an Agent reads `DEEP_RESEARCH_HARNESS/RUN.md`
- **THEN** the first content after the title SHALL be a blockquote banner in the format `DEEP_RESEARCH_HARNESS v<major>.<minor>`
- **AND** the banner version SHALL equal the latest repo-root `CHANGELOG.md` entry
- **AND** the banner SHALL appear before the trigger-context blockquote and Section 0

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells the Agent that reading `DEEP_RESEARCH_HARNESS/RUN.md` selects the Deep Research Harness entry for that request. The Agent SHALL NOT invoke a built-in `research` or `deep-research` skill, an equivalent one-shot research shortcut, direct request-specific WebSearch/WebFetch, or manual evidence collection/synthesis as a substitute for the selected Deep Research Harness execution path.

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

### Requirement: Entry trigger hands control to Agent-run framework execution

The `RUN.md` entry surface SHALL frame dragging, pasting, or otherwise providing `DEEP_RESEARCH_HARNESS/RUN.md` as a one-time pre-pipeline trigger that selects the DEEP_RESEARCH_HARNESS entry path and transfers control to the Agent.

After that user-initiated entry trigger has selected the path, `RUN.md` SHALL direct the Agent to proceed with framework execution rather than asking whether to use DEEP_RESEARCH_HARNESS, a built-in research shortcut, or another route. The entry trigger SHALL NOT create another framework-initiated clarification/wait point. Research-goal, scope and effort clarification belongs to HITL1; host setup/permission failure remains a narrow external prerequisite boundary rather than a conversational lifecycle checkpoint.

The entry surface and synchronized framework entry docs SHALL present the default collaboration rhythm as:

```text
HITL1: align research goal, scope and effort
  -> non-HITL phases: Agent runs silently and autonomously
  -> HITL2: review current research and decide delivery or further work
  -> Final: terminal delivery only when proceed is selected
```

HITL1 and HITL2 SHALL be the only framework-initiated points where the framework invites and waits for a semantic decision. During the autonomous middle, the framework SHALL NOT initiate progress, ordinary-error, idle, acknowledgement, or continuation messages. A user-initiated normal conversation turn SHALL be answered, but the answer SHALL NOT create a third HITL, permission, mutation/reentry authority, pause/interrupt lifecycle, or promise that arbitrary mid-run intent is persisted or applied. Final SHALL remain terminal delivery rather than a third decision interaction point.

Entry positioning SHALL describe DEEP_RESEARCH_HARNESS as iterative research that preserves history/provenance while allowing current judgments to be revised, downgraded, or superseded. It SHALL NOT promise unlimited reruns, guarantee every rerun is purely incremental, or claim that all historical conclusions remain currently valid.

#### Scenario: Reading RUN.md means DEEP_RESEARCH_HARNESS was selected

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` as the run entry
- **THEN** the entry docs SHALL state that DEEP_RESEARCH_HARNESS has been selected for this run
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT ask the user to confirm whether to use the framework

#### Scenario: Pre-pipeline exception is explicit

> **@deprecated name** — Retained as the historical scenario anchor. The target behavior removes the former route-clarification exception.

- **WHEN** the user provides or opens `RUN.md` and thereby selects DEEP_RESEARCH_HARNESS
- **THEN** entry docs SHALL direct the Agent into framework execution without another route-selection question
- **AND** research semantics that still need clarification SHALL be handled at HITL1
- **AND** host setup or permission failure SHALL be reported only as the smallest external prerequisite, not a third lifecycle interaction point

#### Scenario: Entry docs expose the two-HITL rhythm

- **WHEN** an Agent or user reads the framework entry docs
- **THEN** the docs SHALL identify HITL1 and HITL2 as the only framework-initiated in-run decision points
- **AND** they SHALL describe the middle as silently autonomous
- **AND** they SHALL describe Final as terminal delivery rather than another decision loop

#### Scenario: User-initiated message does not add an entry path

- **WHEN** a user voluntarily sends a normal conversation message while a non-HITL phase is active
- **THEN** entry docs SHALL require the Agent to answer that turn
- **AND** they SHALL NOT describe the message as another HITL, entry trigger, mutation permission, pause state, or durable intervention path

#### Scenario: Iterative positioning separates history from current judgment

- **WHEN** entry docs describe rerun or iterative refinement
- **THEN** they SHALL say that historical evidence, provenance, decisions and Gate lineage remain traceable
- **AND** they SHALL allow current conclusions to be revised, downgraded or superseded
- **AND** they SHALL NOT promise unlimited reruns or permanent validity of stale conclusions

### Requirement: Explicit existing bundle routes before the new-run default

Root and Harness-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing run bundle from a new research request. When the
user explicitly supplies or opens a bundle directory (or its `BUNDLE_ENTRY.md`,
legacy `RUN_BUNDLE.md`, or `BUNDLE_MAP.md`) in the selected Deep Research
Harness workspace and asks to continue, inspect, supplement, or question that
bundle, the routing surface SHALL direct the Agent to the canonical
existing-bundle continuation playbook before `RUN.md`, `start-research`,
generic research shortcuts, direct request-specific search/fetch, or manual
synthesis.

For an explicitly supplied existing bundle, the entry resolution order SHALL be
`BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, then legacy map-only
`BUNDLE_MAP.md`. The selected bundle directory, resolved to its canonical
absolute form, is the current run bundle root for that continuation operation.

This condition SHALL require an explicit user-provided bundle/path and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, or a copied/unreachable directory. In those cases,
the Agent retains the direct Harness-context boundary. When the condition is
absent, selected new-research routing SHALL use `RUN.md` before later workflow
instructions or research work.

The distinction SHALL be synchronized across repo-root `AGENTS.md` and
`CLAUDE.md`, Harness `AGENTS.md` and `CLAUDE.md`, and relevant Harness
entry/command guidance. It SHALL NOT add a lifecycle checkpoint, host trigger,
permission, mutation, or rerun authority.

#### Scenario: Explicit existing bundle prevents a second bundle and pre-entry research

- **WHEN** a user explicitly provides a reachable existing bundle in a selected
  Harness workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `RUN.md` or `start-research`
- **AND** it SHALL NOT create a new bundle, invoke a generic research shortcut,
  or perform request-specific direct research before that playbook is read

#### Scenario: Selected new research starts at RUN.md

- **WHEN** a user makes a selected Harness research request without an
  explicitly supplied, reachable existing bundle
- **THEN** root/Harness routing SHALL direct the Agent to read `RUN.md` before
  `start-research`, a generic shortcut, or request-specific direct research work
- **AND** `RUN.md` SHALL remain free to delegate to its existing workflow
  instructions

#### Scenario: Discovered bundle does not select a route

- **WHEN** a bundle is discovered by scanning, named without being supplied, or
  cannot establish its reachable bundle/Harness context
- **THEN** routing SHALL NOT select that bundle or execute its continuation
  commands
- **AND** it SHALL NOT treat entry-card content as host trigger, Harness
  authentication, permission, or reentry authority
