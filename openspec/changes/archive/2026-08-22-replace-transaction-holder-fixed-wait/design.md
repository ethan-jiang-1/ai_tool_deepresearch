## Context

`operate-work-unit.test.mjs:1707` proves that default and forced timeouts are
refused while a valid transaction holder is live, for both same-attempt and
different-attempt contention, without unrelated progress or mutation. The
holder is a real child process running `withWorkUnitTransaction` whose
mutation callback holds the lock via a fixed 6s `Atomics.wait`. Measured leaf
time ≈12.5s (2 × 6s + assertions).

## Goals / Non-Goals

**Goals:**

- Remove the arbitrary 12s of fixed holding while keeping the holder real.
- Preserve every assertion and every `sameAttempt` variant verbatim (no
  test-case merging; the two variants are independent facts).
- Keep the failure mode safe: if an assertion throws, the holder must not
  hang the suite.

**Non-Goals:**

- No change to the engine `work-unit-transaction.mjs` or any CLI.
- No touching of the other holder tests (`:1641`, engine `:230/:290/:645`
  waits) — those are separate facts/leaves and are out of scope (engine
  waits are a later P3 item).
- No timing tolerances added to assertions.

## Design

### Ready/release handshake

Holder script (replaces the 6s `Atomics.wait` inside the mutation callback):

```js
() => {
  writeFileSync(READY_FILE, 'ready\n');
  const buf = new Int32Array(new SharedArrayBuffer(4));
  let elapsed = 0;
  while (!existsSync(RELEASE_FILE) && elapsed < 30000) {
    Atomics.wait(buf, 0, 0, 50);
    elapsed += 50;
  }
  return { ok: true };
}
```

- `READY_FILE` / `RELEASE_FILE` live **next to the bundle** (same pattern as
  the existing `*.settled-ready` file at `:1643`), so they never appear
  inside `rb_queue.json`/`rb_status.json`/`_work_units` and cannot affect the
  byte-immutability assertions.
- The test: `await waitForPath(readyFile)` (holder has acquired the lock),
  then all existing assertions, then `writeFileSync(releaseFile, 'release')`,
  then `await holderDone`.
- Safety: the 30s poll ceiling bounds the holder even if the test throws
  before writing release; the existing `finally` also `SIGKILL`s a live
  holder and awaits/catches `holderDone`. If the release file is never
  written because an assertion failed, the holder exits after 30s and the
  suite reports the original assertion failure (holder exit code is not part
  of the assertions).

### Assertion preservation

The block `:1743-:1794` is unchanged except the release write:
- timeout-preflight busy facts (`timeout_eligible:false`,
  `recommended_action:'wait'`, `disposition:'busy'`,
  `targets_same_attempt`, holder target ids, rerun, no unrelated
  `engine_event` progress for the different-attempt branch);
- default and forced `timeout` refusal (status 1, `ok:false`, busy,
  `recommended_action:'wait'`);
- `recover-transaction` busy for the same-attempt branch;
- `rb_queue.json` and work-unit index byte identity, journal inventory, and
  `claimed` status.

## Duplication ledger (measured)

| Case | Before | After (expected) |
|---|---:|---:|
| `blocks default and forced timeout...` (`sameAttempt` × 2) | 12.449s / 12.433s | ~0.5s per variant |

Expected suite saving ≈ 12s. Verification: focused run + full canonical run
leaf timing (single samples).

## Risks And Open Questions

- The holder's ready file is written inside the mutation callback after the
  lock is acquired; the test also keeps `await
  waitForPath(transactionLockOwnerPath(dir))` as today — redundant but
  harmless.
- Bounded poll uses `Atomics.wait` 50ms slices — no new dependency, no event
  loop requirement (holder is a dedicated child).
- No contention semantics change: busy refusal is produced by the engine from
  the live lock/journal, independent of how long the holder waits.
