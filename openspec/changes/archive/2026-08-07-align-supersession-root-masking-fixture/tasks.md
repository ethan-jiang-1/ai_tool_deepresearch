## 1. Review And Baseline

- [x] 1.1 @impl WPG-016, DEW-006 openspec-feedback:plan-review: Re-read the proposal, design, current malformed-relation E2E scenario, claimed manifest output contract, and existing provenance requirements before target edits. Done when any actionable finding is an ordinary pending task with an authoritative owner, smallest repair, and observable done condition. Evidence: `apply-evidence.md` records the scoped review, direct authority, and no-new-capability conclusion.
- [x] 1.2 @impl WPG-016, DEW-006: Run `node openspec/governance/check-verification-routing.mjs --change align-supersession-root-masking-fixture --mode plan` and `openspec validate align-supersession-root-masking-fixture --strict` before target edits. Done when both pass and the baseline captures the stale `reference/*.md` selector's deterministic red result without treating it as Agent-flow evidence. Evidence: `apply-evidence.md` records both planning checks and the twice-reproduced baseline.

## 2. Assignment-Derived Regression Scope

- [x] 2.1 @impl WPG-016, DEW-006: In `tests/e2e/work-unit-attempt-recovery.test.mjs`, derive the malformed-relation output-coverage selector from the claimed manifest's `output_contract.required_outputs` before relation corruption. Done when no retired Wave0 reference path or hard-coded replacement role remains in that scenario.
- [x] 2.2 @impl WPG-016: Preserve root-first assertions by checking every manifest-selected output scope against the existing coverage evaluator and by deriving the expected orphan count from the same tuple. Done when output coverage, submission presence, and inspect each fail closed on the malformed relation without an `:output:` primary root.

## 3. Verification And Tracking

- [x] 3.1 @impl WPG-016: Run the isolated malformed-relation subtest. Done when it passes and proves the assignment-derived fixture reaches the existing `ledger_invalid` root.
- [x] 3.2 @impl WPG-016, DEW-006: Run the complete `tests/e2e/work-unit-attempt-recovery.test.mjs` file. Done when all existing recovery, supersession, and malformed-relation cases pass.
- [x] 3.3 @impl WPG-016: Run `node openspec/governance/check-verification-routing.mjs --change align-supersession-root-masking-fixture --mode assets` and `openspec validate align-supersession-root-masking-fixture --strict`. Done when the route asset and all planning artifacts are valid.
- [x] 3.4 @impl WPG-016: Update the Gate Schema Phase 3 observation tracker with the direct fixture-drift finding, corrective change result, and unchanged real Agent-flow status. Done when it does not claim Agent adherence or a new production capability.
- [x] 3.5 @impl WPG-016: Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirements.
- [x] 3.6 @impl WPG-016: Run `node openspec/governance/check-project-specs.mjs`. Done when it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [x] 3.7 @impl WPG-016 openspec-feedback:closeout-review: Review the change-scoped diff, verification evidence, tracker update, and no-spec-delta boundary before archive. Done when any actionable finding is an ordinary unchecked task and all other closeout evidence is recorded.
