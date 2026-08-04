## 0. Plan Review

- [x] 0.1 openspec-feedback:plan-review — reviewed the proposal, skipped-spec boundary, test ownership, and verification plan before the first target edit; no actionable scope finding.

## 1. Verification Routing

- [x] 1.1 Created and validated `verification-plan.yaml` with the selected integration claim before target edits using `node openspec/governance/check-verification-routing.mjs --change repair-case-164-verification-contract --mode plan` (passed).

## 2. Case-164 Contract Test Repair

- [x] 2.1 Reproduced the current failure (`3 !== 2`): the `'164'` to `'232'` slice includes case 225. Verified the playbook and the actual case-164 runner entry agree on three Subject turns with child invocations only in turns 1 and 3; no production-source scope finding.
- [x] 2.2 Replaced the raw phrase-count assertion with a test-local structural reader that stops at case 164's next runner entry and extracts the ordered messages; it requires exactly three turns, child actors in turns 1 and 3, and none in turn 2.
- [x] 2.3 Kept the reader and protocol assertion test-local; focused synthetic arrays prove rejection of a missing third message, a child instruction in turn 2, and an incorrect number of child-bearing turns without changing the runner, playbook, native evidence, or `NOT_RUN` boundary.

## 3. Verification And Closeout

- [x] 3.1 Ran `node --test tests/integration/md/case-164-direct-output-candidate-contract.test.mjs tests/engine/work-unit-attempt-disposition.test.mjs tests/engine/work-unit-submit.test.mjs tests/integration/md/phase-wave-replacement-guidance.test.mjs`; all selected tests passed (76 tests, 0 failures).
- [x] 3.2 Ran `node openspec/governance/check-verification-routing.mjs --change repair-case-164-verification-contract --mode assets`; the selected integration asset validated.
- [x] 3.3 Ran `openspec validate repair-case-164-verification-contract --strict` successfully.
- [x] 3.4 Ran `node openspec/governance/check-project-reqs.mjs`; 629 registered IDs were consistent (0 duplicate, orphan, unregistered, or reused-retired IDs).
- [x] 3.5 Ran `node openspec/governance/check-project-specs.mjs`; 84 main spec files had zero structural violations.
- [x] 3.6 openspec-feedback:closeout-review — reviewed the change-scoped diff, skipped-spec boundary, focused verification, and residual Agent-evidence boundary; no open finding remains.
