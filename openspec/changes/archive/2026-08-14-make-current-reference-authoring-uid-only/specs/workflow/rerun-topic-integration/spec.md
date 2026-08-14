## ADDED Requirements

### Requirement: Rerun reference authoring SHALL preserve canonical binding cardinality

Rerun-produced rich references SHALL use the same new-output cardinality forms
as normal materialization: scalar UID, all sentinel, or exact UID subset. A
rerun writer SHALL preserve the semantically selected Topic scope and SHALL not
reintroduce `related_topic` merely because current or previous layout aliases
are available for historical reading.

#### Scenario: Rerun subset remains exact after layout history exists

- **WHEN** a rerun materializes a cross-Topic reference for a selected subset
  whose Topics have previous layout coordinates
- **THEN** it SHALL write the selected current UID array
- **AND** it SHALL not replace that subset with prior slugs or `all`
