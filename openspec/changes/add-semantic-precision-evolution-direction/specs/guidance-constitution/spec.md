> req: GCO-007, GCO-008

## ADDED Requirements

### Requirement: Semantic precision makes abstraction reviewable

The guidance suite SHALL maintain `guidelines/evolution-semantic-precision.md` as a Charter-companion evolution direction. It SHALL preserve the EWD 340 primary-source quotation and its finite-reasoning/new-semantic-level context, then require future design to identify a bounded decision, a named semantic object, decision-relevant distinctions, a reader-facing Interface, and the legal action or honest no-path implied by the direct authority.

The direction SHALL require a new abstraction to reduce lower-layer reconstruction or conceptual clutter for that decision. It SHALL NOT use guidance prose to create runtime authority, turn Markdown into deterministic truth, require Engine judgment of research semantics, prescribe a controller/state/validator, or invalidate accepted behavior outside a focused OpenSpec change.

#### Scenario: A proposed abstraction is evaluated at its semantic level

- **WHEN** a proposal or design introduces a state, projection, Module, feedback surface, or workflow concept
- **THEN** its semantic-precision review identifies the bounded decision and semantic object it makes more exact
- **AND** it states which distinctions remain essential to truth, authority, legal action, or evidence scope rather than hiding them behind a new name

#### Scenario: Semantic research judgment remains outside deterministic authority

- **WHEN** a design applies the semantic-precision direction to evidence selection, research relevance, or synthesis quality
- **THEN** it states the applicable evidence or review boundary for that judgment
- **AND** it SHALL NOT claim that the direction authorizes Engine/CLI to make that semantic judgment as a deterministic verdict

### Requirement: Evolution directions route every new design through three ordered reviews

The Project Charter, Guidelines Index, OpenSpec proposal/design context, existing Evolution Directions, and active guideline navigation surfaces SHALL route future relevant work through the three canonical directions in order: semantic precision, simple reliable control, then helper-oriented action responsibility.

The route SHALL make `guidelines/evolution-semantic-precision.md` discoverable beside the existing two companions. It SHALL preserve their distinct ownership: semantic precision chooses the justified semantic level; simple reliable control limits control complexity; helper-oriented guidance assigns decision and legal mechanical execution responsibility. The route SHALL NOT claim that all existing historical artifacts were retroactively reviewed or modify archived/closed records solely to rename the route.

#### Scenario: A future proposal receives the three-direction review route

- **WHEN** an author starts a new architecture, recovery, mutation, Agent-facing, state, projection, or interface design
- **THEN** `openspec/config.yaml` directs the author to complete semantic-precision, simplicity, and helper reviews in that order
- **AND** the Charter and Guidelines Index expose the same three canonical paths

#### Scenario: Active guidance navigation does not retain a two-direction-only route

- **WHEN** an Agent reads an active guideline that lists Evolution Directions in its siblings or related navigation
- **THEN** that navigation includes the semantic-precision canonical path alongside the existing companions
- **AND** archived OpenSpec and closed backlog records remain outside this active-navigation migration
