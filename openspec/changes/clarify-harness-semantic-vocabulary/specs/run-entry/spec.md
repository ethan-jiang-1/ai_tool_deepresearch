> req: RUE-001, RUE-004, RUE-005

## RENAMED Requirements

- FROM: `### Requirement: Entry point announces version`
- TO: `### Requirement: Entry point announces Harness version`

- FROM: `### Requirement: Entry trigger hands control to Agent-run framework execution`
- TO: `### Requirement: Entry trigger hands control to Agent-run Harness execution`

## MODIFIED Requirements

### Requirement: Entry point announces Harness version

The RUN.md entry point SHALL display the Harness version as a banner
immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DEEP_RESEARCH_HARNESS
v<major>.<minor>**`. The concrete version in this banner SHALL match the
latest repo-root `CHANGELOG.md` entry as required by `version-management`
VEM-003. Historical change-specific target versions SHALL remain in archived
proposals/changelog entries, not as a permanent current-version assertion in
the accepted requirement.

#### Scenario: Agent reads RUN.md and sees current version

- **WHEN** an Agent reads `DEEP_RESEARCH_HARNESS/RUN.md`
- **THEN** the first content after the title SHALL be a blockquote banner in
  the format `DEEP_RESEARCH_HARNESS v<major>.<minor>`
- **AND** the banner version SHALL equal the latest repo-root `CHANGELOG.md`
  entry
- **AND** the banner SHALL appear before the trigger-context blockquote and
  Section 0

### Requirement: Agent behavior files stay synchronized on skill override

When the entry-priority directive in RUN.md is updated, the same directive
SHALL be reflected consistently across repo-root `CLAUDE.md`, repo-root
`AGENTS.md`, `DEEP_RESEARCH_HARNESS/CLAUDE.md`,
`DEEP_RESEARCH_HARNESS/AGENTS.md`, and `DEEP_RESEARCH_HARNESS/README.md`.

Repo-root behavior files SHALL contain a short high-priority rule: when the
user expresses research, deep-research, investigation, or report intent and
this repo's `DEEP_RESEARCH_HARNESS/` is the selected entry path, the Agent
SHALL first read the selected entry surface. It SHALL NOT invoke generic
`research` / `deep-research` / equivalent one-shot shortcuts, direct
request-specific WebSearch/WebFetch, or manual evidence collection/synthesis
before that entry routing is complete. The Harness-local surfaces SHALL
express the same priority while retaining their local pointers to the selected
entry document.

#### Scenario: Entry-priority language stays consistent

- **WHEN** RUN.md Section 0 is updated with an entry-priority directive
- **THEN** repo-root `CLAUDE.md` and repo-root `AGENTS.md` SHALL contain
  equivalent repo-level routing language
- **AND** `DEEP_RESEARCH_HARNESS/CLAUDE.md` and
  `DEEP_RESEARCH_HARNESS/AGENTS.md` SHALL contain equivalent Harness-local
  directive language
- **AND** `DEEP_RESEARCH_HARNESS/README.md` SHALL reference the directive and
  selected-entry route

#### Scenario: Root behavior files route before Harness-local files load

- **WHEN** a fresh Agent session loads repo-root behavior files before reading
  `DEEP_RESEARCH_HARNESS/RUN.md`
- **AND** the user expresses research intent with
  `DEEP_RESEARCH_HARNESS/` selected or relevant
- **THEN** the root behavior files SHALL direct the Agent to the selected Deep
  Research Harness entry before any request-specific generic shortcut or
  direct research action
- **AND** they SHALL not present a generic research skill as an equivalent
  route

### Requirement: Entry trigger hands control to Agent-run Harness execution

The `RUN.md` entry surface SHALL frame dragging, pasting, or otherwise
providing `DEEP_RESEARCH_HARNESS/RUN.md` as a one-time pre-pipeline trigger
that selects the `DEEP_RESEARCH_HARNESS/` entry path and transfers control to
the Agent.

After that user-initiated entry trigger has selected the path, `RUN.md` SHALL
direct the Agent to proceed with Harness execution rather than asking whether
to use `DEEP_RESEARCH_HARNESS/`, a built-in research shortcut, or another
route. The entry trigger SHALL NOT create another Harness-initiated
clarification/wait point. Research-goal, scope and effort clarification
belongs to HITL1; host setup/permission failure remains a narrow external
prerequisite boundary rather than a conversational lifecycle checkpoint.

The entry surface and synchronized Harness entry docs SHALL present the
default collaboration rhythm as:

```text
HITL1: align research goal, scope and effort
  -> non-HITL phases: Agent runs silently and autonomously
  -> HITL2: review current research and decide delivery or further work
  -> Final: terminal delivery only when proceed is selected
```

HITL1 and HITL2 SHALL be the only Harness-initiated points where the Harness
invites and waits for a semantic decision. During the autonomous middle, the
Harness SHALL NOT initiate progress, ordinary-error, idle, acknowledgement, or
continuation messages. A user-initiated normal conversation turn SHALL be
answered, but the answer SHALL NOT create a third HITL, permission,
mutation/reentry authority, pause/interrupt lifecycle, or promise that
arbitrary mid-run intent is persisted or applied. Final SHALL remain terminal
delivery rather than a third decision interaction point.

Entry positioning SHALL describe `DEEP_RESEARCH_HARNESS/` as iterative
research that preserves history/provenance while allowing current judgments to
be revised, downgraded, or superseded. It SHALL NOT promise unlimited reruns,
guarantee every rerun is purely incremental, or claim that all historical
conclusions remain currently valid.

#### Scenario: Reading RUN.md means DEEP_RESEARCH_HARNESS was selected

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` as the run entry
- **THEN** the entry docs SHALL state that `DEEP_RESEARCH_HARNESS/` has been
  selected for this run
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT ask the user to confirm whether to use the
  Harness

#### Scenario: Pre-pipeline exception is explicit

> **@deprecated name** — Retained as the historical scenario anchor. The
> target behavior removes the former route-clarification exception.

- **WHEN** the user provides or opens `RUN.md` and thereby selects
  `DEEP_RESEARCH_HARNESS/`
- **THEN** entry docs SHALL direct the Agent into Harness execution without
  another route-selection question
- **AND** research semantics that still need clarification SHALL be handled at
  HITL1
- **AND** host setup or permission failure SHALL be reported only as the
  smallest external prerequisite, not a third lifecycle interaction point

#### Scenario: Entry docs expose the two-HITL rhythm

- **WHEN** an Agent or user reads the Harness entry docs
- **THEN** the docs SHALL identify HITL1 and HITL2 as the only
  Harness-initiated in-run decision points
- **AND** they SHALL describe the middle as silently autonomous
- **AND** they SHALL describe Final as terminal delivery rather than another
  decision loop

#### Scenario: User-initiated message does not add an entry path

- **WHEN** a user voluntarily sends a normal conversation message while a
  non-HITL phase is active
- **THEN** entry docs SHALL require the Agent to answer that turn
- **AND** they SHALL NOT describe the message as another HITL, entry trigger,
  mutation permission, pause state, or durable intervention path

#### Scenario: Iterative positioning separates history from current judgment

- **WHEN** entry docs describe rerun or iterative refinement
- **THEN** they SHALL say that historical evidence, provenance, decisions and
  Gate lineage remain traceable
- **AND** they SHALL allow current conclusions to be revised, downgraded or
  superseded
- **AND** they SHALL NOT promise unlimited reruns or permanent validity of
  stale conclusions
