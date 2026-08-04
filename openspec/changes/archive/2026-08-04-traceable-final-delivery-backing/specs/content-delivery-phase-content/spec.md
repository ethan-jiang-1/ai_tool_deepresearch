# Content Delivery Phase Content Delta

> req: CDP-003, CDP-004, CDP-006

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

## MODIFIED Requirements

### Requirement: Phase Final body completeness

`phase-final.md` SHALL contain a complete 9-section body. The node SHALL
declare `phase: final`, `gate: null`, and `stop: "no"`; it SHALL not declare a
`next` frontmatter field. It SHALL be a terminal node with no outgoing gate and
no normal next phase.

Delivery completion SHALL be evidenced by the existence of at least one report
file under the `final/` directory. Because `phase-final.md` is a terminal node
with `gate: null`, there is no gate CLI to write a `final_delivery` trace event,
and the charter prohibits hand-writing trace events. Therefore the delivery
fact is proven by file existence plus legal readiness-to-Final entry, not by a
`final_delivery` event.

#### Scenario: Final frontmatter contract

- **WHEN** `phase-final.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-final`,
  `phase: final`, `gate: null`, and `stop: "no"`
- **AND** it SHALL not contain a `next` frontmatter field
- **AND** `gate` being `null` SHALL mean no outgoing gate CLI runs after this
  phase

### Requirement: Final delivery is terminal non-interactive delivery and post-final feedback re-enters through HITL2

Final SHALL remain a terminal non-interactive delivery phase with `gate: null`,
no `next` frontmatter field, no hidden next phase, no hidden gate, no
recommendation/confirmation prompt, and no implicit loop.

#### Scenario: Final terminal frontmatter has no outgoing edge

- **WHEN** `phase-final.md` is loaded for terminal delivery
- **THEN** its frontmatter SHALL use `gate: null` and omit `next`
- **AND** that absence SHALL not create a hidden next phase, Final Gate, or
  Final-owned repair loop
