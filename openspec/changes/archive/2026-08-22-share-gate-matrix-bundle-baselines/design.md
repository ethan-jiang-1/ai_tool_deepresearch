## Context

Five gate/queue matrix files each rebuild a disposable bundle per leaf
(`createBundle(unique(...))` = one `new-disposable-bundle.mjs` launch +
in-process status-window/artifact writes) before the leaf's own fixture
mutations. ~90 such launches across the five files (08-cost-table). The
bundle is only a legal empty predecessor; the per-leaf facts come from the
leaf's own mutations + gate/inspect runs.

## Goals / Non-Goals

**Goals:**

- Build the empty disposable bundle once per run; snapshot it; restore to the
  original path per leaf (leaves then apply their own mutations as today).
- Keep every `it()`, assertion, and fixture mutation verbatim; no merging.
- Preserve the bundle-identity invariant (dir name vs `plan_basename`) by
  restoring in place.

**Non-Goals:**

- No change to `check-gate-hitl1-recorded.test.mjs` (no `createBundle`; its
  cost is per-leaf CLIs — separate analysis).
- No change to `agent-experiment-autorun.test.mjs` (host-tools surface).
- No change to any production Gate/Engine/CLI code.

## Design

Per file, same mechanical shape:

```js
import { restoreBundle, snapshotBundle } from '../../e2e/helpers/deterministic-chain-harness.mjs';
// + dirname from node:path, before from node:test as needed

let sharedBundle;
let sharedSnapshot;
function restoredBundle() {
  restoreBundle(sharedSnapshot, sharedBundle);
  return sharedBundle;
}

// in the describe:
before(() => {
  sharedBundle = createBundle('shared');
  sharedSnapshot = snapshotBundle(sharedBundle, dirname(sharedBundle));
});
```

Each leaf's `const dir = createBundle(unique('label'));` becomes
`const dir = restoredBundle();`. The shared bundle keeps its original path;
`restoreBundle` does `rmSync(target)` + `cpSync(snapshot, target)` — byte
exact, same path, same name (`dpt_rb_shared`), `plan_basename` unchanged.
`track()` registers the shared bundle once; `after()` cleanup unchanged.
Sequential execution (canonical `--test-concurrency=1`) makes one shared
path safe; a failed leaf is reset by the next leaf's restore.

Exceptions:
- `check-gate-wave0-complete.test.mjs:933` uses `createBundleWithTopics` with
  a custom topic set — it keeps its own bundle creation (no sharing).
- Any leaf calling `createBundle` inside a helper (e.g., setup functions that
  receive the dir) is unaffected — only the leaf-level creation call changes.

## Duplication ledger (measured)

| File | Per-leaf createBundle | After |
|---|---:|---|
| wave0-complete | 28 (1 custom-topic stays) | 1 build + 27 restores |
| wave2-complete | 31 | 1 build + 31 restores |
| readiness-passed | 16 | 1 build + 16 restores |
| hitl2-recorded | 15 | 1 build + 15 restores |
| operate-queue-validation | 27 | 1 build + 27 restores |

Expected ~90 saved `new-disposable-bundle` launches ≈ 30-40s (measured per
file during apply).

## Risks And Open Questions

- Bundle name is not asserted by any leaf (verified: only `unique()` labels
  and `plan_basename` frontmatter writes; wave2/readiness/hitl2 write their
  own fixed basenames during fixture setup). Fixed `shared` name is safe.
- `createBundle` shapes differ slightly per file (status window, artifacts);
  the shared snapshot captures whatever `createBundle('shared')` produces, so
  each file's leaves restore the correct base state.
- The one custom-topic leaf (wave0 :933) and any future custom-bundle leaves
  keep their own creation — the shared snapshot only serves the uniform
  `createBundle` leaves.
- **Helper fix (found during apply):** `snapshotBundle` used bare
  `cpSync(recursive)`, which MERGES into an existing destination. With a
  fresh temp root (WS3/WS5) the destination never pre-existed; these files
  snapshot into the shared `tests/.test-bundles`, where a stale
  `.baseline-snapshot` from an earlier file's run contaminated the copy
  (a handoff work-unit beacon leaked into wave0 bundles). `snapshotBundle`
  now clears its destination first, matching `restoreBundle`'s
  rmSync+cpSync semantics.
