> req: AGQ-018, AGQ-019

## MODIFIED Requirements

### Requirement: Delegated submit completes queue demand by work-id binding

The Agentic Queue system SHALL complete delegated queue demand only through Engine-owned work-unit completion commands. Normal `operate-work-unit submit` SHALL complete a claimed attempt by validating the `work_id` binding in `delegated_in_flight`.

Explicit audited `operate-work-unit late-submit` is the only terminal recovery completion path. Because the original timed-out attempt is no longer expected in `delegated_in_flight`, late-submit SHALL complete queue demand only after validating the original work-unit identity, rejecting submitted replacement coverage, and cleaning up any non-submitted retry state for the same `queue_item_id`.

#### Scenario: late-submit does not use queue-complete

- **WHEN** an eligible timed-out original is recovered
- **THEN** queue completion SHALL happen through `operate-work-unit late-submit`
- **AND** `operate-queue complete` SHALL remain invalid for delegated work

### Requirement: Queue state and item schema are structured

For audited late-submit success, the completed `queue_item_id` SHALL appear in exactly one durable queue location: the original work unit's `done` entry in `terminal_history`. Queued retry demand for that queue item SHALL be removed. Claimed retry attempts for that queue item SHALL be cleared from `delegated_in_flight` and terminalized through work-unit status, not through a second queue terminal-history row.

#### Scenario: late-submit leaves one queue location

- **WHEN** late-submit accepts an original timed-out work unit
- **THEN** `rb_queue.json` SHALL validate
- **AND** the completed `queue_item_id` SHALL appear only in the original terminal-history `done` row
