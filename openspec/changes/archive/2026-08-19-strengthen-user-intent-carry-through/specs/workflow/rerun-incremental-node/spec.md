> req: REI-007

## ADDED Requirements

### Requirement: Rerun preparation SHALL materialize one target-round intent revision before topic-state planning

For every legal rerun, `phase-rerun` SHALL first run the existing read-only
topic-state inspect and resolve any accepted workspace through its exact recover
owner. Once no accepted workspace remains, the phase SHALL compute the existing
`target_rerun_count = profile.rerun_count + 1`, read the accepted route-bound
rationale and current host file, and write or reuse exactly one complete
target-round revision under `rb_plan.md## Decisions`. It SHALL then rerun
topic-state inspect and only from that fresh post-revision baseline construct
the retained topic-state candidate. The revision SHALL use PHS-009's complete
shape and SHALL be the newest accepted entry. Topic adjustment and direction
candidates SHALL be derived from the same accepted rationale and current
revision.

A complete revision for the same target and accepted rationale SHALL be reused
after interruption rather than duplicated. A target-round draft is accepted
history only after every required part is present and the Phase Agent has
re-read the host file. An interrupted incomplete target-round draft MAY be
repaired before topic-state candidate creation; a conflicting or duplicate
complete target-round revision SHALL be preserved and exposed as a plan
ambiguity rather than overwritten or arbitrarily selected. Complete older
revisions SHALL never be edited.

After the revision is durable, the phase SHALL run the existing topic-state
inspect, build the current retained candidate against those plan bytes, and use
the existing topic-state apply/recover path. Each affected Topic's
`rationale_excerpt` SHALL be a bounded topic-local explanation of why that
Topic is affected by the current revision. It SHALL NOT copy the complete user
wording or require identical text across Topics. Profile count increment,
matching-direction resolution, Gate, lineage, and topic-state transaction
authority SHALL remain unchanged.

#### Scenario: Crash after revision write reuses the same target entry

- **WHEN** phase-rerun writes and re-reads a complete target-round revision but stops before topic-state apply
- **THEN** resumed phase-rerun SHALL reuse that revision and continue with topic-state inspect
- **AND** it SHALL not append a second revision for the same accepted target and rationale

#### Scenario: Revision precedes the plan hash used by topic-state

- **WHEN** phase-rerun prepares an add, intent update, or direction-only candidate
- **THEN** its post-revision topic-state inspect/candidate SHALL observe the plan bytes that already contain the current revision
- **AND** successful apply/recovery SHALL preserve that revision while publishing existing Topic/direction changes

#### Scenario: Existing workspace keeps recovery ownership before revision write

- **WHEN** the initial read-only topic-state inspect reports an accepted workspace
- **THEN** phase-rerun SHALL run only its exact recover operation before writing or repairing a Decisions revision
- **AND** it SHALL not mutate plan bytes, submit new semantics, or create a competing recovery path while that workspace owns recovery

#### Scenario: Topic excerpts remain bounded and distinct

- **WHEN** one accepted revision affects two Topics for different reasons
- **THEN** each matching direction SHALL contain its own topic-local rationale excerpt
- **AND** neither excerpt SHALL be required to reproduce the complete user wording or match the other Topic's text

#### Scenario: Conflicting complete target revisions fail without destructive repair

- **WHEN** Decisions contains two conflicting complete entries for the same target count
- **THEN** phase-rerun SHALL not overwrite either entry, choose one by file order, apply topic state, or increment the profile
- **AND** it SHALL expose the host-file ambiguity as the current plan repair boundary without creating a new Gate or recovery controller
