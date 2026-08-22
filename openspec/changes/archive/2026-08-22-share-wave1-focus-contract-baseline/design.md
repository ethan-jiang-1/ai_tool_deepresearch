## Context

The Wave1 focus-coverage contract cluster (4 cases; 5 bundles incl. the
two-bundle clean-path case) rebuilds the full Wave1 chain per variant
(`prepareWave1Bundle`: instantiate + plan/profile + 5× gate/enter/advance
with stageWave0/stageWave1 submissions ≈ 24 CLIs each). Measured file 21.1s /
149 launches. Every variant's first and only mutation is the
`depth-review.yaml` `focus_coverage` declaration (`writeFocusCoverage`).

## Goals / Non-Goals

**Goals:**

- Build the legal predecessor state once per test run; byte-snapshot it;
  restore to the **original path** before each variant.
- Keep every `it()`, the `partial`/`blocked` loop, and every assertion
  verbatim (no merging).
- Preserve bundle identity (`dpt_rb_<name>` vs `plan_basename` invariant).

**Non-Goals:**

- No change to the e2e sibling `wave1-focus-coverage-rerun.test.mjs` (its
  HITL2-rerun baseline shape differs; keep families separate — ledger D).
- No change to any Gate/Engine production code.
- No change to `check-gate-wave1-complete`/`inspect-wave1-output` invocation
  or the degraded/attempt semantics.

## Design

### Shared immutable baseline

```js
let baseline;
let snapshot;
before(() => {
  baseline = prepareWave1Bundle('focus-shared');
  snapshot = snapshotBundle(baseline, dirname(baseline));
});
function restoredBundle() {
  restoreBundle(snapshot, baseline); // original path, byte-exact
  return baseline;
}
```

- `snapshotBundle` (deterministic-chain-harness.mjs:47-51) copies the bundle
  to `root/.baseline-snapshot`; `restoreBundle` (:53-57) deletes the bundle
  dir and copies the snapshot back — content byte-identical, path/name
  unchanged.
- Each variant: `const bundle = restoredBundle();` then its existing
  `writeFocusCoverage` + gate/inspect assertions, unchanged.
- The `:85` clean-path case restores twice (pristine `noFocus` assert, then
  a fresh restore for the `covered` write) — same semantics as today's two
  bundles.
- Sequential execution (canonical `--test-concurrency=1`) makes one shared
  path safe; a failed variant is reset by the next variant's restore, so
  there is no cross-test contamination.

### Bundle-identity invariant (verified)

`check-gate-setup-ready.mjs:455-477` compares normalized bundle basename
against `rb_plan.md#/plan_basename` and `rb_profile.yaml#/plan_basename`.
Restoring to the original path keeps all three equal (the basename is the
one created by `instantiateBundle('focus-shared')`). The wave1 gate and
inspect CLI do not check `plan_basename`; the variant facts depend only on
`depth-review.yaml`, which each variant rewrites after restore.

### Byte-stability of the checkpoint

The snapshot is taken right after `prepareWave1Bundle` returns: the bundle
has completed the wave0 chain (trace/journal/ledger deterministic), no wave1
gate has run yet, and no variant mutation has been applied. `cpSync` restore
is exact for content; per-variant gate/inspect runs accumulate trace only
within that variant and are reset by the next restore.

## Duplication ledger (measured)

| Metric | Before | After (expected) |
|---|---:|---:|
| Production CLI launches per run | ~149 | ~55 (1 build ≈24 + variant gates/inspects) |
| File wall | 21.1s | ~5-7s |

## Risks And Open Questions

- The `before()` hook runs once; if the baseline build fails, the whole
  describe fails (today it would fail per-case) — acceptable and clearer.
- Snapshot copy cost: one `cpSync` of the built bundle (~KB-MB) per run,
  negligible vs ~94 saved launches.
- Restore is a delete+copy at the original path — no live runtime directory
  is ever shared between variants (guardrail-compliant: copying an immutable
  test-run-local baseline).
