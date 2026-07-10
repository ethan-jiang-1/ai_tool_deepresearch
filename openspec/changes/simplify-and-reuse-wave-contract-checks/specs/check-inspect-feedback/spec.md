> req: CHI-001

## MODIFIED Requirements

### Requirement: Inspect diagnoses Check failures and generates feedback

When Inspect reports multiple failures from the same checkpoint, it SHALL distinguish root causes from downstream symptoms whenever the Engine can determine the dependency. A prerequisite failure SHALL short-circuit dependent checks in the primary Agent-facing feedback when those checks cannot produce an independent repair action.

Primary `inspect[]` and `advice[]` SHALL present the smallest actionable root-cause set and one nearest repair target per root cause. Complete post-mortem detail MAY be preserved in durable diagnostic artifacts, but SHALL NOT be repeated as a large flat wall of derivative failures in primary feedback.

Advice SHALL avoid manual edits to deterministic authority files when a valid Engine path exists, and SHALL not encode presentation preferences as blocking when direct structured authority already proves the required fact.

#### Scenario: Root cause short-circuits symptoms

- **WHEN** a missing or unparseable parent artifact causes downstream provenance, enum, eligibility, or backing checks to become non-actionable
- **THEN** Inspect SHALL present the parent artifact failure as the primary root cause
- **AND** dependent failures SHALL be suppressed or grouped as durable downstream detail

#### Scenario: Advice stays actionable

- **WHEN** a checkpoint detects several independent root causes
- **THEN** advice SHALL provide one nearest repair target for each root cause
- **AND** it SHALL NOT contain conflicting manual repair instructions for authority files

#### Scenario: Presentation preference does not obscure authority

- **WHEN** a Markdown presentation difference is semantically equivalent and direct structured authority is valid
- **THEN** Inspect SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT displace the direct authority result
