## Context

See `proposal.md` for motivation. Case 225's real-child requirement is stricter
than the production work-unit policy: production may legally claim the work as
`phase_agent_fallback` after an unavailable delegated-child probe, but this
experiment cannot use that work as evidence that an independent child ran.

The case already has an unavailable marker and an existing finalizer branch
that turns that marker into native `NOT_RUN`. Only the marker's establishment
currently relies on the Subject process exit code, which misses a successful
process that followed the production fallback path.

## Goals / Non-Goals

**Goals:**

- Establish the existing unavailable marker from the Engine's persisted actor
  record for the one Case 225 demand when that precise record proves the
  required child was unavailable.
- Keep the native finalizer's existing `NOT_RUN` branch and make the direct
  actor facts visible to the static contract.

**Non-Goals:**

- Do not change actor policy, preflight, Queue claim/submit, child probing,
  Phase work, availability, trace semantics, or `NOT_RUN` behavior itself.
- Do not treat `phase_agent_fallback` as delegated-subagent execution, inspect
  Subject prose for availability, or mark missing/malformed actor records as
  unavailable.
- Do not convert an unavailable child into a fixture-backed PASS.

## Decisions

### 1. Classify only the exact Engine-recorded fallback tuple

After the existing Subject process returns successfully, Step 2 will inspect
the current `_work_units/_index.json` record for `case-225-primary-1`. It will
write the existing unavailable marker only when all of these direct facts hold:

- `execution_actor_class === 'phase_agent_fallback'`;
- `fallback_from === 'delegated_subagent'`;
- `delegated_role_key === 'dpt-evidence-extractor'`; and
- `observation.outcome === 'unavailable'`.

This keeps the classification at the direct Engine boundary:

```text
Engine actor_execution tuple
  -> existing unavailable marker
  -> existing native finalizer NOT_RUN branch
```

**Alternative considered:** infer unavailability from Subject transcript or
child-evidence prose. Rejected because neither is the deterministic actor
authority and either can be incomplete or misleading.

**Alternative considered:** mark any non-delegated work as `NOT_RUN`. Rejected
because a malformed/missing record or a different valid actor policy must not
be relabelled as child unavailability.

### 2. Preserve current failed-process handling and observer/finalizer flow

A nonzero Subject process continues to write the existing unavailable marker.
A precise fallback marker causes Step 3 to skip its read-only checks and lets
Step 4 use its already declared `--not-run-reason` branch. No new completion
file, verdict rule, or retry loop is introduced.

The existing bounded reader question is whether this real-child canary reached
its required child boundary. This is a net simplification: direct Engine facts
replace process-exit inference while reusing one current marker and one current
native boundary. The user has authorized the mechanical correction and rerun;
the Agent changes the playbook/test, while Engine facts and native completion
remain the verdict authorities.

### 3. Quarantine supersedes future native execution

The user-directed `exp_extrem_slow/` quarantine supersedes every earlier
reference in this design to an authorized rerun. The static repair remains in
the quarantined asset, but its native `NOT_RUN` behavior is unobserved. That
unknown is preserved rather than replaced with a fixture result or a success
claim. A future refactor may create a new runnable case and new proof plan;
this change has no further execution path.

## Risks / Trade-offs

- [A malformed or absent index follows a successful process] -> do not create
  the marker; existing observer/finalizer failure remains visible rather than
  being rewritten as unavailable.
- [A different production actor policy becomes legal] -> the static contract
  fails when it no longer matches the exact tuple, requiring an explicit case
  evidence-boundary decision.
- [A future refactor reactivates the case] -> it must define a new bounded
  native claim; this quarantined artifact supplies no reusable PASS/NOT_RUN
  result.

## Migration Plan

1. Add a focused static assertion for the exact fallback tuple and demonstrate
   its absence in the current process-exit-only Step 2.
2. Add the narrow direct-index marker write, then rerun static contract,
   registered-playbook validation, and exact-case dry-run.
3. Record the unobserved native `NOT_RUN` boundary under the quarantine and
   preserve it for a future refactor without launching the case.
4. Revert only if the accepted Case 225 real-child evidence boundary changes;
   no runtime migration or Engine rollback is involved.
