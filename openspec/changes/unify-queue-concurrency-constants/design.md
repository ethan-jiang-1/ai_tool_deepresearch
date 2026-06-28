## Context

`MAX_CONCURRENT_SUBAGENTS` is the Relay concurrency source of truth in `DPT_FRAMEWORK/engine/subagent-relay.mjs` and currently evaluates to 8. Queue active-window shape is a separate contract: one current task plus four preview slots, persisted as five named wire keys in `rb_queue.json`.

The earlier design attempted `MAX_QUEUE_SLOTS = MAX_CONCURRENT_SUBAGENTS + 4`. That was the wrong coupling. It made Queue pending slots look like the Relay work pool, even though Queue only executes `slot_1_current` and Relay fan-out happens inside a claimed task.

## Goals / Non-Goals

**Goals**:
- Keep Queue active-window length at 5 and make it explicit as `QUEUE_ACTIVE_WINDOW_SLOTS`.
- Export `SLOT_NAMES` as the Queue slot wire-shape SSOT.
- Make schema and engine import the same Queue slot constants from a pure module.
- Keep `MAX_CONCURRENT_SUBAGENTS` as Relay's separate SSOT.
- Add `pendingCount(queue)` and CLI `count` as Queue task-depth helpers.
- Clarify docs so future agents model batch parallelism as one current Queue task with Relay fan-out inside it.

**Non-Goals**:
- Do not change `MAX_CONCURRENT_SUBAGENTS`.
- Do not derive Queue slot count from Relay concurrency.
- Do not add `claimBatch`, lease semantics, out-of-order Queue `complete()`, or execution of pending Queue slots.
- Do not make Queue engine call Relay engine directly.

## Design

### 1. Queue Slot Constants

Add a pure Queue contract module:

```js
export const QUEUE_ACTIVE_WINDOW_SLOTS = 5;
export const SLOT_NAMES = [
  'slot_1_current',
  'slot_2_next',
  'slot_3_pending',
  'slot_4_pending',
  'slot_5_tail',
];
export const PENDING_SLOT_NAMES = SLOT_NAMES.slice(1);
```

`queue-manager.mjs` and `schema/contracts/queue.mjs` both import this module. The engine may re-export `QUEUE_ACTIVE_WINDOW_SLOTS` and `SLOT_NAMES` as part of its public interface, but the constants are not owned by Relay and are not derived from Relay.

### 2. Queue Slot Operations

`promote()` and `preempt()` should iterate `SLOT_NAMES` rather than repeat five hardcoded assignments. This keeps the implementation aligned with the wire-shape SSOT while preserving existing behavior:

- `promote()` left-shifts every slot and clears the tail.
- default `preempt()` inserts at `slot_2_next`, right-shifts preview slots, and moves a displaced tail item to `refill_pool` with restore metadata.
- `canonicalQueueFileShape()` emits slot keys by iterating `SLOT_NAMES`.

### 3. pendingCount()

`pendingCount(queue)` returns Queue task depth only:

```js
active non-null Queue slots + refill_pool.length
```

It does not count Relay sub-agent slots. A delegated or batch Queue task remains one Queue task even if Relay fans out multiple sub-agents while executing it.

CLI:

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs count <bundle>
```

prints:

```json
{ "pending": 3, "active_window": 2, "refill_pool": 1 }
```

### 4. Queue x Relay Mechanism

The mechanism boundary is intentionally simple:

1. Phase Agent claims one Queue current task.
2. If that task is delegated or contains batch payload items, Phase Agent maps the current task payload to Relay `SlotConfig` entries.
3. Relay stages and runs at most `MAX_CONCURRENT_SUBAGENTS` sub-agent slots.
4. Phase Agent collects committed Relay results and completes the current Queue task once the task's receipts/artifacts satisfy the Queue contract.

Queue pending slots are preview/depth, not executable Relay work. Relay does not query Queue and Queue does not lease pending tasks.

### 5. Documentation SSOT

Docs should name `MAX_CONCURRENT_SUBAGENTS` rather than duplicating stale values. It is acceptable to mention the current value when useful, but the symbol and owning file must be the source of truth.
