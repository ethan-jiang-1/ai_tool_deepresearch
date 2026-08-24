> req: RWP-023

## ADDED Requirements

### Requirement: Wave0 phase guidance SHALL document the deferred-selector precondition and explicit-entry recovery

Wave0 phase guidance SHALL present the contribution-wide
`wave0_evidence.deferred_contribution` selector with its disposition-
compatibility precondition: the form is legal only while every identity of the
selected contribution is unprojected or already holds the same deferred
disposition, and a different persisted projection rejects the whole packet
atomically before any mutation. When part of a contribution is already
explicitly projected, the guidance SHALL direct the Phase Agent to apply
explicit `wave0_evidence` entries for each remaining authoritative ordinal and
then rerun the same inspect, instead of using the selector for the remainder.

#### Scenario: Phase guidance states the precondition

- **WHEN** a Phase Agent reads the deferred disposition guidance in `phase-wave0.md`
- **THEN** the text SHALL state the all-or-nothing disposition-compatibility condition
- **AND** it SHALL direct a mixed contribution to explicit remaining-ordinal packets plus the same inspect rerun

#### Scenario: No new writer or repair authority

- **WHEN** the guidance documents the recovery
- **THEN** it SHALL not hand-edit a seed, index, ledger, receipt, or trace
- **AND** it SHALL not describe the selector as a subset or partial operation
