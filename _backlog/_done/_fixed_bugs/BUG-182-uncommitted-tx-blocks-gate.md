---
bug_id: BUG-182
title: Uncommitted transaction files from failed submits block wave0_work_unit_submission_presence gate
severity: P2
phase: wave0
source: CCDS4 (Claude Code + DeepSeek v4, 2026-07-29 data repair)
surfaced_at: 2026-07-29
---

# BUG-182: Uncommitted transactions block gate

## What happened

After the submit postcondition failed (ledger_record_hash mismatch), the Engine rolled back its writes but left 18 `tx-*.json` files in `_work_units/_transactions/`. The wave0 gate detected these as "uncommitted transaction" and failed `wave0_work_unit_submission_presence` — even though all 5 work units were correctly submitted.

The fix was manually deleting all `tx-*.json` files. There is no Engine operation to clean up stale transactions.

## Expected behavior

`operate-work-unit sweep` or a gate preflight should clean up uncommitted transactions that are older than the last successful submit. Stale transactions should not block gate passage.

## C4 Disposition (2026-07-31)

- Implemented path (`DEW-023`, `CHI-004`): new transaction-v2 journals declare complete exact-path
  before-images before target mutation and settle as `committed`, proof-verified `rolled_back`, or `suspect`
  before final lock release. Proven rollback history no longer blocks solely by existing. One exact unlocked
  v2 `started`/`suspect` journal may be reconciled with
  `operate-work-unit recover-transaction <bundle> --tx-id <id>` only when all declared targets still match;
  settled recovery is idempotent and changes no original target authority.
- Residual boundary: C4 adds no age sweep, batch cleanup, lock stealing, or dead-process inference. Any valid
  non-suspect held pair remains honest `busy`; legacy/incomplete/drifted proof or a suspect held pair remains
  `missing_contract`. Host crash/liveness recovery requires a future fencing contract.
