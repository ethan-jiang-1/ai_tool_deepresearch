> req: WAI-012

## ADDED Requirements

### Requirement: Focus coverage SHALL derive from current accepted intent and current-round backing

When accepted current intent creates a material Wave1 commitment for a Topic,
the Phase Agent SHALL derive the smallest readable commitment set for the
existing optional `focus_coverage` block. In round 0, the positive intent
sources are the applicable User Research Controls baseline and current
canonical Seed projection. In rerun N, they are that baseline, the newest
complete Decisions revision for N, and the Topic's matching direction for N.
Profile prose, filenames, older revisions, stale/future/invalid directions,
and historical submitted work SHALL NOT independently create a current
commitment.

The declaration SHALL preserve the existing Topic UID, rerun count, outcome,
commitment, and submitted-ref contract. `covered` SHALL use only reviewed,
hash-valid submitted Wave1 refs for the current round. A commitment may remain
`limited` only after existing authorized Wave1 repair is exhausted and the
current boundary is `external_action`, `user_decision`, or
`missing_contract`; it SHALL not use limitation as a shortcut around available
supplementary work. This projection records requirement coverage, not user
wording, semantic quality, or permission.

#### Scenario: Initial focus uses baseline and Seed projection

- **WHEN** an HITL1 control creates a material round-0 commitment for one Topic
- **THEN** its focus coverage SHALL be derived from the baseline and current Seed interpretation
- **AND** covered status SHALL require explicit round-0 submitted backing under the existing contract

#### Scenario: Second rerun excludes withdrawn first-round commitment

- **WHEN** the newest round-2 revision withdraws a round-1 commitment
- **THEN** the round-2 focus coverage set SHALL not recreate that commitment from the older revision or historical work
- **AND** the older coverage remains historical rather than current proof

#### Scenario: Available supplementary work prevents false limitation

- **WHEN** an uncovered current commitment has an existing legal supplementary Wave1 repair
- **THEN** the Phase Agent SHALL execute that queue/work-unit path and rerun the same inspect
- **AND** it SHALL not mark the commitment limited merely to close the round
