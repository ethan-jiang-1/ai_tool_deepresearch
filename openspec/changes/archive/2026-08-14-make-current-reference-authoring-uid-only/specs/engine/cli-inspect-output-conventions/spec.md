## ADDED Requirements

### Requirement: Wave inspect SHALL report canonical UID subset binding

Wave inspect output SHALL use the common reference-binding adapter for a
`related_topic_uids` current metadata array. A valid exact subset SHALL satisfy
the topic-binding prerequisite without legacy-field advice. An invalid subset
SHALL expose one adapter-owned binding root with the affected array coordinate;
inspect SHALL not add per-UID or dependent metadata noise.

#### Scenario: Wave2 inspect accepts a selected cross-Topic subset

- **WHEN** an optional `00-cross-*` reference has valid common metadata,
  semantic sections, and a valid selected UID subset
- **THEN** Wave2 inspect SHALL accept its topic-binding form
- **AND** it SHALL not advise `related_topic` or convert the subset to `all`
