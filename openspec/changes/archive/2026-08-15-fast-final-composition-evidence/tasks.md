## 1. Plan Admission

- [x] 1.1 `openspec-feedback:plan-review` Review CDE-003's one-finding/one-must-answer case-137 reader question, the one-Subject/one-report scope, the 30/45/5-second process limits plus retained 60-second success-evidence threshold, the no-evidence closeout branch, and the exclusion of report-quality claims; record every actionable finding as an ordinary pending task with its owner and observable repair condition before target edits.
- [x] 1.2 Validate the plan before target edits: run `node openspec/governance/check-project-reqs.mjs --mode plan`, `node openspec/governance/check-verification-routing.mjs --change fast-final-composition-evidence --mode plan`, and `node openspec/governance/check-semantic-closure.mjs --change fast-final-composition-evidence --mode plan`; repair all blocking diagnostics without adding a new capability or runtime fact family.

## 2. Bounded Evidence Assets

- [x] 2.1 Implement CDE-003's case-137 single real-Subject Final configuration in `experiments_env/shared/run-iterative-interaction-subject.mjs`: exactly one Final-only message with `Bash,Glob,Grep,Read,Write`, no network/Task/production delegation, retained Subject evidence, and a 30,000 ms Subject boundary.
- [x] 2.2 Implement CDE-003's `case-137-standard-fast-final-composition.md` and active manifest entry: one setup-only legal Final predecessor with one must-answer, one submitted-backed finding and one Evidence Map backing; one real Subject execution; one `persist-final-report` result; one primary report at most 1,600 UTF-8 bytes with exactly one Evidence Map row; strict terminal-discipline/native-completion checks; the required `--timeout 45000 --health-timeout 5000` invocation; and no semantic judge or claim beyond the bounded observation.
- [x] 2.3 Add `tests/integration/md/case-137-fast-final-composition-contract.test.mjs` for CDE-003 source-contract parity across the case, manifest, minimal fixture, Subject configuration, 30/45/5-second limits, 60-second retained-result threshold, verification profile, and case-135/136 exclusion; it must explicitly remain deterministic-contract proof.

## 3. Verification And One-Shot Outcome

- [x] 3.1 Run the selected static proof and asset admission for CDE-003 case-137: the new integration test, `node openspec/governance/check-verification-routing.mjs --change fast-final-composition-evidence --mode assets`, and `node openspec/governance/check-semantic-closure.mjs --change fast-final-composition-evidence --mode assets`.
- [x] 3.2 Run `case-137-standard-fast-final-composition` exactly once through the Autorun Supervisor with `--timeout 45000 --health-timeout 5000` and an approved positive budget; preserve the native report/audit and record the exact retained `duration_ms`, native, lifecycle, and health outcomes without interpreting console prose as a verdict.
- [x] 3.3 Apply exactly one CDE-003 case-137 outcome branch: only a retained `duration_ms <= 60000`, native `PASS`, null lifecycle, and `CLEAN` health result may link the Subject/runtime evidence and leave case-137 active; for any other outcome, preserve diagnostics, remove the case from the active manifest, move it to `exp_extrem_slow/`, record an explicit `no-evidence` result, and do not retry or claim Agent-behavior PASS.

## 4. Closeout

- [x] 4.1 `openspec-feedback:closeout-review` Review CDE-003's final case-137 evidence boundary, actual one-shot outcome branch, manifest/quarantine state, and all agent-behavior wording; convert every actionable finding into an ordinary pending task with owner and independently observable done condition.
- [x] 4.2 Sync the CDE-003 delta through the accepted apply/sync route; run `node openspec/governance/check-project-reqs.mjs --mode archive --change fast-final-composition-evidence` and require PASS with no duplicate, orphan, unregistered, or reused-retired ID.
- [x] 4.3 Run `node openspec/governance/check-project-specs.mjs` and require PASS with no delta header in a main spec, missing Purpose, missing Requirements, or missing requirement header.
- [x] 4.4 Archive only after every ordinary task and review finding is closed, the accepted specs and active/quarantined assets match the recorded CDE-003 case-137 outcome, and no report-quality or unsupported Agent-behavior claim remains. Marked complete immediately before invoking `node openspec/governance/finalize-change-archive.mjs --change fast-final-composition-evidence`; restore it to unchecked if finalization fails.
