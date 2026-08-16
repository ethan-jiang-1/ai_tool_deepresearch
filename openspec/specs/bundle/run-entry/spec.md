> req: RUE-001, RUE-002, RUE-004, RUE-005, RUE-006

## Purpose

定义 DEEP_RESEARCH_HARNESS 入口文件 `RUN.md` 的当前路由、内置 research
shortcut 覆盖指令，以及关联 agent 行为文件（CLAUDE.md / AGENTS.md /
README.md）的同步一致性。
## Requirements
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

The `RUN.md` entry surface SHALL frame dragging, pasting, or otherwise providing
`DEEP_RESEARCH_HARNESS/RUN.md` as a one-time pre-pipeline trigger that selects
the Harness entry path and transfers control to the Agent.

After that trigger, `RUN.md` SHALL direct the Agent to proceed rather than ask
whether to use the Harness, a built-in research shortcut, or another route.
Research-goal, scope, and effort clarification belongs to HITL1; host setup or
permission failure remains a narrow external prerequisite rather than a new
conversational checkpoint.

The entry surface and synchronized Harness entry docs SHALL present the default
collaboration rhythm as:

```text
HITL1: align research goal, scope and effort
  -> non-HITL middle: Agent runs silently and autonomously
  -> HITL2: review current research and decide delivery or further work
  -> Final: publish the first report immediately
       -> remain on Final for feedback and immutable presentation revisions
       -> stop the interaction when the user is satisfied
       -> use audited rerun only for evidence-expanding feedback
```

HITL1 and HITL2 SHALL remain the only Harness-initiated in-run lifecycle
decision checkpoints. During the autonomous middle, the Harness SHALL NOT
initiate progress, ordinary-error, idle, acknowledgement, or continuation
messages. An already-current user turn SHALL be answered without creating a
checkpoint, permission, pause, mutation/reentry authority, or a promise that
arbitrary mid-run intent was persisted.

Final SHALL remain the terminal lifecycle node but SHALL be an interactive
delivery surface after the first committed report. Entry docs SHALL explicitly
distinguish “terminal” from “non-interactive”: Final has no Gate, outgoing edge,
or lifecycle verdict, yet it presents each committed report, invites bounded
feedback, and waits for another presentation revision. Any legal Final lineage
that lacks its bound report SHALL never wait for feedback: after Final entry
admits an empty primary baseline, the bundle's first lineage publishes
`final/final.md`; after a later audited rerun, the new Final load first admits
the exact event-bound prior inventory, synchronizes the Readiness source Gate,
and then appends global `latest + 1`. A
satisfaction message ends the current interaction without new Engine state.

For an explicitly selected existing bundle whose current node is Final, entry
docs SHALL direct the Agent to inspect the canonical primary inventory plus
current/retired C5 lineage binding and resume the same Final delivery/refinement
owner unless the current user request explicitly expands research evidence. A
zero-append newer Final lineage SHALL resume immediate delivery; a report already
bound to that lineage SHALL resume latest refinement. Entry docs SHALL not infer
satisfaction from a previously ended chat, reissue a report without a delivery-
pending lineage or current feedback, or default every clean Final to post-final
rerun.

Entry positioning SHALL describe the Harness as iterative research and
iterative delivery that preserve history/provenance while allowing current
judgments and report presentations to be revised. It SHALL NOT promise
unlimited research reruns, guarantee every rerun is purely incremental, or
claim that all historical conclusions remain currently valid.

#### Scenario: Reading RUN.md means DEEP_RESEARCH_HARNESS was selected

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` as run entry
- **THEN** docs SHALL state that the Harness is selected and assign subsequent execution to the Agent
- **AND** they SHALL not ask the user to reconfirm the route

#### Scenario: Pre-pipeline exception is explicit

> **@deprecated name** — Retained as the historical scenario anchor. The target
> behavior removes the former route-clarification exception.

- **WHEN** the user provides `RUN.md` and thereby selects the Harness
- **THEN** entry docs SHALL proceed without another route-selection question
- **AND** unresolved research semantics SHALL be handled at HITL1
- **AND** host setup/permission failure SHALL be only the smallest external prerequisite

#### Scenario: Entry docs expose the two-HITL rhythm

- **WHEN** an Agent or user reads the Harness entry docs
- **THEN** they SHALL identify HITL1 and HITL2 as the only lifecycle decision checkpoints
- **AND** they SHALL describe the middle as silent and autonomous
- **AND** they SHALL describe Final as deliver-first terminal refinement rather than a third HITL

#### Scenario: First Final delivery precedes feedback

- **WHEN** entry docs describe first arrival at Final after empty-primary entry admission
- **THEN** they SHALL require immediate first-report publication and presentation
- **AND** they SHALL place feedback invitation and waiting only after that delivery

#### Scenario: Post-rerun Final delivery also precedes feedback

- **WHEN** entry docs describe a newer legal Final handoff whose new load admitted the retired C5 prior inventory and has no appended current-lineage report
- **THEN** they SHALL require global `latest + 1` publication and presentation before feedback
- **AND** they SHALL not recreate the base or present the prior lineage's latest report as current delivery

#### Scenario: Existing Final bundle resumes the Final owner

- **WHEN** an explicitly selected current bundle has `current_node: phases/phase-final.md` and no current evidence-expanding request
- **THEN** entry docs SHALL use current lineage/inventory facts to direct the Agent either to immediate missing delivery or to the latest bound primary report and Final refinement contract
- **AND** they SHALL not default to HITL2 or post-final rerun

#### Scenario: User-initiated message does not add an entry path

- **WHEN** a user voluntarily sends a normal conversation message while a non-Final non-HITL phase is active
- **THEN** entry docs SHALL require an answer without describing the message as another HITL, entry trigger, permission, pause, or durable intervention

#### Scenario: Iterative positioning separates history from current judgment

- **WHEN** entry docs describe research rerun or Final refinement
- **THEN** they SHALL preserve historical evidence, provenance, decisions, Gate lineage, and report versions
- **AND** they SHALL allow current conclusions or presentation to be revised without promising permanent validity or unlimited research reruns

### Requirement: Explicit existing bundle routes before the new-run default

Root and Harness-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing run bundle from a new research request. When the
user explicitly supplies or opens a bundle directory (or a file within it) in
the selected Deep Research Harness workspace and asks to continue, inspect,
supplement, or question that bundle, routing SHALL first verify that the
candidate directory contains both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`.

Only a verified pair directs the Agent to the canonical existing-bundle
continuation playbook before `RUN.md`, `start-research`, generic research
shortcuts, direct request-specific search/fetch, or manual synthesis. The
selected bundle directory, resolved to its canonical absolute form, is the
current run bundle root for that continuation operation.

An explicitly supplied reachable candidate missing either current file SHALL
stop at the unsupported-current-entry-contract boundary. It SHALL NOT fall back
to legacy `RUN_BUNDLE.md`, `START_FROM_HERE.md`, map-only entry, `RUN.md`, new
bundle creation, scanning, a different bundle, migration, upgrade, or a
human-only Harness command. Direct human reading of historical Markdown remains
outside this routing contract.

This condition SHALL require an explicit user-provided bundle/path and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, or a copied/unreachable directory. In those cases,
the Agent retains the direct Harness-context boundary. When no existing
candidate is supplied, selected new-research routing SHALL use `RUN.md` before
later workflow instructions or research work.

The complete entry-selection rule — including both the verified-pair branch and
the no-candidate `RUN.md` branch — SHALL have exactly one canonical statement in
`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`. Repo-root
`AGENTS.md` and `CLAUDE.md`, Harness `AGENTS.md` and `CLAUDE.md`, and relevant
Harness entry/command guidance (README, RUN, COMMANDS, start-research) SHALL
carry a short pointer to that canonical statement instead of restating the
complete rule. Pointers SHALL name the playbook and the unsupported-current-
entry-contract boundary without reproducing the selection procedure. A pointer
SHALL NOT weaken, reorder, or paraphrase the canonical rule's outcomes. This
single-source arrangement SHALL NOT add a lifecycle checkpoint, host trigger,
permission, mutation, or rerun authority.

#### Scenario: Explicit existing bundle prevents a second bundle and pre-entry research

- **WHEN** a user explicitly provides a reachable bundle with the current pair
  in a selected Harness workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `RUN.md` or `start-research`
- **AND** it SHALL NOT create a new bundle, invoke a generic research shortcut,
  or perform request-specific direct research before that playbook is read

#### Scenario: Supplied incomplete candidate stops rather than selecting another route

- **WHEN** a user explicitly provides a reachable directory missing either
  member of the current pair
- **THEN** routing SHALL report the unsupported current-entry contract and stop
- **AND** it SHALL not route the request to `RUN.md`, `start-research`, a
  legacy entry, map-only entry, or another bundle

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

#### Scenario: Entry surfaces point instead of restating

- **WHEN** an Agent reads a root or Harness routing surface before selecting an
  entry
- **THEN** the surface SHALL point to
  `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` as the one
  canonical statement of the complete selection rule
- **AND** it SHALL NOT reproduce the full selection procedure or rephrase its
  branches
- **AND** the canonical playbook SHALL state both the verified-pair branch and
  the no-candidate `RUN.md` branch
