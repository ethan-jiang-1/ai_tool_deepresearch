## 1. Verification Baseline and Negative Proof

- [ ] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change restore-section-scoped-seed-projection-contract --mode plan` before any target edit; done when all four routed claims validate with no routing issue.
- [ ] 1.2 Add focused `RRM-007` unit fixtures in `tests/engine/helpers/return-map.test.mjs` for target-section extraction, Wave0-valid/Wave1-prose masking, Wave1 section-to-section masking, count summaries, harmless heading presentation, duplicate/missing section prerequisites and current-wave/other-wave token behavior; done when the false-pass cases fail against the pre-change implementation for the intended rule.
- [ ] 1.3 Add `RRM-007` / `IOC-005` CLI fixtures in `tests/integration/cli/inspect-wave-return-map.test.mjs` for section-qualified blocking findings, current-row omission, valid disposition and legacy Wave2 advisory classification; done when assertions cover exit code, `failed_rule_ids`, `finding_classification`, `missing_fact`, `write_to` and exact same-check `rerun`.

## 2. Shared Current-Round Authority

- [ ] 2.1 Implement `RRM-007` by refactoring the existing work-unit inspect owner into one fail-closed eligible-row authority result that validates index/ledger/manifest authority before filtering, preserves legacy-row warnings and never converts unreadable authority to an empty-success result; done when focused tests distinguish no rows from invalid authority.
- [ ] 2.2 Implement `RRM-007` canonical topic binding in that shared result using the existing UID/current-or-previous layout resolver and return current `topic_uid`, `topic_slug` and accepted slugs without filename inference; done when renamed-layout fixtures bind historical submitted rows to the current seed exactly once.
- [ ] 2.3 Update `operate-work-unit inspect --eligible-rows` to consume the same `RRM-007` authority result while preserving its JSON fields, authority-first exit behavior and legacy warnings; done when `tests/integration/cli/rerun-round-continuity.test.mjs` passes and invalid authority still clears eligible rows with exit 1.
- [ ] 2.4 Add or update `// @impl RRM-007` annotations on the shared authority path and tests; done when no second index/ledger/round filter exists in `return-map.mjs`.

## 3. Section-Scoped Return-Map Evaluation

- [ ] 3.1 Implement `RRM-007` with one centralized wave-to-section map and tolerant H2 boundary extractor in `DPT_FRAMEWORK/engine/helpers/return-map.mjs`; done when each accepted section is uniquely resolved, harmless suffix/spacing is accepted and missing/duplicate parents return one prerequisite root.
- [ ] 3.2 Replace whole-seed validation with independent `RRM-007` validation of each target section, then expose the parsed target-section union for coverage checks; done when a complete Wave0/mechanism entry cannot satisfy an invalid Wave1/trend section and other-wave tokens do not short-circuit the target wave.
- [ ] 3.3 Implement `RRM-007` Wave0/Wave1 per-row projection over the shared eligible-row result, accepting only target-section refs/entry identity or the existing explicit no-projection disposition predicate; done when every omitted current row is named once and prior-round rows do not block.
- [ ] 3.4 Implement `RRM-007` Wave2 current/legacy finding projection by reusing the existing finding-index parent parser and targeted-backing evaluator; done when current omissions block, legacy omissions advise, present legacy refs pass and an invalid finding-index parent masks dependent projection symptoms.
- [ ] 3.5 Implement `IOC-005` root-first structured findings for section/row/finding failures with stable rule ids, `agent_action`, section-qualified `missing_fact`, seed-file `write_to` and the invoking inspect command as `rerun`; done when blocking/advisory summaries agree and no presentation-only difference becomes blocking.
- [ ] 3.6 Add `// @impl RRM-007, IOC-005` annotations to the section checker/finding projection and focused tests; done when traceability points to the shared evaluator rather than CLI-local variants.

## 4. CLI and Workflow-Scale Verification

- [ ] 4.1 Complete `RRM-007` / `IOC-005` Wave0/Wave1/Wave2 integration cases in `tests/integration/cli/inspect-wave-return-map.test.mjs`; run `node --test tests/integration/cli/inspect-wave-return-map.test.mjs` and finish only when all target-section, current-row/current-finding, legacy advisory, exact feedback and no-write assertions pass.
- [ ] 4.2 Extend `tests/e2e/rerun-round-continuity.test.mjs` for `RRM-007`: stage valid prior/other-wave projection plus one omitted current-round row, prove the real production inspect/check fails, apply an explicitly labeled Agent seed-projection repair, rerun the same checkpoint and prove pass without authority-lineage mutation; done when `node --test tests/e2e/rerun-round-continuity.test.mjs` passes.
- [ ] 4.3 Run focused authority/contract regressions: `node --test tests/engine/helpers/return-map.test.mjs tests/integration/cli/rerun-round-continuity.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs`; done when all pass with no contradictory classification or eligible-row behavior.
- [ ] 4.4 Run `npm test`; done when all repository `node:test` suites pass, or any pre-existing unrelated failure is captured with reproducible command/output and does not affect the four verification claims.

## 5. Release and Traceability

- [ ] 5.1 Audit `RRM-007` and `IOC-005` across registry, accepted specs, delta specs, `@impl` annotations and test claims; done when no new requirement ID is added and the historical tasks 7.2/7.3 checkbox is not cited as executable proof.
- [ ] 5.2 Update `CHANGELOG.md` with concise `v0.35` notes describing section-scoped seed projection and current-round per-row/per-finding enforcement; done when `v0.35` is the newest release entry.
- [ ] 5.3 Update the `DPT_FRAMEWORK/RUN.md` version banner and current-release summary to `v0.35`; done when it matches the newest CHANGELOG entry.
- [ ] 5.4 Record executed commands and outcomes in change-root `apply-evidence.md`, including the original false-pass reproducer and its post-fix blocking result; done when every verification-plan claim points to real command evidence rather than a checklist assertion.

## 6. Required Archive Checks

- [ ] 6.1 Run `node openspec/governance/check-verification-routing.mjs --change restore-section-scoped-seed-projection-contract --mode assets`; done when all four declared proof assets exist at canonical routes and validate.
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs`; done only with 0 duplicate, 0 orphan, 0 unregistered and 0 reusedRetired requirements.
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs`; done only with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements and 0 missingReqHeader violations.
- [ ] 6.4 Run `openspec validate restore-section-scoped-seed-projection-contract --strict`; done when the complete change validates with no error.
- [ ] 6.5 Review the apply target manifest against the final diff; done when whole-seed validation and warning-as-empty ambiguity are removed/contained, no parallel validator/CLI/state/migration was added, and any target deviation is documented in `design.md` before archive.
