## MODIFIED Requirements

### Requirement: Seed topics SHALL be UID-bound canonical projections

Every canonical registry entry SHALL have exactly one `seed_topics/<slug>.md` projection carrying matching topic UID, id, slug, title, must-answer set, scope role and dependency UIDs. Current add/update apply and any required explicit recover SHALL finish registry and touched seed replacements before topic-scoped queue/content work. Seed presence or filename SHALL NOT create topic identity independently.

HITL1 topic-state apply SHALL create the initial UID-bound seed skeleton after user approval. The seed phase SHALL verify and enrich that projection; it SHALL NOT remain the first durable writer of approved topic intent.

Seed readiness SHALL validate exact UID/slug/intent binding for a schema-valid canonical plan. A plan that does not meet the current canonical plan contract SHALL fail through its existing plan/topic-state prerequisite before seed compatibility is evaluated. Seed readiness SHALL NOT retain a slug-only legacy success path, synthesize UIDs, create canonical topics, authorize mutation, migrate a plan, or upgrade historical seed bytes.

#### Scenario: Add commits seed before work eligibility
- **WHEN** topic-state apply adds a topic
- **THEN** canonical registry and matching complete UID-bound seed SHALL commit before the topic is eligible for work

#### Scenario: Orphan seed does not become authority
- **WHEN** a seed has no matching canonical UID
- **THEN** inspect/gate SHALL report an orphan projection and SHALL NOT infer a new topic

#### Scenario: Legacy seed compatibility does not become canonical authority
- **WHEN** a selected bundle uses a mutable plan that fails the current canonical plan contract
- **THEN** seed readiness SHALL stop at the existing plan/topic-state prerequisite
- **AND** it SHALL not accept slug-only seed compatibility or infer a UID, topic addition, intent mutation, migration, or upgrade from filename or prose
