# C6d: Decide the Transaction v1 Journal Policy

> Candidate change: `retire-transaction-v1-history`
>
> Execution batch: dashboard item 17; standalone because it owns mutation safety
>
> Status: decision card; reader fanout complete and user policy pending
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
- The transaction parser still accepts v1 and v2. An uncommitted v1 journal is
  an unresolved orphan: `inspectWorkUnitTransaction()` projects it as a
  `suspect_transaction` blocker rather than allowing a new mutation to proceed.
- The current `recover-transaction` operation does not recover a v1 journal;
  it requires recoverable v2 proof. Thus v1 is not an active recovery protocol.
- A committed v1 journal can nevertheless be used by
  `originalAcceptanceEvidence()` as historical proof that a submit transaction
  occurred. Supersession and declaration-recovery reasoning can depend on that
  proof for an old predecessor.
- The accepted `delegated-work-units` spec requires new v2 journals while
  explicitly retaining v1 as a read-only branch. It also requires legacy or
  proof-incomplete transaction state to be `suspect_transaction`, not `busy`.

## Possible policies

| Choice | Current Engine treatment | Main benefit | Main consequence |
|---|---|---|---|
| A. Reject all v1 computation | Retain a raw-directory safety scan that blocks unresolved v1 journals, but do not use committed v1 as acceptance proof | Removes the v1 schema reader from provenance/recovery | Historical predecessor supersession or declaration recovery may lose its only original-submit proof |
| B. Keep committed-v1 evidence only | Uncommitted v1 remains a fail-closed suspect boundary; committed v1 may prove past acceptance but is never recoverable/mutable | Smallest retained v1 meaning | Keeps a narrowly scoped historical parser and proof path |
| C. Retain the present read-only branch | Preserve current parse, safety, and evidence behavior | Least disruptive to historical runs | Retains the full v1 journal branch |

No choice is selected. The current-only direction cannot permit A to make a v1
file invisible: an unresolved journal must remain an explicit no-mutation
boundary even if it is no longer a legal current journal.

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
- [ ] Characterize current v2 lock, rollback, suspect, and idempotent recovery
  behavior before a parser branch is removed.
- [ ] User selects A, B, or C.
- [ ] A proposal proves that no uncommitted/invalid v1 journal can disappear
  from the mutation blocker scan and names the exact fate of committed-v1 proof.

## Expected verification

```bash
node --test tests/engine/work-unit-transaction.test.mjs \
  tests/engine/work-unit-attempt-recovery.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs \
  tests/e2e/work-unit-attempt-recovery.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
