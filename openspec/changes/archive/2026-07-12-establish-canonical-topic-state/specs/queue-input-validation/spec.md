> req: QIV-006

## ADDED Requirements

### Requirement: Topic enqueue SHALL require committed canonical seed binding

Without changing the queue schema, topic-scoped enqueue SHALL reuse the same topic-state registry/seed/workspace evaluator used by inspect. Before queue mutation it SHALL require a canonical plan entry for the resolved current slug, an exact UID-bound seed projection, and no accepted topic-state workspace affecting the bundle. Legacy plan mode, missing/mismatched seed, or accepted workspace SHALL reject with one nearest reachable lifecycle/migrate/repair/recover action. It SHALL NOT recommend `migrate_legacy` as immediately reachable outside sanctioned rerun. Existing finding-scoped non-topic exceptions remain unchanged.

#### Scenario: Plan-first crash cannot enqueue work
- **WHEN** topic-state apply has committed new plan bytes but an accepted workspace still has pending seed replacements
- **THEN** topic-scoped enqueue SHALL reject without changing queue state
- **AND** the result SHALL return the exact recover action

#### Scenario: Canonical topic enqueue preserves existing slug contract
- **WHEN** a topic slug resolves to a canonical entry, its UID-bound seed matches, and no workspace remains
- **THEN** existing topic-slug validation MAY continue and enqueue SHALL not require a queue schema migration in C3A

#### Scenario: Legacy enqueue does not advertise unreachable migration
- **WHEN** topic-scoped enqueue reads a legacy plan outside sanctioned rerun
- **THEN** enqueue SHALL reject without queue mutation and identify the legal rerun/C5 boundary
- **AND** SHALL NOT present a direct migrate command as currently authorized
