# Agentic Queue (delta)

> req: AGQ-001, AGQ-004, AGQ-018, AGQ-019

## Purpose

Allow `completion_receipt: null` for bounded supplementary tasks whose queue-level file receipt is deferred to phase-local verification and downstream gate evaluation. The property remains required; null is valid only with `required_receipts: []` and does not grant pass authority by itself. Also expand the active window from 5 to 20 slots (AGQ-019) to support research runs with more than 5 topics without queue overflow.

## MODIFIED Requirements

### Requirement: Queue state and item schema are structured

The Queue Manager SHALL continue to define Zod-validated `QueueState` and `QueueItem` schemas. `QueueState` SHALL contain a 20-slot active window (`slot_1_current` through `slot_20_tail`), a `refill_pool`, queue health, stop authorization state, and a trace path. All other accepted `QueueItem` fields, `TargetSpec` wire shape, and schema validation rules SHALL remain as defined in the accepted spec.

The `completion_receipt` property SHALL remain required on every queue item; a missing property is still invalid.

**Change**: `completion_receipt` MAY be `null` only for bounded supplementary tasks whose queue-level file receipt is intentionally deferred to phase-local verification and downstream gate evaluation. This exception is narrow:

- `required_receipts` SHALL be an empty array when `completion_receipt` is `null`.
- `done_condition`, `verification`, and `writes_to` SHALL describe the expected incremental outputs.
- If the task delegates to a Sub-agent, delegated `complete()` SHALL still validate relay provenance, runtime receipt, committed SlotResult, `output_files[]`, declared files, and cache trail filtering according to accepted delegated completion rules.
- `completion_receipt: null` SHALL NOT mark a task done by itself and SHALL NOT satisfy gate provenance, countability, cache coverage, or reference quality rules.

This supports existing Wave0/Wave1 count-floor supplementary tasks and Wave2 supplementary backing/cross/emergent search tasks without making queue receipt checks a filesystem pass authority.

**Agent completion signal for supplementary tasks**: When a supplementary task has `completion_receipt: null`, the Phase Agent SHALL treat successful delegated relay completion as the task's completion signal. Specifically, the Agent SHALL consider the task done when: (a) the relay Sub-agent's `commitSlotResult()` has committed `result.json` with `status: "done"`, (b) delegated `complete()` has appended the output declaration ledger record, and (c) the declared output files pass local existence checks. The queue-level `completion_receipt` field remains `null` by design — its absence does not mean the task is incomplete; it means queue-level receipt checking is deferred to phase-local verification and downstream gate evaluation. The Agent SHALL NOT loop or re-spawn the task solely because `completion_receipt` is `null`.

#### Scenario: Valid queue item passes schema

- **WHEN** a queue item has all fixed core fields and `payload` is an object
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Valid queue item with targets.delegates passes schema

- **WHEN** a queue item has `targets: { controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }`
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Valid queue item with targets.controller only passes schema

- **WHEN** a queue item has `targets: { controller: "main-agent" }` (no delegates)
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Missing controller is rejected

- **WHEN** a queue item has `targets: { controller: "invalid_controller" }`
- **THEN** `QueueItemSchema.safeParse()` SHALL reject the item

#### Scenario: Invalid delegates.to is rejected

- **WHEN** a queue item has `targets: { controller: "main-agent", delegates: { to: "invalid" } }`
- **THEN** `QueueItemSchema.safeParse()` SHALL reject the item

#### Scenario: Missing core field is rejected

- **WHEN** a queue item is missing `producer_rule` or `required_receipts`
- **THEN** `QueueItemSchema.safeParse()` SHALL reject the item

#### Scenario: Supplementary delegated task accepts null completion receipt

- **WHEN** a Wave1 supplementary reference task has `required_receipts: []`
- **AND** `completion_receipt: null`
- **AND** `targets.delegates.to: "sub-agent"`
- **AND** `done_condition`, `verification`, and `writes_to` describe the expected new reference files
- **THEN** `QueueItemSchema.safeParse()` SHALL accept the task shape
- **AND** delegated `complete()` SHALL still require relay provenance before the queue item can complete

#### Scenario: Missing completion receipt remains invalid

- **WHEN** a queue item omits the `completion_receipt` property entirely
- **THEN** `QueueItemSchema.safeParse()` SHALL reject the item

#### Scenario: Null completion receipt is invalid with required receipts

- **WHEN** a queue item has `required_receipts: ["file:artifacts/wave2/synthesis.md"]`
- **AND** `completion_receipt: null`
- **THEN** `QueueItemSchema.safeParse()` SHALL reject the item
- **AND** feedback SHALL state that queue-level receipts require a concrete completion receipt

#### Scenario: Null completion receipt does not bypass gate authority

- **WHEN** a Wave2 supplementary search task with `completion_receipt: null` writes `reference/00-cross-new.md`
- **THEN** the downstream Wave2 conditional provenance and accepted reference/cache/countability checks SHALL still decide whether that output is valid for gate pass

#### Scenario: Agent treats relay completion as the signal for supplementary tasks

- **WHEN** a supplementary task has `completion_receipt: null` and `targets.delegates.to: "sub-agent"`
- **AND** the relay Sub-agent completes successfully (`commitSlotResult()` commits `result.json` with `status: "done"`, delegated `complete()` appends output declaration, output files exist)
- **THEN** the Phase Agent SHALL treat the task as complete
- **AND** the Agent SHALL NOT re-spawn or loop the task solely because `completion_receipt` is `null`
- **AND** the Agent SHALL proceed to the next queue item or phase closeout

### Requirement: Queue active window has an explicit slot-shape SSOT

The accepted `QUEUE_ACTIVE_WINDOW_SLOTS` constant SHALL change from `5` to `20`. `SLOT_NAMES` SHALL expand accordingly: `slot_1_current`, `slot_2_next`, `slot_3_pending` through `slot_19_pending`, `slot_20_tail`. `PENDING_SLOT_NAMES` SHALL continue to be `SLOT_NAMES.slice(1)`.

The queue schema (`QueueSchema`), engine queue operations (`queue-manager.mjs`), and primary queue CLI operations (`operate-queue.mjs`) derive slot structure dynamically from `SLOT_NAMES` and SHALL preserve that SSOT pattern. Diagnostic helpers, templates, tests, and playbook fixtures SHALL NOT keep independent hardcoded 5-slot active-window assumptions.

Accepted spec text updates for `agentic-queue`, `schema-core`, and `cmd-bundle-instantiation` are handled by their respective delta specs in this change (AGQ-019, SCO-002, CMI-002). The following non-spec derivative artifacts SHALL be updated:

- `rb_queue.json.tmpl`: rename `slot_5_tail` to `slot_5_pending`, add `slot_6_pending` through `slot_20_tail` (all `null`)
- `check-reentry.mjs`: search for hardcoded slot-name array (grep `slot_5_tail` or `slot_1_current.*slot_2_next`) and replace with `import { SLOT_NAMES }` from `queue-slots.mjs`
- `gate-helpers.mjs`: search for hardcoded active-window scan loop (grep `slot_5_tail` or `slot_1_current`) and replace with `import { SLOT_NAMES }` from `queue-slots.mjs`
- `file-observability.mjs`: search for hardcoded slot enumeration (grep `slot_5_tail` or `slot_1_current`) and replace with `import { SLOT_NAMES }` from `queue-slots.mjs`
- `experiments_env/shared/new-disposable-bundle.mjs`: expand queue fixture from 5 to 20 slots (validated by `QueueSchema.parse()` so mismatch would be caught at runtime)
- Governance `req-registry.yaml` AGQ-019: update `QUEUE_ACTIVE_WINDOW_SLOTS=5` → `20` (keep `MAX_CONCURRENT_SUBAGENTS=8` unchanged)
- Tests asserting `QUEUE_ACTIVE_WINDOW_SLOTS === 5`: update to `20`
- Tests asserting `deepEqual(SLOT_NAMES, [...5-slot array])`: update to a 20-element expected array or derive expectations from `SLOT_NAMES`
- Test fixtures and controlled playbook snippets with hardcoded 5-slot queue objects: expand to 20 slots or derive from `SLOT_NAMES` where executable JS can import it
- Current guidance/shared schema docs that describe queue slot count: update to 20 slots unless the text is explicitly historical

The decoupling invariant from Relay concurrency (`MAX_CONCURRENT_SUBAGENTS = 8`) SHALL be preserved: `QUEUE_ACTIVE_WINDOW_SLOTS` SHALL NOT equal `MAX_CONCURRENT_SUBAGENTS`.

**Legacy queue migration**: When the 20-slot queue schema encounters a legacy 5-slot `rb_queue.json`, the first `operate-queue` operation SHALL populate the expanded slot shape before any mutation:

- The existing `slot_5_tail` SHALL be renamed to `slot_5_pending`. Its value (task card or null) SHALL be preserved.
- `slot_6_pending` through `slot_20_tail` SHALL be initialized to `null`.
- `slot_1_current` through `slot_4_pending` SHALL be preserved as-is.
- This migration SHALL follow the same injection-then-validate pattern as QIV-002 legacy `bundle_name` injection: detect legacy shape, migrate, persist, then validate normally.
- If the queue already has 20 slots (e.g., already migrated), no migration SHALL be performed.

This migration is deterministic and idempotent. A legacy queue migrated once SHALL pass subsequent schema validation without further transformation.

#### Scenario: Queue slot constants define the 20-slot wire shape

- **WHEN** `QUEUE_ACTIVE_WINDOW_SLOTS` and `SLOT_NAMES` are imported from `queue-slots.mjs`
- **THEN** `QUEUE_ACTIVE_WINDOW_SLOTS` SHALL equal 20
- **AND** `SLOT_NAMES` SHALL equal `slot_1_current`, `slot_2_next`, `slot_3_pending`, `slot_4_pending`, `slot_5_pending`, `slot_6_pending`, `slot_7_pending`, `slot_8_pending`, `slot_9_pending`, `slot_10_pending`, `slot_11_pending`, `slot_12_pending`, `slot_13_pending`, `slot_14_pending`, `slot_15_pending`, `slot_16_pending`, `slot_17_pending`, `slot_18_pending`, `slot_19_pending`, `slot_20_tail`
- **AND** Queue schema validation and Queue engine operations SHALL use the same `SLOT_NAMES` source of truth

#### Scenario: Promote shifts the configured active window left

- **WHEN** `promote(queue, work_id)` is called
- **THEN** every configured slot in `SLOT_NAMES` SHALL shift one position left
- **AND** the configured tail slot SHALL become null

#### Scenario: Preempt displaces the configured tail slot

- **WHEN** `preempt(queue, urgentItem)` is called and the active window is full
- **THEN** the configured tail slot SHALL be displaced to `refill_pool`
- **AND** the displaced item SHALL record `preempted_from_slot` using the configured tail slot name
- **AND** `restore_priority` SHALL be set to `next_tail_opening`

#### Scenario: Queue with 20 slots accepts 20 active-window task cards

- **WHEN** 20 topic-scoped task cards are enqueued
- **THEN** the active window SHALL accommodate all 20 without displacing any to `refill_pool`
- **AND** `slot_1_current` through `slot_20_tail` SHALL be populated
- **AND** only `slot_1_current` SHALL be executable by `claim()`

#### Scenario: Queue SSOT remains decoupled from Relay concurrency

- **WHEN** `QUEUE_ACTIVE_WINDOW_SLOTS` is changed
- **THEN** its value SHALL remain independent of `MAX_CONCURRENT_SUBAGENTS`
- **AND** the architectural invariant SHALL hold: queue slot count ≠ relay concurrency cap

#### Scenario: Legacy 5-slot queue is migrated to 20-slot on first operation

- **WHEN** an `operate-queue` operation encounters `rb_queue.json` with only 5 slots (keys `slot_1_current` through `slot_5_tail`)
- **THEN** the engine SHALL detect the legacy shape before any mutation
- **AND** `slot_5_tail` SHALL be renamed to `slot_5_pending` with its value preserved
- **AND** `slot_6_pending` through `slot_20_tail` SHALL be initialized to `null`
- **AND** `slot_1_current` through `slot_4_pending` SHALL be preserved as-is
- **AND** the migrated queue SHALL be persisted before the requested operation proceeds
- **AND** subsequent operations SHALL validate normally against the 20-slot schema

#### Scenario: Already-migrated 20-slot queue is not re-migrated

- **WHEN** an `operate-queue` operation encounters `rb_queue.json` with 20 slots
- **THEN** no migration SHALL be performed
- **AND** the operation SHALL proceed directly to normal validation
