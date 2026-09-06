> req: RUE-004

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
       -> remain on Final for feedback and presentation revisions (CAS updates of the current latest version; the version number does not change)
       -> stop the interaction when the user is satisfied
       -> use audited rerun only for evidence-expanding feedback (which allocates a new global version)
```

HITL1 and HITL2 SHALL remain the only Harness-initiated in-run lifecycle
decision checkpoints. During the autonomous middle, the Harness SHALL NOT
initiate progress, ordinary-error, idle, acknowledgement, or continuation
messages. An already-current user turn SHALL be answered without creating a

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

- **WHEN** entry docs describe a newer legal Final handoff whose new load admitted the retired ReopenResearchPass prior inventory and has no appended current-lineage report
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

#### Scenario: Presentation feedback revises the current version in place

- **WHEN** a user gives presentation-only feedback on the delivered Final report
- **THEN** the Final Agent SHALL apply a presentation revision as a CAS update of the current latest primary bytes
- **AND** the version number SHALL NOT change and no new primary file SHALL be created

#### Scenario: Evidence-expanding feedback allocates a new version

- **WHEN** a user request crosses the verified research boundary
- **THEN** the audited post-final rerun path SHALL be used
- **AND** the resulting legal Final delivery SHALL allocate a new global version
