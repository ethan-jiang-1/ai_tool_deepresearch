> req: FIO-006

## ADDED Requirements

### Requirement: File observability SHALL detect canonical topic footprint drift

File observability SHALL compare the current `rb_plan.md#/topic_registry` identities with explicit topic identities exposed by accepted seed, artifact, reference metadata, final-output, queue, work-unit, and submitted-output surfaces. It SHALL report registry-missing canonical surfaces, references to unregistered topics, registry-external durable topic output, and durable parallel result namespaces without granting those files authority.

The audit SHALL use explicit ids/slugs/metadata or accepted path contracts. It SHALL NOT infer a topic from semantic title similarity or arbitrary filename text. Cache-only scratch SHALL remain non-authoritative and SHALL NOT independently establish a durable topic; when cache is the only backing for registry-external durable reference/final/artifact output, it MAY be included as supporting evidence for the same root finding.

Findings SHALL preserve full forensic detail while identifying root-cause and masked dependent findings so one unregistered topic does not generate multiple competing primary repair actions.

#### Scenario: Registry-external durable topic is blocking

- **WHEN** a bundle contains explicit topic-bearing reference or final output for a topic identity absent from `topic_registry`
- **THEN** file observability SHALL report an unregistered durable topic root finding
- **AND** the output SHALL remain non-authoritative
- **AND** dependent missing-seed or missing-wave symptoms SHALL be linked or masked rather than emitted as competing primary actions

#### Scenario: Dangling reference metadata is reported

- **WHEN** a reference file declares `related_topic` for an identity absent from `topic_registry`
- **THEN** file observability SHALL report the reference path and dangling identity
- **AND** it SHALL NOT guess a replacement topic from title similarity or numeric proximity

#### Scenario: Cache-only scratch does not become topic authority

- **WHEN** `_cache/` contains an unknown subtree with no registry-external durable reference, artifact, or final output
- **THEN** file observability SHALL keep the cache non-authoritative
- **AND** it SHALL NOT classify the cache subtree alone as a completed or canonical topic

#### Scenario: Audit remains read-only

- **WHEN** canonical topic footprint audit runs
- **THEN** it SHALL NOT create, delete, rename, or modify bundle files
- **AND** it SHALL NOT write status, queue, trace, ledger, checkpoint, artifact, reference, final, or cache authority
