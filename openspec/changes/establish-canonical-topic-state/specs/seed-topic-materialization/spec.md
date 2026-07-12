> req: STM-007

## ADDED Requirements

### Requirement: Seed materialization SHALL be a canonical topic projection

Seed-topic materialization SHALL consume canonical registry entries by `topic_uid` and create/update exactly one `seed_topics/<slug>.md` projection carrying the same topic UID, id, slug, title, must-answer set, scope role and dependency UIDs. New scope SHALL not enter topic-scoped queue or content work until registry and seed projection are both committed. Seed presence or filename SHALL never create topic identity independently.

#### Scenario: Registration commits registry and seed before work
- **WHEN** `operate-topic-state register` succeeds
- **THEN** the canonical registry entry and matching seed skeleton SHALL both be durable before the topic is eligible for queue/content work

#### Scenario: Orphan seed does not become authority
- **WHEN** a seed file has no matching canonical topic UID
- **THEN** seed/topic inspection SHALL block it as an orphan projection
- **AND** downstream work SHALL NOT infer a new topic from the file
