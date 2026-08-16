> req: RUE-005

## MODIFIED Requirements

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
