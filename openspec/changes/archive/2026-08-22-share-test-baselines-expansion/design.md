## Context

Same immutable-baseline pattern proven in workstream 3
(`share-wave1-focus-contract-baseline`): build the legal predecessor once per
run via production predecessors, byte-snapshot it, restore to the ORIGINAL
path before each independent mutation. Three families still rebuild the
predecessor per case/branch.

## Goals / Non-Goals

**Goals:**

- Share the expensive production predecessor build within each of the three
  families (once per run, restored per variant).
- Keep every `it()`, branch, and assertion verbatim; no test-case merging.
- Preserve bundle identity (restore in place) and the checks/expects/health
  accounting in the handoff file.

**Non-Goals:**

- No cross-file sharing (would merge cases / processes — forbidden).
- No change to any production Gate/Engine/CLI code.
- No restructure of the rerun file's other 17 cases or the handoff file's
  other tests.

## Design

### final-refinement-continuity.test.mjs

```js
let baseline;
let snapshot;
before(() => {
  root = createTempRoot();
  baseline = buildHitl2Baseline(root, 'final-shared');
  snapshot = snapshotBundle(baseline, root);
});
function restoredBundle() { restoreBundle(snapshot, baseline); return baseline; }
```

Each `it()` replaces `buildHitl2Baseline(root, 'final-...')` with
`restoredBundle()`. `after(() => cleanupRoot(root))` unchanged. Imports:
add `snapshotBundle, restoreBundle` from deterministic-chain-harness.

### handoff-witnessing-lifecycle.test.mjs

The :988 test's three branches each build the identical prefix
(`createBundle` + `writeBasePlanAndProfile` + wave0-entry gates +
`passWave0WithDiagnostics`). Restructure:

```js
function buildSharedPrefixState() {
  const { bundle, name } = createBundle('shared-prefix');
  writeBasePlanAndProfile(bundle, name);
  // the wave0-entry gate sequence with label 'shared-prefix'
  passWave0WithDiagnostics(bundle, 'shared-prefix');
  return bundle;
}
```

In the :988 test: build once → `prefixSnapshot = snapshotBundle(shared,
dirname(shared))` → for each branch `restoreBundle(prefixSnapshot, shared)`
and call the branch with the bundle. The three branch functions drop their
`createBundle`/prefix lines and start at their unique suffix:
`continueMainLifecycle(bundle)` (:821), `runRerunBranch(bundle)` (:877),
`runSupersededBranch(bundle)` (:914). Prefix `expect` entries run once with
`shared-prefix:` labels (same facts, one execution instead of three). The
module-level `checks`/`expect`/`finalVerdict`/`runHealthChecks`/cleanup
mechanics are unchanged; one bundle is registered instead of three.

`prepareThroughWave0Entry` is used only by the three branches (verified), so
it can be refactored into the shared-prefix builder.

### rerun-round-continuity.test.mjs

Second snapshot layer in `before()` (after the existing baseline snapshot):

```js
let wave2Ready;
let wave2Snapshot;
before(() => {
  root = createTempRoot();
  baseline = buildBaseline();
  snapshot = snapshotBundle(baseline, root);
  wave2Ready = reachWave2(restoreBundle(snapshot, baseline), { suffix: 'direction-shared' });
  wave2Snapshot = snapshotBundle(wave2Ready, root);
});
```

The three direction variants (:728 ×2, :739) replace
`restoreBundle(snapshot, baseline); reachWave2(...)` with
`restoreBundle(wave2Snapshot, wave2Ready)` and keep their distinct
`stageSeed` + `useDeltaSynthesis` (+ `setProfileRerunCount` for :739) +
gate suffix. The wave1 rows shared by the three variants are the same
production-submitted state; none of the variants' assertions reference the
row suffix.

## Duplication ledger (measured)

| Family | Before | After (expected) |
|---|---:|---:|
| final-refinement | 2 × ~22-CLI baseline | 1 build + 2 restores (~5-7s saved) |
| handoff | 3 × 20-CLI prefix + health checks | 1 build + 3 restores (~10s saved) |
| rerun direction variants | 3 × ~8-10-CLI reachWave2 | 1 build + 3 restores (~4-6s saved) |

## Risks And Open Questions

- handoff: the prefix `expect` labels change from per-branch to
  `shared-prefix:` — the fact set is identical (verified by reading the
  branch functions); the checks/health/cleanup accounting is unchanged.
  Applied and verified focused before the full run.
- rerun: `reachWave2` runs once in `before()` — if it fails, the whole
  describe fails (clearer than per-case).
- Restores are byte-exact `cpSync` round-trips at the original path (same as
  workstream 3).
