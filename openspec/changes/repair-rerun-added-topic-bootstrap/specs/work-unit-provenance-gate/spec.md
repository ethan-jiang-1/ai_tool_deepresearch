> req: WPG-001, WPG-002, WPG-008

## MODIFIED Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL continue to read schema-valid, hash-valid Engine-written rows in bundle-root `rb_output_declarations.jsonl` as delegated coverage authority. Work-unit-local submitted-declaration recovery witnesses SHALL NOT count directly as coverage.

When a ledger row is absent but `_work_units/_index.json` contains a submitted attempt, gate/inspect SHALL distinguish missing declaration authority from nonexistent delegated work. It SHALL classify the work ID as `submitted_declaration_missing` or equivalent, determine whether exact or audited legacy declaration recovery is reachable through the existing work-unit owner, and mask downstream missing-output/cache/count symptoms that depend on that row.

The gate SHALL remain failed until recovery restores a valid bundle ledger row. This diagnostic simplification SHALL NOT let index/result/filesystem facts bypass the ledger.

#### Scenario: Hand-written ledger row is rejected

- **WHEN** a ledger row lacks a valid submit/recovery fingerprint or matching submitted index entry
- **THEN** it SHALL not count as coverage

#### Scenario: Missing submitted declaration is one root

- **WHEN** a submitted index/status/result binding exists but its bundle ledger row is absent
- **THEN** gate/inspect SHALL report one missing-declaration root for that work ID
- **AND** dependent output coverage, cache mapping and count symptoms SHALL be masked until recovery is attempted

#### Scenario: Recovery witness is not direct coverage

- **WHEN** an exact work-unit-local declaration witness exists without its bundle ledger row
- **THEN** the gate SHALL remain failed
- **AND** advice SHALL identify the sanctioned `recover-declaration` action

#### Scenario: Recovered row counts normally

- **WHEN** Engine recovery restores a schema-valid/hash-valid row bound to the submitted attempt
- **THEN** subsequent gates SHALL evaluate it through the normal ledger path
- **AND** no recovery-specific gate success branch SHALL exist


### Requirement: Gate SHALL verify work-unit submission presence

For each counted ledger row, gates SHALL continue to verify submitted index, manifest, canonical result, runtime receipt, beacon, nonce, outputs, cache/source claims and hashes.

For a missing ledger row, the submission-presence evaluator SHALL inspect only enough independent submitted surfaces to classify declaration recovery eligibility. It SHALL not report a successful submission-presence result as gate coverage before the row is restored. Conflicting index/status/result/receipt/queue/trace evidence SHALL fail recovery eligibility and remain the primary integrity root.

#### Scenario: Exact recovery eligibility is diagnosed

- **WHEN** a submitted attempt has a matching exact declaration witness and all binding surfaces agree
- **THEN** inspect SHALL report recovery as reachable and provide one command target

#### Scenario: Legacy recovery requires full witness set

- **WHEN** a pre-witness submitted attempt lacks its row
- **THEN** recovery eligibility SHALL require matching index/status/result/receipt/beacon/output/cache, queue terminal history and original submit trace
- **AND** any missing fact SHALL be named as the direct blocker

#### Scenario: Conflicting submitted surfaces block recovery

- **WHEN** a purported submitted attempt has result hash, queue replacement, actor, receipt or trace conflict
- **THEN** the checker SHALL not recommend declaration reconstruction
- **AND** it SHALL return the one nearest legal boundary or new-attempt action


### Requirement: Gate diagnostics SHALL carry work-unit binding context

Work-unit provenance diagnostics SHALL carry `work_id`, `queue_item_id`, wave, kind, failing direct surface, expected deterministic fact, observed fact, repair target and at most one structured nearest action. Every primary in-scope root SHALL include `missing_fact`, `write_to`, and `rerun`. Diagnostics SHALL use work-unit identity rather than forcing the Agent to infer lineage from a generic file error.

When a root failure explains downstream findings, the primary result SHALL mask or group those findings. A missing declaration SHALL not appear simultaneously as an empty Wave ledger, missing every output, missing every cache trail, delegated bypass and zero reference count. Full forensic detail MAY remain in existing diagnostic detail, but the Agent-facing repair list SHALL stay root-first.

For source/output/cache binding failures, diagnostics SHALL name the exact result JSON pointer or submitted authority ref the Agent can change or reuse. They SHALL say whether a value must be added to the current candidate, selected from a compatible submitted row, restored through Engine recovery, or produced by a new legal attempt. They SHALL never advise hand-editing ledger/index/status hashes.

#### Scenario: Missing declaration diagnostic is self-sufficient

- **WHEN** a submitted work ID lacks its ledger row
- **THEN** diagnostics SHALL name the work ID, missing ledger row, recovery witness status and exact recover command or missing-contract blocker
- **AND** `missing_fact` SHALL identify the absent declaration authority, `write_to` SHALL identify the Engine-owned recovery operation, and `rerun` SHALL identify the same gate/inspect checkpoint after recovery
- **AND** the Agent SHALL not need to read Engine source to choose the next action

#### Scenario: Source-ref mismatch identifies lineage repair

- **WHEN** submit rejects a source claim because its source ref is not current or compatible prior submitted output
- **THEN** diagnostics SHALL name the claim index, candidate path, searched authority sets and compatible repair form
- **AND** `write_to` SHALL identify the exact source-claim JSON pointer and `rerun` SHALL name the same dry-submit command

#### Scenario: Cache drift preserves submitted context

- **WHEN** a valid row has a missing/drifted cache leaf
- **THEN** diagnostics SHALL preserve its work-unit context and target that cache/source binding
- **AND** it SHALL not claim all submitted rows are absent
