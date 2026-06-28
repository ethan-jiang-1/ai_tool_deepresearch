> req: AGQ-019, AGQ-020

## ADDED Requirements

### Requirement: Queue active window has an explicit slot-shape SSOT

The Queue active window slot count SHALL be defined as `QUEUE_ACTIVE_WINDOW_SLOTS = 5`, and the active-window wire keys SHALL be defined by `SLOT_NAMES`. Both Queue schema validation and Queue engine operations SHALL use the same `SLOT_NAMES` source of truth. Queue slot count SHALL NOT be derived from Relay sub-agent concurrency.

#### Scenario: Queue slot constants define the five-slot wire shape

- **WHEN** Queue code imports the active-window constants
- **THEN** `QUEUE_ACTIVE_WINDOW_SLOTS` SHALL equal 5
- **AND** `SLOT_NAMES` SHALL equal `slot_1_current`, `slot_2_next`, `slot_3_pending`, `slot_4_pending`, `slot_5_tail`

#### Scenario: Promote shifts the configured active window left

- **WHEN** `promote()` is called after a completion
- **THEN** every configured slot in `SLOT_NAMES` SHALL shift one position left
- **AND** the configured tail slot SHALL become `null`

#### Scenario: Preempt displaces the configured tail slot

- **WHEN** a default preempt inserts at `slot_2_next`
- **AND** all configured Queue active-window slots are occupied
- **THEN** the configured tail slot SHALL be displaced to `refill_pool`
- **AND** the displaced item SHALL record `preempted_from_slot` using the configured tail slot name

### Requirement: Queue exposes pending task count

The queue manager SHALL export a `pendingCount(queue)` function that returns the total number of outstanding Queue tasks: the count of non-null active-window slots plus the length of `refill_pool`. The count SHALL NOT include Relay sub-agent slots. The CLI SHALL expose this via `operate-queue.mjs count <bundle>`.

#### Scenario: Pending count reflects active window and pool

- **WHEN** a queue has 3 non-null slots in the active window and 5 items in the refill pool
- **THEN** `pendingCount(queue)` SHALL return 8

#### Scenario: Pending count is zero for empty queue

- **WHEN** a queue has all null slots and an empty refill pool
- **THEN** `pendingCount(queue)` SHALL return 0

#### Scenario: CLI count command reports Queue task depth

- **WHEN** `node DPT_FRAMEWORK/cli/operate-queue.mjs count <bundle>` is executed
- **THEN** it SHALL print a JSON object with `pending`, `active_window`, and `refill_pool` counts
- **AND** exit 0
