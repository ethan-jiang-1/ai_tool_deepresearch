> req: DEW-001, DEW-008

## MODIFIED Requirements

### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path

Production delegated work SHALL use the path `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate`. A work unit SHALL mean one Engine-allocated delegated execution attempt for one queue demand item. A wave, phase, queue item, runtime thread, or filesystem artifact SHALL NOT be called a work unit unless it is the Engine-allocated attempt envelope.

Current production-facing surfaces outside `openspec/changes/archive/` SHALL NOT describe old relay/slot mechanisms as active delegated-work paths. This applies to active main specs, active change deltas, framework docs, runtime docs, tests, guidelines, current runner surfaces, and runnable experiment playbooks. Archived OpenSpec changes are historical record and SHALL NOT be cleaned or treated as current drift.

#### Scenario: production delegated path is singular

- **WHEN** active specs, framework docs, phase docs, tests, or playbooks describe delegated completion
- **THEN** they SHALL describe queue demand claimed into a work unit and returned through submit
- **AND** they SHALL NOT describe any alternate production delegated-work mechanism

#### Scenario: archived changes are historical only

- **WHEN** stale relay/slot terms appear under `openspec/changes/archive/`
- **THEN** the terms SHALL be treated as historical OpenSpec record
- **AND** current-surface hygiene SHALL NOT require editing that archive path

### Requirement: Gates SHALL read submitted work-unit ledger coverage

Delegated gate coverage SHALL come only from Engine-written work-unit rows in `rb_output_declarations.jsonl`. `_work_units/_index.json`, manifest, result, receipt, beacon, cache, and output files SHALL be cross-check surfaces, not independent pass coverage.

Current specs, docs, tests, and playbooks SHALL NOT present relay slot files, old slot result references, old relay commit/merge events, or old delegated queue completion as alternate gate coverage.

#### Scenario: filesystem-only delegated output cannot pass

- **WHEN** a delegated output file exists without submitted work-unit ledger coverage
- **THEN** the gate SHALL fail delegated coverage
- **AND** the file MAY be reported as cleanup or bypass diagnostic evidence only

#### Scenario: old delegated surface is diagnostic only

- **WHEN** a current diagnostic names a retired relay/slot artifact outside `openspec/changes/archive/`
- **THEN** the diagnostic SHALL frame it as rejected, removed, deprecated, or legacy/backlog evidence
- **AND** it SHALL NOT describe that artifact as a production success path
