> req: CTS-011

## ADDED Requirements

### Requirement: Wave0 deferred-contribution guidance and feedback SHALL state the disposition-compatibility precondition and explicit-entry recovery

The existing contribution-wide `deferred_contribution` selector SHALL be
documented as all-or-nothing with respect to disposition compatibility: it is
legal only while every identity of the selected submitted contribution is
unprojected, or already holds the same equivalent deferred disposition. When
any selected identity already has a different persisted projection (for example
an explicit materialized entry), the existing writer SHALL reject the whole
packet atomically before any workspace or seed mutation, and the collision
feedback SHALL name the direct legal recovery: apply explicit `wave0_evidence`
entries for each remaining authoritative ordinal, then rerun the same inspect.
The documented contract and the writer behavior SHALL NOT permit overwriting a
different disposition, silently converting the selector into a subset
operation, or a raw-edit repair path.

#### Scenario: Playbook states the precondition

- **WHEN** a reader loads the contribution-wide deferred form in the operate-topic-state command playbook
- **THEN** the text SHALL state that every selected identity must be unprojected or already an equivalent deferred entry
- **AND** it SHALL direct a mixed contribution to explicit remaining-ordinal packets and the same inspect rerun

#### Scenario: Collision feedback names the recovery

- **WHEN** the writer rejects a contribution-wide deferred packet because a selected identity has a different persisted disposition
- **THEN** the feedback SHALL name the direct legal recovery of explicit `wave0_evidence` entries for the remaining ordinals
- **AND** the existing atomic non-overwrite rejection SHALL remain unchanged

#### Scenario: Writer behavior is not changed

- **WHEN** an explicit materialization is followed by a deferred selector for the same contribution
- **THEN** the existing writer SHALL keep rejecting the whole packet before publication
- **AND** the existing regression test for that rejection SHALL remain green
