## Why

Three e2e/integration families rebuild the same production predecessor state
per case/branch even though each variant only diverges at one point. The
plan's P1.1 "share immutable setup" pattern (already proven in workstream 3:
wave1-focus snapshot share) applies:

- `tests/e2e/final-refinement-continuity.test.mjs` (11.4s / 90 launches):
  two cases each call `buildHitl2Baseline` (~22 CLIs) and diverge only at
  the Final entry / publish step.
- `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` (24.1s /
  142 launches): the three branches of the :988 lifecycle test each run the
  identical `prepareThroughWave0Entry` (14 CLIs) + `passWave0WithDiagnostics`
  (6 CLIs) prefix before diverging.
- `tests/e2e/rerun-round-continuity.test.mjs` (59.8s / 463 launches): the
  three `action:add` direction variants (728 stale/invalid, 739 future) each
  run `reachWave2` (~8-10 CLIs) before their distinct `stageSeed` +
  `useDeltaSynthesis` + gate suffix.

## What Changes

- **final-refinement-continuity.test.mjs**: build `buildHitl2Baseline` once
  in `before()`, `snapshotBundle` it, `restoreBundle` (original path) per
  test; each `it()` uses the restored bundle.
- **handoff-witnessing-lifecycle.test.mjs**: build the shared prefix
  (createBundle + plan/profile + the wave0-entry gates +
  `passWave0WithDiagnostics`) once inside the :988 test, snapshot it, and
  restore per branch; the three branch functions take the restored bundle and
  start at their unique suffix (normal: unwitnessed-status rejection; rerun:
  wave1 entry; superseded: newer failed wave0 attempt). Prefix expectations
  run once with a `shared-prefix` label (same facts; per-branch prefix
  repetition removed).
- **rerun-round-continuity.test.mjs**: add a second snapshot layer in
  `before()` — baseline → `reachWave2` (one shared suffix) → `snapshot2`;
  the three direction variants restore from `snapshot2` and run only their
  distinct `stageSeed` + `useDeltaSynthesis` + gate suffix.
- All restores return to the **original path** (bundle-identity invariant:
  `check-gate-setup-ready` compares basename vs `plan_basename`, verified in
  workstream 3). Every `it()`, branch, and assertion is preserved — no test
  case merging (implementation guardrail, research notes §07).

Expected saving: ~15s (final-refinement ~5-7s + handoff ~10s +
rerun-variants ~4-6s, minus the one-time shared builds).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-harness-only change; no production Gate/Engine surface
is touched.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Existing test classes and proof boundaries only. |
| `verification/integration-tests` | the three touched test files | Verify-only | Setup becomes shared; every asserted fact stays identical. |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` | Excluded | Gate verdict semantics are the facts being tested, not modified. |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Excluded | Final/C5 recovery facts are tested, not modified. |

## Impact

Target edits are limited to the three test files and this change's
verification assets. No npm dependencies, production Harness modules,
schemas, CLI behavior, or runtime bundles are changed. The repository test
command remains `npm test`.
