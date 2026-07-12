> req: FIO-006

## ADDED Requirements

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
