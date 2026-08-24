# Design — Scope Work-Unit Transaction Attribution

## Context

See proposal.md — Why. Current state shaping the approach:

- `withWorkUnitTransaction` (`work-unit-transaction.mjs`): snapshots the whole
  work-unit root + root output ledger (`listBundleFiles`, 154-188), then after
  the callback computes `changedFiles(before, after).filter(!mutationTargets)`
  (565-583) → any change not declared is `suspect`. The snapshot is used ONLY
  for this diff; rollback uses the declared-target before-image manifests
  (`restoreMutationTargets`).
- The diff cannot distinguish "callback mutated an undeclared file" from "a
  concurrent actor wrote its own file": every change under `_work_units/**`
  is attributed to the transaction. BUG-234 excluded surfaces OUTSIDE
  `_work_units/**`; BUG-239 is the remaining gap — directories INSIDE
  `_work_units/**` that belong to other work units.
- Actors write their own `runtime-receipt.jsonl`/result/status outside any
  transaction; the Engine cannot intercept or serialize plain actor file
  writes, so serialization (the card's first option) is infeasible. The
  comparison-scoping option is the implementable contract.
- Existing deterministic concurrency pattern: holder-child tests in
  `tests/engine/work-unit-transaction.test.mjs` (open the transaction in a
  child, interleave from the parent via ready/release files).

## Goals / Non-Goals

**Goals:**

- Other work-unit directories (`_work_units/<wave>/<work-id>/` with work-id not
  in the transaction's `targetWorkIds`) are excluded from undeclared-mutation
  attribution: concurrent actor writes there never mark this transaction
  `suspect` and are never rolled back by it.
- The transaction's own target work-unit directories + the root output
  declaration ledger remain fully attributed: undeclared callback writes there
  still fail closed to `suspect`.
- Deterministic two-worker fixture proves the exact interleaving; genuine
  suspect behavior stays regression-locked.

**Non-Goals:**

- No global suppression of undeclared-mutation detection.
- No serialization/locking of actor file writes; no new lock state.
- No change to `busy` contention semantics, recover-transaction proof
  boundaries, v1 handling, or rollback behavior.
- No change to the surface-external exclusions (`_cache/`, `_scripts/`,
  `reference/`, `artifacts/`) established by BUG-234.

## Decisions

### D1. Attribution predicate in the undeclared filter

Add a pure predicate and apply it after the declared-target filter:

```js
function belongsToOtherWorkUnit(relativePath, targetWorkIds) {
  const segments = relativePath.split('/');
  if (segments.length < 3 || segments[0] !== WORK_UNITS.ROOT) return false;
  return !targetWorkIds.includes(segments[2]);
}
// in the diff:
const undeclared = changedFiles(beforeFiles, afterFiles)
  .filter((entry) => !normalized.mutationTargets.includes(entry))
  .filter((entry) => !belongsToOtherWorkUnit(entry, normalized.targetWorkIds));
```

Rationale: the layout is fixed (`_work_units/<wave>/<work-id>/<file>`); the
work-id is the third segment. Root-level authority files (`_work_units/_index.json`)
have only two segments and stay attributed; the transaction's own work-unit dir
is exempted because its work-id is in `targetWorkIds`. Recovery passes the
recovered journal's `target_work_ids`, so the predicate is correct there too.
Alternative — narrowing `listBundleFiles` to only own dirs — rejected: keeping
the snapshot broad makes the attribution filter explicit and leaves the helper's
surface semantics untouched for any future reader.

### D2. Contract wording (DEW-023)

The spec now defines attribution, not just the surface: "The undeclared-mutation
attribution surface SHALL be the transaction's own target work-unit directories
plus the root output declaration ledger... Every other work-unit directory is
owned by that work unit's concurrent actor lifecycle." The fail-closed scenario
is scoped to the transaction's own attributed surface; a new scenario locks the
concurrent other-work-unit case. No new requirement ID — MODIFIED DEW-023.

### D3. Deterministic two-worker fixture (unit)

Holder-child pattern (as existing contention tests): child opens B's submit
transaction with a declared target, signals ready, waits for release; parent
appends A's receipt inside `_work_units/wave1/wu-w1-b000-deep-i0001/`, then
releases. Asserts: B commits (journal `committed`), no `suspect`, A's receipt
bytes intact, lock released. A second direct-callback variant (same process)
writes A's receipt inside B's callback and asserts commit — no child needed for
the attribution logic itself. A third test keeps a genuine undeclared write to
B's OWN directory fail-closed (`suspect`).

### D4. Real-CLI integration coverage

`tests/integration/cli/operate-work-unit.test.mjs`: claim two Wave1 work units
(A, B); append A's runtime receipt (normal actor behavior); run the real
`operate-work-unit submit` for B; assert submit succeeds, journal committed,
`operate-work-unit inspect` remains valid. Proves the end-to-end path tolerates
another claimed actor's directory content and keeps inspection valid (the
interleaving itself is proven deterministically at unit level).

## Risks / Trade-offs

- [Engine callback secretly writes another work-unit dir undeclared] → now not
  fail-closed; mitigated because the callback is deterministic reviewed Engine
  code with no legitimate reason to touch other work-unit dirs, and the
  non-goal only forbids *global* suppression. The isolation contract is
  documented in DEW-023.
- [Empty `targetWorkIds` for some future operation] → every work-unit dir would
  be "other" and unmonitored; all current callers (submit, recover) pass real
  target ids; the contract text requires target ids.
- [Filter hides a real integrity incident in another dir] → the incident would
  surface in that work unit's own lifecycle (its own submit/inspect), not as a
  false suspect in B's transaction; attribution follows ownership.

## Migration Plan

None — attribution logic + contract text + tests; no schema/state migration.

## Open Questions

None.
