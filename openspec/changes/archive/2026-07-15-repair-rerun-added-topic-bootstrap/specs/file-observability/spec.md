> req: FIO-006, FIO-007

## MODIFIED Requirements

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

File observability SHALL use the shared UID/layout resolver for current seeds and topic-bearing artifact/reference paths. Its reference reader SHALL be a thin adapter over that resolver rather than an independent regular-expression identity map. Current seed paths SHALL be audited against current registry layout. Accepted artifact/reference paths and legacy reference metadata using unique previous ids or slugs SHALL remain at their recorded locations and SHALL be classified as historical bindings rather than stale projections, independent topic identity or mandatory rename work. Exact UID-only reference metadata SHALL resolve through the same path. An accepted layout workspace SHALL be the primary root and SHALL mask derivative seed mismatch findings.

Previous layouts and valid legacy metadata SHALL be compatibility inputs to one authority interpretation only. File observability SHALL NOT synthesize missing expected artifact/reference paths for every previous slug, require metadata-only mass rewrites, or treat both UID and legacy forms as separate authorities; existing files still require their normal ledger/receipt authority before they count as accepted outputs.

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

#### Scenario: Historical reference spelling does not require rewrite

- **WHEN** a covered historical reference resolves uniquely through exact UID or accepted legacy metadata
- **THEN** observability SHALL classify it under the same canonical topic UID
- **AND** it SHALL NOT recommend a rewrite solely to change the metadata spelling

#### Scenario: Gate and observability share binding outcome

- **WHEN** Wave1 reference checks and file observability read the same reference metadata and registry facts
- **THEN** both SHALL return the same canonical UID set or the same binding reason code
- **AND** neither SHALL maintain a second raw-field precedence rule
