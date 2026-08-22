## Context

Three engine-level contention tests spawn a real holder child running
`withWorkUnitTransaction` whose mutation callback (or
`afterCommittedBeforeRelease` hook at :290) holds the lock via a fixed
`Atomics.wait` (1200/1000/900ms). The `:290` test already writes a
`*.settled-ready` file before its fixed wait.

## Goals / Non-Goals

**Goals:**

- Remove the ~3.1s of fixed holding while keeping the holder real.
- Preserve every assertion and every `sameAttempt` variant verbatim.
- Keep the failure mode safe (bounded release poll + SIGKILL fallback in
  `finally`).

**Non-Goals:**

- No change to `work-unit-transaction.mjs` or any CLI.
- No change to the CLI-level holder test in `operate-work-unit.test.mjs`
  (already released in WS2).

## Design

Holder mutation callback (and the `afterCommittedBeforeRelease` hook at
`:290`) becomes:

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

- Ready/release files live next to the bundle (never inside it), so the
  byte-immutability assertions (queue/index/authority files) are unaffected.
- Test flow: `await waitForFile(lockOwner)` (existing) + `await
  waitForFile(readyFile)` → all existing assertions → `writeFileSync(release,
  'release')` → `await holderDone` (for `:290`, the post-holder lock-release
  assertions then run as today).
- Safety: 30s poll ceiling + `finally` `rmSync` of both files + existing
  holder kill/cleanup. `:645` declares ready/release per loop iteration
  (bundle dir differs per `sameAttempt`).

## Duplication ledger (measured)

| Test | Before (fixed wait) | After (expected) |
|---|---:|---:|
| :230 structured busy | 1200ms | ~50ms |
| :290 settled busy | 1000ms | ~50ms |
| :645 timeout refusal (×2 variants) | 900ms each | ~50ms each |

Expected suite saving ≈ 3.1s; contention/busy facts unchanged.

## Risks And Open Questions

- `waitForFile` default timeout must exceed holder startup (it does — the
  same helper already gates the lock-owner file).
- Ready is written inside the mutation callback (journal `started`) for
  `:230`/`:645` and in `afterCommittedBeforeRelease` (journal `committed`)
  for `:290` — matching each test's asserted `journal_disposition`.
