---
bug_id: BUG-186
title: No pre-submit gate validation — Phase Agent cannot dry-run gate before committing work
severity: P3
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-186: No pre-submit gate validation

## What happened

Each `operate-work-unit submit` attempt is a one-way door. If the submit postcondition fails (ledger_record_hash mismatch, etc.), the Engine rolls back but leaves uncommitted transaction files that later block the gate. The Phase Agent has no way to check "will this submit succeed and will the gate pass?" before committing.

Multiple failed submit attempts created 18 stale transaction files that had to be manually cleaned.

## Expected behavior

`operate-work-unit dry-submit` should include a gate preflight check that validates ledger integrity, index consistency, and transaction cleanliness. The current dry-submit only validates result/output/cache/receipt — not the Engine state that submit will modify.

## C4 Disposition (2026-07-31)

- Implemented path (`DEW-023`, `CHI-004`): dry-submit and formal submit now share one read-only
  submit-integrity evaluator for attempt binding, current ledger/index relation, queue/successor binding, and
  transaction disposition. Formal submit reruns it after acquiring the global lock. It returns structured
  `busy`, `suspect_transaction`, declaration-recovery, supersession, or no-path facts without candidate/authority
  side effects; fault injection covers rollback versus suspect disposition.
- Residual boundary: this is intentionally not a Gate preflight. Content completeness, delegated coverage
  counts/floors, references, and cross-work-unit Phase rules remain owned by the formal Gate, so dry-submit
  cannot promise that a Wave Gate will pass or become a second Gate evaluator.
