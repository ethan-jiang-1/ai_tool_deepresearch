> req: WNC-005

## MODIFIED Requirements

### Requirement: Final node terminal semantics

`phase-final.md` SHALL declare `gate: null`, `stop: "yes"`, and no `next`
frontmatter field. It SHALL remain the terminal node for the current lifecycle
delivery pass and SHALL NOT own an outgoing Gate, normal next phase, transition-
table edge, or status transition.

Final's `stop: "yes"` SHALL be a Final-specific interaction placement, not the
generic HITL meaning “wait before executing the loaded node.” Whenever the
current legal Final lineage has no report bound to it, the Agent SHALL execute
Final and publish before waiting: `final/final.md` after entry admitted the
bundle's empty first inventory, or global `latest + 1` after a later audited
rerun whose new Final load admitted the exact event-bound prior inventory. The
existing Readiness status synchronization SHALL precede either publication.
After that commit the same loaded node SHALL invite and wait for feedback;
presentation-only requests SHALL be applied as CAS updates of the current
latest primary bytes (version number unchanged, REVISIONS.md audited, no new
primary file allocated), and the node SHALL wait again. This in-place
interaction SHALL not be represented as a self-transition, hidden loop edge,
Gate retry, or third HITL decision checkpoint.

Feedback that expands the verified research boundary SHALL use the accepted
post-final rerun operation and its legal handoff, and the resulting legal Final
delivery SHALL allocate a new global version. Presentation-only feedback SHALL
remain inside Final, SHALL not be routed through HITL2 or post-final rerun, and
SHALL not advance the global version number.

#### Scenario: Final node is terminal

- **WHEN** the loader reads `phase-final.md` metadata or the Final manifest entry
- **THEN** `gate` SHALL be `null`, `stop` SHALL be `"yes"`, and `next` SHALL be absent
- **AND** the transition table SHALL have no Final source edge

#### Scenario: Current Final delivery executes before waiting

- **WHEN** Final is legally loaded, its Readiness status synchronization is complete, and direct lineage/inventory facts show no report bound to the current Final lineage
- **THEN** `stop: "yes"` SHALL direct the Agent to publish and present the current-lineage report
- **AND** it SHALL not wait for another user decision before that publication

#### Scenario: Committed Final remains on the same node

- **WHEN** the first or a presentation-revised primary report commits
- **THEN** the current lifecycle coordinate SHALL remain `phases/phase-final.md`
- **AND** the Agent MAY await bounded presentation feedback without a transition or Gate

#### Scenario: Presentation-only feedback CAS-updates the current version

- **WHEN** a user gives presentation-only feedback after a committed report
- **THEN** the Final Agent SHALL apply a CAS update of the current latest primary bytes
- **AND** the version number SHALL NOT change and no new primary file SHALL be allocated
