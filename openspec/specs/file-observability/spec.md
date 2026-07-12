# File Observability

> req: FIO-001, FIO-002, FIO-003, FIO-004, FIO-005, FIO-006, FIO-007

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

### Requirement: Root bundle map files SHALL follow canonical map policy

File observability SHALL classify `BUNDLE_MAP.md` as the expected current root bundle map file for active bundles. It SHALL NOT require `START_FROM_HERE.md` for new-bundle root-control-file expectations.

If `START_FROM_HERE.md` appears without `BUNDLE_MAP.md`, file observability SHALL report it as legacy deprecated compatibility. If both files appear, file observability SHALL prefer `BUNDLE_MAP.md` and report `START_FROM_HERE.md` as deprecated compatibility debris or a non-authoritative legacy file.

This classification SHALL NOT affect gate pass authority for research artifacts, submitted work-unit ledger coverage, or queue state. It is a file-observability diagnostic about root map naming only.

#### Scenario: Current bundle map is expected

- **WHEN** file observability audits a bundle containing `BUNDLE_MAP.md`
- **THEN** it SHALL classify `BUNDLE_MAP.md` as an expected root map file
- **AND** it SHALL NOT require `START_FROM_HERE.md`

#### Scenario: Legacy map is diagnostic compatibility

- **WHEN** file observability audits a bundle containing `START_FROM_HERE.md` but no `BUNDLE_MAP.md`
- **THEN** it SHALL report a legacy compatibility diagnostic
- **AND** it SHALL NOT treat the legacy file as submitted evidence, gate authority, or current primary map

#### Scenario: Both map names do not create two authorities

- **WHEN** file observability audits a bundle containing both `BUNDLE_MAP.md` and `START_FROM_HERE.md`
- **THEN** `BUNDLE_MAP.md` SHALL be the current expected map
- **AND** `START_FROM_HERE.md` SHALL be reported as deprecated compatibility or cleanup advice

### Requirement: File observability SHALL detect canonical topic footprint drift

File observability SHALL compare the current `rb_plan.md#/topic_registry` exact ids/slugs with explicit topic identities exposed by accepted seed, artifact, reference metadata, final-output, queue, work-unit, and submitted-output surfaces. `related_topic: all` SHALL be treated as a valid sentinel; comma-separated values SHALL be trimmed and matched exactly against registry ids/slugs. It SHALL report registry-missing canonical surfaces, references to unregistered topics, registry-external durable topic output, and durable parallel result namespaces without granting those files authority.

Missing canonical surfaces for a registered topic SHALL be evaluated only relative to the supplied target phase or normalized reentry target and the accepted manifest/gate path truth. An early lifecycle target SHALL NOT fail because a future wave or final surface does not yet exist. When no target is supplied, file observability SHALL report explicit identity/provenance drift but SHALL NOT infer lifecycle completeness.

The audit SHALL use explicit ids/slugs/metadata or accepted path contracts. It SHALL NOT infer a topic from semantic title similarity or arbitrary filename text. Cache-only scratch SHALL remain non-authoritative and SHALL NOT independently establish a durable topic; when cache is the only backing for registry-external durable reference/final/artifact output, it MAY be included as supporting evidence for the same root finding.

Canonical findings SHALL be grouped by explicit topic identity with a bounded precedence: an unregistered identity with durable output is the primary finding and dangling metadata, parallel namespace, and supporting cache/work-unit facts are supporting details; a registered identity with missing accepted surfaces is a separate primary gap; an unknown durable subtree without explicit identity SHALL remain a warning unless another accepted contract makes it blocking. Existing per-file findings SHALL remain available for forensic detail.

#### Scenario: Registry-external durable topic is blocking

- **WHEN** a bundle contains explicit topic-bearing reference or final output for a topic identity absent from `topic_registry`
- **THEN** file observability SHALL report an unregistered durable topic root finding
- **AND** the output SHALL remain non-authoritative
- **AND** dangling metadata, parallel namespace, and supporting provenance facts for the same identity SHALL be grouped as supporting details rather than emitted as competing primary actions

#### Scenario: Dangling reference metadata is reported

- **WHEN** a reference file declares `related_topic` for an identity absent from `topic_registry`
- **THEN** file observability SHALL report the reference path and dangling identity
- **AND** it SHALL NOT guess a replacement topic from title similarity or numeric proximity

#### Scenario: Related-topic sentinel and lists follow current contract

- **WHEN** reference metadata uses `related_topic: all` or a comma-separated list of exact registered ids/slugs
- **THEN** file observability SHALL not report a dangling topic
- **AND** any non-matching list member SHALL be reported independently

#### Scenario: Future wave absence does not block an early target

- **WHEN** the requested reentry target is Wave0
- **AND** a registered topic has valid Wave0 surfaces but no Wave1 or final output yet
- **THEN** canonical footprint audit SHALL not report the future surfaces as missing

#### Scenario: Cache-only scratch does not become topic authority

- **WHEN** `_cache/` contains an unknown subtree with no registry-external durable reference, artifact, or final output
- **THEN** file observability SHALL keep the cache non-authoritative
- **AND** it SHALL NOT classify the cache subtree alone as a completed or canonical topic

#### Scenario: Audit remains read-only

- **WHEN** canonical topic footprint audit runs
- **THEN** it SHALL NOT create, delete, rename, or modify bundle files
- **AND** it SHALL NOT write status, queue, trace, ledger, checkpoint, artifact, reference, final, or cache authority

### Requirement: File observability SHALL consume canonical layout resolution

File observability SHALL use the shared UID/layout resolver for current seeds and topic-bearing artifact/reference paths. Current seed paths SHALL be audited against current registry layout. Accepted artifact/reference paths using unique previous slugs SHALL remain at their recorded locations and SHALL be classified as historical bindings rather than stale projections, independent topic identity or mandatory rename work. An accepted layout workspace SHALL be the primary root and SHALL mask derivative seed mismatch findings.

Previous layouts SHALL be classification alternatives only. File observability SHALL NOT synthesize missing expected artifact/reference paths for every previous slug; existing files still require their normal ledger/receipt authority before they count as accepted outputs.

#### Scenario: Old submitted path remains valid historical coverage
- **WHEN** immutable provenance records a previous slug and the accepted artifact remains at its recorded path
- **THEN** observability SHALL bind that path to the same UID and report the topic's current slug without requiring a move

#### Scenario: Workspace masks cascade
- **WHEN** a prepared layout workspace temporarily leaves old and new seed paths on disk
- **THEN** observability SHALL return one exact recovery blocker
- **AND** SHALL NOT report the two seed paths as two canonical topics

#### Scenario: Missing historical alias path is not an error
- **WHEN** a UID has a previous slug with no artifact/reference file at that coordinate
- **THEN** observability SHALL NOT create a missing-path finding solely from layout history
