## 1. Apply Readiness

- [x] 1.0 openspec-feedback:plan-review — reviewed the existing AGT-010 contract, both topic-rewrite fixtures, retained case-181 evidence, proposal, design, verification plan, task list, and current apply guidance before the first target edit; no additional actionable finding remains.
- [x] 1.1 AGT-010: ran `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-topic-rewrite-fixtures --mode plan`; the plan keeps source-composition proof and Headless Playbook-Agent proof separate.

## 2. Topic-Rewrite Fixture Repair

- [x] 2.1 AGT-010: updated both topic-rewrite fixtures so Agent-owned rewrite semantics remain in Markdown while approved HITL1 topic inputs flow through the existing initial instantiation -> HITL1 handoff, `advance-status`, and one `operate-topic-state apply`; no fixture-owned registry or UID-bound seed identity write remains.
- [x] 2.2 AGT-010: each fixture consumes its committed topic-state `style_projection` handoff and runs the returned selected-style command, with its profile/count check, before its only verdict-affecting `hitl1-recorded` Gate; neither hand-writes `research_style_params`.
- [x] 2.3 AGT-010: added `tests/integration/md/topic-rewrite-fixtures-contract.test.mjs`; its 4 assertions lock both V2 policies, retained semantic checks, expected topic counts, legal writer/style order, and absence of direct registry/seed identity writes without claiming Agent-flow execution.

## 3. Verification And Requalification

- [x] 3.1 AGT-010: ran `node --test tests/integration/md/topic-rewrite-fixtures-contract.test.mjs` (4/4 passing) and `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook` (102 passed, 0 failed) before a Headless Playbook-Agent run.
- [x] 3.2 AGT-010: ran fresh `calibration --max-predicted-duration-ms 900000 --dry-run --json`; it selected five current candidates, beginning with `case-11-light-four-returns` (observed-stale prediction `38053` ms / `$0.257206`). The explicit one-case preflight at exactly those duration and total/per-case budget bounds selected only case-11; no arbitrary `--case` substitute was used.
- [x] 3.3 AGT-010: the one-case preflight selected case-11, not case-181; case-181 remained omitted for `predicted_duration_exceeds_bound` (`382873` ms / `$1.266596`). Per the approved boundary, no replacement real run was started. The repair therefore has static fixture evidence and a recorded selector boundary, but no fresh case-181 native/health/trace/audit evidence.
- [x] 3.4 AGT-010: ran `node openspec/governance/check-verification-routing.mjs --change experiment-progressive-run-topic-rewrite-fixtures --mode assets` (2 claims valid), repeated the focused 4/4 Markdown contract test, and ran `validate-playbook` (102 passed, 0 failed); no native asset is claimed because the current selector did not authorize case-181.
- [x] 3.5 AGT-010: updated `_backlog/plans/experiment-progressive-run-plan.md` with P3.1's fresh calibration facts, the P3.2/P3.3 selector boundary, and the current case-11 next state without inferring a permanent case classification.

## 4. Governance Closeout

- [x] 4.1 Ran `node openspec/governance/check-project-reqs.mjs`: 616 registered (53 retired), 0 orphan, duplicate, unregistered, or reused-retired findings.
- [x] 4.2 Ran `node openspec/governance/check-project-specs.mjs`: 82 main spec files, 0 deltaHeaderInMain, missingPurpose, missingRequirements, or missingReqHeader findings.

## 5. Archive Closeout

- [x] 5.1 openspec-feedback:closeout-review — reviewed the change-scoped fixture/plan/test/artifact diff, the focused 4/4 Markdown contract test, `validate-playbook` (102/0), current calibration selector boundary, routing assets, and AGT-010. No delta specs require sync; no actionable finding remains. Static source proof is not represented as Headless runtime evidence.
