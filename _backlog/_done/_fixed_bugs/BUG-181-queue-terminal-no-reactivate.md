---
bug_id: BUG-181
title: Queue terminal_history items cannot be reactivated through any Engine operation
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-181: Queue terminal_history items cannot be reactivated

## What happened

After nuking work units #4 and #5 from ledger and index, the corresponding queue items remained in `rb_queue.json` terminal_history as "done." `operate-queue enqueue` rejected re-enqueuing: "queue_item_id appears in both active_window and terminal_history."

The only fix was manually editing `rb_queue.json` to extract the task card from terminal_history and inject it into active_window. Even then, the work-unit index `next_claim_index` had to be manually adjusted to avoid work_id collision.

## Expected behavior

`operate-queue reactivate --queue-item-id <id>` should move a completed terminal queue item back to active_window with status "queued." This is the legitimate use case of "the work unit for this queue item was corrupted — redo it."

## C4 Disposition (2026-07-31)

- Implemented path (`AGQ-026`, `DEW-024`): C4 deliberately keeps the submitted predecessor and its terminal
  queue snapshot immutable. Audited `supersede` derives one fresh queue demand with a new
  `successor_queue_item_id` and five exact direct-parent lineage fields. It enters an ordinary queue location,
  requires current actor observation and normal claim, and may continue only through existing
  retry/replacement/later-supersession edges to one acyclic current leaf.
- Residual boundary: no `reactivate` operation is added. A missing/mismatched successor, sibling, branch,
  cycle, or parent reactivation fails closed; later legal work targets the current successor under its own
  status contract rather than rewriting terminal history.
