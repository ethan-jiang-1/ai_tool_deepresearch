> req: AGQ-019

## MODIFIED Requirements

### Requirement: Queue state and item schema are structured

The target `rb_queue.json` schema SHALL be queue v2 with ordered
`active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`.
Queue demand identity SHALL be `queue_item_id`. `work_id` SHALL mean only an
Engine-allocated delegated execution attempt and SHALL NOT be used as queue
demand identity, task-card identity, or old queue-position identity.

Current main spec Purpose SHALL describe queue v2 as an ordered active-window
queue with refill and delegated in-flight binding. The accepted active-window
capacity SHALL be expressed through the current queue v2 schema/constant,
currently `QUEUE_ACTIVE_WINDOW_LIMIT = 20`. It SHALL NOT describe the current
state model as a fixed small window, named queue positions, or top-level
current/next projection.

For audited late-submit success, the completed `queue_item_id` SHALL appear in
exactly one durable queue location: the targeted work unit's `done` entry in
`terminal_history`. Queued retry demand for that queue item SHALL be removed.
Claimed retry attempts for that queue item SHALL be cleared from
`delegated_in_flight` and terminalized through work-unit status, not through a
second queue terminal-history row.

An Engine-created terminal replacement demand SHALL use a fresh
`queue_item_id` and retain its parent relation only in the ordinary queue
item's `lineage`. It SHALL preserve the source snapshot's `kind`, `targets`,
`action`, `producer_rule`, `priority_class`, `required_receipts`,
`done_condition`, `verification`, `writes_to`, `status_sync`,
`completion_receipt`, `failure_route`, and `payload`. That lineage SHALL
include `replacement_of_work_id`, `replacement_of_queue_item_id`,
`replacement_terminal_status`, `replacement_terminal_reason`, and
`replacement_queue_item_snapshot_hash`, populated from the parent terminal
authority. It SHALL not put a work ID on the queue-demand identity, alter the
parent's terminal-history row, or create a queue location outside the existing
active window, refill pool, delegated in-flight, and terminal history model.

Generic Queue `fail` input SHALL contain only the current `queue_item_id` and a
non-empty failure reason. It SHALL reject an arbitrary `repair` Queue item or
any other successor payload before mutation. When the current active-front
demand is non-delegated, `fail` SHALL append its existing `failed`
terminal-history row with closed `failure_disposition:
terminal_no_successor`; it SHALL then promote/refill only existing lawful
demands and SHALL NOT enqueue, preempt, construct, or infer a repair successor.
Legacy terminal-history rows without `failure_disposition` remain readable.

`terminal_no_successor` answers only whether this generic Queue operation has a
Queue-owned successor now. It SHALL not be used for a delegated attempt,
replacement lineage, retry, ledger coverage, receipt, success status, or
workflow routing. A generic Queue `fail` directed at a delegated demand SHALL
fail closed without Queue mutation and direct the caller to the existing
work-unit terminal/replacement authority. Queue inspect and the rendered
projection SHALL expose the exact terminal item and its no-successor boundary
from `terminal_history`; neither may infer a repair card from `failure_route`
prose or an absent active item.

#### Scenario: late-submit leaves one queue location

- **WHEN** late-submit accepts a targeted timed-out work unit
- **THEN** `rb_queue.json` SHALL validate
- **AND** the completed `queue_item_id` SHALL appear only in the targeted
  terminal-history `done` row

#### Scenario: queue v2 purpose names ordered active window

- **WHEN** active main specs are synced after this change
- **THEN** `agentic-queue` Purpose SHALL describe ordered `active_window`, its
  current capacity semantics, `refill_pool`, delegated in-flight attempts,
  deterministic receipts, and Markdown projection
- **AND** it SHALL NOT describe a fixed small active window as the current
  state model
- **AND** if it mentions capacity, it SHALL refer to the queue v2
  schema/constant rather than a historical fixed-position shape

#### Scenario: work_id is not queue demand identity

- **WHEN** a queue item or task-card example identifies queue demand
- **THEN** it SHALL use `queue_item_id`
- **AND** it SHALL reserve `work_id` for delegated work-unit attempts allocated
  by `operate-work-unit claim`

#### Scenario: replacement lineage binds a fresh ordinary demand to one terminal parent

- **WHEN** the Engine creates a replacement demand from an eligible terminal
  work unit
- **THEN** the new demand SHALL have a fresh queue-item identity and the
  required parent-attempt lineage
- **AND** each listed queue-item contract field SHALL equal the source snapshot
  value
- **AND** each required replacement lineage field SHALL equal the matching
  parent terminal authority fact
- **AND** it SHALL appear in exactly one ordinary queue location before claim
- **AND** no work ID, queue completion, or modification of the parent
  terminal-history record SHALL occur

#### Scenario: generic Queue failure has no repair descendant

- **WHEN** `operate-queue fail` terminalizes a current non-delegated demand
- **THEN** its terminal-history row SHALL have `terminal_status: failed` and
  `failure_disposition: terminal_no_successor`
- **AND** no `repair-*` or `repair-repair-*` queue demand SHALL be inserted
- **AND** repeated failure input cannot create a successor from that terminal
  row

#### Scenario: arbitrary repair payload fails before mutation

- **WHEN** a generic Queue failure payload contains `repair` or another
  caller-authored successor field
- **THEN** schema admission SHALL reject the input
- **AND** active-window, refill-pool, delegated-in-flight, terminal-history and
  projection authority SHALL remain unchanged

#### Scenario: delegated failure retains work-unit authority

- **WHEN** the current Queue demand is delegated and a caller invokes generic
  `operate-queue fail`
- **THEN** the operation SHALL reject without terminalizing the Queue demand or
  creating a successor
- **AND** feedback SHALL name the existing work-unit terminal/replacement
  owner rather than a generic Queue repair route

#### Scenario: projection reports the durable no-successor boundary

- **WHEN** a schema-valid Queue has a `terminal_no_successor` row
- **THEN** Queue inspect and its rendered projection SHALL identify that exact
  `queue_item_id` and terminal reason
- **AND** neither surface SHALL treat an empty active window as proof that the
  terminal failure was repaired
