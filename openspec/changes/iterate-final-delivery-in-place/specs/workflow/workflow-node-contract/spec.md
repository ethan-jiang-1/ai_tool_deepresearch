> req: WNC-005, WNC-008

## RENAMED Requirements

- FROM: `### Requirement: Autonomous contract header injection for lifecycle stop:no phases`
- TO: `### Requirement: Lifecycle contract header injection follows node interaction semantics`

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
After that commit the same loaded node SHALL invite and wait for feedback, publish immutable
revisions for presentation-only requests, and wait again. This in-place
interaction SHALL not be represented as a self-transition, hidden loop edge,
Gate retry, or third HITL decision checkpoint.

Feedback that expands the verified research boundary SHALL use the accepted
post-final rerun operation and its legal handoff. Presentation-only feedback
SHALL remain inside Final and SHALL not be routed through HITL2 or post-final
rerun.

#### Scenario: Final node is terminal

- **WHEN** the loader reads `phase-final.md` metadata or the Final manifest entry
- **THEN** `gate` SHALL be `null`, `stop` SHALL be `"yes"`, and `next` SHALL be absent
- **AND** the transition table SHALL have no Final source edge

#### Scenario: Current Final delivery executes before waiting

- **WHEN** Final is legally loaded, its Readiness status synchronization is complete, and direct lineage/inventory facts show no report bound to the current Final lineage
- **THEN** `stop: "yes"` SHALL direct the Agent to publish and present the current-lineage report
- **AND** it SHALL not wait for another user decision before that publication

#### Scenario: Committed Final remains on the same node

- **WHEN** the first or a revised primary report commits
- **THEN** the current lifecycle coordinate SHALL remain `phases/phase-final.md`
- **AND** the Agent MAY await bounded presentation feedback without a transition or Gate

### Requirement: Lifecycle contract header injection follows node interaction semantics

Contract-header injection SHALL apply only to manifest lifecycle phases.
Work-unit task guidance and other non-lifecycle task surfaces SHALL NOT receive
lifecycle autonomous or terminal-delivery headers merely because their
frontmatter resembles a phase node.

For non-terminal lifecycle `stop: "no"` phases, the injected autonomous header
SHALL preserve silent execution:

- the Agent/framework SHALL NOT initiate questions, confirmations, progress,
  partial delivery, acknowledgements, idle reports, or continuation requests;
- the Agent SHALL continue node work, repair, strategy change, legal handoff
  consumption, or silent holding from direct runtime facts;
- an already-current user-initiated message SHALL be answered without creating
  a third HITL, permission, mutation/reentry authority, pause, or durable intent;
  and
- Engine header injection SHALL NOT inspect or classify chat state.

Terminal Final SHALL receive its separate terminal-delivery header even though
its frontmatter uses `stop: "yes"`. The loader SHALL recognize the manifest
Final plus `gate: null` combination before applying generic stop placement. It
SHALL preserve the existing loaded-node continuation cue
`interaction: terminal_delivery` and `next_action: deliver_final_artifacts` for
compatibility; the cue means execute the inventory-aware Final delivery
contract, not always create an unversioned report.

The terminal header SHALL require this order:

- when Final entry admitted an empty canonical primary inventory, publish and
  present the bundle base after the exact Readiness status synchronization and
  before any question or wait;
- when a newer route-bound Final load admitted its retired C5 prior inventory and
  the Readiness status window is synchronized with zero proven append, publish
  and present global `latest + 1` before any question or wait;
- when a primary report is bound to the current lineage, present or reground in
  the latest version and handle the current bounded feedback inside Final;
- after each committed report, invite concise natural-language feedback and
  wait without a Gate, status transition, or HITL2 mapping; and
- route only evidence-expanding feedback through the accepted audited rerun
  operation.

Header injection and continuation cues SHALL remain Agent-facing guidance
projections. They SHALL not establish publication, satisfaction, lifecycle,
interaction transport, routing, or permission facts.

#### Scenario: work-unit sub-agent guidance does not receive lifecycle header

- **WHEN** `assessNode()` loads work-unit sub-agent task guidance
- **THEN** it SHALL NOT inject a lifecycle header unless the file is a manifest lifecycle phase

#### Scenario: autonomous header prohibits initiation rather than every reply

- **WHEN** `assessNode()` loads a non-terminal manifest lifecycle phase with `stop: "no"`
- **THEN** the injected header SHALL prohibit framework-initiated surfacing and direct autonomous continuation
- **AND** it SHALL permit an answer to an already received user turn without changing lifecycle authority

#### Scenario: Final keeps terminal delivery header

- **WHEN** `assessNode()` loads manifest Final with `stop: "yes"` and `gate: null`
- **THEN** it SHALL inject the Final terminal-delivery/refinement header rather than a generic HITL wait header
- **AND** the loaded-node cue SHALL retain `terminal_delivery` / `deliver_final_artifacts`
- **AND** the header SHALL require current-lineage delivery before feedback when the bundle base or a post-rerun append is still pending

#### Scenario: Current-lineage Final inventory resumes refinement

- **WHEN** Final is loaded or reloaded with a canonical primary report proven for the current legal Final lineage
- **THEN** the header SHALL direct the Agent to the latest report and bounded feedback interaction
- **AND** it SHALL not claim a new phase entry, Gate, status transition, or automatic report publication
