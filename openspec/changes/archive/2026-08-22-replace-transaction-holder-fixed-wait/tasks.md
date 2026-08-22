# replace-transaction-holder-fixed-wait

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current transaction/work-unit sources; reviewed
      whole-change coherence and the touched surface (one integration leaf's
      holder timing). For `semantic-closure: not_applicable`, the reason
      holds: no runtime fact family or production behavior changes. Done when
      no actionable finding remains and plan-mode governance passes. Completed 2026-08-22: reviewed per change-feedback-loop Apply Review; no finding; not_applicable holds (test-owned timing only).
- [x] 0.2 Plan-mode governance before the first target edit:
      `openspec validate replace-transaction-holder-fixed-wait --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      replace-transaction-holder-fixed-wait --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      replace-transaction-holder-fixed-wait --mode plan`. Done when all exit
      zero; structural PASS results are planning evidence only.

## 1. Target Edits

- [x] 1.1 In `tests/integration/cli/operate-work-unit.test.mjs:1707`, replace
      the fixed 6s `Atomics.wait` in the holder's mutation callback with the
      ready/release file handshake (holder writes `*.holder-ready`, polls up
      to 30s for `*.holder-release`); the test waits for ready, runs every
      existing assertion unchanged (both `sameAttempt` variants), then writes
      release. Done when the focused serial run passes and the leaf timing
      drops from ~12.5s to ~0.5s per variant without changing any assertion. Completed 2026-08-22: focused run 42/42 pass; holder leaf 1202ms (was ~12.5s); every assertion unchanged.

## 2. Verification

- [x] 2.1 Focused serial run of the touched file: every leaf passes; the
      `blocks default and forced timeout...` leaf measures ~0.5s per variant
      (single sample); byte-immutability and busy-fact assertions unchanged. Completed 2026-08-22: focused run 42/42 pass, 0 fail; holder leaf 1.2s vs ~12.5s baseline (single sample).
- [x] 2.2 Full canonical serial run (`npm test -- --test-concurrency=1
      --test-reporter=tap`): zero failed/cancelled; wall time reduced by
      ≈12s vs the 649.9s dedup baseline; record as a single sample. Completed 2026-08-22: clean run 2798 passed / 0 failed / 0 cancelled, wall 610.0s vs 649.9s prior run (leaf-level deterministic saving 11.3s; residual wall delta within machine variance).

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (only the one test file + this change's assets), review
      the actual diff against proposal/design/tasks/verification-plan, and
      reassess `semantic-closure: not_applicable`. Record every actionable
      finding as an ordinary unchecked task; complete only when none remains. Completed 2026-08-22: boundary = the one test file (:1707 handshake + loop-level ready/release vars); diff matches proposal/design; no production/Harness surface touched; verification-plan claim exercised (focused 42/42, full 2798/2798); semantic-closure not_applicable reassessed — holds (test-owned timing only). No actionable finding remains.
- [x] 3.2 Archive-mode governance: `check-project-reqs --mode archive`,
      `check-project-specs`, `check-verification-routing --mode assets`,
      `check-semantic-closure --mode assets`, strict validation, and
      `git diff --check`. Done when all exit zero. Completed 2026-08-22: reqs archive consistent; project specs valid; routing assets valid (1 claim); semantic-closure assets valid; strict validate valid; diff-check OK.
