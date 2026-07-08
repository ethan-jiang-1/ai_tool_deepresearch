> req: AGQ-023

## ADDED Requirements

### Requirement: Phase task-card examples SHALL preserve queue demand identity

Agent-facing phase Markdown task-card and result examples for queue demand SHALL use `queue_item_id` as queue demand identity. They SHALL NOT use `work_id` as queue demand identity, task-card identity, non-delegated queue completion identity, or old queue-position identity.

Static hygiene checks SHALL scan active phase Markdown queue task-card/result examples for retired queue identity drift, not only the queue JSON template or work-unit generated surfaces. Queue task-card examples SHALL validate against the active queue demand schema. Non-delegated `operate-queue complete --result` examples SHALL validate against the active queue result schema. `work_id` SHALL remain valid only when a surface explicitly describes an Engine-allocated delegated work-unit attempt, such as work-unit claim/submit, work-unit result, runtime receipt, or submitted ledger context.

The validation surface SHALL be example-driven, not token-only: when active phase Markdown presents a JSON object as an Agent-copyable task card or complete result, static hygiene or regression tests SHALL extract and parse that JSON against the same queue schemas that `operate-queue enqueue` or `operate-queue complete` uses.

#### Scenario: seed-topic materialization example uses queue item identity

- **WHEN** the Agent reads the seed-topics phase task-card template for `producer_rule: seed_topic_materialize`
- **THEN** the task-card example SHALL identify the queue demand with `queue_item_id`
- **AND** it SHALL NOT include `work_id` as the task-card's queue demand identifier

#### Scenario: phase template hygiene fails on queue demand work_id

- **WHEN** an active phase Markdown queue task-card or queue result example uses `work_id` where the queue demand identity is required
- **THEN** static hygiene SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

#### Scenario: seed-topic queue complete result uses queue item identity

- **WHEN** the Agent reads the seed-topics phase `operate-queue complete --result` example
- **THEN** the example SHALL identify the completed non-delegated queue item with `queue_item_id`
- **AND** the example SHALL NOT use `work_id` as the completion result identity

#### Scenario: phase examples match queue schemas

- **WHEN** static hygiene scans active phase Markdown queue task-card and non-delegated queue result JSON examples
- **THEN** task-card examples SHALL parse against the queue demand schema
- **AND** non-delegated complete result examples SHALL parse against the queue result schema

#### Scenario: token-only hygiene is insufficient for Agent-copyable JSON

- **WHEN** an active phase Markdown JSON example avoids retired `work_id` wording but still violates the active queue demand or queue result schema
- **THEN** static hygiene or regression tests SHALL fail
- **AND** the diagnostic SHALL identify the example surface and the schema mismatch

#### Scenario: work-unit attempt contexts may still use work_id

- **WHEN** active documentation or generated task text explicitly describes `operate-work-unit claim`, `operate-work-unit submit`, work-unit result JSON, work-unit runtime receipts, or submitted ledger rows
- **THEN** `work_id` SHALL remain valid as the Engine-allocated delegated attempt identity
- **AND** queue hygiene SHALL NOT require replacing that work-unit attempt identity with `queue_item_id`
