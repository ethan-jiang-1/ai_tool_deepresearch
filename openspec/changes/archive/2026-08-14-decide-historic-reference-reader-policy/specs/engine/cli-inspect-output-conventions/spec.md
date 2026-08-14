## MODIFIED Requirements

### Requirement: Wave inspect SHALL report canonical UID subset binding

Wave inspect output SHALL use the common reference-binding adapter for a
`related_topic_uids` current metadata array. A valid exact subset SHALL satisfy
the topic-binding prerequisite without legacy-field advice. An invalid subset
SHALL expose one adapter-owned binding root with the affected array coordinate;
inspect SHALL not add per-UID or dependent metadata noise.

An inspected reference containing `related_topic`, alone or beside a current
UID form, SHALL expose the same
`reference_topic_binding_legacy_unsupported` root as Gate, index, provenance,
and file observability. Inspect SHALL name the reference metadata boundary and
SHALL not parse the legacy id/slug, emit a consumer-specific fallback, advise a
silent conversion, or present the file as current countable evidence.

#### Scenario: Wave2 inspect accepts a selected cross-Topic subset

- **WHEN** an optional `00-cross-*` reference has valid common metadata,
  semantic sections, and a valid selected UID subset with no `related_topic`
- **THEN** Wave2 inspect SHALL accept its topic-binding form
- **AND** it SHALL not advise `related_topic` or convert the subset to `all`

#### Scenario: Inspect reports the common legacy rejection boundary

- **WHEN** a Wave inspect command reads a reference containing `related_topic`
- **THEN** inspect SHALL return one
  `reference_topic_binding_legacy_unsupported` finding for that reference
- **AND** it SHALL not add an id/slug lookup result or a dependent countability
  symptom as a competing primary repair action
