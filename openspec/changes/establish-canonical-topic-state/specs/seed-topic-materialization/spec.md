> req: STM-007

## ADDED Requirements

### Requirement: Seed topics SHALL be UID-bound canonical projections

Every canonical registry entry SHALL have exactly one `seed_topics/<slug>.md` projection carrying matching topic UID, id, slug, title, must-answer set, scope role and dependency UIDs. Migrate-legacy/add/update apply and any required explicit recover SHALL finish registry and touched seed replacements before topic-scoped queue/content work. Seed presence or filename SHALL NOT create topic identity independently.

HITL1 topic-state apply SHALL create the initial UID-bound seed skeleton after user approval. The seed phase SHALL verify and enrich that projection; it SHALL NOT remain the first durable writer of approved topic intent.

For canonical plans, seed readiness SHALL validate exact UID/slug/intent binding. Existing legacy bundles MAY continue the accepted slug-only seed compatibility path until sanctioned rerun migration; that path SHALL NOT synthesize UIDs, create canonical topics or authorize add/update mutation. Its retirement condition SHALL be C5-backed migration/reentry coverage plus migrated supported legacy fixtures, not an unbounded second authority path.

#### Scenario: Add commits seed before work eligibility
- **WHEN** topic-state apply adds a topic
- **THEN** canonical registry and matching complete UID-bound seed SHALL commit before the topic is eligible for work

#### Scenario: Orphan seed does not become authority
- **WHEN** a seed has no matching canonical UID
- **THEN** inspect/gate SHALL report an orphan projection and SHALL NOT infer a new topic

#### Scenario: Legacy seed compatibility does not become canonical authority
- **WHEN** a resumed legacy bundle follows its existing slug-only seed path before sanctioned rerun migration
- **THEN** existing compatibility behavior MAY continue
- **AND** no UID, topic addition or intent mutation SHALL be inferred from seed filename or prose
