> req: DEW-001, DEW-008

## MODIFIED Requirements

### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path

Production delegated work SHALL use the path `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate` inside the active runtime bundle root. A work unit SHALL mean one Engine-allocated delegated execution attempt for one queue demand item. A wave, phase, queue item, runtime thread, or filesystem artifact SHALL NOT be called a work unit unless it is the Engine-allocated attempt envelope. Bare work-unit paths such as `_work_units/waveN/{work_id}/` SHALL resolve under the active bundle root.

Current production-facing surfaces outside `openspec/changes/archive/` SHALL NOT describe old relay/slot mechanisms, old delegated ledger rows, or invalid old queue slot shapes as active delegated-work paths. This applies to active main specs, active change deltas, framework docs, runtime docs, tests, guidelines, current runner surfaces, and runnable experiment playbooks. Archived OpenSpec changes are historical record and SHALL NOT be cleaned or treated as current drift.

Old delegated-work mechanisms include retired relay commands and modules, old relay helper APIs, old slot result fields, old slot identity fields, old relay event names, old dispatch files, `_subagents/` relay directory paths when used as production authority, and hand-written delegated ledger rows that bypass work-unit submit.

#### Scenario: production delegated path is singular

- **WHEN** active specs, framework docs, phase docs, tests, or playbooks describe delegated completion
- **THEN** they SHALL describe queue demand claimed into a work unit and returned through submit
- **AND** they SHALL NOT describe any alternate production delegated-work mechanism

#### Scenario: retired relay identity is not current work identity

- **WHEN** a current surface identifies delegated work by `slotKey`, `roleAgentKey`, relay commit events, relay spawn events, `dispatch.json`, or `_subagents/` paths
- **THEN** that surface SHALL be migrated to work-unit identity or removed from current production-facing guidance
- **AND** it SHALL NOT count as current delegated-work proof

#### Scenario: old queue shape is not a delegated-work fallback

- **WHEN** a current surface uses old top-level queue slot shape or queue demand `work_id` identity to bypass work-unit claim/submit for delegated work
- **THEN** that surface SHALL be migrated to queue v2 plus work-unit submit or removed from current production-facing guidance
- **AND** it SHALL NOT count as a valid non-delegated queue path

#### Scenario: archived changes are historical only

- **WHEN** stale relay/slot terms appear under `openspec/changes/archive/`
- **THEN** the terms SHALL be treated as historical OpenSpec record
- **AND** current-surface hygiene SHALL NOT require editing that archive path

### Requirement: Gates SHALL read submitted work-unit ledger coverage

Delegated gate coverage SHALL come only from Engine-written work-unit rows in bundle-root `rb_output_declarations.jsonl`. Bundle-root `_work_units/_index.json`, manifest, result, receipt, beacon, cache, and output files SHALL be cross-check surfaces, not independent pass coverage.

Current specs, docs, tests, and playbooks SHALL NOT present relay slot files, old slot result references, old relay commit/merge events, or old delegated queue completion as alternate gate coverage.

#### Scenario: filesystem-only delegated output cannot pass

- **WHEN** a delegated output file exists without submitted work-unit ledger coverage
- **THEN** the gate SHALL fail delegated coverage
- **AND** the file MAY be reported as cleanup or bypass diagnostic evidence only

#### Scenario: old delegated surface is rejected or removed

- **WHEN** a current diagnostic names a retired relay/slot artifact outside `openspec/changes/archive/`
- **THEN** the diagnostic SHALL frame it as rejected, removed, deprecated, or non-authoritative evidence
- **AND** it SHALL NOT describe that artifact as a production success path
