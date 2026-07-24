## MODIFIED Requirements

### Requirement: Queue state and item schema are structured

The target `rb_queue.json` schema SHALL be queue v2 with ordered `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`. Queue demand identity SHALL be `queue_item_id`. `work_id` SHALL mean only an Engine-allocated delegated execution attempt and SHALL NOT be used as queue demand identity, task-card identity, or old queue-position identity.

Current main spec Purpose SHALL describe queue v2 as an ordered active-window queue with refill and delegated in-flight binding. The accepted active-window capacity SHALL be expressed through the current queue v2 schema/constant, currently `QUEUE_ACTIVE_WINDOW_LIMIT = 20`. It SHALL NOT describe the current state model as a fixed small window, named queue positions, or top-level current/next projection.

For audited late-submit success, the completed `queue_item_id` SHALL appear in exactly one durable queue location: the targeted work unit's `done` entry in `terminal_history`. Queued retry demand for that queue item SHALL be removed. Claimed retry attempts for that queue item SHALL be cleared from `delegated_in_flight` and terminalized through work-unit status, not through a second queue terminal-history row.

An Engine-created terminal replacement demand SHALL use a fresh `queue_item_id` and retain its parent relation only in the ordinary queue item's `lineage`. It SHALL preserve the source snapshot's `kind`, `targets`, `action`, `producer_rule`, `priority_class`, `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`, `completion_receipt`, `failure_route`, and `payload`. That lineage SHALL include `replacement_of_work_id`, `replacement_of_queue_item_id`, `replacement_terminal_status`, `replacement_terminal_reason`, and `replacement_queue_item_snapshot_hash`, populated from the parent terminal authority. It SHALL not put a work ID on the queue-demand identity, alter the parent's terminal-history row, or create a queue location outside the existing active window, refill pool, delegated in-flight, and terminal history model.

#### Scenario: late-submit leaves one queue location

- **WHEN** late-submit accepts a targeted timed-out work unit
- **THEN** `rb_queue.json` SHALL validate
- **AND** the completed `queue_item_id` SHALL appear only in the targeted terminal-history `done` row

#### Scenario: queue v2 purpose names ordered active window

- **WHEN** active main specs are synced after this change
- **THEN** `agentic-queue` Purpose SHALL describe ordered `active_window`, its current capacity semantics, `refill_pool`, delegated in-flight attempts, deterministic receipts, and Markdown projection
- **AND** it SHALL NOT describe a fixed small active window as the current state model
- **AND** if it mentions capacity, it SHALL refer to the queue v2 schema/constant rather than a historical fixed-position shape

#### Scenario: work_id is not queue demand identity

- **WHEN** a queue item or task-card example identifies queue demand
- **THEN** it SHALL use `queue_item_id`
- **AND** it SHALL reserve `work_id` for delegated work-unit attempts allocated by `operate-work-unit claim`

#### Scenario: replacement lineage binds a fresh ordinary demand to one terminal parent

- **WHEN** the Engine creates a replacement demand from an eligible terminal work unit
- **THEN** the new demand SHALL have a fresh queue-item identity and the required parent-attempt lineage
- **AND** each listed queue-item contract field SHALL equal the source snapshot value
- **AND** each required replacement lineage field SHALL equal the matching parent terminal authority fact
- **AND** it SHALL appear in exactly one ordinary queue location before claim
- **AND** no work ID, queue completion, or modification of the parent terminal-history record SHALL occur
