> req: FIO-001, FIO-002, FIO-004

## MODIFIED Requirements

### Requirement: Engine SHALL audit phase-owned directories against expected file patterns

File observability SHALL treat `_work_units/waveN/{work_id}/` as the production delegated runtime path. It SHALL audit work-unit directories, result files, output files, cache trails, and ledger declarations for consistency. Non-work-unit delegated directories SHALL be reported only as removal/bypass diagnostics.

Current main spec Purpose SHALL describe file observability as work-unit-aware file audit and non-authority diagnostics. It SHALL NOT remain `TBD`, and it SHALL NOT describe old `_subagents/` relay slot directories or old queue slot shapes as production observability paths.

#### Scenario: non-work-unit delegated file is diagnostic

- **WHEN** file observability finds a delegated result file outside submitted work-unit coverage
- **THEN** it SHALL classify the path as a non-authoritative delegated artifact
- **AND** it SHALL NOT treat the file as production coverage

#### Scenario: purpose text is durable

- **WHEN** active main specs are synced after this change
- **THEN** `file-observability` Purpose SHALL describe work-unit file audit, unplanned-file diagnostics, and non-authoritative delegated artifacts
- **AND** it SHALL NOT remain `TBD` or point to an old change delta as the capability purpose

### Requirement: Unplanned files SHALL produce inspect/advice requesting explanation

Unplanned delegated files SHALL produce inspect/advice that identifies whether the file is outside a submitted work-unit ledger row, outside the claimed work-unit directory, or outside the production delegated runtime path. Advice SHALL route repair through work-unit submit, fail, timeout, abandon, or refill.

Current file-observability playbooks and fixtures SHALL use current work-unit or queue v2 surfaces for positive proof. Old queue slot control fixtures and old relay/slot delegated artifacts SHALL be migrated or removed unless the case explicitly proves non-authority diagnostics.

#### Scenario: orphan output requests work-unit repair

- **WHEN** an expected output exists but no submitted work-unit ledger row declares it
- **THEN** inspect SHALL report the file as orphaned
- **AND** advice SHALL direct the Agent to submit or refill through work-unit mechanisms

#### Scenario: old fixture is not current proof

- **WHEN** a file-observability playbook uses old relay/slot delegated artifacts or old queue slot control shape
- **THEN** the playbook SHALL be migrated to current work-unit or queue v2 surfaces, or removed from current runner surfaces
- **AND** its old fixture verdict SHALL NOT count as current file-observability proof

### Requirement: Explained files SHALL remain non-authoritative unless declared through ledger or receipt

Agent explanations SHALL remain diagnostic only. Delegated output files SHALL become gate-authoritative only when covered by a successful work-unit submit ledger row and passing cross-checks.

Current tests that name `_subagents/` or old delegated directories SHALL frame those paths only as non-authoritative rejection or bypass diagnostics. If a test cannot be read that way, it SHALL be migrated to a work-unit fixture or removed.

#### Scenario: explanation does not create coverage

- **WHEN** an Agent explains an orphan delegated file in logs
- **THEN** that explanation SHALL NOT make the file count as gate coverage

#### Scenario: old delegated diagnostic cannot become authority

- **WHEN** a file-observability test or health verifier fixture writes an old `_subagents/` path
- **THEN** the assertion SHALL prove the path remains non-authoritative
- **AND** it SHALL NOT describe the path as a production delegated runtime location

### Requirement: File observability SHALL detect mixed delegated provenance

File observability SHALL detect bundles that contain submitted work-unit artifacts alongside non-work-unit delegated artifacts for the same delegated output scope and SHALL report mixed delegated provenance as a blocker.

Mixed-provenance diagnostics MAY name old delegated artifact families such as `_subagents/` only to explain rejection, cleanup, or bypass suspicion. They SHALL NOT provide an alternate success path around submitted work-unit ledger authority.

#### Scenario: mixed provenance is a blocker

- **WHEN** a wave contains a submitted work-unit output and a non-work-unit-only delegated output
- **THEN** inspect SHALL report mixed delegated provenance
- **AND** the non-work-unit-only output SHALL remain non-authoritative

#### Scenario: old delegated path is diagnostic only

- **WHEN** mixed-provenance diagnostics mention an old delegated path
- **THEN** the diagnostic SHALL frame it as cleanup, rejection, or bypass evidence
- **AND** submitted work-unit coverage SHALL remain the only positive delegated authority
