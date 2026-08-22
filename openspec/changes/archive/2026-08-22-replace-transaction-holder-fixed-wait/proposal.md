## Why

The canonical serial regression suite spends **12.4s × 2** on one leaf in
`tests/integration/cli/operate-work-unit.test.mjs:1707` ("blocks default and
forced timeout for valid holders and exposes no unrelated progress"). The
test's real holder process deliberately sleeps **6 seconds** inside the
transaction mutation callback (`Atomics.wait`, lines 1730) for each of the
`sameAttempt` variants. The elapsed wall time is not the fact under test:
the assertions only require the holder to *still be holding* while the
contender CLI assertions (timeout-preflight, default/forced timeout,
recover-transaction) run and the byte-level invariants are checked
(measured leaf 12.449s / 12.433s in the plan inventory; per-file profile
confirms ~12.5s).

This is the plan's P0.3 "event release" workstream:
`_backlog/plans/slow-test-suite-audit-and-remediation.md` §P0 item 3 and
§"Complete Inventory" rows 8/9.

## What Changes

- In `tests/integration/cli/operate-work-unit.test.mjs:1707`, replace the
  fixed 6s `Atomics.wait` inside the holder's mutation callback with an
  explicit **ready/release file handshake**:
  - The holder writes a bundle-local `*.holder-ready` file when the
    transaction is acquired, then polls (bounded 30s safety ceiling) for a
    `*.holder-release` file before returning `{ ok: true }`.
  - The test waits for the ready file, runs **all existing assertions
    unchanged** (timeout-preflight busy facts, default + forced `timeout`
    refusal, `recover-transaction` busy for the same-attempt branch, queue
    and index byte immutability, journal inventory, `claimed` status), then
    writes the release file and awaits the holder.
  - The holder remains a **real** `withWorkUnitTransaction` process; only
    the arbitrary waiting is removed.
- Every `it()`, every `sameAttempt` variant, and every assertion is
  preserved as-is (no test-case merging — see the implementation guardrail in
  the research notes §07). No other test is touched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-harness-only change; `work-unit-transaction.mjs`
production behavior is untouched.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Existing test classes and proof boundaries only; no route change. |
| `verification/integration-tests` | current `tests/integration/cli/operate-work-unit.test.mjs` | Verify-only | One integration leaf's holder timing changes; all facts asserted stay identical. |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | Work-unit transaction production behavior is the fact being tested, not modified. |

## Impact

Target edits are limited to `tests/integration/cli/operate-work-unit.test.mjs`
and this change's verification assets. No npm dependencies, production
Harness modules, schemas, CLI behavior, or runtime bundles are changed. The
repository test command remains `npm test`.
