> req: RWP-022

## ADDED Requirements

### Requirement: Wave phases SHALL carry current intent at their actual decision points

Wave0 SHALL author current-intent `task_brief` content when it creates its own
`source_intake_fan_in` demand; Seed Topics SHALL NOT pre-author a future Wave0
queue action or brief. Wave1 SHALL author the brief at initial or supplementary
topic-deepening enqueue and use current intent when forming the existing
topic/round-bound focus commitments. Wave2 SHALL author the brief for each
targeted-evidence demand and, before pure synthesis, read the baseline, current
revision, matching directions, current Wave1 coverage, carried-target receipt,
finding index, and verified backing.

For an initial round, applicable intent comes from the controls baseline and
current canonical Seed projection. For a rerun, it comes from that baseline,
the newest complete matching Decisions revision, and matching current Topic
direction. Each phase SHALL retain no-controls/no-current-amendment behavior,
SHALL keep older revisions and nonmatching directions as history, and SHALL not
invent a new queue kind, direct-search path, Gate, user checkpoint, or intent
schema.

#### Scenario: Wave0 owns its future delegated brief

- **WHEN** Wave0 fills source-intake demand for an affected Topic
- **THEN** Wave0 itself SHALL author the current task brief before claim
- **AND** it SHALL not depend on Seed Topics having predicted or written a future queue item

#### Scenario: Wave1 supplemental work retains current objective

- **WHEN** current intent requires supplementary Wave1 evidence for a Topic
- **THEN** the Phase Agent SHALL carry the bounded objective and source coordinates into the existing supplementary demand
- **AND** existing claim, dry-submit, submit, depth-review, and same-inspect ownership SHALL remain unchanged

#### Scenario: Wave2 synthesis does not use stale intent

- **WHEN** Wave2 begins pure synthesis after two reruns
- **THEN** it SHALL use the newest complete revision and matching current directions with current coverage/backing
- **AND** it SHALL not treat an older revision, stale direction, or historical work as the current amendment set
