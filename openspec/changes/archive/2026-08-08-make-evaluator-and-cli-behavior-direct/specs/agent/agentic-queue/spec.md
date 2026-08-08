# Agentic Queue — Delta

> req: AGQ-027

## ADDED Requirements

### Requirement: `operate-queue check` SHALL report a distinct drained conclusion for a fully drained queue

When a queue has an empty `active_window`, an empty `refill_pool`, and no
`delegated_in_flight` work, `operate-queue check` SHALL report a distinct `drained`
conclusion rather than `passed: false`. The `drained` conclusion SHALL be
distinguishable from both `passed: true` (work is available and healthy) and
`passed: false` (a blocker or missing receipt), and SHALL NOT advise the Agent to
refill or record a blocker.

#### Scenario: a fully drained queue reports drained

- **WHEN** `active_window`, `refill_pool`, and `delegated_in_flight` are all empty
- **THEN** `operate-queue check` SHALL return a `drained` conclusion
- **AND** the output SHALL NOT instruct the Agent to refill or record a blocker

#### Scenario: a healthy queue with work reports passed

- **WHEN** the active window contains work and the queue is healthy
- **THEN** `operate-queue check` SHALL return `passed: true`
- **AND** the `drained` conclusion is not used

#### Scenario: a blocker or missing receipt still fails

- **WHEN** the queue has a blocked item or a missing receipt
- **THEN** `operate-queue check` SHALL return `passed: false`
- **AND** the `drained` conclusion is not used for a non-drained failure
