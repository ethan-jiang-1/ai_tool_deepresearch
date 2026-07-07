## ADDED Requirements

> req: AGQ-021

### Requirement: Supplementary queue demand IDs MAY carry iteration labels when explicit topic identity is valid

Queue demand identity SHALL remain `queue_item_id`, but topic identity SHALL come from explicit task-card fields when available. Topic-scoped supplementary queue items MAY include iteration or repair labels in `queue_item_id`, such as `-v2`, `-supplement`, or `-deep`, without making those suffixes part of the topic slug.

The queue system SHALL allow these supplementary IDs when the task card includes a valid `payload.topic_slug` or `lineage.topic_slug` matching the bundle `topic_registry`.

#### Scenario: Supplementary topic task uses explicit topic identity

- **WHEN** a task card has `queue_item_id: "wave1-deepen-01_event-basics-logistics-v2"`
- **AND** it has `payload.topic_slug: "01_event-basics-logistics"`
- **AND** `topic_registry` contains `01_event-basics-logistics`
- **THEN** queue validation SHALL treat the task as topic-scoped to `01_event-basics-logistics`
- **AND** it SHALL NOT reject merely because the queue item ID contains `-v2`
