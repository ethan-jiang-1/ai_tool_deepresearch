> req: DEW-019

## ADDED Requirements

### Requirement: Work-unit provenance SHALL inherit UID-bound queue identity without duplicate fields

When topic-scoped demand is claimed, the existing immutable `manifest.queue_item` snapshot SHALL preserve canonical payload UID and the current slug observed at enqueue. Submit/provenance readers SHALL resolve topic identity from that snapshot and the ledger's existing `work_unit_ref`; WorkUnitResultSchema and WorkUnitLedgerRecordSchema SHALL NOT gain duplicate topic fields. Historical slug-only queue snapshots MAY resolve through unique registry layout history. Layout mutation SHALL never edit receipt, actor, result, work-unit or ledger facts.

#### Scenario: Claim snapshot carries existing queue binding
- **WHEN** a topic-scoped demand is claimed after C3B activation
- **THEN** its existing manifest queue-item snapshot SHALL carry the same canonical payload UID and current slug
- **AND** result and ledger schemas SHALL remain free of duplicate topic identity fields

#### Scenario: Historical record remains byte-stable
- **WHEN** its topic is later renamed or renumbered
- **THEN** the submitted work-unit and ledger bytes SHALL remain unchanged
- **AND** shared inspection SHALL resolve the snapshot's previous slug to the current UID while preserving its recorded output paths
