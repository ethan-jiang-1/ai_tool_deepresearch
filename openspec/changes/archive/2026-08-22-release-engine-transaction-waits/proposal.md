## Why

`tests/engine/work-unit-transaction.test.mjs` holds the transaction lock in
three real holder processes via fixed `Atomics.wait` sleeps (1200ms at :230,
1000ms at :290, 900ms at :645 ≈ 3.1s per suite run). The elapsed wall time is
not the fact under test: each test only requires the holder to still be
holding while the contender assertions run. This is the event-release pattern
from workstream 2 (`replace-transaction-holder-fixed-wait`) applied to the
engine-level holders (plan P3 tail; engine waits flagged in
`01-state-and-measurements.md`).

## What Changes

- In the three contention tests of `work-unit-transaction.test.mjs`, replace
  the fixed `Atomics.wait` with the ready/release file handshake:
  - The holder writes a bundle-local `*.holder-ready` (or `*.settled-ready`,
    already present at :290) when the lock is held, then polls (bounded 30s
  safety ceiling) for a `*.holder-release` file.
  - The test waits for ready, runs **all existing assertions unchanged**, then
  writes the release file and awaits the holder.
  - The holder remains a **real** `withWorkUnitTransaction` process; only the
  arbitrary waiting is removed.
- Every `it()`, every `sameAttempt` variant, and every assertion is preserved
  as-is (no test-case merging — implementation guardrail, research notes §07).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-harness-only change; `work-unit-transaction.mjs`
production behavior is untouched.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Existing test classes and proof boundaries only. |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | Work-unit transaction production behavior is the fact being tested, not modified. |

## Impact

Target edits are limited to `tests/engine/work-unit-transaction.test.mjs`
and this change's verification assets. No npm dependencies, production
Harness modules, schemas, CLI behavior, or runtime bundles are changed.
