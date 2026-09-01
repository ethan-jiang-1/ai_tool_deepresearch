## MODIFIED Requirements

### Requirement: File observability names its feedback field repair_directive

> req: FIO-008

The file-observability feedback surface SHALL name its single repair/directive field `repair_directive`, distinct from the gate/phase and work-unit `repair_kind` fields. Its value SHALL remain the closed six-value set `materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`. The emitter (`the file-observability helper`) and its consumer (`the check-reentry CLI`) SHALL use `repair_directive`, and deterministic regression SHALL fail when a `repair_kind` literal appears in the file-observability emission surface.

The six-value closed set SHALL exist as one code-derived frozen export in the file-observability helper. The emitter SHALL take every `repair_directive` value from that export, and the export SHALL be registered in the enum-restatement governance checker so that closed-vocabulary restatements in specs, glossary prose, or documentation are validated against the code-derived set exactly like `GATE_REPAIR_KINDS` and `WORK_UNIT_RECOVERY_ACTIONS`. The export SHALL NOT introduce a second spelling, alias, or parallel literal set for any of the six values.

#### Scenario: Field name disambiguates the three repair vocabularies

- **WHEN** an Agent reads a file-observability finding
- **THEN** it SHALL see `repair_directive` naming the file-observability repair action
- **AND** the gate/phase and work-unit `repair_kind` fields SHALL remain unchanged and unambiguous

#### Scenario: Renamed field is locked by regression

- **WHEN** the emitter or its consumer reintroduces a file-observability `repair_kind` literal
- **THEN** the deterministic regression SHALL fail at the emission surface

#### Scenario: Directive values are pinned to one code-derived export

- **WHEN** any code surface needs a file-observability `repair_directive` value
- **THEN** it SHALL reference the single frozen export instead of a string literal
- **AND** the enum-restatement governance check SHALL treat the export as the executable source for that closed set

#### Scenario: Prose restatement drift fails governance

- **WHEN** a spec, glossary row, or documentation restates the six-value set and the code-derived export changes without updating the restatement
- **THEN** the enum-restatement governance check SHALL fail naming the drifted restatement
