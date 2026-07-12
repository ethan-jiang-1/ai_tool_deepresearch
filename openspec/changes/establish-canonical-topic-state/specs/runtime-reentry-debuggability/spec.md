> req: RRD-009

## ADDED Requirements

### Requirement: Reentry recovery SHALL consume canonical topic-state inspection

Reentry diagnostics SHALL consume the side-effect-free canonical topic-state read model and group registry, seed, queue/work-unit and artifact drift for one topic UID into one root finding with at most one reachable nearest action. An accepted topic-state mutation workspace SHALL appear as a direct recovery blocker. Reentry SHALL not execute topic mutation, create identity, or persist the derived progress projection.

#### Scenario: One topic drift becomes one recovery root
- **WHEN** a topic has a registry/seed binding failure plus downstream orphan artifact symptoms
- **THEN** reentry SHALL emit one canonical topic-state root and mask derivative symptoms

#### Scenario: Clean canonical topic state adds no blocker
- **WHEN** registry, seed and direct progress facts are consistent and no accepted mutation workspace remains
- **THEN** topic-state integration SHALL add no reentry blocker and SHALL not mutate the bundle
