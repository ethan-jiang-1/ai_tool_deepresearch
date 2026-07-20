## 1. Verification Baseline

- [ ] 1.1 As the first apply-scope write, register CMI-008 and EXS-003 in `openspec/governance/req-registry.yaml`, then run `node openspec/governance/check-verification-routing.mjs --change harden-bundle-creator-arguments --mode plan` and `node openspec/governance/check-project-reqs.mjs` before target edits; done when the two integration claims and registered IDs are accepted without a JS-led E2E or Agent-flow overclaim.
- [ ] 1.2 Add failing CMI-008 cases to `tests/integration/cli/instantiate-run-bundle.test.mjs`; done when real child-process `--help`, `--force`, unsafe/flag/path names, unknown/missing options, and extra positionals prove exit behavior plus zero target/bundle writes, while a legal explicit target still creates one direct-child production bundle.
- [ ] 1.3 Add failing EXS-003 cases in `tests/integration/experiments_env/new-disposable-bundle.test.mjs`; done when real child-process `--help`, unsafe name/case, unknown/missing options, and extra positionals prove zero target/bundle writes, while legal case/target creation and legal disposable `--force` remain proven over test-owned temporary directories.

## 2. Early Creator Boundaries

- [ ] 2.1 Implement CMI-008 in `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`; done when one strict pre-write argv boundary accepts exactly one production-safe name plus documented target option, returns zero-side-effect help, retains the explicit production `--force` rejection, and rejects every malformed invocation before repo/target/bundle mutation without a new shared parser, Gate, state, trace, or cleanup surface.
- [ ] 2.2 Implement EXS-003 in `experiments_env/shared/new-disposable-bundle.mjs`; done when one strict pre-write argv boundary accepts exactly one disposable-safe name, safe optional case fragment, documented nodes/target options and legal force flag, while every malformed invocation fails before repo/target/bundle mutation and existing legal generated basename behavior remains intact.
- [ ] 2.3 Audit CMI-008/EXS-003 compatibility at all creator call sites; done when existing playbook, fixture, and integration invocations use accepted option/name forms, success output remains an absolute direct-child bundle path, and no caller needs an undocumented fallback or user-directed manual repair.

## 3. Focused Verification

- [ ] 3.1 Run `node --test tests/integration/cli/instantiate-run-bundle.test.mjs tests/integration/experiments_env/new-disposable-bundle.test.mjs tests/integration/host_tools/agent-experiment-targeting.test.mjs`; done when zero-side-effect rejections and valid explicit target creation pass through the real creators.
- [ ] 3.2 Run `node --test tests/integration/cli/exit-code-convention.test.mjs` and `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`; done when the utility exit-code convention and shipped workflow package remain compatible.
- [ ] 3.3 Run `npm test`; done when all suites pass, or every unrelated existing failure is recorded with an exact focused reproduction and kept outside the two CMI-008/EXS-003 claims.
- [ ] 3.4 Audit CMI-008/EXS-003 non-goals; done when the diff adds no automatic historical-bundle deletion, generic parser framework, additional naming authority, Gate, trace event, persistent state, watcher, or recovery/controller path.

## 4. Release And Governance

- [ ] 4.1 Update `CHANGELOG.md` for v0.37 and `DPT_FRAMEWORK/RUN.md` banner/summary; done when both describe pre-write bundle-creator argument safety without claiming a runtime Gate or automatic cleanup capability.
- [ ] 4.2 Run `node openspec/governance/check-verification-routing.mjs --change harden-bundle-creator-arguments --mode assets`; done when both CMI-008/EXS-003 proof assets exist in their canonical integration locations.
- [ ] 4.3 Run `node openspec/governance/check-project-reqs.mjs` and `node openspec/governance/check-project-specs.mjs`; done when both report zero violations and CMI-008/EXS-003 remain traceable through registry, deltas, implementation annotations, and tests.
- [ ] 4.4 Run `openspec validate harden-bundle-creator-arguments --strict` and `git diff --check`; done when the complete change validates and contains no whitespace errors before archive.
