## 0. Plan Review

- [x] 0.1 openspec-feedback:plan-review — Review completed before target edits; the caller-extra mismatch was recorded and corrected as 0.2, and the repeated review found no remaining planning finding.
- [x] 0.2 LDC-002 / selected-host reader question — The delta incorrectly described caller extra-env `false` as producing a `true` child even though `buildChildEnv` rejects owned caller extras. Owner: the `local-deepseek-claude-launcher` delta and verification plan. Smallest repair: distinguish inherited-value replacement from caller-extra fail-closed rejection and add the corresponding deterministic assertions. Done when the corrected delta/plan pass strict OpenSpec and verification-routing plan validation.

## 1. Tool Discovery Configuration

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change enable-selected-host-research-tools --mode plan`; completed with all three selected claims valid before target edits.
- [x] 1.2 Implement LDC-002 in `DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`: completed with inherited-value removal and extra-env rejection preserved while the final launcher-owned `ENABLE_TOOL_SEARCH` value is `true` for direct and supervised child plans.
- [x] 1.3 Update `experiments_env/shared/run-iterative-interaction-subject.mjs` to use a new private `v2` settings identity with `ENABLE_TOOL_SEARCH=true`; completed with atomic creation, mode protections, selected generic launcher invocation, untouched `v1` settings, and fail-closed reuse validation that the v2 owned value remains true.

## 2. Deterministic Proof And Release

- [x] 2.1 Extend the selected unit/integration contracts: completed with v2/true Subject assertions, inherited-false fake-child proof, caller-extra rejection, and preserved non-bypass/provider-isolation assertions.
- [x] 2.2 Run the focused unit and integration tests plus the existing selected adapter contract tests; completed with 31 passing tests and no real provider call or private-settings mutation.
- [x] 2.3 Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` for the proposal-declared `v0.68`, describing enabled selected-host tool discovery without claiming available research access.

## 3. Fresh Provider Observation

- [x] 3.1 Run a no-consumption `assurance` preflight scoped to exact case-115 with `--max-predicted-duration-ms 360000 --max-total-budget-usd 1.00 --max-case-budget-usd 1.00 --timeout 360000 --dry-run --json`; completed: case-115 was the sole selected item, with observed-stale predictions of `308567 ms` / `$0.935117`, no omitted cases, and no profile queue progression. This replaces discovery inventory rotation for this focused claim.
- [x] 3.2 Under exactly the preflight's `$1.00` total/per-case cap and `360000` ms predicted/Agent timeout, launch only the one assurance-selected case-115 slice; completed with batch `022a0574-efb2-49ab-9fd9-8045fb503aae`: native `NOT_RUN`, health `CLEAN`, `115278 ms`, and `$0.284056`. Retained Subject facts show v2 true/requested tools but actual `init.tools` only `Bash/Edit/Read`; no later case, retry, widening, or discovery run was launched.
- [x] 3.3 Record the agent-flow claim in `apply-evidence.md` as PASS, FAIL, or NOT_RUN from retained evidence. Completed as `NOT_RUN`: case-115 retained no public `WebSearch`, returned URL, or same-URL fetch; neither a visible configuration value nor the clean health result was upgraded to available-path success.

## 4. Verification And Closeout

- [x] 4.1 Run `node openspec/governance/check-verification-routing.mjs --change enable-selected-host-research-tools --mode assets`; completed with all three selected assets valid and canonically routed.
- [x] 4.2 Run `openspec validate enable-selected-host-research-tools --strict`, focused tests, and `git diff --check`; completed: strict validation passed, focused suite passed `31/31`, and whitespace validation passed. Commands/results are recorded in `apply-evidence.md`.
- [x] 4.3 Run `node openspec/governance/check-project-reqs.mjs` with 0 duplicate, orphan, unregistered, and reused-retired requirement IDs; completed: 616 registered, 53 retired, and 0 violations.
- [x] 4.4 Run `node openspec/governance/check-project-specs.mjs` with 0 deltaHeaderInMain, missingPurpose, missingRequirements, and missingReqHeader violations; completed: 82 main spec files and 0 structural violations.
- [x] 4.5a LDC-002 release claim precision — Closeout review found that the v0.68 release projection says enabled configuration "exposes" the declared native research surface, while retained case-115 evidence proves only a requestable configuration and an actually absent host tool surface. Owner: `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md`. Repaired by describing launcher-owned enablement as requesting the declared surface; both release surfaces preserve the explicit non-availability boundary.
- [x] 4.5 openspec-feedback:closeout-review — Reviewed the change-scoped actual diff, v2 migration boundary, claim dispositions, synchronized LDC-002 main spec, and post-sync verification evidence; no actionable finding remains.
