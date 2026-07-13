> req: AGQ-002, AGQ-014

## MODIFIED Requirements

### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL keep deterministic queue operations for non-delegated main-agent work and queue demand maintenance. Delegated sub-agent completion SHALL NOT use `operate-queue complete`; delegated completion SHALL use `operate-work-unit submit`, which validates result/receipt/output/cache, updates work-unit state, completes the bound queue demand, and appends the ledger in one Engine transition.

When non-delegated `operate-queue claim` encounters a delegated item at the active-window front, it SHALL reject without moving or completing that demand. The result SHALL distinguish this blocker from an empty active window by returning a stable root reason, the blocked `queue_item_id`, and contract-lineage coordinates: `missing_fact` naming the delegated-owner mismatch, `write_to` naming the role-bound observation/claim input owned by `operate-work-unit`, and `rerun` naming the exact `operate-work-unit claim` checkpoint. A genuinely empty active window SHALL return a different root reason. These fields SHALL be read-only feedback projections and SHALL NOT create route, permission or persisted queue state.

#### Scenario: non-delegated queue completion remains available

- **WHEN** a queue item is assigned to main-agent work with no delegated work-unit binding
- **THEN** `operate-queue complete` SHALL remain a valid deterministic completion path
- **AND** no work-unit ledger row SHALL be required for that non-delegated queue item

#### Scenario: delegated queue completion rejects operate-queue complete

- **WHEN** a queue item is present in `delegated_in_flight`
- **THEN** `operate-queue complete` SHALL fail closed for that queue item
- **AND** the diagnostic SHALL instruct completion through `operate-work-unit submit`

#### Scenario: Delegated queue claim rejection is not reported as empty queue

- **WHEN** the active-window front contains a queued item whose target delegates to a sub-agent
- **AND** the caller invokes non-delegated `operate-queue claim`
- **THEN** claim SHALL return `item: null` and `reason_code: delegated_requires_work_unit_claim`
- **AND** it SHALL name the blocked `queue_item_id`, the delegated ownership fact, the actor-observation input surface, and one exact `operate-work-unit claim` rerun
- **AND** queue authority bytes SHALL remain unchanged

#### Scenario: Empty active window has a distinct reason

- **WHEN** `operate-queue claim` runs with no active-window item
- **THEN** the result SHALL use an empty-window reason distinct from delegated rejection
- **AND** it SHALL NOT imply that an existing delegated item disappeared


### Requirement: Work-unit claim moves delegated demand into in-flight state

The Agentic Queue system SHALL expose delegated queue demand through `operate-work-unit claim`, not through queue completion or any non-work-unit delegated channel. A claim SHALL allocate one Engine-owned work unit for each claimed queue demand item, move the bound `queue_item_id` into `delegated_in_flight`, and write the allocation to `_work_units/_index.json`.

Existing terminal or submitted work-unit history and an earlier batch SHALL NOT make a later eligible queue-front demand unclaimable. After the existing batch owner opens the next batch, a valid current role-bound actor observation SHALL allocate the rerun demand from that batch through the same claim transaction. Missing or unknown actor observation SHALL continue to return no claim and one probe-then-rerun action without changing queue, batch counters or work-unit authority. A `phase_agent_fallback` request SHALL remain invalid unless the same claim carries a matching classified unavailable observation and the kind policy permits fallback; the diagnostic SHALL explain that exact missing precondition through `missing_fact`, `write_to`, and `rerun` rather than presenting the demand as empty.

#### Scenario: claim allocates delegated attempt

- **WHEN** the active queue front contains an eligible delegated queue item for Wave0
- **THEN** `operate-work-unit claim` SHALL allocate a `work_id`
- **AND** the queue item SHALL move from `active_window` to `delegated_in_flight`
- **AND** `_work_units/_index.json` SHALL contain the same `queue_item_id` and `work_id` binding

#### Scenario: Rerun demand claims from the next historical batch

- **WHEN** Wave0 has prior work-unit history in batch b000, the existing batch owner opens b001 for rerun work, and an eligible new-topic demand is at the active queue front
- **AND** claim receives a valid current actor observation for the demand role
- **THEN** `operate-work-unit claim` SHALL allocate the demand in b001
- **AND** it SHALL move only that demand into `delegated_in_flight`
- **AND** prior batch records SHALL remain unchanged

#### Scenario: Missing actor observation does not consume rerun demand

- **WHEN** an eligible rerun demand exists after historical work but claim has no current role-bound actor observation
- **THEN** claim SHALL allocate zero work units and return `observation_required` with one probe-then-rerun action
- **AND** `write_to` SHALL identify the claim observation fields and `rerun` SHALL identify the same work-unit claim command
- **AND** active queue demand, batch counters and work-unit index authority SHALL remain unchanged

#### Scenario: Fallback rejection names the missing authorization fact

- **WHEN** the Agent requests `phase_agent_fallback` without a matching classified unavailable observation
- **THEN** claim SHALL allocate zero work units and preserve the demand
- **AND** the diagnostic SHALL identify the required role-bound unavailable observation in `missing_fact`, the exact claim arguments in `write_to`, and the same-claim command in `rerun`
- **AND** it SHALL NOT describe the active queue as empty
