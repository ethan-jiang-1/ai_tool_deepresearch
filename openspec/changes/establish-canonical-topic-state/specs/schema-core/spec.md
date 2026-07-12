> req: SCO-013

## ADDED Requirements

### Requirement: Plan schema SHALL validate canonical topic identity and intent

`PlanSchema.topic_registry[]` SHALL validate immutable `topic_uid`, ordered `id`, numeric-prefixed `slug`, non-empty `title`, non-empty unique `must_answer[]`, closed `scope_role`, and unique `depends_on_topic_uids[]`. Topic UIDs and slugs SHALL be unique, dependency refs SHALL resolve within the same registry, self-dependency SHALL fail, and `derived_topic_count` SHALL equal registry length. Legacy entries without `topic_uid` MAY be parsed only through an explicit diagnostic/migration result and SHALL NOT pass mutation validation.

#### Scenario: Canonical registry validates
- **WHEN** a plan contains unique topic UIDs/slugs, resolved non-self dependencies and a matching derived count
- **THEN** canonical PlanSchema validation SHALL pass

#### Scenario: Legacy registry is diagnostic only
- **WHEN** a plan uses the historical `{id, slug, title}` entry shape without stable identity/intent fields
- **THEN** read-only inspection MAY identify a migration candidate
- **AND** a topic mutation SHALL fail until deterministic migration succeeds
