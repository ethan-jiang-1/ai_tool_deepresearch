# Content Delivery Phase Content Delta

> req: CDP-006

## ADDED Requirements

### Requirement: Final guidance SHALL declare and persist traceable evidence backing

Final phase guidance SHALL direct the Phase Agent to write a bounded Evidence
Map in every Final Markdown report, choose its key-finding declarations from
verified bundle state, and invoke `persist-final-report` for each
safe Markdown target under `final/`. The guidance SHALL preserve a completed staging file
until a `committed` result and SHALL direct the Agent to repair the reported
map row or backing path, then rerun the same operation when deterministic
admission fails.

The guidance SHALL preserve Final's existing terminal semantics: `gate: null`,
no Final Gate, no `final_delivery` trace event, no hidden next edge, no
Final-owned feedback/retry loop, and no user prompt for ordinary report repair.
The Agent remains responsible for content judgment and authorized mechanical
repair; the Engine remains responsible only for structural declaration, path,
and submitted-provenance feedback.

#### Scenario: Final Markdown delivery uses the one admitted persistence path

- **WHEN** the Phase Agent prepares a Final Markdown report in retained
  staging
- **THEN** Final guidance SHALL require a bounded Evidence Map and direct the
  Agent to use `persist-final-report` rather than generic `persist`
- **AND** the report SHALL not be presented as delivered before a `committed`
  result and the existing legal Final-entry conditions hold

#### Scenario: Final backing rejection stays an Agent repair of staging

- **WHEN** `persist-final-report` returns a backing rejection during Final
- **THEN** Final guidance SHALL direct the Agent to inspect the reported direct
  fact, repair its retained staging report or its legal backing surface, and
  rerun `persist-final-report`
- **AND** it SHALL not ask the user to run an ordinary command or create a
  Final Gate, Final trace event, Final-owned interaction loop, or new lifecycle
  state

#### Scenario: Final terminal delivery semantics remain unchanged

- **WHEN** a Final Markdown report has passed backing admission and commits
- **THEN** Final SHALL remain a terminal, non-interactive delivery phase with
  no outgoing Gate or transition
- **AND** the persistence result and Evidence Map SHALL not replace the
  existing readiness-to-Final handoff and Final-entry evidence
