## MODIFIED Requirements

### Requirement: Topic enqueue SHALL require committed canonical seed binding

Without changing the queue schema, topic-scoped enqueue SHALL reuse the same
topic-state registry/seed/workspace evaluator used by inspect. Before queue
mutation it SHALL require a schema-valid canonical plan entry for the resolved
current slug, an exact UID-bound seed projection, and no accepted topic-state
workspace affecting the bundle.

A legacy mutable plan, missing/mismatched seed, or accepted workspace SHALL
reject without queue mutation and return the existing nearest direct
schema/seed/workspace boundary. A noncanonical plan SHALL not advertise a
sanctioned rerun, `migrate_legacy`, adoption, upgrade, raw-YAML repair, or any
other current Engine conversion as a legal action. Existing finding-scoped
non-topic exceptions remain unchanged.

#### Scenario: Plan-first crash cannot enqueue work

- **WHEN** topic-state apply has committed new plan bytes but an accepted
  workspace still has pending seed replacements
- **THEN** topic-scoped enqueue SHALL reject without changing queue state
- **AND** the result SHALL return the exact recover action

#### Scenario: Canonical topic enqueue preserves existing slug contract

- **WHEN** a topic slug resolves to a canonical entry, its UID-bound seed
  matches, and no workspace remains
- **THEN** existing topic-slug validation MAY continue and enqueue SHALL not
  require a queue schema migration

#### Scenario: Legacy enqueue does not advertise unreachable migration

- **WHEN** topic-scoped enqueue reads a plan that fails the current canonical
  plan contract
- **THEN** enqueue SHALL reject without queue mutation at its existing current
  plan/topic-state boundary
- **AND** it SHALL not present a direct or deferred migrate, adoption, upgrade,
  or conversion command
