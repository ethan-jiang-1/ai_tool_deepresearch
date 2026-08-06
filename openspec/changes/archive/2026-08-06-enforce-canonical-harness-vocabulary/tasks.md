## 0. Plan Review

- [x] 0.1 Review `verification-plan.yaml`, record all four test-class decisions, and run `node openspec/governance/check-verification-routing.mjs --change enforce-canonical-harness-vocabulary --mode plan` before any target edit. (RUE-002, RUE-004, SWE-004)
- [x] 0.2 `openspec-feedback:plan-review` - Review the proposal, two full delta requirements, design boundaries, seventeen-current-occurrence inventory, and verification plan. Record any actionable finding as an ordinary unchecked task naming its requirement/reader question, authoritative owner, smallest repair, and observable done condition. (RUE-002, RUE-004, SWE-004)

## 1. Canonical Current Vocabulary

- [x] 1.1 Update `SETUP.md` so its readiness prose names the Deep Research Harness and its opt-in prose names a research run through that Harness, preserving the permission-posture meaning. (RUE-002)
- [x] 1.2 Sync `run-entry` RUE-002 and RUE-004 from the approved delta so selected entry and execution-path language names the Deep Research Harness without changing shortcut-routing behavior. (RUE-002, RUE-004)
- [x] 1.3 Sync `silent-wave-execution` SWE-004 from the approved delta so the background-workflow scenario names Deep Research Harness authority and scopes runtime truth to the current run bundle without changing silent-phase behavior. (SWE-004)
- [x] 1.4 Update the two `bundleDir` JSDoc descriptions in `DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs` to name a run bundle without changing queue behavior or the structural `dpt_*` protocol. (RUE-002, RUE-004, SWE-004)
- [x] 1.5 Update the expected runtime paths in the six audited `experiments_playbook/exp_gate-fork/` and `experiments_playbook/exp_gate-loop/` cases to name a run bundle without changing experiment execution or `dpt_*` fixture grammar. (RUE-002, RUE-004, SWE-004)
- [x] 1.6 Add `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs` with `@impl RUE-002, RUE-004, SWE-004`; it SHALL read the ten audited current sources and assert their canonical Harness entry, execution-path, research-run, run-bundle, authority, and current-run-bundle runtime-truth statements without persisting a retired-name test fixture. (RUE-002, RUE-004, SWE-004)

## 2. Verification and Closeout

- [x] 2.1 Run the focused integration contract declared in `verification-plan.yaml` and require a deterministic passing `node --test` verdict. Do not claim real-Agent behavior. (RUE-002, RUE-004, SWE-004)
- [x] 2.2 Run bounded tracked-worktree scans outside this active change, `openspec/changes/archive/`, and protected runtime/historical locations. Require no current exact legacy source label and no human-readable retired framework/flow/entry/run phrase, including `DPT run bundle`; retain accepted structural `dpt_*` identifiers outside the scan claim. Record scope and expected no-match exits in closeout evidence. (RUE-002, RUE-004, SWE-004)
- [x] 2.3 Run `node openspec/governance/check-verification-routing.mjs --change enforce-canonical-harness-vocabulary --mode assets`, `openspec validate enforce-canonical-harness-vocabulary --type change --strict`, and `git diff --check`; resolve only change-scoped failures. (RUE-002, RUE-004, SWE-004)
- [x] 2.4 Run `node openspec/governance/check-project-reqs.mjs` and require 0 duplicate, orphan, unregistered, or reused-retired requirement IDs.
- [x] 2.5 Run `node openspec/governance/check-project-specs.mjs` and require 0 main-spec structural violations.
- [x] 2.6 After spec sync, directly compare both delta requirement blocks with their accepted main-spec blocks and require only the approved canonical-vocabulary substitutions.
- [x] 2.7 RUE-002/RUE-004 closeout finding: the `run-entry` contract has two canonical entry and five canonical execution-path statements, but the focused regression asserted only a subset. Authoritative owner: `openspec/specs/run-entry/spec.md`; smallest repair: assert those positive counts without retaining a retired-name fixture; done condition: the focused test fails if any audited entry or execution-path statement stops using its canonical wording. (RUE-002, RUE-004)
- [x] 2.8 `openspec-feedback:closeout-review` - Review the scoped source/test/spec diff, the structural-identifier exclusion, the bounded scan scope/results, delta/main synchronization, and selected deterministic evidence before archive. Record every actionable finding as a normal pending task with its requirement ID or reader question, authoritative owner, smallest repair, and observable done condition. (RUE-002, RUE-004, SWE-004)
