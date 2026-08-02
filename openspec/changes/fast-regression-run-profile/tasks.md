## 1. Apply Readiness

- [ ] 1.1 `openspec-feedback:plan-review` Obtain the current feedback-operation guidance and review the approved ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004 plan before the first target edit; record every actionable finding as an ordinary unchecked task with its owner, smallest repair, and observable done condition.
- [ ] 1.2 Reconfirm the existing ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004 source contracts against the selected target surface, then pass `node openspec/governance/check-verification-routing.mjs --change fast-regression-run-profile --mode plan` before target edits.

## 2. Fast Regression Facts And Selection

- [ ] 2.1 Implement EXA-004 and ERS-002 strict V2 frontmatter support for neutral `regression_recommendation` and `all`-only `regression_retry_safety`, with focused validation tests that prove neither field grants verdict, health, budget, or selection authority by itself.
- [ ] 2.2 Implement EXO-007 selection-observation v2 so regression normal/qualification intent is durable while outer v2 report/audit envelopes and retained v1/v2 observations remain readable; cover versioning and outcome/health orthogonality with focused tests.
- [ ] 2.3 Implement ERS-002 virtual regression admission from current policy plus one latest retained result, including explicit `eligible`, `needs_qualification`, and `ineligible` reasons without writing case state; cover matching-v2 PASS+CLEAN, drift, SLO breach, agent-behavior exclusion, reviewed-`all` boundaries, and rejection of cross-record fact stitching with unit tests.
- [ ] 2.4 Implement ERS-002 fixed fast-envelope selection, one-per-`experiment` group rotation, recommendation-only tie-breaking, and visible group gaps; cover caller tightening, caller widening rejection, and explicit qualification versus normal-regression selection with unit tests.

## 3. Supervisor Boundary

- [ ] 3.1 Implement EXA-009 regression CLI/profile parsing and launch enforcement so normal and explicit qualification intent remain distinct; non-dry launch requires explicit `--timeout <= 120000`, predicted `480000` ms / `$3.00` batch limits, effective `60000` ms per-health-target timeout, and `$0.60` per-case cap cannot be widened; retain selection intent in the Supervisor report and prove widened and omitted-timeout rejection occurs before side effects with integration coverage.

## 4. Operator Surface And Initial Pool

- [ ] 4.1 Implement PLR-004 normal-runner guidance for bounded fast regression, explicit qualification, neutral author advice, visible group gaps, and slow-case calibration/diagnostic/assurance routes; update the terminology integration test without restoring filename-tier default selection or a persistent taxonomy.
- [ ] 4.2 Review only the then-current fast qualification candidates that use `verdict_mode: all` for ERS-002 retry safety; add `regression_retry_safety: reviewed` only where the current playbook supports that conclusion, leave all others excluded, and do not move, rename, or bulk-reclassify cases.
- [ ] 4.3 Run ERS-002 initial qualification through the real Headless Playbook-Agent path within one `480000` ms / `$3.00` forecast batch and bounded fast timeouts, preserve native v2 completion evidence, and confirm a subsequent normal regression dry-run contains only matching-v2 PASS+CLEAN members; do not substitute fixture output or a hand-written report.

## 5. Release And Closeout

- [ ] 5.1 Run the focused ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004 unit and integration suites; record the exact commands and results in the apply ledger.
- [ ] 5.2 Update `CHANGELOG.md` for v0.67 and align the `DPT_FRAMEWORK/RUN.md` version banner and fast-regression entry with the release note.
- [ ] 5.3 Pass `node openspec/governance/check-verification-routing.mjs --change fast-regression-run-profile --mode assets`, `node openspec/governance/check-project-reqs.mjs`, and `node openspec/governance/check-project-specs.mjs` for ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004.
- [ ] 5.4 `openspec-feedback:closeout-review` Review the actual change-scoped diff, artifacts, and selected verification evidence for ERS-002, EXA-004/EXA-009, EXO-007, and PLR-004 before archive; record every actionable finding as an ordinary unchecked task with its owner, smallest repair, and observable done condition.
