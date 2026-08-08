# Wave1 Intake — Delta

> req: WAI-009, WAI-010

## ADDED Requirements

### Requirement: Reference-floor-deficit feedback SHALL name the depth-review sync for supplementary work units

When a Wave1 supplementary `wave1_topic_deepening` work unit is submitted and the
topic's reference floor is still below target, the reference-floor-deficit
feedback SHALL check whether the submitted supplementary work unit is missing
from `depth-review.yaml#reviewed_work_unit_refs` and, when it is, name that
update as the first repair action. The supplementary evidence SHALL NOT appear
to have no effect because the depth review was not updated.

#### Scenario: supplementary work unit missing from depth review is named

- **WHEN** a submitted supplementary Wave1 work unit is not listed in the
  topic's `depth-review.yaml#reviewed_work_unit_refs` and the reference floor is
  still below target
- **THEN** the feedback names the depth-review update and the exact work-unit
  ref to add
- **AND** the feedback directs the Agent to rerun the same Wave1 inspect after
  the update

#### Scenario: depth review already includes the supplementary work unit

- **WHEN** the depth review already lists the submitted supplementary work unit
- **THEN** the reference-floor-deficit feedback does not repeat the depth-review
  sync and proceeds to the materialization or supplementary-demand root

### Requirement: Wave1 reference-floor inspect SHALL surface canonical reference targets

The Wave1 reference-floor inspect SHALL surface, for each materializable
submitted backing candidate whose canonical consumer projection is missing, the
exact canonical `reference/{topic.slug}-{token}-{digest}.md` target and the
submitted source/cache/work-unit refs needed to close it. The Phase Agent SHALL
be able to materialize the closing projection from inspect feedback alone.

#### Scenario: candidate target path is emitted in feedback

- **WHEN** a Wave1 submitted backing candidate lacks its canonical consumer
  projection
- **THEN** the inspect feedback emits the exact canonical target path and the
  candidate's submitted source/cache/work-unit refs
