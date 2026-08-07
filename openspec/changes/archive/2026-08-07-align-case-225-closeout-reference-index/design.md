## Context

See `proposal.md` for motivation. The existing Case 225 observer builds its
closeout path set from `closeout.reference_refs`, then adds the depth-review,
seed, and inspect references. The retained real Phase-owned closeout index
instead contains two concrete paths in `materialized_reference_refs`. As a
result, all produced artifacts can exist while the observer counts only three
paths and fails the case-owned check.

The closeout index is an Actor-produced diagnostic/evidence locator. Existing
Phase/Engine closeout behavior and native finalization already own the relevant
runtime facts and are not repair targets.

## Goals / Non-Goals

**Goals:**

- Read the currently produced materialized-reference array directly from the
  Case 225 closeout index.
- Add a static contract that distinguishes the current reader field from the
  retired one before a real Agent run.
- Retain a later exact-case native run as the only proof of the real
  Subject-Agent closeout claim.

**Non-Goals:**

- Do not change the Subject's closeout instructions, reference materializer,
  work-unit submission, Queue admission, Phase evaluator, health policy, or
  native completion semantics.
- Do not accept either field through a compatibility fallback, infer references
  from the filesystem, or lower the closeout path count.
- Do not treat a passing static test as a native PASS.

## Decisions

### 1. Read only `materialized_reference_refs`

The observer will replace its stale `closeout.reference_refs` access with
`closeout.materialized_reference_refs`. The retained native index is the direct
source of record for those paths. The existing `filter(Boolean)`, bundle-root
resolution, and file existence checks remain intact.

```text
Phase-owned closeout index
  -> materialized_reference_refs
  -> existing Case 225 path existence check
  -> existing native finalizer
```

**Alternative considered:** read `materialized_reference_refs || reference_refs`.
Rejected because it hides the one current contract spelling and would let a
stale writer/reader pair pass without proving which field is authoritative.

**Alternative considered:** rebuild reference paths from output files or the
submitted ledger. Rejected because it would create a second, less direct
closeout locator and conceal the index mismatch that the case is meant to
observe.

### 2. Make the field contract explicit in the existing integration test

The Case 225 test will isolate the observer block, require the current field,
and reject the retired field. It will keep the native path check intact rather
than reimplementing Phase closeout in test code.

No new semantic layer, state, projection, command, or evaluator is introduced.
The change is a direct reader correction that removes a hidden stale alias;
this is the smallest legal control loop and a net simplification. The user has
authorized the mechanical correction and bounded rerun, the Agent executes the
edit, and existing Engine/trace completion remains the verdict authority.

### 3. Quarantine supersedes future native execution

The user-directed `exp_extrem_slow/` quarantine supersedes every earlier
reference in this design to a later registered-case run. The retained native
`FAIL` already establishes the narrow reader observation and its independent
required-child failure; it is not a real-child PASS. No further execution is
legal for this asset. A future refactor must create a new runnable case and a
new proof plan instead of reviving this archived experiment.

## Risks / Trade-offs

- [The Phase-owned index field intentionally changes later] -> the focused
  contract fails and requires an explicit playbook alignment, rather than
  silently accepting an unknown compatibility path.
- [A future refactor fails at a different checkpoint] -> retain that result
  independently; do not recast this reader correction as Phase success.
- [The observed index is absent or malformed] -> the existing path check
  fails; the case must not reconstruct a substitute reference list.

## Migration Plan

1. Add the precise observer-field assertion and run it against the retained
   stale reader to prove the intended red boundary.
2. Align the one Case 225 observer expression and rerun its focused test,
   playbook validation, and exact-case dry-run.
3. Preserve the retained native observation, record the quarantine, and update
   the remediation tracker without widening its claims or launching the case.
4. Revert only if the actual Phase-closeout index contract is deliberately
   changed through its own accepted change; no runtime data migration is
   required.
