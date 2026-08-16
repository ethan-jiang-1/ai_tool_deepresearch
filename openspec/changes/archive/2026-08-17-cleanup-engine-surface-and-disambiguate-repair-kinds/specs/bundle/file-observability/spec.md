## ADDED Requirements

### Requirement: File observability names its feedback field repair_directive

The file-observability feedback surface SHALL name its single repair/directive field `repair_directive`, distinct from the gate/phase and work-unit `repair_kind` fields. Its value SHALL remain the closed six-value set `materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`. The emitter (`engine/helpers/file-observability.mjs`) and its consumer (`cli/check-reentry.mjs`) SHALL use `repair_directive`, and deterministic regression SHALL fail when a `repair_kind` literal appears in the file-observability emission surface.

#### Scenario: Field name disambiguates the three repair vocabularies

- **WHEN** an Agent reads a file-observability finding
- **THEN** it SHALL see `repair_directive` naming the file-observability repair action
- **AND** the gate/phase and work-unit `repair_kind` fields SHALL remain unchanged and unambiguous

#### Scenario: Renamed field is locked by regression

- **WHEN** the emitter or its consumer reintroduces a file-observability `repair_kind` literal
- **THEN** the deterministic regression SHALL fail at the emission surface
