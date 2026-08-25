## 1. Apply Readiness And Evidence Baseline

- [x] 1.1 Complete the selected-change plan review (`openspec-feedback:plan-review`) after reading the proposal, delta, design, verification plan, and semantic-closure record. Turn every actionable finding into an ordinary unchecked repair task with its owner, smallest repair, and observable done condition; complete those repairs and rerun every affected planning validation/governance check before the first target edit. (ACR-002, ACR-004)
- [x] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change entry-chain-single-source-symlink --mode plan` and `node openspec/governance/check-semantic-closure.mjs --change entry-chain-single-source-symlink --mode plan`; repair and rerun every reported coordinate before the first target edit. (ACR-002, ACR-004)

## 2. Entry-File Single Source

- [x] 2.1 Neutralize root `AGENTS.md` line 3 to a host-agnostic phrase, then replace root `CLAUDE.md` with a symlink resolving to the co-located `AGENTS.md`; verify `AGENTS.md` remains the sole regular file. (ACR-002)
- [x] 2.2 Neutralize `DEEP_RESEARCH_HARNESS/AGENTS.md` line 3 to a host-agnostic phrase and update its trailing note to state `CLAUDE.md` is a symlink, then replace `DEEP_RESEARCH_HARNESS/CLAUDE.md` with a symlink resolving to the co-located `AGENTS.md`. (ACR-002)
- [x] 2.3 Add `openspec/governance/check-entry-chain.mjs` (`// @impl ACR-002`): over the repo-root and `DEEP_RESEARCH_HARNESS/` entry directories, fail with the violating surface and a repair instruction when `CLAUDE.md` is not a symlink resolving to the co-located `AGENTS.md` (or `AGENTS.md` is not a regular file). Auto-aggregated by `check-all.mjs`; no aggregator edit. (ACR-002, ACR-004)

## 3. Deterministic Coverage

- [x] 3.1 Rewrite `tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs` to assert the single-source shape: in each entry directory `AGENTS.md` is a regular file and `CLAUDE.md` is a symlink resolving to it. (ACR-004)
- [x] 3.2 Add `tests/integration/governance/check-entry-chain-contract.test.mjs` (`node:test`): materialize a temp fixture where `CLAUDE.md` is a regular-file copy and assert the checker exits non-zero (negative control); then assert the symlink shape exits zero. (ACR-004)

## 4. Verification

- [x] 4.1 Run `npm test` and `npm run governance:check`; record both green with no unrelated failures. (ACR-002, ACR-004)

## 5. Review, Sync, And Governed Archive

- [x] 5.1 Complete the change-scoped closeout review (`openspec-feedback:closeout-review`) after reviewing the actual diff, the semantic-closure record, and the selected verification evidence; leave no open finding. (ACR-002, ACR-004)
- [x] 5.2 Synchronize the approved ACR-002/ACR-004 delta to the main spec through the supported Agent-owned route, then re-compare delta/main semantics and rerun affected governance checks. (ACR-002, ACR-004)
- [x] 5.3 Run `node openspec/governance/check-project-reqs.mjs --mode archive --change entry-chain-single-source-symlink` and `node openspec/governance/check-project-specs.mjs`; both must PASS before archive. (ACR-002, ACR-004)
- [x] 5.4 After all earlier tasks and any review-created repair tasks are complete, mark this archive-transition task complete immediately before invoking `node openspec/governance/finalize-change-archive.mjs --change entry-chain-single-source-symlink`. If it returns non-zero, restore this task to unchecked and repair its named root. Done when the governed finalizer reports native archive success. (ACR-002, ACR-004)
