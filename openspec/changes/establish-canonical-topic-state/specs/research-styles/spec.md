> req: RES-007

## ADDED Requirements

### Requirement: Research style recomputation SHALL consume committed canonical topic count

Research-style parameter recomputation SHALL read topic count only from a successfully committed canonical registry and SHALL run after register/renumber commit when count changes. It SHALL ignore prepared/blocked topic-state workspaces and SHALL preserve unrelated profile sections through the existing profile owner.

#### Scenario: Register updates style count after commit
- **WHEN** a new topic registration commits and increases canonical registry length
- **THEN** research style parameters SHALL be recomputed from the new committed count
- **AND** no half-prepared mutation SHALL affect the profile
