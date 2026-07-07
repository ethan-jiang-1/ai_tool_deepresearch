> req: WPG-001, WPG-004, WPG-008, WPG-010, WPG-011

## MODIFIED Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL read Engine-written rows in bundle-root `rb_output_declarations.jsonl` as the delegated coverage authority. The check name SHALL be `work_unit_ledger_exists`. A row SHALL count only when its work-unit fields are schema-valid, its `ledger_record_hash` verifies, and it binds to a submitted work-unit attempt.

Current main spec Purpose and guidance SHALL describe this capability as the work-unit provenance gate contract. It SHALL NOT describe the capability as an artifact of archiving the retired relay/slot replacement change.

#### Scenario: hand-written ledger row is rejected

- **WHEN** a ledger row contains work-unit-looking fields but lacks a valid submit fingerprint or matching submitted index entry
- **THEN** `work_unit_ledger_exists` SHALL fail
- **AND** the row SHALL NOT count as coverage

#### Scenario: purpose text is durable

- **WHEN** active main specs are synced after this change
- **THEN** `work-unit-provenance-gate` Purpose SHALL describe submitted work-unit provenance gate behavior
- **AND** it SHALL NOT mention archived relay replacement history as the capability purpose

### Requirement: Gate SHALL reject non-work-unit delegated authority surfaces

Work-unit provenance gates SHALL reject delegated artifacts, result references, hand-written declarations, and filesystem-only outputs that are not covered by submitted work-unit ledger rows. These surfaces MAY appear in diagnostics as bypass or cleanup evidence, but they SHALL NOT become alternate coverage authority.

Current forensics experiments, docs, and tests SHALL use work-unit signals for current proof. Old relay/slot forensics matrices SHALL be migrated to work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals or removed from current surfaces.

#### Scenario: non-work-unit delegated path cannot pass gate

- **WHEN** a delegated result file exists but no submitted work-unit ledger row covers the output
- **THEN** the gate SHALL fail delegated provenance
- **AND** the path SHALL be reported as non-authoritative

#### Scenario: old forensics matrix is not current proof

- **WHEN** a current playbook proves provenance forensics
- **THEN** it SHALL use submitted work-unit provenance signals
- **AND** it SHALL NOT present relay slot artifacts or relay commit events as the production proof matrix

### Requirement: Gate diagnostics SHALL carry work-unit binding context

Work-unit provenance diagnostics SHALL carry `work_id` when available, `queue_item_id` when available, `wave`, `kind`, check name, and mismatched surface refs. Diagnostics SHALL use work-unit binding context rather than non-work-unit channel keys.

Current diagnostics SHALL NOT use retired slot keys, relay slot paths, or old result-reference fields as the primary identity for delegated provenance. If a retired token is named, it SHALL be framed only as rejected, non-authoritative, or removed.

Retired relay provenance identifiers include `slotKey`, `roleAgentKey`, relay commit/spawn events, relay `dispatch.json`, and relay slot result references. Current provenance identity SHALL prefer `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, submitted ledger row, and work-unit binding surfaces.

#### Scenario: mismatch diagnostic identifies work unit

- **WHEN** a result hash mismatch is found for a submitted work unit
- **THEN** the diagnostic SHALL include `work_id`, `queue_item_id`, `wave`, and `kind`
- **AND** it SHALL identify the mismatched work-unit surfaces

#### Scenario: retired identity is not primary context

- **WHEN** a provenance diagnostic mentions a retired relay/slot artifact
- **THEN** the diagnostic SHALL identify it as rejected or non-authoritative
- **AND** the diagnostic SHALL use work-unit binding context for current delegated provenance whenever available

#### Scenario: relay event is not provenance authority

- **WHEN** a current provenance playbook or diagnostic mentions a relay commit or relay spawn event
- **THEN** that event SHALL be framed as retired or non-authoritative
- **AND** submitted work-unit ledger and binding surfaces SHALL remain the only delegated provenance authority

### Requirement: Gate SHALL emit work-unit lifecycle evidence diagnostics

Work-unit provenance gates SHALL check, for each evidence-producing submitted work unit, whether lifecycle events exist with matching `work_id` and `receipt_nonce` when lifecycle logging is expected. Missing lifecycle evidence SHALL emit `lifecycle_events_missing` as an advisory diagnostic and SHALL NOT replace authoritative ledger and submit checks.

Lifecycle evidence guidance SHALL bind to work-unit receipt nonce and submitted work-unit identity. It SHALL NOT require retired relay staging, relay commit events, or slot paths as current lifecycle proof.

#### Scenario: missing lifecycle evidence is advisory

- **WHEN** a submitted evidence-producing work unit has no matching lifecycle event
- **THEN** the gate SHALL emit `lifecycle_events_missing`
- **AND** pass/fail authority SHALL still come from submitted ledger coverage and required cross-checks

#### Scenario: lifecycle proof uses work-unit identity

- **WHEN** current diagnostics or playbooks explain lifecycle provenance
- **THEN** they SHALL bind lifecycle evidence to `work_id` and `receipt_nonce`
- **AND** they SHALL NOT require retired relay commit or slot path evidence as current proof

### Requirement: Framework SHALL ship a work-unit provenance-forensics guide

The framework SHALL ship a durable provenance-forensics judgment guide that a coding agent can read post-run to decide whether delegated evidence provenance is real or bypassed. The guide SHALL describe work-unit signals across submitted ledger rows, `_work_units/_index.json`, manifest, result, runtime receipt, beacon, lifecycle events, submit fingerprints, output files, cache trails, and gate diagnostics.

The guide SHALL explain forge-resistance as a spectrum: single files can be hand-shaped, while Engine-written submit transactions plus cross-surface hash/nonce consistency and trace/log timing are stronger evidence. The guide SHALL include a decision matrix mapping work-unit signal patterns to conclusions and remediation. Signing remains out of scope.

Current forensics guidance SHALL NOT present retired relay/slot tiers as the current decision matrix. Old relay/slot playbooks that no longer diagnose current work-unit provenance SHALL be removed from current experiment surfaces.

#### Scenario: coding agent decides from landed evidence using the guide

- **WHEN** a coding agent inspects a completed run bundle
- **THEN** it SHALL be able to open the shipped provenance-forensics judgment guide
- **AND** follow work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals to reach a documented conclusion

#### Scenario: retired matrix is not shipped as current guidance

- **WHEN** current forensics guidance names provenance decision tiers
- **THEN** those tiers SHALL be expressed in submitted work-unit signal terms
- **AND** retired relay/slot tiers SHALL NOT appear as current proof instructions
