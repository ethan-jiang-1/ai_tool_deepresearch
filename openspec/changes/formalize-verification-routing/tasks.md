## 1. Verification Routing Governance

- [x] 1.1 Register the `VER` prefix and `VER-001` through `VER-005` under `# verification-routing` in `openspec/governance/req-registry.yaml`, preserving required alphabetical and numeric ordering. Done when the registry names the new capability without a synthetic delta group. (VER-001, VER-002, VER-003, VER-004, VER-005) — 已在 explore 阶段完成，`check-project-reqs.mjs` PASS。
- [ ] 1.2 Implement the `verification-routing/v1` plan parser and read-only `check-verification-routing.mjs --change <name> --mode plan|assets` contract in `openspec/governance/`. Done when it validates method decisions, claim compatibility, production distance, native verdict authority, and declared asset boundaries without running any test or mutating files. (VER-002, VER-003)
- [ ] 1.3 Add focused `tests/governance/` coverage for valid plans and rejection of missing method decisions, invalid claim/method combinations, wrong asset roots, fixture-as-Agent overclaims, fake production stand-ins, and result-bearing plan fields. Done when the checker reports the claim id and one nearest correction for each invalid route. (VER-002, VER-003)
- [ ] 1.4 Update `openspec/config.yaml` to require `verification-plan.yaml`, plan-mode validation before implementation, asset-mode validation before archive, and an explicit deferred/not-applicable rationale without changing the existing requirement-traceability checks. Done when the rules route future changes without requiring a new OpenSpec schema or universal runner. (VER-002, VER-003)
- [ ] 1.5 Run the new checker in plan mode against this change's `verification-plan.yaml` before changing regression or playbook assets. Done when its route decision passes and it emits no runtime result claim. (VER-002, VER-003)

## 2. Regression Route For Rerun Continuity

- [ ] 2.1 Preserve and extend focused direction-resolver regression coverage for matching, stale, future/crash-window, legacy-unbound, and invalid direction states. Done when the helper test proves only the deterministic resolver contract. (VER-001, VER-004)
- [ ] 2.2 Replace the manual filtering assertions in `tests/integration/cli/rerun-round-continuity.test.mjs` with `spawnSync` calls to the accepted work-unit inspect and relevant return-map/gate CLI boundaries over an isolated `os.tmpdir()` bundle. Done when current-round eligible rows, legacy exclusion warnings, and missing per-row authority references are asserted from structured CLI output rather than test-local filtering logic. (VER-001, VER-004)
- [ ] 2.3 Verify the regression route uses no top-level `tests_e2e/` directory, no framework-local test files, and no `test:e2e`/`test:all` script that mixes Node tests with playbooks. Done when the canonical `npm test` discovery continues to cover the new deterministic scenario under `tests/`. (VER-001, VER-004)

## 3. Controlled E2E Route For Agent Recovery

- [ ] 3.1 Create `experiments_playbook/exp_wfn_rerun/case-305-heavy-rerun-direction-recovery.md` as a valid command experiment（复用既有 exp_wfn_rerun 目录与 case-30x 编号段，不新开 exp 目录）. Done when it creates a fresh disposable bundle through approved shared infrastructure, declares a real-Agent dependency, executes the phase-rerun direction/recovery flow, records verdict-affecting facts as trace checks, and derives its final verdict from bundle-root `rb_trace.jsonl`. (VER-001, VER-004)
- [ ] 3.2 Ensure the controlled case never scripts an Agent-produced direction or treats a hand-written result, receipt, trace, or README as Agent-flow proof. Done when its Reality Distance Ledger identifies actual actors and any controlled fixture boundary, and the playbook passes the existing playbook validator. (VER-001, VER-004)
- [ ] 3.3 Update the active runner surface and adjacent experiment documentation with the new case, its heavy cost, its precise proof claim, and its non-proof boundaries. Done when the runner has one unambiguous entry and does not redesign unrelated `RUN.md`/`RUN_EXPS.md` policy. (VER-001, VER-004)

## 4. Knowledge-Surface Convergence (VER-005, design Decision 6)

- [ ] 4.1 Rewrite the 测试分层 section of `openspec/config.yaml`: three canonical method identifiers plus their asset-ownership boundaries plus one pointer to `openspec/specs/verification-routing/`; delete the full per-layer restatement and the 「第一/二/三层」 ordinal naming. Done when the section contains no ordinal method names and no routing/plan semantics restatement. (VER-005)
- [ ] 4.2 Update the Test layering hard rule in `AGENTS.md` and `CLAUDE.md`: keep the one-line asset-ownership rule they own, switch method names to canonical identifiers, append the pointer. Done when both files agree verbatim on the rule. (VER-005)
- [ ] 4.3 Align the tests/experiments rows of the directory-responsibility table in `guidelines/project-charter.md` to canonical method identifiers without changing row semantics. Done when no competing method vocabulary remains. (VER-005)
- [ ] 4.4 Update the root README, `tests/README.md`, and `experiments_playbook/README.md` to describe the three methods, their asset boundaries, and the distinction between claim class and test scope. Done when documentation no longer presents `tests_e2e/` as a fourth project-level method and restates nothing beyond owned boundary facts plus pointer. (VER-001, VER-005)
- [ ] 4.5 Add a concise routing reference to `guidelines/command-experiments.md` or its nearest authoritative navigation surface without duplicating the full policy. Done when playbook authors can find the verification plan requirement and understand that a fixture-backed case is Engine evidence only. (VER-001, VER-002)
- [ ] 4.6 Verify `tests/integration/README.md` states the regression asset disciplines absorbed from the backlog (bundles under `os.tmpdir()`, `after()` cleanup, `spawnSync` against real CLIs, no Engine-internal imports, self-contained test files); add any missing ones. Done when all five are present. (VER-004)
- [ ] 4.7 Annotate `_backlog/plans/tests-e2e-layer.md` header Metadata only: Status → Superseded, plus one line pointing to this change; do not rewrite its body. Done when the header annotation exists and body is untouched. (VER-005)
- [ ] 4.8 Reconcile `seed-backfill-round-continuity` task 10.7 only with the newly existing, executed controlled-E2E asset and its native trace evidence; restore it to incomplete or record the missing proof if execution cannot occur. Done when no checked task is used as a substitute for an absent runnable asset or result. (VER-004)

## 5. Evidence And Deferred Production Boundary

- [ ] 5.1 Create and maintain `implementation-evidence.md` in this change during apply. Done when it records the route plan, commands actually run, native verdict locations, controlled-E2E trace result, source-change reconciliation, and residual risk without copying results into `verification-plan.yaml`. (VER-002, VER-003, VER-004)
- [ ] 5.2 Keep the `real_environment_e2e` claim in this change's plan and implementation evidence as deferred unless the user explicitly selects a production bundle. Done when no synthetic asset, fixture, or disposable bundle is reported as production evidence. (VER-001, VER-002, VER-004)
- [ ] 5.3 Run `check-verification-routing.mjs --mode assets`, focused regression tests, `npm test`, the selected controlled-E2E playbook, and the existing playbook validator. Done when each actual outcome is recorded in implementation evidence; a missing real-Agent execution leaves the Agent-flow task incomplete rather than converted into PASS. (VER-003, VER-004)

## 6. OpenSpec Completion Checks

- [ ] 6.1 Run `openspec validate formalize-verification-routing --strict`. Done when proposal, delta spec, design, and tasks validate with the new verification plan present. (VER-001, VER-002, VER-003, VER-004, VER-005)
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports 0 duplicate, 0 unregistered, 0 orphan, and 0 reusedRetired requirement IDs. (VER-001, VER-002, VER-003, VER-004, VER-005)
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs`. Done when it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader violations. (VER-001, VER-002, VER-003, VER-004, VER-005)
- [ ] 6.4 Run `node openspec/governance/check-verification-routing.mjs --change formalize-verification-routing --mode assets`. Done when this change passes its own archive gate (dogfood). (VER-003)
