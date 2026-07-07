## MODIFIED Requirements

> req: WPG-001, WPG-002, WPG-003, WPG-007, WPG-008, WPG-009, WPG-010

### Requirement: Gate diagnostics SHALL carry work-unit binding context

Work-unit provenance diagnostics SHALL carry `work_id` when available, `queue_item_id` when available, `wave`, `kind`, check name, and mismatched surface refs. Diagnostics SHALL use work-unit binding context rather than non-work-unit channel keys.

Current diagnostics SHALL NOT use retired channel keys, non-work-unit paths, or old result-reference fields as the primary identity for delegated provenance. If a retired token is named, it SHALL be framed only as rejected, non-authoritative, or removed.

Current provenance identity SHALL prefer `work_id`, `queue_item_id`, `kind`, work-unit receipt nonce, submitted ledger row, and work-unit binding surfaces.

When provenance drift is detected, the gate SHALL preserve valid submitted-row context where it can do so independently. A cache coverage failure SHALL NOT by itself make every otherwise hash-valid submitted ledger row unreadable. If a ledger row hash mismatch or manual row edit is detected, diagnostics SHALL distinguish that root cause from downstream missing-coverage symptoms.

#### Scenario: mismatch diagnostic identifies work unit

- **WHEN** a result hash mismatch is found for a submitted work unit
- **THEN** the diagnostic SHALL include `work_id`, `queue_item_id`, `wave`, and `kind`
- **AND** it SHALL identify the mismatched work-unit surfaces

#### Scenario: retired identity is not primary context

- **WHEN** a provenance diagnostic mentions a retired delegated artifact
- **THEN** the diagnostic SHALL identify it as rejected or non-authoritative
- **AND** the diagnostic SHALL use work-unit binding context for current delegated provenance whenever available

#### Scenario: retired event is not provenance authority

- **WHEN** a current provenance playbook or diagnostic mentions a retired delegated event
- **THEN** that event SHALL be framed as retired or non-authoritative
- **AND** submitted work-unit ledger and binding surfaces SHALL remain the only delegated provenance authority

#### Scenario: manual ledger drift receives root-cause repair advice

- **WHEN** a submitted ledger row fails hash verification or does not bind to `_work_units/_index.json`
- **THEN** diagnostics SHALL identify ledger/manual-edit drift as the root cause
- **AND** advice SHALL direct restoration, retry/replacement submit, or Engine-mediated ledger repair if available
- **AND** advice SHALL NOT tell the Agent to edit `rb_output_declarations.jsonl` by hand

#### Scenario: cache coverage failure does not erase valid ledger context

- **WHEN** a submitted work-unit ledger row is hash-valid but one declared cache trail leaf is missing
- **THEN** the gate SHALL report cache coverage as its own failure
- **AND** it SHALL preserve the ledger row's work-unit identity in diagnostics
- **AND** it SHALL NOT report all submitted rows as absent solely because a cache file is missing

