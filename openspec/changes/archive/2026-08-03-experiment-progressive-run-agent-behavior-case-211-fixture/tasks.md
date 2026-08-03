## 1. Apply Readiness

- [x] 1.0 openspec-feedback:plan-review — reviewed the retained P4.3 report/bundle, RWE-001, RWP-001, EXO-003/004, proposal, design, and routing plan; recorded the legal predecessor-path and test-path findings as ordinary tasks 2.0 and 3.1 before the first target edit.
- [x] 1.1 RWE-001, RWP-001, EXO-003: `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-agent-behavior-case-211-fixture --mode plan` passed with three claims; static composition proof and real-Actor `agent_flow_e2e` proof remain separate.

## 2. Case-211 Fixture Repair

- [x] 2.0 RWP-001 plan-review finding — case-211 now establishes fixed setup input -> `setup-ready` -> Seed Topics entry -> seed-topic materialization -> `seed-topics-ready` -> Wave0 entry -> `advance-status seed_topics_ready` before the actor claim. The Markdown contract test, `validate-playbook`, and no-Actor Engine predecessor preflight passed; the fixture does not claim HITL1 or Seed Agent behavior.
- [x] 2.1 RWE-001: `writeWave0Scaffold` now has default-on `syntheticWave0Trace`; its false branch omits only `writeWave0Handoff` and fixture-owned `wave0_completion`. The focused test proves the default trace remains and the case-211 opt-out has no synthetic trace.
- [x] 2.2 RWE-001, RWP-001: case-211 assigns the real `dpt-source-intake` actor its conditional `reference/00-shared-agentic-coding-tools.md` output with a real `source_url`, required topic `source.yaml`, and cache trail, while its task text prohibits Phase-authored substitutes. The Markdown contract test passed.
- [x] 2.3 RWP-001: case-211 now composes `dry-submit` -> formal submit -> eligible contribution inspect -> pre-projection Wave0 inspect -> current `wave_projection` schema -> retained/apply Wave0 Projection Packet -> current Wave0 inspect, without seed edits or a hard-coded packet schema. The Markdown contract test passed.
- [x] 2.4 RWE-001, EXO-003, EXO-004: case-211 logs `wave0_completion` only at phase closeout and runs the Wave0 Gate through `run-gate-with-monitor`; its native checks derive from submit/inspect/monitor evidence and retain the `NOT_RUN` branch. The Markdown contract test and `validate-playbook` passed.

## 3. Deterministic Verification And Evidence Record

- [x] 3.1 RWE-001: extended `tests/experiments_env/shared/work-unit-playbook-utils.test.mjs`; its default-versus-opt-out regression passes.
- [x] 3.2 RWE-001, RWP-001, EXO-003: added `tests/integration/md/case-211-fixture-contract.test.mjs`; its V2 composition and evidence-boundary assertions pass without claiming Agent execution.
- [x] 3.3 RWE-001: `node --test tests/experiments_env/shared/work-unit-playbook-utils.test.mjs tests/integration/md/case-211-fixture-contract.test.mjs` passed `6/6`, and `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook` passed `102/102`.
- [x] 3.4 RWE-001: updated `_backlog/plans/experiment-progressive-run-plan.md` with the P4.3 native `FAIL` / Heavy `ISSUES`, P4.4 fixture scope, static verification, selector result, and no-budget-reuse rule.
- [x] 3.5 RWE-001 closeout-review finding: `subjectBound` is now explicitly wrapped in `Boolean(...)` before `recordPlaybookCheck`; the Markdown contract test locks that strict verdict shape and passes.

## 4. Fresh Requalification Boundary

- [x] 4.1 RWE-001: fresh discovery `--dry-run --json` selected case-406 as the only due Agent-behavior case (`254929` ms / `$1.212314`); case-211 was omitted with stale `435120` ms / `$2.135120` for `predicted_duration_exceeds_bound`. The one-case `254929` ms / `$1.25` total/per-case preflight likewise selected only case-406, with no `--case` override.
- [x] 4.2 RWE-001: conditional requalification branch not entered. Because 4.1 did not select case-211, no new budget decision was requested or consumed and no Headless run was performed; repaired real-Actor/native/Heavy evidence remains unproven rather than PASS.
- [x] 4.3 RWE-001: `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-agent-behavior-case-211-fixture --mode assets` passed with three claims. The unit/integration claims have static evidence; the selected `agent_flow_e2e` claim remains unproven because the selector did not select case-211.

## 5. Governance Closeout

- [x] 5.1 `node openspec/governance/check-project-reqs.mjs` passed: 616 registered, 53 retired, 0 orphan, with no duplicate, unregistered, or reused-retired findings.
- [x] 5.2 `node openspec/governance/check-project-specs.mjs` passed: 82 main spec files and 0 violations for deltaHeaderInMain, missingPurpose, missingRequirements, or missingReqHeader.
- [x] 5.3 openspec-feedback:closeout-review — reviewed the scoped helper/playbook/test/plan diff, all change artifacts, routing assets, focused `6/6` tests, `102/102` playbook validation, governance results, and fresh selector result. The review added ordinary task 3.5 for the non-boolean check value, repaired and reverified it; the final review found no further actionable issue. No delta spec exists, so delta/main sync and re-comparison are not applicable. The case-211 real-Actor claim remains explicitly unproven because the current profile selected case-406 instead.
