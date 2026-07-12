> req: RRD-009

## ADDED Requirements

### Requirement: Reentry SHALL consume canonical topic-state inspection without mutation

Reentry diagnostics SHALL consume the side-effect-free topic-state read model and group registry, seed, queue/work-unit and artifact symptoms for one canonical UID into one root finding with at most one reachable nearest action. An accepted topic-state workspace SHALL be a direct blocker whose reachable action is the exact topic-state recover command. Reentry SHALL NOT execute apply/recover, persist progress or create identity.

When no accepted workspace exists, a post-final legacy or new-scope finding SHALL report the missing C5 reentry/mutation capability rather than presenting topic-state apply as reachable. An accepted prepared workspace remains recoverable after lifecycle drift because recovery finishes previously authorized bytes; this SHALL NOT make fresh post-final apply reachable.

#### Scenario: One UID drift becomes one root
- **WHEN** a topic has registry/seed binding failure plus derivative queue/artifact symptoms
- **THEN** reentry SHALL emit one topic-state root and mask derivative symptoms

#### Scenario: Clean topic state remains read-only
- **WHEN** identity/materialization/direct facts are consistent and no accepted workspace remains
- **THEN** integration SHALL add no blocker and mutate no bundle file

#### Scenario: Post-final legacy incident points to missing C5
- **WHEN** reentry inspects terminal final state with legacy topic state and no accepted topic-state workspace
- **THEN** it SHALL report the missing C5 reentry boundary
- **AND** SHALL NOT recommend migrate-legacy apply as a reachable action

#### Scenario: Post-final accepted workspace exposes exact recovery only
- **WHEN** terminal lifecycle state still contains an accepted prepared topic-state workspace
- **THEN** reentry SHALL expose the exact recover operation id
- **AND** SHALL NOT expose fresh apply or new semantic input
