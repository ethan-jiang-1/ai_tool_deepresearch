## 1. Apply Readiness

- [x] 1.0 openspec-feedback:plan-review — reviewed the existing AGT-010 contract, current case-51 fixture, proposal, design, verification plan, and archived standard-health-scope prerequisite; no additional actionable finding remains before the target edit.
- [x] 1.1 Confirm the existing AGT-010 contract and run `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-diagnostic-case-51-fixture --mode plan` before target edits; retain the separate standard-health-scope change as the clean-health prerequisite.

## 2. Case Fixture Repair

- [x] 2.1 AGT-010: update the case-51 proceed fixture so its fixture-owned `wave1-complete` attempt derives the existing carried-target receipt and passes it through the Engine writer with strict trace durability; no Markdown/Agent direct trace append is allowed.
- [x] 2.2 AGT-010: update the rerun fixture to invoke the existing selected-style projection CLI after the HITL2 rerun status transition and before the first `rerun-ready` Gate.
- [x] 2.3 AGT-010: add `tests/integration/md/case-51-fixture-contract.test.mjs` to lock the revised fixture ordering and legal writer boundary without treating it as Agent-flow proof.

## 3. Verification And Requalification

- [x] 3.1 AGT-010: run the focused Markdown contract test and `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook`; both must pass before an Agent-flow run.
- [x] 3.2a AGT-010: after `experiment-progressive-run-diagnostic-standard-health-scope` is applied, use the current diagnostic profile to dry-run a one-case envelope; it selects only case-51 at `480000` ms / `$2.00`.
- [x] 3.2b AGT-010: execute that bounded case-51 requalification, retain its report/root, and verify native `PASS`, `CLEAN` health, paired Wave1 trace/log evidence, and no failed `rerun-ready` style-projection artifact.
- [x] 3.3 Run `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-diagnostic-case-51-fixture --mode assets` and record the completed asset evidence.

## 4. Governance Closeout

- [x] 4.1 Run `node openspec/governance/check-project-reqs.mjs` with 0 duplicate, orphan, unregistered, and reused-retired findings.
- [x] 4.2 Run `node openspec/governance/check-project-specs.mjs` with 0 deltaHeaderInMain, missingPurpose, missingRequirements, and missingReqHeader findings.

## 5. Archive Closeout

- [x] 5.1 openspec-feedback:closeout-review — review the change-scoped fixture diff, focused Markdown contract evidence, bounded requalification evidence, routing assets, and current AGT-010 contract before finalization; leave any finding as an ordinary unchecked task.
