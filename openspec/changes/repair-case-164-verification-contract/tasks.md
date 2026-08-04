## 0. Plan Review

- [ ] 0.1 openspec-feedback:plan-review — review the proposal, skipped-spec boundary, test ownership, and verification plan before the first target edit; record any actionable scope finding as an ordinary pending task.

## 1. Verification Routing

- [ ] 1.1 Create and validate `verification-plan.yaml` with the selected integration claim before target edits using `node openspec/governance/check-verification-routing.mjs --change repair-case-164-verification-contract --mode plan`.

## 2. Case-164 Contract Test Repair

- [ ] 2.1 Reproduce the current case-164 test failure and verify that the playbook and runner agree on three Subject turns with child invocations only in turns 1 and 3; stop and record a scope finding if either production source is inconsistent.
- [ ] 2.2 Replace the raw phrase-count assertion in `tests/integration/md/case-164-direct-output-candidate-contract.test.mjs` with structural assertions over the ordered case-164 message protocol: exactly three messages, the first and third require the child actor, and the second forbids it.
- [ ] 2.3 Add focused negative assertions so a missing third message, a child instruction in turn 2, or an incorrect number of child-bearing turns fails without changing the runner, playbook, native evidence, or `NOT_RUN` boundary.

## 3. Verification And Closeout

- [ ] 3.1 Run `node --test tests/integration/md/case-164-direct-output-candidate-contract.test.mjs tests/engine/work-unit-attempt-disposition.test.mjs tests/engine/work-unit-submit.test.mjs tests/integration/md/phase-wave-replacement-guidance.test.mjs`; all selected tests pass.
- [ ] 3.2 Run `node openspec/governance/check-verification-routing.mjs --change repair-case-164-verification-contract --mode assets`; the selected integration asset validates.
- [ ] 3.3 Run `openspec validate repair-case-164-verification-contract --strict` successfully.
- [ ] 3.4 Run `node openspec/governance/check-project-reqs.mjs` with zero duplicate, orphan, unregistered, or reused-retired requirement IDs.
- [ ] 3.5 Run `node openspec/governance/check-project-specs.mjs` with zero main-spec structural violations.
- [ ] 3.6 openspec-feedback:closeout-review — review the change-scoped diff, skipped-spec boundary, focused verification, and residual Agent-evidence boundary; no open finding remains.
