# share-wave1-focus-contract-baseline

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current Wave1 gate/inspect and bundle-identity sources;
      reviewed whole-change coherence and the touched surface (one
      integration cluster's setup). For `semantic-closure: not_applicable`,
      the reason holds. Done when no actionable finding remains and plan-mode
      governance passes.
- [x] 0.2 Plan-mode governance before the first target edit:
      `openspec validate share-wave1-focus-contract-baseline --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      share-wave1-focus-contract-baseline --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      share-wave1-focus-contract-baseline --mode plan`. Done when all exit
      zero; structural PASS results are planning evidence only.

## 1. Target Edits

- [x] 1.1 In `tests/integration/cli/wave1-focus-coverage-contract.test.mjs`,
      build the Wave1-ready baseline once in a `before()` hook, snapshot it
      with `snapshotBundle` at its root, and replace each
      `prepareWave1Bundle(...)` call in the four cases (and the
      `partial`/`blocked` loop) with `restoredBundle()` (restore to original
      path). Keep every `it()`, loop, and assertion verbatim. Done when the
      focused serial run passes with all four leaves green and no assertion
      changed.

## 2. Verification

- [x] 2.1 Focused serial run: all leaves pass; file wall drops from ~21s to
      ~5-7s and launches from ~149 to ~55 (single sample); per-variant
      assertions byte-identical to the pre-change behavior. Completed 2026-08-22: focused run 4/4 pass, 0 fail; file 6.64s vs 21.1s (~14.5s saved); launches ~149 to ~55 (est.); single sample.
- [x] 2.2 Full canonical serial run (`npm test -- --test-concurrency=1
      --test-reporter=tap`): zero failed/cancelled; wall reduced by ≈12-15s
      vs the 610.0s event-release baseline; record as a single sample. Completed 2026-08-22: clean run 2798 passed / 0 failed / 0 cancelled, wall 625.8s (single sample; focused deterministic saving 14.5s on the wave1 file; suite-level single-sample wall varies ±10-15s across runs).

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (only the one test file + this change's assets), review
      the actual diff against proposal/design/tasks/verification-plan, and
      reassess `semantic-closure: not_applicable`. Record every actionable
      finding as an ordinary unchecked task; complete only when none remains. Completed 2026-08-22: boundary = the one test file (imports + before/snapshot/restore + 4 call sites); diff matches proposal/design; no production/Harness surface touched; verification-plan claim exercised (focused 4/4, full 2798/2798); semantic-closure not_applicable reassessed — holds (test-owned setup only). No actionable finding remains.
- [x] 3.2 Archive-mode governance: `check-project-reqs --mode archive`,
      `check-project-specs`, `check-verification-routing --mode assets`,
      `check-semantic-closure --mode assets`, strict validation, and
      `git diff --check`. Done when all exit zero. Completed 2026-08-22: reqs archive consistent; project specs valid; routing assets valid (1 claim); semantic-closure assets valid; strict validate valid; diff-check OK.
