> req: REI-006

## ADDED Requirements

### Requirement: Rerun scope changes SHALL use canonical topic-state operations

The rerun Phase Agent SHALL translate the recorded HITL2 rationale into an explicit topic adjustment plan, but SHALL use `operate-topic-state register|rename|renumber` to commit identity/intent changes before seed/wave work. The Agent SHALL consume structured blockers, drain active owners through their existing commands, and rerun the same topic operation. Direct multi-file edits or a parallel addendum path SHALL NOT count as rerun preparation.

#### Scenario: Added rerun topic is materialized first
- **WHEN** HITL2 rerun requires a new topic
- **THEN** the Agent SHALL register its minimum durable intent and seed projection before queueing Wave0/Wave1 work

#### Scenario: Unsanctioned post-final request remains blocked
- **WHEN** a post-final request cannot legally enter the existing rerun phase
- **THEN** topic-state operations SHALL NOT be used to bypass reentry
- **AND** the result SHALL preserve the missing C5 recovery contract boundary
