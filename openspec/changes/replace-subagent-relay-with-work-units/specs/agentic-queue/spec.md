> req: AGQ-001, AGQ-002, AGQ-004, AGQ-005, AGQ-014, AGQ-017, AGQ-018, AGQ-019, AGQ-020

## ADDED Requirements

### Requirement: Work-unit claim moves delegated demand into in-flight state

The Agentic Queue system SHALL expose delegated queue demand through `operate-work-unit claim`, not through queue completion or any non-work-unit delegated channel. A claim SHALL allocate one Engine-owned work unit for each claimed queue demand item, move the bound `queue_item_id` into `delegated_in_flight`, and write the allocation to `_work_units/_index.json`.

#### Scenario: claim allocates delegated attempt

- **WHEN** the active queue front contains an eligible delegated queue item for Wave0
- **THEN** `operate-work-unit claim` SHALL allocate a `work_id`
- **AND** the queue item SHALL move from `active_window` to `delegated_in_flight`
- **AND** `_work_units/_index.json` SHALL contain the same `queue_item_id` and `work_id` binding

### Requirement: Delegated submit completes queue demand by work-id binding

The Agentic Queue system SHALL complete delegated queue demand only through `operate-work-unit submit`. Submit SHALL complete the bound `queue_item_id` by validating the `work_id` binding in `delegated_in_flight`; it SHALL NOT depend on queue-front aliases or return order.

#### Scenario: out-of-order submit completes correct demand

- **WHEN** three delegated work units are in flight for the same wave
- **AND** the third work unit submits before the first
- **THEN** the queue SHALL complete the `queue_item_id` bound to the submitted `work_id`
- **AND** the other in-flight queue items SHALL remain in `delegated_in_flight`

### Requirement: Phase drain includes queue demand and in-flight attempts

The Agentic Queue system SHALL report a phase as drained only when the phase has no unclaimed queue demand and no non-terminal or expired delegated in-flight attempt.

#### Scenario: expired attempt blocks drain

- **WHEN** a wave has no remaining unclaimed delegated queue items
- **AND** `delegated_in_flight` contains a claimed work unit whose `deadline_at` has passed
- **THEN** queue inspect SHALL report the phase as not drained
- **AND** the Main Agent SHALL resolve the attempt through submit, fail, timeout, or abandon before the wave gate may be run

### Requirement: Work-unit submit SHALL validate delegated cache trails

Delegated cache trail validation SHALL occur during `operate-work-unit submit`, not queue completion. Submit SHALL validate candidate `cache_trails[]` from the work-unit result against the kind-specific cache policy, filter or reject paths according to that policy, and write only verified cache trails to the submitted ledger row.

#### Scenario: valid cache leaf is ledger-written

- **WHEN** a work-unit result declares a valid leaf cache trail required by its kind
- **THEN** submit SHALL write the verified cache trail to the ledger row

#### Scenario: unsafe cache trail rejects submit

- **WHEN** a work-unit result declares a cache trail outside the bundle cache policy
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be appended

### Requirement: Work-unit submit SHALL validate declared output files

For delegated tasks, `operate-work-unit submit` SHALL validate `output_files[]` from the work-unit result. It SHALL verify each declared `path` is bundle-relative, does not escape the bundle, and exists on disk. Standard completion receipt and writes checks SHALL be consistent with the declared output files.

#### Scenario: declared output file exists

- **WHEN** a work-unit result declares `output_files: [{ path: "reference/source.md", role: "reference", source_url: "https://example.com/article" }]`
- **AND** `reference/source.md` exists in the bundle
- **THEN** output file validation SHALL pass for that entry

#### Scenario: missing declared file rejects submit

- **WHEN** a work-unit result declares `output_files: [{ path: "reference/missing.md", role: "reference", source_url: "https://example.com/article" }]`
- **AND** that file does not exist
- **THEN** `operate-work-unit submit` SHALL reject the result as non-terminal
- **AND** feedback SHALL identify the missing declared output file

### Requirement: Non-delegated queue completion SHALL skip work-unit checks

If a queue item has no delegated target and no work-unit binding, `operate-queue complete` SHALL skip delegated work-unit receipt, ledger, cache trail, and submission checks. It SHALL retain standard non-delegated receipt behavior for direct Phase Agent or engine tasks.

#### Scenario: non-delegated task skips work-unit checks

- **WHEN** a direct Phase Agent task with no delegated target calls `operate-queue complete`
- **THEN** work-unit result and runtime receipt checks SHALL be skipped
- **AND** standard completion receipt checks SHALL still run

## MODIFIED Requirements

### Requirement: Receipts fail closed and feedback is structured

The Queue Manager SHALL check deterministic receipts through `checkReceipts()` and `inspect()`. Supported receipt prefixes SHALL include `file:`, `json:`, `queue:`, `trace:`, `work_unit:`, and `none`. Unknown prefixes SHALL fail closed. Feedback SHALL be returned as check/inspect/advice-style structured data.

#### Scenario: work-unit receipt prefix is recognized

- **WHEN** a queue receipt references submitted delegated work
- **THEN** the receipt SHALL use work-unit identity and submitted ledger evidence
- **AND** unknown receipt prefixes SHALL fail closed

### Requirement: Queue exposes pending task count

The queue manager SHALL export `pendingCount(queue)` for queue v2. The count SHALL include outstanding queue demand in `active_window` plus `refill_pool` and SHALL report delegated in-flight attempts separately. The count SHALL NOT treat delegated work-unit attempts as unclaimed queue demand.

#### Scenario: pending count separates in-flight attempts

- **WHEN** queue v2 has active demand, refill demand, and delegated in-flight work units
- **THEN** pending count SHALL count only unclaimed queue demand
- **AND** inspect/projection SHALL expose in-flight attempt counts separately

### Requirement: Preemption inserts urgent work without hidden execution

Preemption SHALL operate on queue v2 locations. By default, `preempt(queue, item, { reason, unsafeCurrent })` SHALL insert urgent work at the earliest safe position in `active_window` without interrupting an already claimed delegated attempt or non-delegated current task. When the active window is full, the displaced tail queue item SHALL move to `refill_pool` with restore metadata. Replacing active in-progress work SHALL require `unsafeCurrent=true`.

#### Scenario: preempt preserves in-flight work

- **WHEN** urgent work preempts a queue with delegated work in `delegated_in_flight`
- **THEN** the in-flight work-unit binding SHALL remain unchanged
- **AND** the urgent work SHALL enter `active_window` or `refill_pool` according to preemption rules

### Requirement: Wave0 queue-loop simple playbook

The Wave0 queue-loop playbook SHALL verify the work-unit queue loop end-to-end on a disposable bundle. It SHALL use real framework CLIs, work-unit claim/submit for delegated source intake, gate failure diagnostics, and repair/refill through new queue demand. Verdicts SHALL be read from trace JSONL or gate outcomes, not console confidence.

#### Scenario: real search uses work-unit loop

- **WHEN** the playbook runs a real Wave0 source-intake case
- **THEN** the Phase Agent SHALL claim queue demand through `operate-work-unit claim`
- **AND** each delegated result SHALL return through `operate-work-unit submit`
- **AND** the Wave0 gate SHALL pass only after submitted ledger coverage exists

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` for Wave0 source-intake queue demand. Queue items generated by this producer rule SHALL use `queue_item_id` as demand identity, SHALL include delegated target metadata and output contracts sufficient for `operate-work-unit claim`, and SHALL route successful delegated completion through work-unit submit.

#### Scenario: source-intake queue item uses queue identity

- **WHEN** `topic_registry` contains three topics
- **THEN** the Phase Agent SHALL generate three queue demand items with distinct `queue_item_id` values
- **AND** claiming those items SHALL allocate distinct work-unit `work_id` values

#### Scenario: source-intake output is submitted

- **WHEN** a source-intake sub-agent produces the required source metadata and cache trail
- **THEN** `operate-work-unit submit` SHALL validate the output contract and cache trail before ledger append

### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL keep deterministic queue operations for non-delegated main-agent work and queue demand maintenance. Delegated sub-agent completion SHALL NOT use `operate-queue complete`; delegated completion SHALL use `operate-work-unit submit`, which validates result/receipt/output/cache, updates work-unit state, completes the bound queue demand, and appends the ledger in one Engine transition.

#### Scenario: non-delegated queue completion remains available

- **WHEN** a queue item is assigned to main-agent work with no delegated work-unit binding
- **THEN** `operate-queue complete` SHALL remain a valid deterministic completion path
- **AND** no work-unit ledger row SHALL be required for that non-delegated queue item

#### Scenario: delegated queue completion rejects operate-queue complete

- **WHEN** a queue item is present in `delegated_in_flight`
- **THEN** `operate-queue complete` SHALL fail closed for that queue item
- **AND** the diagnostic SHALL instruct completion through `operate-work-unit submit`

### Requirement: Queue state and item schema are structured

The target `rb_queue.json` schema SHALL be queue v2 with nested `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`. Queue demand identity SHALL be `queue_item_id`. `work_id` SHALL mean only an Engine-allocated delegated execution attempt and SHALL NOT be used as queue demand identity.

Each `delegated_in_flight` entry SHALL be keyed by `queue_item_id` and SHALL include `work_id`, `wave`, `batch_id`, `kind`, `attempt_index`, `queue_item_snapshot_hash`, `claimed_at`, `timeout_ms`, `deadline_at`, and optional `last_observed_at`.

#### Scenario: queue item identity is unique across active locations

- **WHEN** the same `queue_item_id` appears in more than one of `active_window`, `refill_pool`, `delegated_in_flight`, or `terminal_history`
- **THEN** queue validation SHALL fail closed
- **AND** inspect SHALL identify every conflicting location

#### Scenario: work_id is not queue demand identity

- **WHEN** a queue item lacks `queue_item_id` but has a field named `work_id`
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require migration to `queue_item_id`

### Requirement: Projection is generated from queue JSON

Queue projection SHALL be generated from queue v2 JSON and SHALL include delegated in-flight counts, expired attempt diagnostics, blocked queue-front item diagnostics, and phase-drain status. Projection SHALL remain read-only derived output and SHALL NOT be authority for queue or work-unit state.

#### Scenario: projection reports in-flight delegated work

- **WHEN** queue v2 contains two active queue items and three delegated in-flight attempts
- **THEN** the projection SHALL show both unclaimed demand and in-flight delegated attempts
- **AND** the projection SHALL derive its counts from `rb_queue.json` and `_work_units/_index.json`

## REMOVED Requirements

### Requirement: Claim advice reports delegates config for relay dispatch

**Reason**: Delegated dispatch is no longer relay-based. Claim advice tied to relay dispatch would teach an inactive production path.

**Migration**: Use `operate-work-unit claim`, whose response contains `requested_count`, `claimed_count`, `claimed_work_ids`, `in_flight_count`, `unclaimed_delegated_count`, `blocked_by_queue_item_id`, and `phase_drained`.

#### Scenario: relay claim advice is not emitted

- **WHEN** a delegated queue item is claimed
- **THEN** the queue system SHALL NOT emit relay dispatch advice as the production next step
- **AND** the work-unit claim response SHALL be the production instruction surface

### Requirement: Shared subagent protocol defines batch execution contract

**Reason**: Batch execution is now a work-unit claim/submit loop, not a shared relay-slot protocol.

**Migration**: Wave phase docs and shared sub-agent docs SHALL teach the work-unit loop and `claim --count N` in-flight semantics.

#### Scenario: old batch protocol is absent from queue authority

- **WHEN** active queue docs describe delegated batch execution
- **THEN** they SHALL describe work-unit allocation and submit
- **AND** they SHALL NOT describe relay slots as production authority

### Requirement: delegated complete() SHALL validate relay provenance

**Reason**: Delegated completion no longer occurs through queue `complete()` or relay provenance.

**Migration**: `operate-work-unit submit` SHALL validate work-unit provenance and then complete the bound queue demand atomically.

#### Scenario: delegated complete is rejected

- **WHEN** a delegated result attempts to complete through queue `complete()`
- **THEN** the Engine SHALL reject the transition
- **AND** no queue completion or ledger append SHALL occur

### Requirement: delegated complete() SHALL validate leaf cache trails

**Reason**: Delegated cache trail validation is now part of successful work-unit submit, not queue completion.

**Migration**: Use `Work-unit submit SHALL validate delegated cache trails`.

#### Scenario: cache trails are submit-validated

- **WHEN** a delegated work-unit result declares cache trails
- **THEN** `operate-work-unit submit` SHALL validate them before any ledger append

### Requirement: delegated complete() SHALL validate declared output files

**Reason**: Delegated output-file validation is now part of successful work-unit submit, not queue completion.

**Migration**: Use `Work-unit submit SHALL validate declared output files`.

#### Scenario: output files are submit-validated

- **WHEN** a delegated work-unit result declares output files
- **THEN** `operate-work-unit submit` SHALL validate them before any ledger append

### Requirement: non-delegated complete() SHALL skip relay-specific checks

**Reason**: The old relay-specific wording is replaced by a work-unit boundary for delegated checks.

**Migration**: Use `Non-delegated queue completion SHALL skip work-unit checks`.

#### Scenario: non-delegated complete avoids delegated checks

- **WHEN** non-delegated queue work completes through `operate-queue complete`
- **THEN** work-unit receipt/result checks SHALL not be required

### Requirement: Queue active window has an explicit slot-shape SSOT

**Reason**: Queue v2 no longer uses top-level queue slots as the target shape for delegated completion.

**Migration**: `active_window` and `refill_pool` are ordered arrays, and `delegated_in_flight` tracks delegated attempts by `queue_item_id`.

#### Scenario: top-level queue slots are not target shape

- **WHEN** queue validation runs in v2 mode
- **THEN** top-level `slot_NN` / `slot_1_current` SHALL NOT be accepted as the delegated completion authority
