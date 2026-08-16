## ADDED Requirements

### Requirement: Engine-owned recovery vocabulary export locks the decision table

The attempt-owned work-unit recovery `repair_kind` vocabulary SHALL have one engine-owned export surface (`DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs`) that names every attempt-owned recovery `repair_kind` the engine can emit and, for each value, its matching `operate-work-unit.mjs` CLI verb or an explicit no-verb boundary. The four attempt-owned recovery emission modules (`work-unit-transaction.mjs`, `work-unit-supersession.mjs`, `work-unit-submit-integrity.mjs`, `work-unit-attempt-disposition.mjs`) SHALL reference that export instead of emitting bare attempt-owned recovery `repair_kind` string literals. The deterministic decision-table regression SHALL derive its table-row set from that export, SHALL assert one `RUN.md` decision-table row per exported value with a matching CLI verb or an explicit wait/stop boundary, and SHALL fail when a bare attempt-owned recovery `repair_kind` string literal appears in an emission module.

#### Scenario: Table completeness follows the export

- **WHEN** the engine adds or renames an attempt-owned recovery `repair_kind`
- **THEN** the export SHALL be the single surface naming that value
- **AND** the deterministic regression SHALL fail until `RUN.md` carries a row for the value and the CLI-verb map covers it

#### Scenario: Emission modules reference the export

- **WHEN** an attempt-owned recovery emission point emits a `repair_kind` value
- **THEN** it SHALL reference the export constant rather than a bare string literal
- **AND** the deterministic regression SHALL fail when a bare attempt-owned recovery `repair_kind` literal appears in the four emission modules

#### Scenario: Non-recovery vocabularies stay untouched

- **WHEN** a gate-hint, topic-state, or entry-surface `repair_kind` value is emitted
- **THEN** it SHALL NOT be renamed or folded into the attempt-owned recovery export
- **AND** the export SHALL NOT claim ownership of those vocabularies
