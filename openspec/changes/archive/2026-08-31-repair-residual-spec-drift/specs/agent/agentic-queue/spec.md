> req: AGQ-007

## MODIFIED Requirements

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize Wave0 source-intake queue demand by its closed admission kind `wave0_source_intake`. The historical `producer_rule` label `source_intake_fan_in` names the same demand family and remains an accepted open-string `producer_rule` value; it is not an admission discriminator. Queue items generated for this demand family SHALL use `queue_item_id` as demand identity, SHALL include delegated target metadata and output contracts sufficient for `operate-work-unit claim`, and SHALL route successful delegated completion through work-unit submit.

#### Scenario: source-intake queue item uses queue identity

- **WHEN** `topic_registry` contains three topics
- **THEN** the Phase Agent SHALL generate three queue demand items with distinct `queue_item_id` values
- **AND** claiming those items SHALL allocate distinct work-unit `work_id` values

#### Scenario: source-intake output is submitted

- **WHEN** a source-intake sub-agent produces the required source metadata and cache trail
- **THEN** `operate-work-unit submit` SHALL validate the output contract and cache trail before ledger append

> req: AGQ-027

## MODIFIED Requirements

### Requirement: `operate-queue check` SHALL report a distinct drained conclusion for a fully drained queue

When a queue has an empty `active_window` — the refill step keeps `refill_pool` empty whenever the active window is empty — and no `delegated_in_flight` work, `operate-queue check` SHALL report a distinct `drained` conclusion: `drained: true` emitted alongside `passed: false` and the ordinary non-zero check exit status. The `drained` flag SHALL be distinguishable from both `passed: true` (work is available and healthy) and a plain `passed: false` blocker or missing receipt, and the output SHALL NOT advise the Agent to refill or record a blocker.

#### Scenario: a fully drained queue reports drained

- **WHEN** the active window is empty after refill and no delegated in-flight work exists
- **THEN** `operate-queue check` SHALL return a `drained` conclusion with `passed: false` and a non-zero exit status
- **AND** the output SHALL NOT instruct the Agent to refill or record a blocker

#### Scenario: a healthy queue with work reports passed

- **WHEN** the active window contains work and the queue is healthy
- **THEN** `operate-queue check` SHALL return `passed: true`
- **AND** the `drained` conclusion is not used

#### Scenario: a blocker or missing receipt still fails

- **WHEN** the queue has a blocked item or a missing receipt
- **THEN** `operate-queue check` SHALL return `passed: false`
- **AND** the `drained` conclusion is not used for a non-drained failure
