## Context

See `proposal.md` for motivation. The case uses fixture-backed predecessor attempts because its bounded reader question is a real HITL2/readiness fail -> repair -> rerun path, not Wave1 content production. Its Step 1 has a `wave1-complete` fixture entry, but calls `writeGateAttempt` bare for every entry. Existing Engine behavior requires a carried-target receipt for that routed successful Wave1 attempt and silently preserves legacy non-strict write behavior, so the entry is absent from trace and log. The retained readiness Gate then correctly rejects the missing prior lineage.

The Headless Playbook Agent also had to repeat Step 3 with a literal readiness target because each Markdown `bash` block is an independent shell. `$N` is computed in Step 2 and is unavailable in Step 3; its accidental second execution produced a duplicate expected-negative check but did not repair the missing Wave1 attempt.

## Goals / Non-Goals

**Goals:**

- Make the fixture-owned Wave1 predecessor a valid, durable Engine-authored attempt.
- Keep the intentional fail -> repair observations intact while restoring the expected passed readiness retry.
- Keep the handoff command independent of shell-local state from an earlier Markdown block.
- Lock the two fixture boundaries with a focused integration test and a bounded real diagnostic observation.

**Non-Goals:**

- Do not change Wave1 receipt rules, Gate behavior, health policy, status transition rules, or the Agent Experiment Supervisor.
- Do not replace the fixture with a complete Wave1 content/work-unit setup.
- Do not reinterpret intentional failed Gate attempts as clean health; `standard` health is expected to report their observed diagnostics independently of native completion.
- Do not add a persistent target file, a new state field, or an Agent-side trace writer merely to pass values between Markdown blocks.

## Decisions

### Bind only the existing Wave1 fixture to the selected receipt

Step 1 will follow the established case-51 pattern: import `selectWave1CarriedTargetReceipt`, fail directly if selection is unavailable, construct the existing fixture result, and call `writeGateAttempt` with `{ carriedTargetReceipt, strictTrace: true }` only for `wave1-complete`. Other predecessor fixtures retain their current legal writer path.

This is the smallest valid fixture: the starter bundle already provides a selector-valid empty carried-target receipt for this fixture scope. Running a full Wave1 Gate would add unrelated content, topic, and work-unit obligations. Hand-writing trace or receipt data is rejected because it would bypass the Engine-owned authority that the case is meant to exercise.

### Use the explicit, already-validated readiness target in Step 3

Step 2 still checks that repaired HITL2 returns `phases/phase-readiness.md`. Step 3 will invoke `enter-phase` with that explicit target rather than `$N`, whose scope ends with the preceding Markdown block. This avoids a second hidden storage/transport mechanism while retaining the exact routing assertion in the case's own required check.

Persisting `$N` in a bundle file was rejected because it adds mutable state solely to compensate for shell lifetime. Re-running Step 2 inside Step 3 was rejected because it creates duplicate gate/check evidence and changes the controlled attempt sequence.

### Prove static boundaries and runtime behavior separately

`tests/integration/md/case-52-fixture-contract.test.mjs` will read the Markdown and assert the receipt selector, strict writer branch, absence of direct trace appends, and explicit readiness entry in Step 3. It is a deterministic contract test, not an Agent-flow claim.

One real Headless Playbook-Agent run remains necessary to prove the Markdown executes as intended. Its authoritative evidence is native completion plus the preserved bundle trace, run log, and health report. The expected health result is `ISSUES` because the case deliberately records first-failure Gate attempts; the acceptance check is that those expected diagnostics remain while the missing `wave1-complete` lineage and trace/log mismatch do not recur.

### Evolution review

No named state, projection, command, module, or reader-facing view is added or materially changed. The existing reader question stays precise: whether a fixture-backed fail/repair case produces legal Engine-authored lifecycle evidence. The reader distinguishes an expected Gate failure from a missing predecessor attempt, then stops at the native completion and health report. The control path is a net simplification: valid fixture -> legal retry evidence -> health, replacing silent omission -> Agent shell workaround -> duplicate check -> failed native result. The user supplies the progressive-run objective, the Agent performs legal fixture commands, and the Engine remains the deterministic evidence owner.

## Risks / Trade-offs

- Receipt selection could fail on a fresh bundle -> The strict fixture stops at the actual missing prerequisite; do not fabricate a receipt or broaden this change.
- The explicit target could drift from the HITL2 contract -> The existing repaired-HITL2 required check and focused Markdown contract test expose the drift before requalification.
- A real Headless Agent could still deviate from the playbook -> Preserve its report/root and use the direct trace/log evidence to create only the next smallest root-cause change.
- Intentional Gate failures keep standard health at `ISSUES` -> Treat that as a separate health observation, not a reason to loosen health or suppress diagnostics.

## Migration Plan

1. Validate the planning routing, then modify only the case-52 fixture and its focused Markdown contract test.
2. Run the focused test and canonical playbook validation before any Agent-flow requalification.
3. Re-run the current diagnostic profile with a newly computed envelope that selects only case-52, then inspect native outcome, health, receipt-bearing Wave1 trace/log evidence, and intentional fail/pass pairs.
4. Roll back by reverting the fixture and test source changes if deterministic validation reveals an unaccounted existing contract. No runtime data, schema, or framework version migration is involved.
