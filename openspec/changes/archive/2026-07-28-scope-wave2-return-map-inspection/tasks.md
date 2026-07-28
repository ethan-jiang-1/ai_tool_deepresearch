## 1. Apply Admission And Ownership

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change scope-wave2-return-map-inspection --mode plan` before target edits. Done when the plan validates all four canonical test classes. (WTS-004, WTS-007)
- [x] 1.2 Re-read the Wave2 inspect composition, Seed Topic projection evaluator, and artifact-specific Wave2 evaluator. Done when `apply-target-manifest.md` records the direct owner for every retained check and the one removed parser path. (WTS-004, WTS-007)

## 2. Scope Correction

- [x] 2.1 Implement WTS-004/WTS-007 by removing only the Wave2 `synthesis.md` and `cross-topic-ledger.md` calls to `validateReturnMapContent()`. Done when Wave2 return-map inspection has no phase-artifact success/failure path and Seed Topic evaluation remains unchanged.
- [x] 2.2 Retain the independent Wave2 artifact evaluator and existing rule IDs; remove a `## Return Map` workaround instruction only if a current guidance surface actually requires it. Done when direct narrative, ledger, and finding-index failures retain their existing owners and no unrelated guidance churn is introduced. (WTS-004, WTS-007)

## 3. Focused Proof And Release

- [x] 3.1 Extend focused unit coverage for Wave2 return-map input scope. Done when valid narrative/ledger prose without return-map fields is ignored by the artifact path while malformed Seed Topic Wave2 entries remain rejected. (WTS-004, WTS-007)
- [x] 3.2 Extend temporary-bundle production-inspect coverage. Done when a valid Wave2 artifact triple without `## Return Map` passes its artifact slice, malformed Seed Topic W2F/field bindings retain exact coordinates, and independently broken synthesis, ledger, and finding-index artifacts retain existing rule IDs. (WTS-004, WTS-007)
- [x] 3.3 Run every selected verification-plan asset and record deterministic results. Done when unit and integration claims pass, with no deterministic-E2E or Agent-flow evidence fabricated. (WTS-004, WTS-007)
- [x] 3.4 Update `CHANGELOG.md` for v0.56 and synchronize the `DPT_FRAMEWORK/RUN.md` banner. Done when both describe the scoped Wave2 parser correction without claiming a new validator or artifact authority. (WTS-004, WTS-007)

## 4. Governance And Archive

- [x] 4.1 Run `node openspec/governance/check-verification-routing.mjs --change scope-wave2-return-map-inspection --mode assets`. Done when every declared proof asset is present at its required route. (WTS-004, WTS-007)
- [x] 4.2 Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired IDs. (WTS-004, WTS-007)
- [x] 4.3 Run `node openspec/governance/check-project-specs.mjs` and strict OpenSpec validation. Done when project specs have no structural violations and the change validates. (WTS-004, WTS-007)
- [x] 4.4 Archive after all tasks and recorded proof are complete; update BUG-134 and the Wave-projection/lifecycle progress record with the archive, commit, and verification evidence, then promote Change 4. (WTS-004, WTS-007)
