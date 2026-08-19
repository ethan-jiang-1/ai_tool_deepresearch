> req: PRP-016

## ADDED Requirements

### Requirement: Research phases SHALL consume baseline and current accepted amendments without reconstructing chat

Seed Topics, Wave0, Wave1, Wave2, and Final guidance SHALL use the original
User Research Controls coordinate as the HITL1 baseline when controls are
present. For a rerun created under the current contract, guidance SHALL also
read the newest complete `rb_plan.md## Decisions` revision whose target count
matches the current accepted rerun count, plus each affected Topic's matching
current direction where that Topic is being acted on. Older revisions and
stale/future/invalid directions remain history or repair context, not current
instructions.

Seed Topics SHALL project baseline controls into existing topic-local
enrichment/body whenever they materially affect that Topic. Wave and Final
guidance SHALL read the source coordinates in addition to their existing
profile, Topic, evidence, coverage, and delivery inputs; a derived projection
SHALL NOT replace its source. No-controls, no-rerun, and readable legacy bundles
without Decisions revisions SHALL preserve their existing paths without copied
empty context, inferred history, or a new blocking Gate.

#### Scenario: Initial run consumes only applicable baseline intent

- **WHEN** HITL1 controls materially constrain one Topic but not another
- **THEN** Seed guidance SHALL project only the applicable constraint into the affected Topic's existing authoring surface
- **AND** later phases SHALL retain the original controls coordinate as the baseline source

#### Scenario: Rerun consumes current revision rather than historical union

- **WHEN** the current count is 2 and Decisions contains complete revisions for rounds 1 and 2
- **THEN** Wave and Final guidance SHALL combine the baseline with round 2's complete active amendments
- **AND** round 1 SHALL remain visible history but SHALL NOT independently reactivate withdrawn work

#### Scenario: Legacy missing revision remains readable

- **WHEN** an already-existing readable rerun bundle has profile/direction facts but no Decisions revision
- **THEN** the existing compatibility path SHALL remain readable
- **AND** no phase SHALL fabricate an amendment history from old artifacts, direction prose, or filenames
