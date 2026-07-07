# File Observability

> req: FIO-001, FIO-002, FIO-003, FIO-004

## Purpose

Define work-unit-aware file observability for active run bundles. The Engine audits planned files, unplanned files, submitted work-unit outputs, cache trails, and non-authoritative delegated artifacts, returning inspect/advice diagnostics without granting authority outside submitted ledger and receipt coverage.
## Requirements
### Requirement: Engine SHALL audit phase-owned directories against expected file patterns

File observability SHALL treat `_work_units/waveN/{work_id}/` as the production delegated runtime path. It SHALL audit work-unit directories, result files, output files, cache trails, and ledger declarations for consistency. Non-work-unit delegated directories SHALL be reported only as removal/bypass diagnostics.

Current main spec Purpose SHALL describe file observability as work-unit-aware file audit and non-authority diagnostics. It SHALL NOT remain `TBD`, and it SHALL NOT describe old non-work-unit delegated directories or old queue-position shapes as production observability paths.

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

Current file-observability playbooks and fixtures SHALL use current work-unit or queue v2 surfaces for positive proof. Old queue-position control fixtures and old delegated artifacts SHALL be migrated or removed unless the case explicitly proves non-authority diagnostics.

#### Scenario: orphan output requests work-unit repair

- **WHEN** an expected output exists but no submitted work-unit ledger row declares it
- **THEN** inspect SHALL report the file as orphaned
- **AND** advice SHALL direct the Agent to submit or refill through work-unit mechanisms

#### Scenario: old fixture is not current proof

- **WHEN** a file-observability playbook uses old delegated artifacts or old queue-position control shape
- **THEN** the playbook SHALL be migrated to current work-unit or queue v2 surfaces, or removed from current runner surfaces
- **AND** its old fixture verdict SHALL NOT count as current file-observability proof

### Requirement: Agent explanations SHALL be recorded as diagnostic trace/log entries

The system SHALL extend `DPT_FRAMEWORK/cli/log-event.mjs` with an Agent-facing diagnostic mode for file explanations. The command SHALL be invokable without inline JavaScript and SHALL write a non-verdict diagnostic event to `rb_trace.jsonl` plus a human-readable line to `_logs/run.log`.

Each explanation SHALL include `path`, `phase`, `reason`, and `authority_status`. It MAY include `work_id`, `topic_slug`, and `related_rerun_action`.

Allowed `authority_status` values SHALL include:
- `explained_non_authoritative`
- `ignored_with_reason`

`declared_authoritative` is a derived audit classification, not an Agent-written explanation status. The Agent SHALL NOT be able to make a file authoritative through file explanation.

File explanations SHALL be append-only. If multiple explanation diagnostics exist for the same path, audits SHALL use the latest valid explanation by timestamp for current classification while preserving all prior diagnostics in trace/log history.

#### Scenario: File explanation is durable

- **WHEN** Agent records an explanation for an unplanned file through `log-event.mjs`
- **THEN** `rb_trace.jsonl` SHALL contain `event: "diagnostic"` with `kind: "file_explanation"`
- **AND** `_logs/run.log` SHALL contain a human-readable diagnostic line
- **AND** the trace event SHALL contain `authority_status`

#### Scenario: Latest explanation is used for audit classification

- **WHEN** two file explanation diagnostics exist for the same path
- **THEN** file observability SHALL use the latest valid explanation for current classification
- **AND** earlier explanation diagnostics SHALL remain in `rb_trace.jsonl` and `_logs/run.log`

### Requirement: Explained files SHALL remain non-authoritative unless declared through ledger or receipt

Agent explanations SHALL remain diagnostic only. Delegated output files SHALL become gate-authoritative only when covered by a successful work-unit submit ledger row and passing cross-checks.

Current tests that name old delegated directories SHALL frame those paths only as non-authoritative rejection or bypass diagnostics. If a test cannot be read that way, it SHALL be migrated to a work-unit fixture or removed.

#### Scenario: explanation does not create coverage

- **WHEN** an Agent explains an orphan delegated file in logs
- **THEN** that explanation SHALL NOT make the file count as gate coverage

#### Scenario: old delegated diagnostic cannot become authority

- **WHEN** a file-observability test or health verifier fixture writes an old delegated path
- **THEN** the assertion SHALL prove the path remains non-authoritative
- **AND** it SHALL NOT describe the path as a production delegated runtime location

### Requirement: File observability SHALL detect mixed delegated provenance

File observability SHALL detect bundles that contain submitted work-unit artifacts alongside non-work-unit delegated artifacts for the same delegated output scope and SHALL report mixed delegated provenance as a blocker.

Mixed-provenance diagnostics MAY name old delegated artifact families only to explain rejection, cleanup, or bypass suspicion. They SHALL NOT provide an alternate success path around submitted work-unit ledger authority.

#### Scenario: mixed provenance is a blocker

- **WHEN** a wave contains a submitted work-unit output and a non-work-unit-only delegated output
- **THEN** inspect SHALL report mixed delegated provenance
- **AND** the non-work-unit-only output SHALL remain non-authoritative

#### Scenario: old delegated path is diagnostic only

- **WHEN** mixed-provenance diagnostics mention an old delegated path
- **THEN** the diagnostic SHALL frame it as cleanup, rejection, or bypass evidence
- **AND** submitted work-unit coverage SHALL remain the only positive delegated authority
