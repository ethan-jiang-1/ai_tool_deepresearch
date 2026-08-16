# File Observability

> req: FIO-001, FIO-002, FIO-003, FIO-004, FIO-005, FIO-006, FIO-007, FIO-008

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

The system SHALL extend `DEEP_RESEARCH_HARNESS/cli/log-event.mjs` with an Agent-facing diagnostic mode for file explanations. The command SHALL be invokable without inline JavaScript and SHALL write a non-verdict diagnostic event to `rb_trace.jsonl` plus a human-readable line to `_logs/run.log`.

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

File observability SHALL consume the shared current-entry predicate for the
bundle root. The predicate passes only when `BUNDLE_ENTRY.md` and
`BUNDLE_MAP.md` both exist at the same root. For a passing root, file
observability SHALL classify both pair members as expected static control
surfaces and SHALL not require `RUN_BUNDLE.md` or `START_FROM_HERE.md`.

For a root missing either current member, file observability SHALL expose the
same unsupported-current-entry-contract conclusion as a deterministic blocking
root. It SHALL not classify `RUN_BUNDLE.md`, `START_FROM_HERE.md`, or a
map-only root as compatibility, expected control, or a repairable migration
path. Extra legacy files beside a passing pair are non-authoritative historical
debris only.

This classification SHALL NOT affect gate pass authority for research
artifacts, submitted work-unit ledger coverage, or queue state. It answers only
whether the selected root can enter current Harness operations.

#### Scenario: Current bundle map is expected

- **WHEN** file observability audits a bundle containing both current root
  files
- **THEN** it SHALL classify `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` as expected
  static root surfaces
- **AND** it SHALL not require a legacy root file

#### Scenario: Legacy map is diagnostic compatibility

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy-map diagnostic route.

- **WHEN** file observability audits a bundle missing `BUNDLE_ENTRY.md` or
  `BUNDLE_MAP.md`
- **THEN** it SHALL return a blocking
  `unsupported_current_entry_contract` conclusion
- **AND** it SHALL not describe any legacy root file as expected or
  compatibility-success behavior

#### Scenario: Both map names do not create two authorities

- **WHEN** file observability audits a bundle containing the current pair and
  `RUN_BUNDLE.md` or `START_FROM_HERE.md`
- **THEN** the pair SHALL remain the only expected operational entry conclusion
- **AND** each legacy file SHALL be non-authoritative historical debris

### Requirement: File observability SHALL detect canonical topic footprint drift

File observability SHALL compare the current `rb_plan.md#/topic_registry` exact ids/slugs with explicit topic identities exposed by accepted seed, artifact, reference metadata, final-output, queue, work-unit, and submitted-output surfaces. Reference metadata SHALL be parsed by the shared canonical topic-binding adapter: `related_topic_uid` MAY contain one exact registered UID or `all`; legacy `related_topic` MAY contain `all` or a comma-separated list of exact current/previous ids or slugs; both forms MAY appear only when they resolve identically. File observability SHALL report registry-missing canonical surfaces, references to unregistered topics, registry-external durable topic output, and durable parallel result namespaces without granting those files authority.

Missing canonical surfaces for a registered topic SHALL be evaluated only relative to the supplied target phase or normalized reentry target and the accepted manifest/gate path truth. An early lifecycle target SHALL NOT fail because a future wave or final surface does not yet exist. When no target is supplied, file observability SHALL report explicit identity/provenance drift but SHALL NOT infer lifecycle completeness.

The audit SHALL use explicit ids/slugs/UIDs/metadata or accepted path contracts. It SHALL NOT infer a topic from semantic title similarity or arbitrary filename text. Cache-only scratch SHALL remain non-authoritative and SHALL NOT independently establish a durable topic; when cache is the only backing for registry-external durable reference/final/artifact output, it MAY be included as supporting evidence for the same root finding.

Canonical findings SHALL be grouped by explicit topic identity with a bounded precedence: an unregistered identity with durable output is the primary finding and dangling metadata, parallel namespace, and supporting cache/work-unit facts are supporting details; a registered identity with missing accepted surfaces is a separate primary gap; an unknown durable subtree without explicit identity SHALL remain a warning unless another accepted contract makes it blocking. A conflicting dual reference binding SHALL be one primary binding finding for that reference rather than separate dangling findings for both raw fields. Existing per-file findings SHALL remain available for forensic detail.

#### Scenario: Registry-external durable topic is blocking

- **WHEN** a bundle contains explicit topic-bearing reference or final output for a topic identity absent from `topic_registry`
- **THEN** file observability SHALL report an unregistered durable topic root finding
- **AND** the output SHALL remain non-authoritative
- **AND** dangling metadata, parallel namespace, and supporting provenance facts for the same identity SHALL be grouped as supporting details rather than emitted as competing primary actions

#### Scenario: Dangling reference metadata is reported

- **WHEN** a reference file declares a canonical UID or legacy related-topic identity absent from `topic_registry`
- **THEN** file observability SHALL report the reference path and dangling identity
- **AND** it SHALL NOT guess a replacement topic from title similarity or numeric proximity

#### Scenario: Related-topic sentinel and lists follow current contract

- **WHEN** reference metadata uses `related_topic_uid: all`, `related_topic: all`, or a legacy comma-separated list of exact registered current/previous ids or slugs
- **THEN** file observability SHALL not report a dangling topic
- **AND** any non-matching list member SHALL be reported independently

#### Scenario: UID-only reference is not reported as dangling

- **WHEN** a reference declares only one exact registered `related_topic_uid`
- **THEN** file observability SHALL bind the reference to that canonical topic
- **AND** it SHALL NOT report missing legacy `related_topic`, unregistered topic, or parallel namespace drift solely because the legacy key is absent

#### Scenario: Conflicting dual binding is one root finding

- **WHEN** `related_topic_uid` and legacy `related_topic` resolve to different topic sets
- **THEN** file observability SHALL report one topic-binding conflict for the reference path
- **AND** it SHALL NOT choose one field by precedence or emit two competing repair actions

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

File observability SHALL use the shared UID/layout resolver for current seeds
and topic-bearing artifact/reference paths. Its reference reader SHALL be a
thin adapter over that resolver rather than an independent regular-expression
identity map. Current seed paths SHALL be audited against current registry
layout. Accepted artifact/reference paths with UID-bound metadata SHALL remain
at their recorded locations and SHALL be classified through the same canonical
binding conclusion. An accepted layout workspace SHALL be the primary root and
SHALL mask derivative seed mismatch findings.

Previous layouts remain compatibility inputs for their accepted non-reference
artifact families. A reference containing `related_topic`, alone or dual with
a UID form, SHALL be reported as the shared
`reference_topic_binding_legacy_unsupported` metadata root and SHALL not be
classified under a canonical topic, accepted as historical coverage, or used to
derive a footprint. File observability SHALL NOT synthesize missing expected
artifact/reference paths for every previous slug, require metadata-only mass
rewrites, or treat the retired key as a second authority; it remains read-only
and does not alter the reference bytes.

#### Scenario: Old submitted path remains valid historical coverage
- **WHEN** immutable provenance records a previous slug and an accepted
  non-reference artifact remains at its recorded path
- **THEN** observability SHALL bind that path to the same UID and report the topic's current slug without requiring a move

#### Scenario: Workspace masks cascade
- **WHEN** a prepared layout workspace temporarily leaves old and new seed paths on disk
- **THEN** observability SHALL return one exact recovery blocker
- **AND** SHALL NOT report the two seed paths as two canonical topics

#### Scenario: Missing historical alias path is not an error
- **WHEN** a UID has a previous slug with no artifact/reference file at that coordinate
- **THEN** observability SHALL NOT create a missing-path finding solely from layout history

#### Scenario: Historical reference spelling does not require rewrite

- **WHEN** a reference contains `related_topic` with a current or previous id,
  slug, sentinel, or comma-separated list
- **THEN** observability SHALL report one
  `reference_topic_binding_legacy_unsupported` result at that reference
- **AND** it SHALL not infer a topic footprint, report a dangling id, or
  recommend or perform a rewrite

#### Scenario: Gate and observability share binding outcome

- **WHEN** Wave1 reference checks and file observability read the same reference metadata and registry facts
- **THEN** both SHALL return the same canonical UID set or the same binding reason code
- **AND** neither SHALL maintain a second raw-field precedence rule

### Requirement: File observability SHALL retain exact reference UID subsets

File observability SHALL consume the shared reference-binding conclusion for a
valid `related_topic_uids` metadata array and attach durable reference facts to
exactly its resolved canonical Topics. It SHALL retain the existing direct
binding failure projection for invalid arrays and SHALL not infer an all-Topic
fact from a selected subset.

#### Scenario: Selected subset creates no unrelated Topic footprint

- **WHEN** a reference declares a valid UID array for Topics A and B in a
  registry that also contains Topic C
- **THEN** observability SHALL attach the reference footprint to A and B only
- **AND** it SHALL not report C as referenced by that file

### Requirement: File observability names its feedback field repair_directive

The file-observability feedback surface SHALL name its single repair/directive field `repair_directive`, distinct from the gate/phase and work-unit `repair_kind` fields. Its value SHALL remain the closed six-value set `materialize_canonical_surface` / `reconcile_topic_identity` / `repair_topic_reference` / `classify_namespace` / `current_entry_contract` / `exact_topic_state_recover`. The emitter (`engine/helpers/file-observability.mjs`) and its consumer (`cli/check-reentry.mjs`) SHALL use `repair_directive`, and deterministic regression SHALL fail when a `repair_kind` literal appears in the file-observability emission surface.

#### Scenario: Field name disambiguates the three repair vocabularies

- **WHEN** an Agent reads a file-observability finding
- **THEN** it SHALL see `repair_directive` naming the file-observability repair action
- **AND** the gate/phase and work-unit `repair_kind` fields SHALL remain unchanged and unambiguous

#### Scenario: Renamed field is locked by regression

- **WHEN** the emitter or its consumer reintroduces a file-observability `repair_kind` literal
- **THEN** the deterministic regression SHALL fail at the emission surface
