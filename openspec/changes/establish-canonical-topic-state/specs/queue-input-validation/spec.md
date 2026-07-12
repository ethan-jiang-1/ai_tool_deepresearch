> req: QIV-006

## ADDED Requirements

### Requirement: Topic-scoped queue demand SHALL bind stable canonical identity

Topic-scoped enqueue and work-unit allocation SHALL require a canonical `topic_uid`; a supplied slug SHALL match the current registry projection for that UID. Legacy slug-only demand MAY be reported as migration-required but SHALL NOT authorize new work for an unmaterialized or ambiguous topic. Finding-scoped non-topic demand retains its existing exception.

#### Scenario: Stable UID survives rename
- **WHEN** a queued topic demand names a valid topic UID and its current slug projection
- **THEN** validation SHALL bind demand identity to the UID
- **AND** a later legal rename SHALL not reinterpret it as a different topic

#### Scenario: Stale slug is rejected before enqueue
- **WHEN** a task uses a valid topic UID with a slug that no longer matches the canonical registry
- **THEN** enqueue SHALL reject without changing the queue
- **AND** the result SHALL report the current canonical slug
