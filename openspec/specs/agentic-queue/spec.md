# Agentic Queue

> req: AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006

## Purpose

Define the JS-owned Agentic Queue Manager: a structured, Zod-validated queue system with a five-slot active window, refill pool, deterministic receipts, and Markdown projection. The Queue Manager owns all queue mutation; the Agent does semantic work but does not self-govern queue state. This capability replaces the V12 Markdown-governed queue pattern with machine-enforced scheduling, receipt checking, promotion, preemption, and trace.

## Requirements

### Requirement: Queue state and item schema are structured

The Queue Manager SHALL define Zod-validated `QueueState` and `QueueItem` schemas. `QueueState` SHALL contain a five-slot active window (`slot_1_current` through `slot_5_tail`), a `refill_pool`, queue health, stop authorization state, and a trace path. `QueueItem` SHALL contain fixed executable work fields (`work_id`, `title`, `target`, `action`, `producer_rule`, `lineage`, `priority_class`, `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`, `completion_receipt`, `failure_route`, `status`, `created_at`, `updated_at`) plus a flexible JSON `payload`. The schema SHALL reject items missing `producer_rule`, `required_receipts`, or `completion_receipt`.

#### Scenario: Valid queue item passes schema

- **WHEN** a queue item has all fixed core fields and `payload` is an object
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Missing core field is rejected

- **WHEN** a queue item is missing `producer_rule`, `required_receipts`, or `completion_receipt`
- **THEN** validation fails

### Requirement: Queue Manager exposes enqueue, claim, complete, and fail operations

The Queue Manager SHALL expose JS APIs for `enqueue`, `claim`, `complete`, and `fail`. `enqueue` SHALL fill open active slots before using `refill_pool`. `claim` SHALL only expose `slot_1_current`. `complete` SHALL verify completion receipts before promotion. `fail` SHALL record failure and create repair/refill work instead of authorizing chat progress.

#### Scenario: Enqueue fills active window before refill pool

- **WHEN** six valid items are enqueued into an empty queue
- **THEN** five items occupy active window slots and the sixth is stored in `refill_pool`

#### Scenario: Claim returns current slot only

- **WHEN** `claim(queue, { actor })` is called
- **THEN** it returns `slot_1_current` and does not expose pending slots as executable work

#### Scenario: Complete promotes next work

- **WHEN** `complete()` succeeds for `slot_1_current`
- **THEN** slot 2 promotes to slot 1 and the tail refills from the highest-priority pool item when available

#### Scenario: Failure creates repair work

- **WHEN** `fail()` is called with a structured failure
- **THEN** the queue records failure trace data and adds concrete repair work to the active window or refill pool

### Requirement: Preemption inserts urgent work without hidden execution

The Queue Manager SHALL expose `preempt(queue, item, { reason, unsafeCurrent })`. By default, preemption SHALL insert urgent work into the earliest pending slot and SHALL NOT interrupt `slot_1_current`. When the active window is full, displaced `slot_5_tail` SHALL move to the top of `refill_pool` with restore metadata. Replacing `slot_1_current` SHALL require `unsafeCurrent=true`.

#### Scenario: Preempt inserts into pending slot

- **WHEN** urgent work preempts a queue with current and pending work
- **THEN** the urgent item is inserted into the earliest pending slot and current work remains unchanged

#### Scenario: Full window displacement is preserved

- **WHEN** urgent work preempts a full active window
- **THEN** the previous `slot_5_tail` appears in `refill_pool` with `preempted_from_slot=slot_5_tail` and `restore_priority=next_tail_opening`

#### Scenario: Current slot replacement requires unsafe flag

- **WHEN** `preempt()` is asked to replace current work without `unsafeCurrent=true`
- **THEN** it rejects the operation

### Requirement: Receipts fail closed and feedback is structured

The Queue Manager SHALL check deterministic receipts through `checkReceipts()` and `inspect()`. Supported receipt prefixes SHALL include `file:`, `json:`, `queue:`, `slot:`, `trace:`, and `none`. Unknown prefixes SHALL fail closed. Feedback SHALL be returned as check/inspect/advice-style structured data.

#### Scenario: Unknown receipt prefix fails

- **WHEN** a queue item contains `chat:trust_me` as a receipt
- **THEN** receipt validation fails and reports the unsupported prefix

#### Scenario: Missing completion receipt blocks promotion

- **WHEN** `complete()` is called but the item completion receipt is missing
- **THEN** the current item is not promoted and feedback explains the missing receipt

### Requirement: Projection is generated from queue JSON

The Queue Manager SHALL render an Agent-readable Markdown task card/window from JSON queue state via `render()`. The projection SHALL describe current work, pending previews, receipts, writes, and failure route. The projection SHALL NOT be a mutation input or machine authority.

#### Scenario: Render projection writes Markdown

- **WHEN** `render(queue, bundleDir)` is called
- **THEN** a Markdown projection file is written at the queue projection path

#### Scenario: Projection drift cannot mutate state

- **WHEN** the projection file is edited manually
- **THEN** Queue Manager decisions still use JSON queue state and ignore projection content as authority

### Requirement: Command experiments prove queue manager mechanics

The Queue Manager engine SHALL include simple, medium, and complex experiment playbooks under `experiments_playbook/exp_agentic-queue/`. Each playbook SHALL create a real disposable bundle, validate and inspect it, exercise the engine JS API or CLI, derive verdict from trace JSONL `check` events, and clean up on success.

#### Scenario: Simple playbook proves enqueue claim complete promotion

- **WHEN** `test-simple.md` is executed
- **THEN** it proves enqueue, claim, complete, promotion, projection, and trace verdict

#### Scenario: Medium playbook proves preemption and restore

- **WHEN** `test-medium.md` is executed
- **THEN** it proves full-window preemption, displaced tail restore metadata, refill, and trace verdict

#### Scenario: Complex playbook proves fail-closed behavior

- **WHEN** `test-complex.md` is executed
- **THEN** it proves invalid task rejection, missing receipt blocking, unsafe-current guard, and empty queue after refill/blocker handling without fake pass evidence
