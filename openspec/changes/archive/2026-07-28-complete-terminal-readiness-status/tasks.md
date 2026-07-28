## 1. Apply Admission And Ownership

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change complete-terminal-readiness-status --mode plan` before target edits. Done when all four canonical test classes validate against the declared CPT-001/CPT-004 claims.
- [x] 1.2 Re-read `advance-status.mjs`, its trace rollback seam, the normal terminal fixture, and post-final recovery consumers. Done when `apply-target-manifest.md` records the normal terminal owner, retained recovery owner, and no new control surface. (CPT-001, CPT-004)

## 2. Terminal Transaction Correction

- [x] 2.1 Implement CPT-001 in the existing normal next-status construction. Done when only `readiness_passed -> none` writes `state: completed` in the same status/trace transaction and all other paths retain their current state behavior.
- [x] 2.2 Retain CPT-004 post-final recovery behavior and the existing rollback boundary. Done when the accepted `hitl2_recorded -> rerun_ready` exception does not receive terminal completion semantics and a trace append failure restores the complete prior status bytes.

## 3. Focused Proof And Release

- [x] 3.1 Extend `advance-status` integration coverage. Done when a witnessed readiness-to-Final handoff asserts the full terminal triple and the trace-failure case asserts restoration of the prior lifecycle state. (CPT-001)
- [x] 3.2 Update the post-final recovery terminal fixture/coverage only as needed to prove an already completed terminal bundle remains eligible for the existing recovery flow. Done when it retains the existing rerun status transition and does not create a second lifecycle path. (CPT-004)
- [x] 3.3 Run every selected verification-plan asset and record deterministic results in `implementation-evidence.md`. Done when integration claims pass, with no unit, deterministic-E2E, or Agent-flow evidence fabricated. (CPT-001, CPT-004)
- [x] 3.4 Update `CHANGELOG.md` for v0.57 and synchronize the `DPT_FRAMEWORK/RUN.md` banner. Done when both describe the terminal status-triple correction without claiming a new lifecycle state or recovery controller. (CPT-001)

## 4. Governance And Archive

- [x] 4.1 Run `node openspec/governance/check-verification-routing.mjs --change complete-terminal-readiness-status --mode assets`. Done when every declared proof asset is present at its required route.
- [x] 4.2 Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired IDs. (CPT-001, CPT-004)
- [x] 4.3 Run `node openspec/governance/check-project-specs.mjs` and strict OpenSpec validation. Done when project specs have no structural violations and the change validates.
- [x] 4.4 Archive after all tasks and recorded proof are complete; update BUG-135 and the Wave-projection/lifecycle progress record with the archive, commit, and verification evidence, then complete the umbrella plan closeout. (CPT-001, CPT-004)
