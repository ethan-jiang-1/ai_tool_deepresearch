## Why

The gate/queue matrix files rebuild a fresh disposable bundle per leaf via
`createBundle(unique(...))` — one `new-disposable-bundle.mjs` CLI launch per
leaf plus in-process status/artifact setup — even though every leaf then
applies its own fixture mutations. Measured (08-cost-table): wave0-complete
22.3s/63 launches/32 leaves, wave2-complete 14.8s/70/33,
operate-queue-validation 23.1s/98/27, readiness-passed 10.4s/55/19,
hitl2-recorded 8.3s/36/15. The per-leaf `createBundle` is a large hidden
fixed cost (~90 launches across these five files). This is the plan's P3
gate-matrix block (WS7) using the proven shared-empty-bundle pattern
(workstreams 3/5).

## What Changes

In each of the five files, build **one** empty disposable bundle once per run
in a `before()` hook (`createBundle('shared')`), `snapshotBundle` it, and
replace each leaf's `createBundle(unique(...))` with `restoredBundle()`
(restore the byte snapshot to its original path, then the leaf applies its
own fixture mutations as today):

- `tests/integration/cli/check-gate-wave0-complete.test.mjs` (28 leaves; the
  one custom-topic leaf at :933 keeps its own `createBundleWithTopics`).
- `tests/integration/cli/check-gate-wave2-complete.test.mjs` (31 leaves).
- `tests/integration/cli/check-gate-readiness-passed.test.mjs` (16 leaves).
- `tests/integration/cli/check-gate-hitl2-recorded.test.mjs` (15 leaves).
- `tests/integration/cli/operate-queue-validation.test.mjs` (27 leaves).

Restore returns to the original path (bundle-identity invariant; verified in
workstream 3). Every `it()`, assertion, and fixture mutation is preserved —
no test-case merging (implementation guardrail, research notes §07). The
bundle name is not asserted by any leaf (verified: only `unique()` call-site
labels and `plan_basename` frontmatter writes), so a fixed `shared` name is
safe.

Expected saving: ~90 `new-disposable-bundle` launches ≈ 30-40s across the
five files (measured per file during apply). `check-gate-hitl1-recorded`
(9.3s, no `createBundle` — its cost is per-leaf gate/inspect CLIs) is
out of scope for this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-harness-only change; no production Gate/Engine/CLI
surface is touched.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Existing test classes and proof boundaries only. |
| `verification/integration-tests` | the five touched files | Verify-only | Setup becomes shared; every asserted fact stays identical. |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` | Excluded | Gate verdict semantics are the facts being tested, not modified. |

## Impact

Target edits are limited to the five test files, the test helper
`tests/e2e/helpers/deterministic-chain-harness.mjs` (`snapshotBundle` now
clears its destination before copying — `cpSync` merges, so a stale
snapshot in a shared directory would contaminate the copy), and this
change's verification assets. No npm dependencies, production Harness modules,
schemas, CLI behavior, or runtime bundles are changed. The repository test
command remains `npm test`.
