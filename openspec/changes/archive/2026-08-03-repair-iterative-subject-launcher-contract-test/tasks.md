## 0. Feedback Review

- [x] openspec-feedback:plan-review — Reviewed the proposal, design, task ownership boundary, and verification plan before the target edit; the only actionable stale-owner finding is tracked below.

## 1. Verification Routing

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change repair-iterative-subject-launcher-contract-test --mode plan`; proceed to the target test only when the selected integration claim validates.

## 2. Integration Contract Repair

- [x] 2.1 Update `tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs` to read `iterative-interaction-subject-launch.mjs`, assert `--setting-sources ''` on that owning module, and assert the runner does not duplicate the launcher-only argv literal; retain all runner lifecycle assertions.
- [x] 2.2 Move the residual static `--bare`, `--tools`, and `--effort` argv assertions from the runner to the pure launcher owner, with runner non-duplication assertions; the focused contract runs without another stale-owner failure.

## 3. Verification And Closeout

- [x] 3.1 Run `node --test tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs tests/experiments_env/case-115-subject-runner.test.mjs`; the integration contract and focused launcher test both pass without starting a real Agent runtime.
- [x] 3.2 Run `node openspec/governance/check-verification-routing.mjs --change repair-iterative-subject-launcher-contract-test --mode assets`; the selected integration asset validates.
- [x] 3.3 Run `openspec validate repair-iterative-subject-launcher-contract-test --strict` successfully.
- [x] 3.4 Run `node openspec/governance/check-project-reqs.mjs` with zero duplicate, orphan, unregistered, or reused-retired requirement IDs.
- [x] 3.5 Run `node openspec/governance/check-project-specs.mjs` with zero main-spec structural violations.
- [x] openspec-feedback:closeout-review — Reviewed the change-scoped actual diff, skipped-spec boundary, and selected verification evidence after the residual argv-owner repair; no open finding remains.
