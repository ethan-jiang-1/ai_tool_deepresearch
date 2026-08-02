## 1. Apply Readiness

- [x] 1.0 openspec-feedback:plan-review — reviewed the EXO-002 delta, design, verification plan, accepted contract, and direct case-51 evidence before the first target edit; no additional finding remained.
- [x] 1.1 EXO-002: re-read the accepted experiment-observability contract and run `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-diagnostic-standard-health-scope --mode plan` before target edits.

## 2. Profile Policy Alignment

- [x] 2.1 EXO-002: update `PROFILE_TABLE` and its profile description so `standard` requires only light sections, `gate_attempts`, and `timeline`; retain `work_units` plus existing provenance checks as required for `heavy` without changing the health report schema version.
- [x] 2.2 EXO-002: update `tests/schema/health-report-schema.test.mjs` to prove `standard` excludes `work_units` from required sections while `heavy` continues to require it.
- [x] 2.3 EXO-002: update `tests/integration/experiments_env/verify-bundle-health.test.mjs` with an invalid observed work-unit authority that stays section-visible but top-level `CLEAN` under `standard`, and remains blocking under `heavy`.

## 3. Focused Verification

- [x] 3.1 EXO-002: run the focused schema and verifier integration tests; both must pass before applying the dependent case-51 fixture change.
- [x] 3.2 Run `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-diagnostic-standard-health-scope --mode assets` and retain the completed asset evidence.

## 4. Governance Closeout

- [x] 4.1 Run `node openspec/governance/check-project-reqs.mjs` with 0 duplicate, orphan, unregistered, and reused-retired findings.
- [x] 4.2 Run `node openspec/governance/check-project-specs.mjs` with 0 deltaHeaderInMain, missingPurpose, missingRequirements, and missingReqHeader findings.

## 5. Archive Closeout

- [x] 5.1 openspec-feedback:closeout-review — reviewed the change-scoped implementation diff, focused test evidence, routing assets, and EXO-002 main/delta re-comparison; no open finding remains.
