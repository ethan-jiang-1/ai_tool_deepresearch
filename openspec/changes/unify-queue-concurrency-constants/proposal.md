## Why

The queue active window and Relay sub-agent concurrency were being conflated. The active window is a Queue preview/execution structure with one executable current task and four preview slots. Relay concurrency is a separate sub-agent fan-out limit inside the currently claimed Queue task.

The previous draft tried to derive Queue length from `MAX_CONCURRENT_SUBAGENTS`. That would make pending Queue slots look executable and would keep the wrong mental model alive. The cleaner fix is to keep the mechanisms separate and make both constants explicit.

Core rule:

```text
Queue active window is not the Relay work pool.
Relay concurrency happens inside the current Queue task.
```

## What Changes

- **Queue SSOT**: add `QUEUE_ACTIVE_WINDOW_SLOTS = 5` and `SLOT_NAMES` in a pure Queue contract/constants module that schema and engine can import without cycles.
- **Engine**: `queue-manager.mjs` uses `SLOT_NAMES` for active-window validation, promote, preempt, refill, render, canonical file shape, and exports `pendingCount(queue)`.
- **Schema**: `QueueSchema` builds its slot keys from the same `SLOT_NAMES`.
- **CLI**: `operate-queue.mjs count <bundle>` prints `{ "pending": N, "active_window": A, "refill_pool": P }`.
- **Relay SSOT**: `MAX_CONCURRENT_SUBAGENTS` remains owned by `DPT_FRAMEWORK/engine/subagent-relay.mjs`; docs/specs reference that symbol instead of stale hardcoded values.
- **Docs**: clarify that batch parallelism is represented as one current Queue task with batch payload; Relay fans out sub-agent slots inside that task.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agentic-queue`: adds explicit Queue active-window SSOT (`QUEUE_ACTIVE_WINDOW_SLOTS = 5`, `SLOT_NAMES`), dynamic schema/engine slot usage, `pendingCount(queue)`, and CLI `count`.
- `subagent-dispatch`: clarifies that Relay concurrency uses `MAX_CONCURRENT_SUBAGENTS` independently of Queue active-window length. Queue pending slots are not a Relay pool.

## Impact

- `DPT_FRAMEWORK/schema/contracts/queue-slots.mjs` — new pure Queue slot constants
- `DPT_FRAMEWORK/schema/contracts/queue.mjs` — schema slot keys generated from Queue constants
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — shared constants, generic slot operations, `pendingCount()`
- `DPT_FRAMEWORK/cli/operate-queue.mjs` — new `count` command
- `tests/engine/queue-manager.test.mjs` — Queue constants and `pendingCount()` regression tests
- `tests/schema/contracts/queue.test.mjs` — shared slot shape regression
- `tests/integration/cli/operate-queue.test.mjs` — CLI count test
- `openspec/specs/*`, `guidelines/*`, shared subagent protocol, and batch playbook docs — mechanism clarification and stale concurrency cleanup
