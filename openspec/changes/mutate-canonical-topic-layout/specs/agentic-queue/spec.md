> req: AGQ-025

## ADDED Requirements

### Requirement: New topic-scoped demand SHALL bind canonical UID and current slug

New topic-scoped queue demand SHALL store canonical `payload.topic_uid` together with current `payload.topic_slug`. The Engine SHALL derive and persist UID from a valid current slug when the caller omits UID; a caller-supplied UID and any lineage topic projection SHALL match. Queue schema version SHALL remain unchanged. Existing terminal history SHALL remain immutable; nonterminal topic demand SHALL block layout mutation and SHALL be drained, submitted, repaired or terminalized through the existing queue/work-unit owner before retry.

#### Scenario: Current UID and slug enqueue together
- **WHEN** enqueue targets a committed canonical topic using its current slug
- **THEN** the Engine SHALL persist matching topic UID and current slug binding without requiring the Agent to calculate UID

#### Scenario: Nonterminal demand blocks layout mutation
- **WHEN** a target UID has queued, running or delegated-in-flight demand
- **THEN** topic-state apply SHALL return the existing owner and one nearest drain or terminalization action
- **AND** SHALL NOT rewrite queue state itself
