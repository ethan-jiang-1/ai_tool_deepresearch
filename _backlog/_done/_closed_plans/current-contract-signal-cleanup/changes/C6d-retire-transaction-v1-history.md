# C6d: Decide the Transaction v1 Journal Policy

> Candidate change: `retire-transaction-v1-history`
>
> Execution batch: dashboard item 17; standalone because it owns mutation safety
>
> Status: governed-archived and committed as dashboard item 17 (`858cbdb87`)
>
> Risk: L4

## One question

May the current Engine stop parsing `work-unit.transaction.v1` journals without
weakening the fail-closed mutation boundary or losing needed historical
original-submission evidence?

This card owns transaction journals only. It does not remove current
transaction v2 locking/recovery, and it does not decide assignment, submission,
or actor interpretation from C6a-C6c.

## Verified boundary

- Every new work-unit mutation writes a transaction v2 journal with exact
  targets and before-image proof. No current writer emits v1.
- The public transaction schema accepts only v2. A private raw safety
  classifier still treats uncommitted, unreadable, malformed, and
  proof-incomplete v1 journal bytes as `suspect_transaction` blockers rather
  than allowing a new mutation to proceed.
- The current `recover-transaction` operation does not recover a v1 journal;
  it requires recoverable v2 proof. Thus v1 is not an active recovery protocol.
- A structurally complete committed v1 journal is diagnostic-only: it cannot
  satisfy original-submit evidence for declaration recovery or supersession,
  and cannot establish transaction, Gate, inspect, or lineage authority.
- The accepted `delegated-work-units` spec makes v2 the sole current protocol;
  it retains only raw fail-closed detection for unsafe v1 or invalid bytes.

## Policy decision

| Choice | Current Engine treatment | Main benefit | Main consequence |
|---|---|---|---|
| **A. Reject all v1 computation — selected 2026-08-14** | Retain a raw-directory safety scan that blocks unresolved v1 journals, but do not use committed v1 as acceptance proof | Removes the v1 schema reader from provenance/recovery | Historical predecessor supersession or declaration recovery may lose its only original-submit proof |
| B. Keep committed-v1 evidence only | Uncommitted v1 remains a fail-closed suspect boundary; committed v1 may prove past acceptance but is never recoverable/mutable | Smallest retained v1 meaning | Keeps a narrowly scoped historical parser and proof path |
| C. Retain the present read-only branch | Preserve current parse, safety, and evidence behavior | Least disruptive to historical runs | Retains the full v1 journal branch |

The user selected A. The current-only direction cannot permit A to make a v1
file invisible: an unresolved, unreadable, malformed, or proof-incomplete
journal remains an explicit no-mutation boundary even though v1 is no longer a
legal current transaction protocol. A structurally complete committed v1 file
is diagnostic-only: it neither blocks a new v2 mutation by itself nor proves a
current submit, recovery, supersession, Gate, inspect, or lineage conclusion.

## Effects and side effects to assess

- Removing the v1 union without a raw-shape scan could let an unfinished old
  transaction cease to block mutation. That is a safety regression, not a
  cleanup win.
- Removing committed-v1 evidence can break historical acceptance validation,
  declaration recovery, and supersession even though the v1 journal itself is
  never mutated.
- Current v2 contention, rollback, suspect-state diagnostics, and idempotent
  recovery are protected behavior. No proposal may conflate a v1 journal with a
  malformed v2 journal or turn suspect state into a wait/force-delete path.

## Proposal gate

- [x] Current v2 writer, v1 unresolved blocker, v1 non-recoverability, and
  committed-v1 evidence use identified.
- [x] Accepted spec owner and current `suspect_transaction` contract located.
- [x] Map each v1 consumer in mutation preflight, inspect, timeout,
  recover-transaction, supersession, declaration recovery, Gate/provenance,
  CLI diagnostics, and tests.
- [x] Characterize current v2 lock, rollback, suspect, and idempotent recovery
  behavior before a parser branch is removed.
- [x] User selects A: reject all v1 computation while preserving the raw
  mutation-safety scan.
- [x] Proposal proves that no uncommitted/invalid v1 journal can disappear
  from the mutation blocker scan; committed-v1 proof becomes diagnostic-only
  and cannot establish current authority.
- [x] Create and polish [`retire-transaction-v1-history`](../../../../openspec/changes/archive/2026-08-15-retire-transaction-v1-history/): two deltas, design, tasks, semantic closure, and verification plan all agree on policy A.
- [x] User explicitly authorized `APPLY`; implementation removed positive v1
  parsing and committed-v1 evidence authority without changing current v2
  contention, rollback, or recovery behavior.
- [x] Selected schema/unit/integration/deterministic-E2E verification,
  workflow-package validation, main-spec sync, archive governance checks, and
  closeout review completed.
- [x] User authorized governed archive and commit. The finalizer passed every
  check, archived the change as `2026-08-15-retire-transaction-v1-history`,
  and commit `858cbdb87` records the implementation, spec sync, and archive.

## Expected verification

```bash
node --test tests/engine/work-unit-transaction.test.mjs \
  tests/engine/work-unit-attempt-recovery.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs \
  tests/e2e/work-unit-attempt-recovery.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
